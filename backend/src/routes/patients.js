/**
 * Patient Management Router
 * 
 * This Express router handles all patient-related operations including:
 * - Creating, reading, updating, and deleting (CRUD) patient records
 * - Retrieving assigned doctor information for patients
 * - Role-based access control for patient data
 * 
 * Authentication:
 * - All endpoints require JWT authentication
 * - Different roles have different access levels:
 *   - Admin: Full access to all patient operations
 *   - Doctor: Can view patient lists and access patient information
 *   - Patient: Typically no direct access through these routes (uses /my-records in medical records)
 * 
 * Security Features:
 * - Input validation using express-validator
 * - XSS protection for all user inputs
 * - Role-based access control
 * - Protection against SQL injection through parameterized queries
 * 
 * Database Schema Assumptions:
 * Tables: Patients, Doctors, doctor_patient_relationships, Appointments, MedicalRecords
 * Relationships: Patients can be assigned to doctors through doctor_patient_relationships
 * Cascade deletion: Handles related records when deleting patients
 */

// Required dependencies with detailed explanations:

// Express - Web application framework providing routing functionality
const express = require('express');

// Create router instance that will handle all /patients routes
const router = express.Router();

// Express-validator - Middleware for input validation and sanitization
// Prevents invalid data and SQL injection attacks
const { body, validationResult } = require('express-validator');

// Database connection pool from our configuration module
// Uses pg library under the hood for PostgreSQL connection pooling
// Provides efficient connection management with reusable connections
const { pool } = require('../config/database');

// JWT authentication middleware to verify user tokens
// Assumes middleware adds decoded token to req.user with UserID and Role
const authenticateToken = require('../middleware/auth');

// xss package - Sanitizes user input to prevent cross-site scripting attacks
// Filters out malicious HTML/JavaScript that could be injected
const xss = require('xss');

/**
 * GET /patients
 * Retrieve all patients from the database
 * 
 * Business Rules:
 * - Only administrators and doctors can view the patient list
 * - Returns all patient records without pagination (consider adding for scalability)
 * 
 * Authorization: Admin or Doctor roles only
 * 
 * Response: Array of patient objects with all fields
 * 
 * Error handling:
 * - 403: Unauthorized access attempt
 * - 500: Database errors
 */
router.get('/', authenticateToken, async (req, res) => {
  console.log('User role:', req.user.Role);
  
  // Check authorization - only admins and doctors can access patient list
  // Uses case-insensitive comparison for role check
  if (req.user.Role.toLowerCase() !== 'admin' && req.user.Role.toLowerCase() !== 'doctor') {
    console.log('Access denied. User role:', req.user.Role);
    return res.status(403).json({ message: 'Access denied. Insufficient privileges.' });
  }

  try {
    // Fetch all patients from database
    // TODO: Consider adding pagination for better performance with large datasets
    const result = await pool.query('SELECT * FROM Patients');
    console.log('Fetched patients:', result.rows.length);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching patients:', error);
    res.status(500).json({ message: 'Error fetching patients' });
  }
});

// Note: ODBC (Open Database Connectivity) reference suggests standardized DB access
// Ruby on Rails uses ActiveRecord ORM to prevent SQL injection
// The current implementation uses parameterized queries for safety
//

/**
 * POST /patients
 * Create a new patient record
 * 
 * Business Rules:
 * - All inputs are sanitized for XSS protection
 * - Empty validation middleware array suggests validators might be missing
 * - No role restrictions (consider adding for production)
 * 
 * Request body:
 * - FirstName: string
 * - LastName: string  
 * - DOB: date
 * - Gender: string
 * - Address: string
 * - PhoneNumber: string
 * - Email: string
 * 
 * Security:
 * - XSS sanitization on all text fields
 * - Uses parameterized queries to prevent SQL injection
 * 
 * Error handling:
 * - 400: Validation errors
 * - 500: Database errors with detailed error information
 */
router.post('/', [
  // IMPORTANT: Validation middleware is missing here
  // In production, should include validators like in PUT route
], authenticateToken, async (req, res) => {
  // Check for validation errors (though currently none are defined)
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  // Extract inputs from request body
  const { FirstName, LastName, DOB, Gender, Address, PhoneNumber, Email } = req.body;
  
  // Sanitize all text inputs using XSS protection
  // Handles undefined values by defaulting to empty string
  const sanitizedFirstName = xss(FirstName || '');
  const sanitizedLastName = xss(LastName || '');
  const sanitizedGender = xss(Gender || '');
  const sanitizedAddress = xss(Address || '');
  const sanitizedPhoneNumber = xss(PhoneNumber || '');
  const sanitizedEmail = xss(Email || '');
  
  try {
    // Insert new patient record with sanitized data
    // RETURNING * returns the inserted record with auto-generated ID
    const result = await pool.query(
      'INSERT INTO Patients (FirstName, LastName, DOB, Gender, Address, PhoneNumber, Email) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [sanitizedFirstName, sanitizedLastName, DOB, sanitizedGender, sanitizedAddress, sanitizedPhoneNumber, sanitizedEmail]
    );
    // Return created record with 201 Created status
    res.status(201).json(result.rows[0]);
  } catch (err) {
    // Detailed error logging for debugging
    // Returns additional error information in development
    console.error('Error adding patient:', err);
    res.status(500).json({ 
      error: 'Internal server error', 
      details: err.message,
      code: err.code,       // PostgreSQL error code
      hint: err.hint        // PostgreSQL error hint
    });
  }
});

/**
 * PUT /patients/:id
 * Update an existing patient record
 * 
 * Business Rules:
 * - All fields are required for update (no partial updates)
 * - Gender validation only allows specific values
 * - Email and phone number validation enforced
 * 
 * URL Parameters:
 * - id: Patient ID to update
 * 
 * Request body: Same as POST route
 * 
 * Validation:
 * - FirstName, LastName: Required, non-empty
 * - DOB: Must be valid date
 * - Gender: Must be 'Male', 'Female', or 'Other'
 * - Email: Must be valid email format
 * - PhoneNumber: Must be valid mobile phone format
 * 
 * Error handling:
 * - 400: Validation errors
 * - 404: Patient not found
 * - 500: Database errors
 */
router.put('/:id', [
  // Comprehensive validation middleware chain
  body('FirstName').notEmpty().withMessage('First name is required'),
  body('LastName').notEmpty().withMessage('Last name is required'),
  body('DOB').isDate().withMessage('Date of birth must be a valid date'),
  body('Gender').isIn(['Male', 'Female', 'Other']).withMessage('Gender must be Male, Female, or Other'),
  body('Email').isEmail().withMessage('Invalid email address'),
  body('PhoneNumber').isMobilePhone().withMessage('Invalid phone number')
], authenticateToken, async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  // Extract patient ID from URL parameters
  const { id } = req.params;
  
  // Sanitize all input fields
  const FirstName = xss(req.body.FirstName);
  const LastName = xss(req.body.LastName);
  const DOB = req.body.DOB; // Date format, no XSS needed
  const Gender = xss(req.body.Gender);
  const Address = xss(req.body.Address);
  const PhoneNumber = xss(req.body.PhoneNumber);
  const Email = xss(req.body.Email);

  try {
    // Update patient record with sanitized data
    const result = await pool.query(
      'UPDATE Patients SET FirstName = $1, LastName = $2, DOB = $3, Gender = $4, Address = $5, PhoneNumber = $6, Email = $7 WHERE PatientID = $8 RETURNING *',
      [FirstName, LastName, DOB, Gender, Address, PhoneNumber, Email, id]
    );
    
    // Check if patient was found and updated
    if (result.rows.length > 0) {
      res.json(result.rows[0]);
    } else {
      res.status(404).json({ error: 'Patient not found' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

/**
 * DELETE /patients/:id
 * Delete a patient record and all associated data
 * 
 * Business Rules:
 * - Cascading delete removes all related records first:
 *   1. Appointments
 *   2. Doctor-patient relationships
 *   3. Medical records
 *   4. Finally, the patient record itself
 * - Ensures data integrity by handling foreign key constraints
 * 
 * Authorization: Any authenticated user (should be restricted to admins)
 * 
 * URL Parameters:
 * - id: Patient ID to delete
 * 
 * Response: Success message on deletion
 * 
 * Error handling:
 * - 400: Cannot delete due to unhandled foreign key constraints
 * - 404: Patient not found
 * - 500: Database errors
 */
router.delete('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    // Order of deletion is important to maintain referential integrity
    
    // 1. Delete associated appointments first
    await pool.query('DELETE FROM Appointments WHERE PatientID = $1', [id]);
    
    // 2. Delete doctor-patient relationships
    await pool.query('DELETE FROM doctor_patient_relationships WHERE doctor_patient_relationships.patient_id = $1', [id]);
    
    // 3. Delete medical records for this patient
    await pool.query('DELETE FROM medicalrecords WHERE medicalrecords.patientid = $1', [id]);
    
    // 4. Finally, delete the patient record
    const result = await pool.query('DELETE FROM Patients WHERE PatientID = $1 RETURNING *', [id]);
    
    // Check if patient existed and was deleted
    if (result.rows.length > 0) {
      res.json({ message: 'Patient deleted successfully' });
    } else {
      res.status(404).json({ error: 'Patient not found' });
    }
  } catch (err) {
    console.error(err);
    // PostgreSQL error code 23503 indicates foreign key constraint violation
    if (err.code === '23503') {
      // This shouldn't happen given our cascade deletes, but handle it just in case
      res.status(400).json({ error: 'Cannot delete patient. There are related records.' });
    } else {
      res.status(500).json({ error: 'Internal server error', details: err.message });
    }
  }
});

/**
 * GET /patients/:id/doctor
 * Retrieve the doctor assigned to a specific patient
 * 
 * Business Rules:
 * - Returns null if no doctor is assigned to the patient
 * - Returns only active assignments (implicit in the relationship table)
 * 
 * URL Parameters:
 * - id: Patient ID whose doctor to retrieve
 * 
 * Response: 
 * - Doctor object with doctorid, firstname, lastname, specialization
 * - null if no doctor assigned
 * 
 * Error handling:
 * - 500: Database errors
 */
router.get('/:id/doctor', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    // Join query to get doctor information through relationship table
    // Selects specific doctor fields rather than all columns
    const result = await pool.query(`
      SELECT d.doctorid, d.firstname, d.lastname, d.specialization 
      FROM doctors d
      JOIN doctor_patient_relationships dpr ON d.doctorid = dpr.doctor_id
      WHERE dpr.patient_id = $1
    `, [id]);
    
    // Return doctor information if found, or null if no assignment exists
    if (result.rows.length > 0) {
      res.json(result.rows[0]);
    } else {
      res.json(null); // No doctor assigned
    }
  } catch (err) {
    console.error('Error fetching patient\'s doctor:', err);
    res.status(500).json({ message: 'Error fetching patient\'s doctor' });
  }
});

// Export router for use in main application
// This router should be mounted in the main app.js as app.use('/patients', patientsRouter)
module.exports = router;