/**
 * Medical Records Management Router
 * 
 * This Express router handles all medical record-related operations including:
 * - Creating, reading, updating, and deleting (CRUD) medical records
 * - Role-based access control for medical records
 * - Patient-specific record retrieval with pagination
 * - User-specific record access for patients
 * 
 * Authentication:
 * - All endpoints require JWT authentication
 * - Different roles have different access levels:
 *   - Admin: Full access to all records
 *   - Doctor: Can create records, access assigned patients' records
 *   - Patient: Read-only access to their own records
 * 
 * Security Features:
 * - Input validation using express-validator
 * - XSS protection for all user inputs
 * - Role-based access control
 * - Patient-doctor relationship verification
 * 
 * Database Schema Assumptions:
 * Tables: MedicalRecords, Patients, Doctors, doctor_patient_relationships
 * Relationships: Doctors can only access records of patients assigned to them
 */

// Required dependencies with detailed explanations:

// Express - Web application framework providing routing functionality
const express = require('express');

// Create router instance that will handle all /medical-records routes
const router = express.Router();

// Express-validator - Middleware for input validation and sanitization
// Provides chainable validators to ensure data integrity and prevent SQL injection
const { body, validationResult } = require('express-validator');

// Database connection pool from our configuration module
// Uses pg library under the hood for PostgreSQL connection pooling
const { pool } = require('../config/database');

// JWT authentication middleware to verify user tokens
// Assumes middleware adds decoded token to req.user
const authenticateToken = require('../middleware/auth');

// xss package - Sanitizes user input to prevent cross-site scripting attacks
// Filters out malicious HTML/JavaScript that could be injected
const xss = require('xss');

/**
 * GET /medical-records
 * Retrieve all medical records from the database
 * 
 * Authorization: Any authenticated user can access
 * Note: In production, this endpoint should implement role-based filtering
 * or pagination to prevent excessive data exposure
 * 
 * Response: Array of all medical record objects
 * 
 * Error handling:
 * - 500: Database errors
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    // Simple SELECT query to get all records
    // TODO: Consider adding role-based filtering or pagination
    const result = await pool.query('SELECT * FROM MedicalRecords');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /medical-records
 * Create a new medical record
 * 
 * Business Rules:
 * - Only doctors can create medical records
 * - Automatically associates the record with the doctor who created it
 * - All inputs are sanitized for XSS protection
 * 
 * Request body:
 * - PatientID: integer (required)
 * - VisitDate: date (required)
 * - Diagnosis: string (required)
 * - Treatment: string (required)
 * - Notes: string (optional)
 * 
 * Validation:
 * - PatientID must be an integer
 * - VisitDate must be a valid date
 * - Diagnosis and Treatment are required non-empty strings
 * 
 * Error handling:
 * - 400: Validation errors or foreign key violations
 * - 403: Non-doctor attempting to create record
 * - 500: Other database errors
 */
router.post('/', [
  // Validation middleware chain
  body('PatientID').isInt().withMessage('Patient ID must be an integer'),
  body('VisitDate').isDate().withMessage('Visit date must be a valid date'),
  body('Diagnosis').notEmpty().withMessage('Diagnosis is required'),
  body('Treatment').notEmpty().withMessage('Treatment is required'),
], authenticateToken, async (req, res) => {
  // Check for validation errors from express-validator
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // Return 400 with validation errors array
    return res.status(400).json({ errors: errors.array() });
  }
  
  // Role-based access control - only doctors can create medical records
  if (req.user.Role.toLowerCase() !== 'doctor') {
    return res.status(403).json({ error: 'Only doctors can create medical records' });
  }
  
  // Sanitize all inputs using XSS to prevent cross-site scripting attacks
  const PatientID = xss(req.body.PatientID);
  const VisitDate = xss(req.body.VisitDate);
  const Diagnosis = xss(req.body.Diagnosis);
  const Treatment = xss(req.body.Treatment);
  const Notes = req.body.Notes ? xss(req.body.Notes) : null; // Notes are optional
  
  // Get DoctorID from the authenticated user
  // This ensures the record is associated with the creating doctor
  const DoctorID = req.user.UserID;
  
  try {
    // Insert new medical record with sanitized inputs
    const result = await pool.query(
      'INSERT INTO MedicalRecords (PatientID, DoctorID, VisitDate, Diagnosis, Treatment, Notes) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [PatientID, DoctorID, VisitDate, Diagnosis, Treatment, Notes]
    );
    // Return created record with 201 Created status
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating medical record:', err);
    // PostgreSQL error code 23503 indicates foreign key constraint violation
    if (err.code === '23503') {
      res.status(400).json({ error: 'Invalid PatientID or DoctorID' });
    } else {
      res.status(500).json({ error: 'Internal server error', details: err.message });
    }
  }
});

/**
 * PUT /medical-records/:id
 * Update an existing medical record
 * 
 * Business Rules:
 * - Requires all fields to be provided for update
 * - All inputs are sanitized for XSS protection
 * 
 * URL Parameters:
 * - id: Record ID to update
 * 
 * Request body: Same as POST but includes DoctorID
 * 
 * Note: This endpoint allows updating the DoctorID, which might not be
 * desirable in production. Consider removing or restricting this capability.
 * 
 * Error handling:
 * - 400: Validation errors or foreign key violations
 * - 404: Record not found
 * - 500: Database errors
 */
router.put('/:id', [
  // Validation middleware - similar to POST but includes DoctorID
  body('PatientID').isInt().withMessage('Patient ID must be an integer'),
  body('DoctorID').isInt().withMessage('Doctor ID must be an integer'),
  body('VisitDate').isDate().withMessage('Visit date must be a valid date'),
  body('Diagnosis').notEmpty().withMessage('Diagnosis is required'),
  body('Treatment').notEmpty().withMessage('Treatment is required'),
], authenticateToken, async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  // Extract record ID from URL parameters
  const { id } = req.params;
  
  // Sanitize all input fields
  const PatientID = xss(req.body.PatientID);
  const DoctorID = xss(req.body.DoctorID); // Note: Fixed typo in original (DoctorId → DoctorID)
  const VisitDate = xss(req.body.VisitDate);
  const Diagnosis = xss(req.body.Diagnosis);
  const Treatment = xss(req.body.Treatment);
  const Notes = req.body.Notes ? xss(req.body.Notes) : null;
  
  try {
    // Update medical record with all fields
    const result = await pool.query(
      'UPDATE MedicalRecords SET PatientID = $1, DoctorID = $2, VisitDate = $3, Diagnosis = $4, Treatment = $5, Notes = $6 WHERE RecordID = $7 RETURNING *',
      [PatientID, DoctorID, VisitDate, Diagnosis, Treatment, Notes, id]
    );
    
    // Check if record was found and updated
    if (result.rows.length > 0) {
      res.json(result.rows[0]);
    } else {
      res.status(404).json({ error: 'Medical record not found' });
    }
  } catch (err) {
    console.error(err);
    // Check for foreign key constraint violations
    if (err.code === '23503') {
      res.status(400).json({ error: 'Invalid PatientID or DoctorID' });
    } else {
      res.status(500).json({ error: 'Internal server error', details: err.message });
    }
  }
});

/**
 * DELETE /medical-records/:id
 * Delete a medical record
 * 
 * Business Rules:
 * - Permanent deletion of the record
 * - Consider implementing soft delete (status field) in production
 * 
 * Authorization: Any authenticated user (should be restricted to admins/doctors)
 * 
 * URL Parameters:
 * - id: Record ID to delete
 * 
 * Response: Success message on deletion
 * 
 * Error handling:
 * - 404: Record not found
 * - 500: Database errors
 */
router.delete('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    // Delete medical record and return the deleted record
    const result = await pool.query('DELETE FROM MedicalRecords WHERE RecordID = $1 RETURNING *', [id]);
    
    // Check if record existed and was deleted
    if (result.rows.length > 0) {
      res.json({ message: 'Medical record deleted successfully' });
    } else {
      res.status(404).json({ error: 'Medical record not found' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /medical-records/patient/:patientId
 * Retrieve medical records for a specific patient with pagination
 * 
 * Business Rules:
 * - Admin: Access to all patient records
 * - Doctor: Access only to records of assigned patients
 * - Patient: Access only to their own records
 * 
 * URL Parameters:
 * - patientId: ID of the patient whose records to retrieve
 * 
 * Query Parameters:
 * - page: Page number (default: 1)
 * - limit: Records per page (default: 5)
 * 
 * Response: Object containing records array and pagination metadata
 * 
 * Error handling:
 * - 403: Insufficient permissions or attempting to access unauthorized records
 * - 404: Doctor/patient profile not found
 * - 500: Database errors
 */
router.get('/patient/:patientId', authenticateToken, async (req, res) => {
  const { patientId } = req.params;
  
  // Parse pagination parameters with defaults
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 5;
  const offset = (page - 1) * limit;
  
  try {
    // Get user role from JWT token for access control
    const userRole = req.user.Role.toLowerCase();
    
    let query, countQuery, params, countParams;
    
    // Admin role: unrestricted access to all records
    if (userRole === 'admin') {
      query = 'SELECT * FROM MedicalRecords WHERE PatientID = $1 ORDER BY VisitDate DESC LIMIT $2 OFFSET $3';
      countQuery = 'SELECT COUNT(*) FROM MedicalRecords WHERE PatientID = $1';
      params = [patientId, limit, offset];
      countParams = [patientId];
    }
    // Doctor role: check patient assignment before allowing access
    else if (userRole === 'doctor') {
      // Get doctor ID from user ID
      const doctorResult = await pool.query(
        'SELECT doctorid FROM doctors WHERE userid = $1',
        [req.user.UserID]
      );
      
      if (doctorResult.rows.length === 0) {
        return res.status(404).json({ error: 'Doctor profile not found' });
      }
      
      const doctorId = doctorResult.rows[0].doctorid;
      
      // Verify patient is assigned to this doctor
      const relationshipResult = await pool.query(
        'SELECT * FROM doctor_patient_relationships WHERE doctor_id = $1 AND patient_id = $2 AND status = $3',
        [doctorId, patientId, 'Active']
      );
      
      if (relationshipResult.rows.length === 0) {
        return res.status(403).json({ error: 'You do not have access to this patient\'s records' });
      }
      
      // Patient is assigned, allow access with pagination
      query = 'SELECT * FROM MedicalRecords WHERE PatientID = $1 ORDER BY VisitDate DESC LIMIT $2 OFFSET $3';
      countQuery = 'SELECT COUNT(*) FROM MedicalRecords WHERE PatientID = $1';
      params = [patientId, limit, offset];
      countParams = [patientId];
    }
    // Patient role: only allowed to access their own records
    else if (userRole === 'patient') {
      // Verify this is the patient's own record
      const patientResult = await pool.query(
        'SELECT PatientID FROM Patients WHERE UserID = $1',
        [req.user.UserID]
      );
      
      if (patientResult.rows.length === 0 || patientResult.rows[0].patientid != patientId) {
        return res.status(403).json({ error: 'You can only access your own medical records' });
      }
      
      query = 'SELECT * FROM MedicalRecords WHERE PatientID = $1 ORDER BY VisitDate DESC LIMIT $2 OFFSET $3';
      countQuery = 'SELECT COUNT(*) FROM MedicalRecords WHERE PatientID = $1';
      params = [patientId, limit, offset];
      countParams = [patientId];
    }
    // Other roles: no access
    else {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    // Execute both queries: records with pagination and total count
    const recordsResult = await pool.query(query, params);
    const countResult = await pool.query(countQuery, countParams);
    
    // Calculate pagination metadata
    const totalRecords = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalRecords / limit);
    
    // Return records with pagination information
    res.json({
      records: recordsResult.rows,
      pagination: {
        currentPage: page,
        totalPages,
        totalRecords,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });
  } catch (err) {
    console.error('Error fetching patient medical records:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /medical-records/my-records
 * Retrieve medical records for the currently logged-in patient
 * 
 * Business Rules:
 * - Automatically determines patient ID from user session
 * - Returns all records ordered by visit date (most recent first)
 * - No pagination (consider adding for large record sets)
 * 
 * Authorization: Any authenticated user (patient role recommended)
 * 
 * Response: Array of patient's medical records
 * 
 * Error handling:
 * - 404: Patient profile not found
 * - 500: Database errors
 */
router.get('/my-records', authenticateToken, async (req, res) => {
  try {
    // Get patient ID from user ID in the JWT token
    const patientResult = await pool.query(
      'SELECT PatientID FROM Patients WHERE UserID = $1',
      [req.user.UserID]
    );
    
    // Check if user has a patient profile
    if (patientResult.rows.length === 0) {
      return res.status(404).json({ error: 'Patient profile not found' });
    }
    
    const patientId = patientResult.rows[0].patientid;
    
    // Get all medical records for this patient, ordered by most recent first
    const recordsResult = await pool.query(
      'SELECT * FROM MedicalRecords WHERE PatientID = $1 ORDER BY VisitDate DESC',
      [patientId]
    );
    
    res.json(recordsResult.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Export router for use in main application
// This router should be mounted in the main app.js as app.use('/medical-records', medicalRecordsRouter)
module.exports = router;