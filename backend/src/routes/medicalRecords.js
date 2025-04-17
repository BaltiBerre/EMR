// Required dependencies
const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');  // Request validation
const { pool } = require('../config/database');                   // Database connection
const authenticateToken = require('../middleware/auth');          // JWT authentication
const xss = require('xss');

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
  body('VisitDate').isDate().withMessage('Visit date must be a valid date'),
  body('Diagnosis').notEmpty().withMessage('Diagnosis is required'),
  body('Treatment').notEmpty().withMessage('Treatment is required'),
 ], authenticateToken, async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
 
  // Check user role - only doctors can create records
  if (req.user.Role.toLowerCase() !== 'doctor') {
    return res.status(403).json({ error: 'Only doctors can create medical records' });
  }
 
  // Sanitize inputs with XSS
  const PatientID = xss(req.body.PatientID);
  const VisitDate = xss(req.body.VisitDate);
  const Diagnosis = xss(req.body.Diagnosis);
  const Treatment = xss(req.body.Treatment);
  const Notes = req.body.Notes ? xss(req.body.Notes) : null;
  
  // Get DoctorID from the authenticated user
  const DoctorID = req.user.UserID;
 
  try {
    // Insert new medical record
    const result = await pool.query(
      'INSERT INTO MedicalRecords (PatientID, DoctorID, VisitDate, Diagnosis, Treatment, Notes) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [PatientID, DoctorID, VisitDate, Diagnosis, Treatment, Notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating medical record:', err);
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
  const PatientID = xss(req.body.PatientID);
  const DoctorID = xss(req.body.DoctorID); // Fixed typo: DoctorId → DoctorID
  const VisitDate = xss(req.body.VisitDate);
  const Diagnosis = xss(req.body.Diagnosis);
  const Treatment = xss(req.body.Treatment);
  const Notes = req.body.Notes ? xss(req.body.Notes) : null;
  
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

// GET /medical-records/patient/:patientId
// Retrieve medical records for a specific patient with pagination
router.get('/patient/:patientId', authenticateToken, async (req, res) => {
  const { patientId } = req.params;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 5;
  const offset = (page - 1) * limit;
  
  try {
    // Get user role from JWT token
    const userRole = req.user.Role.toLowerCase();
    
    let query, countQuery, params, countParams;
    
    // Admin can see all records
    if (userRole === 'admin') {
      query = 'SELECT * FROM MedicalRecords WHERE PatientID = $1 ORDER BY VisitDate DESC LIMIT $2 OFFSET $3';
      countQuery = 'SELECT COUNT(*) FROM MedicalRecords WHERE PatientID = $1';
      params = [patientId, limit, offset];
      countParams = [patientId];
    }
    // If doctor, check if patient is assigned to them
    else if (userRole === 'doctor') {
      // Get doctor ID
      const doctorResult = await pool.query(
        'SELECT doctorid FROM doctors WHERE userid = $1',
        [req.user.UserID]
      );
      
      if (doctorResult.rows.length === 0) {
        return res.status(404).json({ error: 'Doctor profile not found' });
      }
      
      const doctorId = doctorResult.rows[0].doctorid;
      
      // Check if patient is assigned to this doctor
      const relationshipResult = await pool.query(
        'SELECT * FROM doctor_patient_relationships WHERE doctor_id = $1 AND patient_id = $2 AND status = $3',
        [doctorId, patientId, 'Active']
      );
      
      if (relationshipResult.rows.length === 0) {
        return res.status(403).json({ error: 'You do not have access to this patient\'s records' });
      }
      
      // Patient is assigned, fetch records with pagination
      query = 'SELECT * FROM MedicalRecords WHERE PatientID = $1 ORDER BY VisitDate DESC LIMIT $2 OFFSET $3';
      countQuery = 'SELECT COUNT(*) FROM MedicalRecords WHERE PatientID = $1';
      params = [patientId, limit, offset];
      countParams = [patientId];
    }
    // Patient role - only see own records
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
    // Other roles have no access
    else {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    // Execute the queries
    const recordsResult = await pool.query(query, params);
    const countResult = await pool.query(countQuery, countParams);
    
    const totalRecords = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalRecords / limit);
    
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

// GET user's own medical records
router.get('/my-records', authenticateToken, async (req, res) => {
  try {
    // Get patient ID from user ID
    const patientResult = await pool.query(
      'SELECT PatientID FROM Patients WHERE UserID = $1',
      [req.user.UserID]
    );
    
    if (patientResult.rows.length === 0) {
      return res.status(404).json({ error: 'Patient profile not found' });
    }
    
    const patientId = patientResult.rows[0].patientid;
    
    // Get medical records for this patient only
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
module.exports = router;