// Required dependencies
const xss = require('xss');
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
    // Get user role and ID from JWT token
    const userRole = req.user.Role.toLowerCase();
    const userId = req.user.UserID;
    
    let query;
    let params = [];
    
    // Different queries based on user role
    if (userRole === 'admin') {
      // Admins can see all appointments with patient and doctor details
      query = `
        SELECT a.*, 
               p.firstname as patient_firstname, p.lastname as patient_lastname,
               d.firstname as doctor_firstname, d.lastname as doctor_lastname
        FROM Appointments a
        LEFT JOIN Patients p ON a.patientid = p.patientid
        LEFT JOIN Doctors d ON a.doctorid = d.doctorid
        ORDER BY a.appointmentdate, a.appointmenttime
      `;
    } else if (userRole === 'doctor') {
      // Doctors can only see their own appointments
      query = `
        SELECT a.*, 
               p.firstname as patient_firstname, p.lastname as patient_lastname
        FROM Appointments a
        LEFT JOIN Patients p ON a.patientid = p.patientid
        LEFT JOIN Doctors d ON a.doctorid = d.doctorid
        WHERE d.userid = $1
        ORDER BY a.appointmentdate, a.appointmenttime
      `;
      params.push(userId);
    } else if (userRole === 'patient') {
      // Patients can only see their own appointments
      query = `
        SELECT a.*, 
               d.firstname as doctor_firstname, d.lastname as doctor_lastname
        FROM Appointments a
        LEFT JOIN Doctors d ON a.doctorid = d.doctorid
        LEFT JOIN Patients p ON a.patientid = p.patientid
        WHERE p.userid = $1
        ORDER BY a.appointmentdate, a.appointmenttime
      `;
      params.push(userId);
    } else {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    // Query database for appointments based on user role
    const result = await pool.query(query, params);
    
    // Return appointments as JSON response
    res.json(result.rows);
  } catch (err) {
    // Log any errors for debugging
    console.error('Error fetching appointments:', err);
    // Return 500 status code for server errors
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

// GET /appointments/my-appointments
// Retrieve appointments for the currently logged-in patient
// Requires authentication token
router.get('/my-appointments', authenticateToken, async (req, res) => {
  try {
    console.log('Request for my-appointments received');
    console.log('User data from token:', req.user);
    
    // Check if the user is a patient
    if (req.user.Role.toLowerCase() !== 'patient') {
      console.log('User is not a patient, role:', req.user.Role);
      return res.status(403).json({ error: 'Only patients can access their appointments' });
    }
    
    // We need to get the patientId for this user
    const userResult = await pool.query(
      'SELECT p.PatientID FROM Patients p JOIN UserAccounts u ON p.UserID = u.UserID WHERE u.UserID = $1',
      [req.user.UserID]
    );
    
    if (userResult.rows.length === 0) {
      console.log('No patient profile found for user ID:', req.user.UserID);
      return res.status(404).json({ error: 'Patient profile not found' });
    }
    
    const patientId = userResult.rows[0].patientid;
    console.log('Found patientId:', patientId);
    
    // Get appointments for this patient
    const result = await pool.query(
      'SELECT a.*, d.firstname as doctor_firstname, d.lastname as doctor_lastname ' +
      'FROM Appointments a ' +
      'LEFT JOIN Doctors d ON a.doctorid = d.doctorid ' +
      'WHERE a.PatientID = $1 ' +
      'ORDER BY a.AppointmentDate DESC, a.AppointmentTime DESC',
      [patientId]
    );
    
    console.log(`Found ${result.rows.length} appointments for patient ${patientId}`);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching patient appointments:', err);
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});


// POST /appointments
// Create a new appointment
// Requires authentication token and validates request body
router.post('/', [
  // Validation middleware chain
  // Ensure PatientID is a valid integer
  body('PatientID').isInt().withMessage('Patient ID must be an integer'),
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

  // Sanitize inputs
  const PatientID = req.body.PatientID;
  
  // Get doctor ID based on user role
  let DoctorID;
  
  if (req.user.Role.toLowerCase() === 'doctor') {
    // First try to get the doctor ID from the cookie
    if (req.cookies && req.cookies.doctorId) {
      DoctorID = parseInt(req.cookies.doctorId, 10);
    } else {
      // Fall back to looking it up in the database
      try {
        const doctorResult = await pool.query(
          'SELECT doctorid FROM Doctors WHERE userid = $1',
          [req.user.UserID]
        );
        
        if (doctorResult.rows.length === 0) {
          return res.status(400).json({ error: 'Doctor record not found for current user' });
        }
        
        DoctorID = doctorResult.rows[0].doctorid;
      } catch (err) {
        console.error('Error getting doctor ID:', err);
        return res.status(500).json({ error: 'Error retrieving doctor information' });
      }
    }
  }
  
  
  const AppointmentDate = xss(req.body.AppointmentDate);
  const AppointmentTime = xss(req.body.AppointmentTime);
  const ReasonForVisit = xss(req.body.ReasonForVisit);
  const Status = xss(req.body.Status);

  try {
    // Check for conflicting appointments for the doctor
    const conflictCheck = await pool.query(
      'SELECT * FROM Appointments WHERE doctorid = $1 AND appointmentdate = $2 AND appointmenttime = $3 AND status != $4',
      [DoctorID, AppointmentDate, AppointmentTime, 'Canceled']
    );
    
    if (conflictCheck.rows.length > 0) {
      return res.status(409).json({ error: 'Doctor already has an appointment at this time' });
    }
    
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
    console.error('Error creating appointment:', err);
    if (err.code === '23503') { // PostgreSQL foreign key violation error code
      // Return 400 status if PatientID or DoctorID don't exist
      res.status(400).json({ error: 'Invalid PatientID or DoctorID' });
    } else {
      // Return 500 status for other server errors
      res.status(500).json({ error: 'Internal server error', details: err.message });
    }
  }
});

// DELETE /appointments/:id
// Delete/cancel an appointment
// Requires authentication token
router.delete('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  
  try {
    let result;
    const userRole = req.user.Role.toLowerCase();
    
    if (userRole === 'admin') {
      // Admins can delete any appointment
      result = await pool.query('DELETE FROM Appointments WHERE AppointmentID = $1 RETURNING *', [id]);
    } else if (userRole === 'doctor') {
      // Doctors can only delete their own appointments
      const doctorResult = await pool.query(
        'SELECT doctorid FROM Doctors WHERE userid = $1',
        [req.user.UserID]
      );
      
      if (doctorResult.rows.length === 0) {
        return res.status(403).json({ error: 'Not authorized to delete this appointment' });
      }
      
      const doctorId = doctorResult.rows[0].doctorid;
      
      result = await pool.query(
        'DELETE FROM Appointments WHERE AppointmentID = $1 AND DoctorID = $2 RETURNING *',
        [id, doctorId]
      );
    } else {
      // Patients and other roles are not allowed to delete appointments
      return res.status(403).json({ error: 'Not authorized to delete appointments' });
    }
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Appointment not found' });
    }
    
    res.json({ message: 'Appointment canceled successfully' });
  } catch (err) {
    console.error('Error canceling appointment:', err);
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

// PUT /appointments/:id
// Update an existing appointment
// Requires authentication token
router.put('/:id', [
  // Validation middleware - similar to POST
  body('PatientID').isInt().withMessage('Patient ID must be an integer'),
  body('AppointmentDate').isDate().withMessage('Appointment date must be a valid date'),
  body('AppointmentTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Appointment time must be in HH:MM format'),
  body('Status').isIn(['Confirmed', 'Canceled', 'Completed', 'Pending']).withMessage('Invalid status')
], authenticateToken, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { id } = req.params;
  const PatientID = xss(req.body.PatientID);
  const DoctorID = xss(req.body.DoctorID);
  const AppointmentDate = xss(req.body.AppointmentDate);
  const AppointmentTime = xss(req.body.AppointmentTime);
  const ReasonForVisit = xss(req.body.ReasonForVisit);
  const Status = xss(req.body.Status);

  try {
    // Check if user has permission to update this appointment
    const userRole = req.user.Role.toLowerCase();
    let query;
    let params;
    
    if (userRole === 'admin') {
      // Admins can update any appointment
      query = `
        UPDATE Appointments 
        SET PatientID = $1, DoctorID = $2, AppointmentDate = $3, 
            AppointmentTime = $4, ReasonForVisit = $5, Status = $6
        WHERE AppointmentID = $7
        RETURNING *
      `;
      params = [PatientID, DoctorID, AppointmentDate, AppointmentTime, ReasonForVisit, Status, id];
    } else if (userRole === 'doctor') {
      // Doctors can only update their own appointments
      const doctorResult = await pool.query(
        'SELECT doctorid FROM Doctors WHERE userid = $1',
        [req.user.UserID]
      );
      
      if (doctorResult.rows.length === 0) {
        return res.status(403).json({ error: 'Not authorized to update this appointment' });
      }
      
      const doctorId = doctorResult.rows[0].doctorid;
      
      query = `
        UPDATE Appointments 
        SET PatientID = $1, AppointmentDate = $2, AppointmentTime = $3, 
            ReasonForVisit = $4, Status = $5
        WHERE AppointmentID = $6 AND DoctorID = $7
        RETURNING *
      `;
      params = [PatientID, AppointmentDate, AppointmentTime, ReasonForVisit, Status, id, doctorId];
    } else {
      // Patients can only update the status (to cancel)
      if (Status !== 'Canceled') {
        return res.status(403).json({ error: 'Patients can only cancel appointments' });
      }
      
      const patientResult = await pool.query(
        'SELECT patientid FROM Patients WHERE userid = $1',
        [req.user.UserID]
      );
      
      if (patientResult.rows.length === 0) {
        return res.status(403).json({ error: 'Not authorized to update this appointment' });
      }
      
      const patientId = patientResult.rows[0].patientid;
      
      query = `
        UPDATE Appointments 
        SET Status = $1
        WHERE AppointmentID = $2 AND PatientID = $3
        RETURNING *
      `;
      params = [Status, id, patientId];
    }
    
    const result = await pool.query(query, params);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Appointment not found or you do not have permission to update it' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating appointment:', err);
    
    if (err.code === '23503') { // Foreign key violation
      res.status(400).json({ error: 'Invalid PatientID or DoctorID' });
    } else {
      res.status(500).json({ error: 'Internal server error', details: err.message });
    }
  }
});

// Export router for use in main application
module.exports = router;