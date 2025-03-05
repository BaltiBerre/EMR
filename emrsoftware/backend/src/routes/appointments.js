// Required dependencies
const express = require('express');
const router = express.Router();
// Import validation middleware from express-validator
const { body, validationResult } = require('express-validator');
// Import database connection pool
const { pool } = require('../config/database');
// Import JWT authentication middleware
const authenticateToken = require('../middleware/auth');

// GET /appointments
// Retrieve all appointments
// Requires authentication token
router.get('/', authenticateToken, async (req, res) => {
  try {
    // Query database for all appointments
    const result = await pool.query('SELECT * FROM Appointments');
    // Return appointments as JSON response
    res.json(result.rows);
  } catch (err) {
    // Log any errors for debugging
    console.error(err);
    // Return 500 status code for server errors
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /appointments
// Create a new appointment
// Requires authentication token and validates request body
router.post('/', [
  // Validation middleware chain
  // Ensure PatientID is a valid integer
  body('PatientID').isInt().withMessage('Patient ID must be an integer'),
  // Ensure DoctorID is a valid integer
  body('DoctorID').isInt().withMessage('Doctor ID must be an integer'),
  // Validate appointment date format
  body('AppointmentDate').isDate().withMessage('Appointment date must be a valid date'),
  // Validate time format using regex (HH:MM, 24-hour format)
  body('AppointmentTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Appointment time must be in HH:MM format'),
  // Ensure reason for visit is not empty
  body('ReasonForVisit').notEmpty().withMessage('Reason for visit is required'),
  // Validate appointment status against allowed values
  body('Status').isIn(['Confirmed', 'Canceled', 'Completed', 'Pending'])
    .withMessage('Invalid status')
], authenticateToken, async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // Return 400 status with validation errors if present
    return res.status(400).json({ errors: errors.array() });
  }

  // Destructure validated request body
  const { 
    PatientID, 
    DoctorID, 
    AppointmentDate, 
    AppointmentTime, 
    ReasonForVisit, 
    Status 
  } = req.body;

  try {
    // Insert new appointment into database
    // Use parameterized query to prevent SQL injection
    const result = await pool.query(
      'INSERT INTO Appointments (PatientID, DoctorID, AppointmentDate, AppointmentTime, ReasonForVisit, Status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [PatientID, DoctorID, AppointmentDate, AppointmentTime, ReasonForVisit, Status]
    );
    // Return newly created appointment with 201 Created status
    res.status(201).json(result.rows[0]);
  } catch (err) {
    // Log error for debugging
    console.error(err);
    if (err.code === '23503') { // PostgreSQL foreign key violation error code
      // Return 400 status if PatientID or DoctorID don't exist
      res.status(400).json({ error: 'Invalid PatientID or DoctorID' });
    } else {
      // Return 500 status for other server errors
      res.status(500).json({ error: 'Internal server error', details: err.message });
    }
  }
});

// Export router for use in main application
module.exports = router;