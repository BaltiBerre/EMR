//emrsoftware/backend/src/routes/patientOverview.js
const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const authenticateToken = require('../middleware/auth');

router.get('/', authenticateToken, async (req, res) => {
  try {
    // Total patients
    const totalPatients = await pool.query('SELECT COUNT(*) FROM Patients');

    // Recent appointments
    const recentAppointments = await pool.query(`
      SELECT p.FirstName || ' ' || p.LastName AS patientName, 
             a.AppointmentDate AS date, 
             a.AppointmentTime AS time
      FROM Appointments a
      JOIN Patients p ON a.PatientID = p.PatientID
      ORDER BY a.AppointmentDate DESC, a.AppointmentTime DESC
      LIMIT 5
    `);

    // Patient demographics
    const patientDemographics = await pool.query(`
      SELECT Gender AS name, COUNT(*) AS value
      FROM Patients
      GROUP BY Gender
    `);

    // Appointments trend (last 7 days)
    const appointmentsTrend = await pool.query(`
      SELECT DATE(AppointmentDate) AS date, COUNT(*) AS appointments
      FROM Appointments
      WHERE AppointmentDate >= CURRENT_DATE - INTERVAL '7 days'
      GROUP BY DATE(AppointmentDate)
      ORDER BY DATE(AppointmentDate)
    `);

    // Age distribution
    const ageDistribution = await pool.query(`
      SELECT 
        CASE 
          WHEN AGE(DOB) < INTERVAL '18 years' THEN '0-17'
          WHEN AGE(DOB) >= INTERVAL '18 years' AND AGE(DOB) < INTERVAL '30 years' THEN '18-29'
          WHEN AGE(DOB) >= INTERVAL '30 years' AND AGE(DOB) < INTERVAL '50 years' THEN '30-49'
          WHEN AGE(DOB) >= INTERVAL '50 years' AND AGE(DOB) < INTERVAL '65 years' THEN '50-64'
          ELSE '65+'
        END AS ageGroup,
        COUNT(*) AS count
      FROM Patients
      GROUP BY ageGroup
      ORDER BY ageGroup
    `);

    res.json({
      totalPatients: parseInt(totalPatients.rows[0].count),
      recentAppointments: recentAppointments.rows,
      patientDemographics: patientDemographics.rows,
      appointmentsTrend: appointmentsTrend.rows,
      ageDistribution: ageDistribution.rows
    });
  } catch (err) {
    console.error('Error fetching patient overview:', err);
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

module.exports = router;