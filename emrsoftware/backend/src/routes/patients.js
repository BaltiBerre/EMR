// Required dependencies
const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');  // Request validation
const { pool } = require('../config/database');                   // Database connection
const authenticateToken = require('../middleware/auth');          // JWT authentication

// GET /patients
// Retrieve all patients
// Requires admin or doctor role
router.get('/', authenticateToken, async (req, res) => {
 console.log('User role:', req.user.Role);
 
 // Check authorization - only admins and doctors can access patient list
 if (req.user.Role.toLowerCase() !== 'admin' && req.user.Role.toLowerCase() !== 'doctor') {
   console.log('Access denied. User role:', req.user.Role);
   return res.status(403).json({ message: 'Access denied. Insufficient privileges.' });
 }

 try {
   // Fetch all patients from database
   const result = await pool.query('SELECT * FROM Patients');
   console.log('Fetched patients:', result.rows.length);
   res.json(result.rows);
 } catch (error) {
   console.error('Error fetching patients:', error);
   res.status(500).json({ message: 'Error fetching patients' });
 }
});

// ODBC
// prevents sql injection
// ruby on rails never write plain sql 
//

// POST /patients
// Create a new patient record
router.post('/', [
 // Validation middleware
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

 // Destructure validated request body
 const { FirstName, LastName, DOB, Gender, Address, PhoneNumber, Email } = req.body;
 try {
   // Insert new patient record
   const result = await pool.query(
     'INSERT INTO Patients (FirstName, LastName, DOB, Gender, Address, PhoneNumber, Email) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
     [FirstName, LastName, DOB, Gender, Address, PhoneNumber, Email]
   );
   res.status(201).json(result.rows[0]);
 } catch (err) {
   // Detailed error logging for debugging
   console.error('Error adding patient:', err);
   res.status(500).json({ 
     error: 'Internal server error', 
     details: err.message,
     code: err.code,
     hint: err.hint
   });
 }
});

// PUT /patients/:id
// Update an existing patient record
router.put('/:id', [
 // Validation middleware - same as POST
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

 const { id } = req.params;
 const { FirstName, LastName, DOB, Gender, Address, PhoneNumber, Email } = req.body;
 try {
   // Update patient record
   const result = await pool.query(
     'UPDATE Patients SET FirstName = $1, LastName = $2, DOB = $3, Gender = $4, Address = $5, PhoneNumber = $6, Email = $7 WHERE PatientID = $8 RETURNING *',
     [FirstName, LastName, DOB, Gender, Address, PhoneNumber, Email, id]
   );
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

// DELETE /patients/:id
// Delete a patient record
router.delete('/:id', authenticateToken, async (req, res) => {
 const { id } = req.params;
 try {

    // First delete associated appointments
    await pool.query('DELETE FROM Appointments WHERE PatientID = $1', [id]);
    
   // Attempt to delete patient
   const result = await pool.query('DELETE FROM Patients WHERE PatientID = $1 RETURNING *', [id]);
   if (result.rows.length > 0) {
     res.json({ message: 'Patient deleted successfully' });
   } else {
     res.status(404).json({ error: 'Patient not found' });
   }
 } catch (err) {
   console.error(err);
   if (err.code === '23503') { // PostgreSQL foreign key violation
     // Cannot delete patient with existing records
     res.status(400).json({ error: 'Cannot delete patient. There are related records.' });
   } else {
     res.status(500).json({ error: 'Internal server error', details: err.message });
   }
 }
});

// Export router for use in main application
module.exports = router;