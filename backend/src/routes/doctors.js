/**
 * Doctor Management Router
 * 
 * This Express router handles all doctor-related operations including:
 * - Doctor creation and deletion
 * - Patient assignment to doctors (both single and bulk operations)
 * - Retrieval of assigned and unassigned patients
 * - Doctor statistics and patient management
 * 
 * All endpoints require authentication via JWT. Admin privileges required for:
 * - Creating/deleting doctors
 * - Assigning/unassigning patients
 * - Viewing doctor statistics
 * 
 * Database Schema Assumptions:
 * Tables: doctors, patients, doctor_patient_relationships, appointments, medical_records
 * Relationships: doctor_patient_relationships tracks active assignments between doctors and patients
 * Status field in relationships: 'Active' for current assignments
 */

// Required dependencies with detailed explanations:

// Express - Web application framework for Node.js that provides robust routing
const express = require('express');

// Create router instance that will handle all /doctors routes
const router = express.Router();

// Database connection pool from our config module
// Uses pg library under the hood for PostgreSQL connection pooling
const { pool } = require('../config/database');

// JWT authentication middleware to verify user tokens
// Assumes middleware adds decoded token to req.user
const authenticateToken = require('../middleware/auth');

// Express-validator for input validation and sanitization
// Helps prevent SQL injection and ensures data integrity
const { body, validationResult } = require('express-validator');

router.post('/:doctorid/cleanup-dependencies', authenticateToken, async (req, res) => {
  // Admin-only operation
  if (req.user.Role.toLowerCase() !== 'admin') {
    return res.status(403).json({ message: 'Only admins can perform this operation' });
  }
  
  const { doctorid } = req.params;
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // 1. Remove doctor-patient relationships
    const relationshipsResult = await client.query(
      'DELETE FROM doctor_patient_relationships WHERE doctor_id = $1 RETURNING *',
      [doctorid]
    );
    
    // 2. Update appointments to set doctorid to NULL
    const appointmentsResult = await client.query(
      'UPDATE appointments SET doctorid = NULL WHERE doctorid = $1 RETURNING *',
      [doctorid]
    );
    
    // 3. Update medical records to set doctorid to NULL
    const medicalRecordsResult = await client.query(
      'UPDATE medicalrecords SET doctorid = NULL WHERE doctorid = $1 RETURNING *',
      [doctorid]
    );
    
    await client.query('COMMIT');
    
    res.json({
      message: 'Doctor dependencies cleaned up successfully',
      relationshipsRemoved: relationshipsResult.rowCount,
      appointmentsUpdated: appointmentsResult.rowCount,
      medicalRecordsUpdated: medicalRecordsResult.rowCount
    });
    
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error cleaning up doctor dependencies:', err);
    res.status(500).json({ error: 'Failed to clean up doctor dependencies', details: err.message });
  } finally {
    client.release();
  }
});

/**
 * POST /doctors/:doctorid/patients/bulk
 * Bulk assign multiple patients to a single doctor
 * 
 * Request body: { patientIds: [1, 2, 3, ...] }
 * Response: { message: string, relationships: array }
 * 
 * Business Rules:
 * - Only admins can perform bulk assignments
 * - Patients can only be actively assigned to one doctor at a time
 * - Uses database transaction to ensure all-or-nothing operation
 * - ON CONFLICT clause updates existing inactive relationships to active
 * 
 * Error handling:
 * - 403: Non-admin user attempted operation
 * - 400: Invalid request body (no patientIds or empty array)
 * - 409: Conflict when patients already assigned to different doctors
 * - 500: Database or server errors
 */
router.post('/:doctorid/patients/bulk', authenticateToken, async (req, res) => {
  try {
    // Role-based access control - check if user is admin
    if (req.user.Role.toLowerCase() !== 'admin') {
      return res.status(403).json({ message: 'Only admins can assign patients to doctors' });
    }
    
    // Extract doctor ID from URL parameters and patient IDs from request body
    const { doctorid } = req.params;
    const { patientIds } = req.body;
    
    // Validate that patientIds is a non-empty array
    if (!Array.isArray(patientIds) || patientIds.length === 0) {
      return res.status(400).json({ message: 'Patient IDs array is required' });
    }
    
    // Get a client from the connection pool for transaction management
    const client = await pool.connect();
    
    try {
      // Start database transaction
      await client.query('BEGIN');
      
      // Check if any of these patients are already assigned to another doctor
      // Using ANY operator for efficient array checking in PostgreSQL
      const existingAssignments = await client.query(
        `SELECT patient_id, doctor_id FROM doctor_patient_relationships 
         WHERE patient_id = ANY($1::int[]) AND status = 'Active'`,
        [patientIds]
      );
      
      // Filter out patients who are already assigned to other doctors
      // Allow reassignment to same doctor (update status if inactive)
      const alreadyAssignedPatients = existingAssignments.rows
        .filter(row => row.doctor_id != doctorid) // Only concerned about different doctors
        .map(row => row.patient_id);
      
      // If any patients are assigned to other doctors, rollback and return conflict
      if (alreadyAssignedPatients.length > 0) {
        await client.query('ROLLBACK');
        return res.status(409).json({
          message: 'Some patients are already assigned to other doctors',
          alreadyAssignedPatients
        });
      }
      
      // Bulk insert using PostgreSQL's unnest function for better performance
      // ON CONFLICT clause handles cases where relationship exists but is inactive
      const result = await client.query(
        `INSERT INTO doctor_patient_relationships(doctor_id, patient_id, status)
         SELECT $1, p, 'Active' FROM unnest($2::int[]) AS p
         ON CONFLICT (doctor_id, patient_id) DO UPDATE SET status = 'Active'
         RETURNING *`,
        [doctorid, patientIds]
      );
      
      // Commit transaction if all operations successful
      await client.query('COMMIT');
      
      // Return success response with created/updated relationships
      res.status(201).json({
        message: `${result.rows.length} patients assigned successfully`,
        relationships: result.rows
      });
    } catch (err) {
      // Rollback transaction on any error
      await client.query('ROLLBACK');
      throw err; // Re-throw to be caught by outer catch block
    } finally {
      // Always release the client back to the pool
      client.release();
    }
  } catch (err) {
    console.error('Error bulk assigning patients:', err);
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

/**
 * POST /doctors/:doctorid/patients/:patientid
 * Assign a single patient to a doctor
 * 
 * Business Rules:
 * - Only admins can perform assignments
 * - Patient can only be actively assigned to one doctor
 * - Returns conflict error if patient already assigned to another doctor
 * 
 * Error codes:
 * - 403: Non-admin attempted operation
 * - 400: Patient already assigned to another doctor
 * - 409: Unique constraint violation (patient already assigned to this doctor)
 * - 500: Other database errors
 */
router.post('/:doctorid/patients/:patientid', authenticateToken, async (req, res) => {
  try {
    // Check for admin privileges - role-based access control
    if (req.user.Role.toLowerCase() !== 'admin') {
      return res.status(403).json({ message: 'Only admins can assign patients to doctors' });
    }
    
    // Extract parameters from route
    const { doctorid, patientid } = req.params;

    // Check if patient already has an active assignment to any doctor
    const existingAssignment = await pool.query(
      'SELECT * FROM doctor_patient_relationships WHERE patient_id = $1 AND status = $2',
      [patientid, 'Active']
    );

    // Business rule: one patient cannot be assigned to multiple doctors simultaneously
    if (existingAssignment.rows.length > 0) {
      return res.status(400).json({
        message: 'This patient is already assigned to a doctor',
        currentDoctorId: existingAssignment.rows[0].doctor_id // Changed from doctorId to doctor_id to match DB schema
      })
    }
    
    // Insert new relationship record
    const result = await pool.query(
      'INSERT INTO doctor_patient_relationships(doctor_id, patient_id) VALUES($1, $2) RETURNING *',
      [doctorid, patientid]
    );
    
    // Return created relationship
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error assigning patient to doctor:', err);
    
    // PostgreSQL error code 23505 indicates unique constraint violation
    if (err.code === '23505') {
      return res.status(409).json({ message: 'Patient is already assigned to this doctor' });
    }
    
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

/**
 * GET /doctors/:doctorid/patients
 * Retrieve all active patients assigned to a specific doctor
 * 
 * Returns patient details with active status only
 * Sorted by last name then first name for consistent ordering
 * 
 * Authorization: Any authenticated user can access
 * 
 * Response: Array of patient objects
 */
router.get('/:doctorid/patients', authenticateToken, async (req, res) => {
  try {
    const { doctorid } = req.params;
    
    // Join patients with relationships table to get only active assignments
    // Ordered for consistent display in UI
    const result = await pool.query(
      `SELECT p.* FROM patients p
       JOIN doctor_patient_relationships r ON p.patientid = r.patient_id
       WHERE r.doctor_id = $1 AND r.status = 'Active'
       ORDER BY p.lastname, p.firstname`,
      [doctorid]
    );
    
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching doctor\'s patients:', err);
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

router.delete('/:doctorid/unassign-all-patients', authenticateToken, async (req, res) => {
  try {
    // Admin-only operation
    if (req.user.Role.toLowerCase() !== 'admin') {
      return res.status(403).json({ message: 'Only admins can remove patient assignments' });
    }
    
    const { doctorid } = req.params;
    console.log(`Attempting to remove all patient relationships for doctor ${doctorid}`);
    
    // Delete all relationships for this doctor
    const result = await pool.query(
      'DELETE FROM doctor_patient_relationships WHERE doctor_id = $1 RETURNING *',
      [doctorid]
    );
    
    console.log(`Successfully removed ${result.rowCount} patient relationships`);
    res.json({ 
      message: `${result.rowCount} patient assignments removed successfully`,
      relationships: result.rows
    });
  } catch (err) {
    console.error('Error removing patient assignments:', err);
    res.status(500).json({ 
      error: 'Internal server error', 
      details: err.message,
      stack: err.stack // Include stack trace for debugging
    });
  }
});

/**
 * DELETE /doctors/:doctorid/patients/:patientid
 * Remove a patient assignment from a doctor
 * 
 * Business Rules:
 * - Only admins can remove assignments
 * - Physical deletion of relationship record
 * - Returns 404 if relationship doesn't exist
 * 
 * Authorization: Admin only
 */
router.delete('/:doctorid/patients/:patientid', authenticateToken, async (req, res) => {
  try {
    // Admin-only operation
    if (req.user.Role.toLowerCase() !== 'admin') {
      return res.status(403).json({ message: 'Only admins can remove patient assignments' });
    }
    
    const { doctorid, patientid } = req.params;
    
    // Delete relationship and return deleted record
    const result = await pool.query(
      'DELETE FROM doctor_patient_relationships WHERE doctor_id = $1 AND patient_id = $2 RETURNING *',
      [doctorid, patientid]
    );
    
    // Check if relationship existed
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Relationship not found' });
    }
    
    res.json({ message: 'Patient unassigned successfully' });
  } catch (err) {
    console.error('Error removing patient assignment:', err);
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

/**
 * GET /doctors/my-patients
 * Retrieve patients assigned to the currently logged-in doctor
 * 
 * Business Rules:
 * - Only doctors can access this endpoint
 * - Requires lookup of doctor ID from user ID
 * - Returns only active patient assignments
 * 
 * Response: Array of patient objects
 * 
 * Error handling:
 * - 403: Non-doctor user attempted access
 * - 404: Doctor profile not found for user
 */
router.get('/my-patients', authenticateToken, async (req, res) => {
  try {
    // Ensure only doctors can access their own patients
    if (req.user.Role.toLowerCase() !== 'doctor') {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    // First get the doctor's ID from their user ID
    // Assumes one-to-one relationship between users and doctors
    const doctorResult = await pool.query(
      'SELECT doctorid FROM doctors WHERE userid = $1',
      [req.user.UserID]
    );
    
    // Handle case where user doesn't have a corresponding doctor record
    if (doctorResult.rows.length === 0) {
      return res.status(404).json({ message: 'Doctor profile not found' });
    }
    
    const doctorId = doctorResult.rows[0].doctorid;
    
    // Get active patients assigned to this doctor
    const result = await pool.query(
      `SELECT p.* FROM patients p
       JOIN doctor_patient_relationships r ON p.patientid = r.patient_id
       WHERE r.doctor_id = $1 AND r.status = 'Active'
       ORDER BY p.lastname, p.firstname`,
      [doctorId]
    );
    
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching doctor\'s patients:', err);
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

/**
 * GET /doctors
 * Retrieve all doctors with comprehensive statistics
 * 
 * Statistics included:
 * - Patient count (active assignments only)
 * - Upcoming appointments (from current date forward)
 * - Doctor profile information
 * 
 * Authorization: Admin only
 * 
 * Uses: Complex GROUP BY with aggregate functions
 */
router.get('/', authenticateToken, async (req, res) => {
  console.log('User role:', req.user?.Role);
  
  // Check user authorization - defensive coding for missing role
  const userRole = req?.user?.Role || '';
  if (userRole.toLowerCase() !== 'admin') {
    console.log('Access denied. User role:', userRole);
    return res.status(403).json({ message: 'Access denied. Insufficient privileges.' });
  }

  try {
    // Complex query with subquery for patient count and conditional count for appointments
    // JOIN with UserAccounts to get username
    const result = await pool.query(`
      SELECT 
        d.doctorid,
        d.userid,
        ua.username,
        d.firstname,
        d.lastname,
        d.specialization,
        (SELECT COUNT(*) FROM doctor_patient_relationships WHERE doctor_id = d.doctorid AND status = 'Active') as patient_count,
        COUNT(CASE WHEN a.AppointmentDate >= CURRENT_DATE THEN 1 END) as upcoming_appointments
      FROM Doctors d
      JOIN UserAccounts ua ON d.userid = ua.userid
      LEFT JOIN Appointments a ON d.doctorid = a.doctorid
      GROUP BY d.doctorid, d.userid, ua.username, d.firstname, d.lastname, d.specialization
      ORDER BY d.doctorid;
    `);
    
    console.log('Query result:', result.rows);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching doctors:', error);
    res.status(500).json({ message: 'Error fetching doctors', error: error.message });
  }
});

/**
 * GET /doctors/:id
 * Retrieve detailed information about a specific doctor
 * 
 * Returns:
 * - Doctor statistics (unique patients, completed/upcoming appointments)
 * - Detailed patient list with visit history and latest diagnosis
 * 
 * Authorization: Admin only
 * 
 * Uses multiple complex queries for comprehensive data
 */
router.get('/:id', authenticateToken, async (req, res) => {
  // Check authorization - admin only endpoint
  if (req.user.Role.toLowerCase() !== 'admin') {
    return res.status(403).json({ message: 'Access denied. Insufficient privileges.' });
  }

  try {
    const doctorId = req.params.id;
    
    // Get doctor's user ID first - validates doctor exists
    const doctorQuery = await pool.query(
      'SELECT UserID FROM Doctors WHERE DoctorID = $1',
      [doctorId]
    );
    
    if (doctorQuery.rows.length === 0) {
      return res.status(404).json({ message: 'Doctor not found' });
    }
    
    const userId = doctorQuery.rows[0].userid;

    // Query to get doctor's statistics
    // Includes subquery for active patient count and conditional counting for appointments
    const statsQuery = `
    SELECT 
      (SELECT COUNT(*) FROM doctor_patient_relationships WHERE doctor_id = $1 AND status = 'Active') as unique_patients,
      COUNT(CASE WHEN a.Status = 'Completed' THEN 1 END) as completed_appointments,
      COUNT(CASE WHEN a.AppointmentDate >= CURRENT_DATE THEN 1 END) as upcoming_appointments
    FROM Doctors d
    LEFT JOIN Appointments a ON d.DoctorID = a.DoctorID
    WHERE d.DoctorID = $1
    GROUP BY d.DoctorID;
  `;

    // Complex query to get patients with their medical history
    // Includes: last visit date, visit count, latest diagnosis
    // Uses correlated subquery for latest diagnosis
    const patientsQuery = `
      SELECT 
        p.PatientID as patientid,
        p.FirstName as firstname,
        p.LastName as lastname,
        MAX(mr.VisitDate) as last_visit,
        COUNT(mr.RecordID) as visit_count,
        (
          SELECT Diagnosis 
          FROM MedicalRecords 
          WHERE PatientID = p.PatientID 
          ORDER BY VisitDate DESC 
          LIMIT 1
        ) as latest_diagnosis
      FROM Patients p
      JOIN doctor_patient_relationships dpr ON p.PatientID = dpr.patient_id
      LEFT JOIN MedicalRecords mr ON p.PatientID = mr.PatientID
      WHERE dpr.doctor_id = $1 AND dpr.status = 'Active'
      GROUP BY p.PatientID, p.FirstName, p.LastName
      ORDER BY p.LastName, p.FirstName;
    `;

    // Execute both queries in parallel for efficiency
    const stats = await pool.query(statsQuery, [doctorId]);
    const patients = await pool.query(patientsQuery, [doctorId]);

    // Combine results and send response
    // Provide default empty object/array if queries return no results
    res.json({
      statistics: stats.rows[0] || {
        unique_patients: 0,
        completed_appointments: 0,
        upcoming_appointments: 0
      },
      patients: patients.rows || []
    });
  } catch (error) {
    console.error('Error fetching doctor details:', error);
    res.status(500).json({ message: 'Error fetching doctor details', error: error.message });
  }
});

/**
 * DELETE /doctors/:id
 * Delete a doctor record from the system
 * 
 * Business Rules:
 * - Will fail if doctor has related records (appointments, patient assignments, etc.)
 * - Returns deleted doctor information
 * 
 * Error handling:
 * - 404: Doctor not found
 * - 400: Cannot delete due to related records (foreign key constraint)
 */
router.delete('/:doctorid', authenticateToken, async (req, res) => {
  const { doctorid } = req.params;
  try {
    // Attempt to delete the doctor - will fail if foreign key constraints exist
    const result = await pool.query('DELETE FROM Doctors WHERE doctorid = $1 RETURNING *', [doctorid]);

    // Check if doctor existed and was deleted
    if (result.rows.length > 0) {
      res.json({ message: 'Doctor deleted successfully'});
    } else {
      res.status(404).json({ error: 'Doctor not found' });
    }

  } catch(err) {
    console.error(err);
    // PostgreSQL error code 23503 indicates foreign key constraint violation
    if (err.code === '23503') {
      res.status(400).json({ error: 'Cannot delete doctor. There are related records.'})
    } else {
      res.status(500).json({ error: 'Internal server error', details: err.message });
    }
  }
})

/**
 * POST /doctors
 * Create a new doctor record
 * 
 * Required fields: firstname, lastname, userid
 * Optional fields: specialization, phonenumber, email
 * 
 * Validation:
 * - Uses express-validator for input validation
 * - Email must be valid format
 * - Phone number must be provided
 * 
 * Authorization: Admin only
 * 
 * Error handling:
 * - 403: Non-admin user attempted operation
 * - 400: Validation errors or missing required fields
 * - 400: Invalid UserID specified (foreign key constraint)
 * - 500: Database or server errors
 */
router.post('/', [
  // Validation chain using express-validator
  body('firstname').trim().notEmpty().withMessage("First name is required"),
  body('lastname').notEmpty().withMessage("Last name is required"),
  body('specialization').notEmpty().withMessage("Specialization is required"),
  body('phonenumber').notEmpty().withMessage("Phone number is required"),
  body('email').isEmail().normalizeEmail().withMessage("Valid email address is required")
], authenticateToken, async (req, res) =>{
  // Check for admin privileges - only admins can create doctor records
  if (req.user.Role.toLowerCase() !== 'admin') {
    return res.status(403).json({ message: "Access denied."})
  }

  // Check validation results from express-validator
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array()})
  }

  // Log request body for debugging purposes
  console.log("Request body:", req.body);

  // Extract validated fields from request body
  const {
    firstname,
    lastname,
    specialization,
    phonenumber,
    email,
    userid
  } = req.body

  // Additional server-side validation for required fields
  if (!firstname || !lastname || !userid) {
    return res.status(400).json({ message: "Missing required fields", 
      required: ['firstname', 'lastname', 'userid'],
      provided: Object.keys(req.body)
    });
  }
  
  // Defensive check to ensure doctors table exists in database
  const tableCheck = await pool.query(`
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_name = 'doctors'
    );
  `);
  
  if (!tableCheck.rows[0].exists) {
    return res.status(500).json({ message: "Doctors table does not exist" });
  }

  try {
    // Insert new doctor record with all provided fields
    const result = await pool.query(
      'INSERT INTO Doctors (userid, firstname, lastname, specialization, phonenumber, email) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [userid, firstname, lastname, specialization, phonenumber, email]
    );
    
    // Send success response with the created doctor data
    return res.status(201).json(result.rows[0]);
    
  } catch (err) {
    console.log("Error creating doctor record", err);
    
    // Check for specific error type - foreign key constraint violation
    if (err.code === '23503') {
      return res.status(400).json({message: 'Invalid UserID specified'});
    }
    
    // General error handling for other database errors
    return res.status(500).json({message: "Failed to create doctor record", error: err.message});
  }
});


router.delete('/:doctorid/patients/all', authenticateToken, async (req, res) => {
  try {
    // Admin-only operation
    if (req.user.Role.toLowerCase() !== 'admin') {
      return res.status(403).json({ message: 'Only admins can remove patient assignments' });
    }
    
    const { doctorid } = req.params;
    console.log(`Attempting to remove all patient relationships for doctor ${doctorid}`);
    
    // Delete all relationships for this doctor
    const result = await pool.query(
      'DELETE FROM doctor_patient_relationships WHERE doctor_id = $1 RETURNING *',
      [doctorid]
    );
    
    console.log(`Successfully removed ${result.rowCount} patient relationships`);
    res.json({ 
      message: `${result.rowCount} patient assignments removed successfully`,
      relationships: result.rows
    });
  } catch (err) {
    console.error('Error removing patient assignments:', err);
    res.status(500).json({ 
      error: 'Internal server error', 
      details: err.message,
      stack: err.stack // Include stack trace for debugging
    });
  }
});

router.put('/appointments/doctor/:doctorid/reassign', authenticateToken, async (req, res) => {
  try {
    if (req.user.Role.toLowerCase() !== 'admin') {
      return res.status(403).json({ message: 'Only admins can reassign appointments' });
    }
    
    const { doctorid } = req.params;
    
    // Update all appointments to set doctorid to NULL
    const result = await pool.query(
      'UPDATE appointments SET doctorid = NULL WHERE doctorid = $1 RETURNING *',
      [doctorid]
    );
    
    res.json({ 
      message: `${result.rowCount} appointments updated successfully`,
      appointments: result.rows
    });
  } catch (err) {
    console.error('Error reassigning appointments:', err);
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

/**
 * GET /doctors/:doctorid/unassigned-patients
 * Retrieve all patients not assigned to ANY doctor
 * 
 * Business Rules:
 * - Returns truly unassigned patients (not assigned to any doctor)
 * - Sorted by last name, then first name
 * 
 * Note: Different from getting patients not assigned to a specific doctor
 */
router.get('/:doctorid/unassigned-patients', authenticateToken, async (req, res) => {
  try {
    const { doctorid } = req.params;
    
    // Subquery to find patients without active assignments to any doctor
    // NOT IN clause checks against all active relationships
    const result = await pool.query(`
      SELECT p.* FROM patients p
      WHERE p.patientid NOT IN (
        SELECT r.patient_id FROM doctor_patient_relationships r
        WHERE r.status = 'Active'
      )
      ORDER BY p.lastname, p.firstname`,
      []
    );
    
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching unassigned patients:', err);
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

// Export router for use in main application
// This router should be mounted in the main app.js as app.use('/doctors', doctorRouter)
module.exports = router;