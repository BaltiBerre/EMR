// Required dependencies
const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');          // Database connection
const authenticateToken = require('../middleware/auth'); // JWT authentication
const { body, validationResult } = require('express-validator');


// POST /doctors/:doctorid/patients/bulk
// Bulk assign patients to a doctor
// i have to reorder
// POST /doctors/:doctorid/patients/bulk
router.post('/:doctorid/patients/bulk', authenticateToken, async (req, res) => {
  try {
    if (req.user.Role.toLowerCase() !== 'admin') {
      return res.status(403).json({ message: 'Only admins can assign patients to doctors' });
    }
    
    const { doctorid } = req.params;
    const { patientIds } = req.body;
    
    if (!Array.isArray(patientIds) || patientIds.length === 0) {
      return res.status(400).json({ message: 'Patient IDs array is required' });
    }
    
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Check if any of these patients are already assigned to another doctor
      const existingAssignments = await client.query(
        `SELECT patient_id, doctor_id FROM doctor_patient_relationships 
         WHERE patient_id = ANY($1::int[]) AND status = 'Active'`,
        [patientIds]
      );
      
      // Filter out patients who are already assigned to other doctors
      const alreadyAssignedPatients = existingAssignments.rows
        .filter(row => row.doctor_id != doctorid) // Only concerned about different doctors
        .map(row => row.patient_id);
      
      if (alreadyAssignedPatients.length > 0) {
        await client.query('ROLLBACK');
        return res.status(409).json({
          message: 'Some patients are already assigned to other doctors',
          alreadyAssignedPatients
        });
      }
      
      // Single query with unnest for better performance
      // This will only insert patients not already assigned to this doctor
      const result = await client.query(
        `INSERT INTO doctor_patient_relationships(doctor_id, patient_id, status)
         SELECT $1, p, 'Active' FROM unnest($2::int[]) AS p
         ON CONFLICT (doctor_id, patient_id) DO UPDATE SET status = 'Active'
         RETURNING *`,
        [doctorid, patientIds]
      );
      
      await client.query('COMMIT');
      
      res.status(201).json({
        message: `${result.rows.length} patients assigned successfully`,
        relationships: result.rows
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Error bulk assigning patients:', err);
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

// POST /doctors/:doctorid/patients/:patientid
// Assign a patient to a doctor
router.post('/:doctorid/patients/:patientid', authenticateToken, async (req, res) => {
  try {
    // Check for admin privileges
    if (req.user.Role.toLowerCase() !== 'admin') {
      return res.status(403).json({ message: 'Only admins can assign patients to doctors' });
    }
    
    const { doctorid, patientid } = req.params;

    const existingAssignment = await pool.query(
      'SELECT * FROM doctor_patient_relationships WHERE patient_id = $1 AND status = $2',
      [patientid, 'Active']
    );

    if (existingAssignment.rows > 0) {
      return res.status(400).json({
        message: 'This patient is already assigned to a doctor',
        currentDoctorId: existingAssignment.rows[0].doctorId
      })
    }
    
    // Insert relationship record
    const result = await pool.query(
      'INSERT INTO doctor_patient_relationships(doctor_id, patient_id) VALUES($1, $2) RETURNING *',
      [doctorid, patientid]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error assigning patient to doctor:', err);
    
    if (err.code === '23505') { // Unique violation
      return res.status(409).json({ message: 'Patient is already assigned to this doctor' });
    }
    
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

// GET /doctors/:doctorid/patients
// Get all patients assigned to a doctor
router.get('/:doctorid/patients', authenticateToken, async (req, res) => {
  try {
    const { doctorid } = req.params;
    
    // Get patients assigned to doctor
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

// DELETE /doctors/:doctorid/patients/:patientid
// Remove a patient assignment from a doctor
router.delete('/:doctorid/patients/:patientid', authenticateToken, async (req, res) => {
  try {
    if (req.user.Role.toLowerCase() !== 'admin') {
      return res.status(403).json({ message: 'Only admins can remove patient assignments' });
    }
    
    const { doctorid, patientid } = req.params;
    
    const result = await pool.query(
      'DELETE FROM doctor_patient_relationships WHERE doctor_id = $1 AND patient_id = $2 RETURNING *',
      [doctorid, patientid]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Relationship not found' });
    }
    
    res.json({ message: 'Patient unassigned successfully' });
  } catch (err) {
    console.error('Error removing patient assignment:', err);
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});



// GET /doctors/my-patients
// Get patients assigned to the currently logged-in doctor
router.get('/my-patients', authenticateToken, async (req, res) => {
  try {
    if (req.user.Role.toLowerCase() !== 'doctor') {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    // First get the doctor's ID from their user ID
    const doctorResult = await pool.query(
      'SELECT doctorid FROM doctors WHERE userid = $1',
      [req.user.UserID]
    );
    
    if (doctorResult.rows.length === 0) {
      return res.status(404).json({ message: 'Doctor profile not found' });
    }
    
    const doctorId = doctorResult.rows[0].doctorid;
    
    // Get patients assigned to this doctor
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
    const doctorId = req.params.id;
    
    // Get doctor's user ID first
    const doctorQuery = await pool.query(
      'SELECT UserID FROM Doctors WHERE DoctorID = $1',
      [doctorId]
    );
    
    if (doctorQuery.rows.length === 0) {
      return res.status(404).json({ message: 'Doctor not found' });
    }
    
    const userId = doctorQuery.rows[0].userid;

    // Query to get doctor's statistics
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

    // Query to get patients assigned to this doctor with detailed information
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

    // Execute both queries
    const stats = await pool.query(statsQuery, [doctorId]);
    const patients = await pool.query(patientsQuery, [doctorId]);

    // Combine results and send response
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

router.get('/:doctorid/unassigned-patients', authenticateToken, async (req, res) => {
  try {
    const { doctorid } = req.params;
    
    // Get patients not assigned to ANY doctor (truly unassigned)
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
module.exports = router;