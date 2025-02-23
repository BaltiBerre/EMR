// Required dependencies
const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');  // Request validation
const { pool } = require('../config/database');                   // Database connection
const authenticateToken = require('../middleware/auth');          // JWT authentication

// GET /medical-records
// Retrieve all medical records
router.get('/', authenticateToken, async (req, res) => {
 try {
   const result = await pool.query('SELECT * FROM MedicalRecords');
   res.json(result.rows);
 } catch (err) {
   console.error(err);
   res.status(500).json({ error: 'Internal server error' });
 }
});

// POST /medical-records 
// Create a new medical record
router.post('/', [
 // Validation middleware
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

 // Destructure request body
 const { PatientID, DoctorID, VisitDate, Diagnosis, Treatment, Notes } = req.body;
 try {
   // Insert new medical record
   const result = await pool.query(
     'INSERT INTO MedicalRecords (PatientID, DoctorID, VisitDate, Diagnosis, Treatment, Notes) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
     [PatientID, DoctorID, VisitDate, Diagnosis, Treatment, Notes]
   );
   res.status(201).json(result.rows[0]);
 } catch (err) {
   console.error(err);
   if (err.code === '23503') { // PostgreSQL foreign key violation 
     res.status(400).json({ error: 'Invalid PatientID or DoctorID' });
   } else {
     res.status(500).json({ error: 'Internal server error', details: err.message });
   }
 }
});

// PUT /medical-records/:id
// Update an existing medical record
router.put('/:id', [
 // Validation middleware - same as POST
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

 const { id } = req.params;
 const { PatientID, DoctorID, VisitDate, Diagnosis, Treatment, Notes } = req.body;
 try {
   // Update medical record
   const result = await pool.query(
     'UPDATE MedicalRecords SET PatientID = $1, DoctorID = $2, VisitDate = $3, Diagnosis = $4, Treatment = $5, Notes = $6 WHERE RecordID = $7 RETURNING *',
     [PatientID, DoctorID, VisitDate, Diagnosis, Treatment, Notes, id]
   );
   if (result.rows.length > 0) {
     res.json(result.rows[0]);
   } else {
     res.status(404).json({ error: 'Medical record not found' });
   }
 } catch (err) {
   console.error(err);
   if (err.code === '23503') { // PostgreSQL foreign key violation
     res.status(400).json({ error: 'Invalid PatientID or DoctorID' });
   } else {
     res.status(500).json({ error: 'Internal server error', details: err.message });
   }
 }
});

// DELETE /medical-records/:id
// Delete a medical record
router.delete('/:id', authenticateToken, async (req, res) => {
 const { id } = req.params;
 try {
   // Delete medical record and return deleted record
   const result = await pool.query('DELETE FROM MedicalRecords WHERE RecordID = $1 RETURNING *', [id]);
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

// Export router for use in main application
module.exports = router;

