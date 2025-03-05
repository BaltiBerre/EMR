// Required dependencies
const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');          // Database connection
const authenticateToken = require('../middleware/auth'); // JWT authentication
const { body, validationResult } = require('express-validator');


// GET /doctors
// Get all doctors with their patient and appointment statistics
// Requires admin privileges
router.get('/', authenticateToken, async (req, res) => {
  console.log('User role:', req.user?.Role);
  
  // Check user authorization
  const userRole = req?.user?.Role || '';
  if (userRole.toLowerCase() !== 'admin') {
    console.log('Access denied. User role:', userRole);
    return res.status(403).json({ message: 'Access denied. Insufficient privileges.' });
  }

  try {
    // Complex SQL query using Common Table Expression (CTE)
    const result = await pool.query(`
      SELECT 
        d.doctorid,
        d.userid,
        ua.username,
        d.firstname,
        d.lastname,
        d.specialization,
        COUNT(DISTINCT a.PatientID) as patient_count,
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

// GET /doctors/:id
// Get detailed information about a specific doctor
// Including statistics and patient list
// Requires admin privileges
router.get('/:id', authenticateToken, async (req, res) => {
  // Check authorization
  if (req.user.Role.toLowerCase() !== 'admin') {
    return res.status(403).json({ message: 'Access denied. Insufficient privileges.' });
  }

  try {
    // Query to get doctor's statistics
    const statsQuery = `
    SELECT 
      COUNT(DISTINCT a.PatientID) as unique_patients,
      COUNT(CASE WHEN a.Status = 'Completed' THEN 1 END) as completed_appointments,
      COUNT(CASE WHEN a.AppointmentDate >= CURRENT_DATE THEN 1 END) as upcoming_appointments
    FROM Doctors d
    LEFT JOIN Appointments a ON d.DoctorID = a.DoctorID
    WHERE d.UserID = $1
    GROUP BY d.DoctorID;
  `;
  

    // Query to get detailed patient information for the doctor
    const patientsQuery = `
    SELECT DISTINCT ON (p.PatientID)
      p.PatientID as patientid,
      p.FirstName as firstname,
      p.LastName as lastname,
      MAX(mr.VisitDate) as last_visit,
      COUNT(mr.RecordID) as visit_count,
      FIRST_VALUE(mr.Diagnosis) OVER (
        PARTITION BY p.PatientID 
        ORDER BY mr.VisitDate DESC
      ) as latest_diagnosis
    FROM Patients p
    JOIN Appointments a ON p.PatientID = a.PatientID
    LEFT JOIN MedicalRecords mr ON p.PatientID = mr.PatientID
    JOIN Doctors d ON a.DoctorID = d.DoctorID
    WHERE d.UserID = $1
    GROUP BY p.PatientID, mr.Diagnosis, mr.VisitDate
    ORDER BY p.PatientID, last_visit DESC;
  `;
  

    // Execute both queries
    const stats = await pool.query(statsQuery, [req.params.id]);
    const patients = await pool.query(patientsQuery, [req.params.id]);

    // Combine results and send response
    res.json({
      statistics: stats.rows[0] || {
        unique_patients: 0,
        completed_appointments: 0,
        upcoming_appointments: 0
      },
      patients: patients.rows
    });
  } catch (error) {
    console.error('Error fetching doctor details:', error);
    res.status(500).json({ message: 'Error fetching doctor details', error: error.message });
  }
});

// DELETE /doctors/:id
// DELETE a doctor record

router.delete('/:doctorid', authenticateToken, async (req, res) => {
  const { doctorid } = req.params;
  try {
    // attempt to delete the doctor
    const result = await pool.query('DELETE FROM Doctors WHERE doctorid = $1 RETURNING *', [doctorid]);

    // confirmation of success
    if (result.rows.length > 0) {
      res.json({ message: 'Doctor deleted succesfully'});
    } else {
      res.status(404).json({ error: 'Doctor not found' });
    }


  } catch(err) {
    console.error(err);
    if (err.code === '23503') {
      res.status(400).json({ error: 'Cannot delete doctor. There are related records.'})
    } else {
      res.status(500).json({ error: 'Internal server error', details: err.message });
    }
  }
})
// POST /doctors
// Create new Doctor Record
router.post('/', [
  body('firstname').trim().notEmpty().withMessage("Needs a first name bro"),
  body('lastname').notEmpty().withMessage("Needs a last name too dawg"),
  body('specialization').notEmpty().withMessage("Needs to have specialization"),
  body('phonenumber').notEmpty().withMessage("Not valid phone number"),
  body('email').isEmail().normalizeEmail().withMessage("Not a valid ")
], authenticateToken, async (req, res) =>{
  // Checks fo admin privileges
  if (req.user.Role.toLowerCase() !== 'admin') {
    return res.status(403).json({ message: "Access denied."})
  }
  // checks validation results
   const errors = validationResult(req);
   if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array()})
   }


    // Log request body for debugging
    console.log("Request body:", req.body);

   const {
    firstname,
    lastname,
    specialization,
    phonenumber,
    email,
    userid
   } = req.body

    // Check if required fields exist
    if (!firstname || !lastname || !userid) {
    return res.status(400).json({ message: "Missing required fields", 
      required: ['firstname', 'lastname', 'userid'],
      provided: Object.keys(req.body)
    });
  }
  
    // Check if table exists
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
    // tries to insert doctor record
    const result = await pool.query(
      'INSERT INTO Doctors (userid, firstname, lastname, specialization, phonenumber, email) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [userid, firstname, lastname, specialization, phonenumber, email]
    );
    
    // Send success response with the created doctor data
    return res.status(201).json(result.rows[0]);
    
   } catch (err) {
    console.log("Error creating doctor record", err);
    
    // Check for specific error type
    if (err.code === '23503') {
      return res.status(400).json({message: 'Invalid UserID specified'});
    }
    
    // General error (moved inside catch block and fixed variable name)
    return res.status(500).json({message: "Failed to create doctor record", error: err.message});
   }
});



// Export router for use in main application
module.exports = router;