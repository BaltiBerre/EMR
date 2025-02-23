// Required dependencies
const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');          // Database connection
const authenticateToken = require('../middleware/auth'); // JWT authentication

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
      -- CTE to calculate statistics for each doctor
      WITH DoctorStats AS (
        SELECT 
          ua.userid,
          COUNT(DISTINCT a.PatientID) as patient_count,         -- Count unique patients
          COUNT(CASE 
            WHEN a.AppointmentDate >= CURRENT_DATE 
            THEN 1 END) as upcoming_appointments                 -- Count future appointments
        FROM UserAccounts ua
        LEFT JOIN Appointments a ON ua.userid = a.DoctorID
        WHERE ua.role = 'Doctor'
        GROUP BY ua.userid
      )
      -- Main query to combine user accounts with statistics
      SELECT 
        ua.userid,
        ua.username,
        COALESCE(ds.patient_count, 0) as patient_count,        -- Default to 0 if no patients
        COALESCE(ds.upcoming_appointments, 0) as upcoming_appointments
      FROM UserAccounts ua
      LEFT JOIN DoctorStats ds ON ua.userid = ds.userid
      WHERE ua.role = 'Doctor'
      ORDER BY ua.username;
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
        COUNT(DISTINCT a.PatientID) as unique_patients,         -- Total unique patients
        COUNT(CASE WHEN a.Status = 'Completed' THEN 1 END) as completed_appointments,  -- Past appointments
        COUNT(CASE WHEN a.AppointmentDate >= CURRENT_DATE THEN 1 END) as upcoming_appointments  -- Future appointments
      FROM UserAccounts ua
      LEFT JOIN Appointments a ON ua.userid = a.DoctorID
      WHERE ua.userid = $1 AND ua.role = 'Doctor'
      GROUP BY ua.userid;
    `;

    // Query to get detailed patient information for the doctor
    const patientsQuery = `
      SELECT DISTINCT ON (p.PatientID)
        p.PatientID as patientid,
        p.FirstName as firstname,
        p.LastName as lastname,
        MAX(mr.VisitDate) as last_visit,                       -- Most recent visit
        COUNT(mr.RecordID) as visit_count,                     -- Total visits
        FIRST_VALUE(mr.Diagnosis) OVER (                       -- Most recent diagnosis
          PARTITION BY p.PatientID 
          ORDER BY mr.VisitDate DESC
        ) as latest_diagnosis
      FROM Patients p
      JOIN Appointments a ON p.PatientID = a.PatientID
      LEFT JOIN MedicalRecords mr ON p.PatientID = mr.PatientID
      WHERE a.DoctorID = $1
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

// Export router for use in main application
module.exports = router;