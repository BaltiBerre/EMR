//Server.js
console.log('Starting server...');
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const cookieParser = require('cookie-parser');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT
});

pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

const app = express();
const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
}).on('error', (err) => {
  console.error('Error starting server:', err);
});

app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Middleware for JWT authentication
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  console.log('Received token:', token);

  if (token == null) return res.sendStatus(401);

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      console.error('Error verifying token:', err);
      return res.sendStatus(403);
    }
    console.log('Decoded user:', JSON.stringify(user, null, 2));
    req.user = user;
    next();
  });
}

// Health check route
app.get('/api/health', (req, res) => {
  res.json({ message: 'Backend is healthy' });
});

// Database connection test route
app.get('/api/test-db', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ message: 'Database connected successfully', time: result.rows[0].now });
  } catch (err) {
    console.error('Database connection error:', err);
    res.status(500).json({ message: 'Database connection error', error: err.message });
  }
});

// Patient routes
app.get('/api/patients', authenticateToken, async (req, res) => {
  console.log('User role:', req.user.Role);
  if (req.user.Role !== 'admin' && req.user.Role !== 'doctor') {
    console.log('Access denied. User role:', req.user.Role);
    return res.status(403).json({ message: 'Access denied. Insufficient privileges.' });
  }

  try {
    const result = await pool.query('SELECT * FROM Patients');
    console.log('Fetched patients:', result.rows.length);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching patients:', error);
    res.status(500).json({ message: 'Error fetching patients' });
  }
});

app.post('/api/patients', [
  body('FirstName').notEmpty().withMessage('First name is required'),
  body('LastName').notEmpty().withMessage('Last name is required'),
  body('DOB').isDate().withMessage('Date of birth must be a valid date'),
  body('Gender').isIn(['Male', 'Female', 'Other']).withMessage('Gender must be Male, Female, or Other'),
  body('Email').isEmail().withMessage('Invalid email address'),
  body('PhoneNumber').isMobilePhone().withMessage('Invalid phone number')
], authenticateToken, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { FirstName, LastName, DOB, Gender, Address, PhoneNumber, Email } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO Patients (FirstName, LastName, DOB, Gender, Address, PhoneNumber, Email) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [FirstName, LastName, DOB, Gender, Address, PhoneNumber, Email]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error adding patient:', err);
    res.status(500).json({ 
      error: 'Internal server error', 
      details: err.message,
      code: err.code,
      hint: err.hint
    });
  }
});


app.put('/api/patients/:id', [
    body('FirstName').notEmpty().withMessage('First name is required'),
    body('LastName').notEmpty().withMessage('Last name is required'),
    body('DOB').isDate().withMessage('Date of birth must be a valid date'),
    body('Gender').isIn(['Male', 'Female', 'Other']).withMessage('Gender must be Male, Female, or Other'),
    body('Email').isEmail().withMessage('Invalid email address'),
    body('PhoneNumber').isMobilePhone().withMessage('Invalid phone number')
  ], authenticateToken, async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
  
    const { id } = req.params;
    const { FirstName, LastName, DOB, Gender, Address, PhoneNumber, Email } = req.body;
    try {
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
  
app.delete('/api/patients/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM Patients WHERE PatientID = $1 RETURNING *', [id]);
    if (result.rows.length > 0) {
      res.json({ message: 'Patient deleted successfully' });
    } else {
      res.status(404).json({ error: 'Patient not found' });
    }
  } catch (err) {
    console.error(err);
    if (err.code === '23503') { // foreign_key_violation
      res.status(400).json({ error: 'Cannot delete patient. There are related records.' });
    } else {
      res.status(500).json({ error: 'Internal server error', details: err.message });
    }
  }
});

// Appointment routes
app.get('/api/appointments', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM Appointments');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/appointments', [
    body('PatientID').isInt().withMessage('Patient ID must be an integer'),
    body('DoctorID').isInt().withMessage('Doctor ID must be an integer'),
    body('AppointmentDate').isDate().withMessage('Appointment date must be a valid date'),
    body('AppointmentTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Appointment time must be in HH:MM format'),
    body('ReasonForVisit').notEmpty().withMessage('Reason for visit is required'),
    body('Status').isIn(['Scheduled', 'Completed', 'Cancelled']).withMessage('Invalid status')
  ], authenticateToken, async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
  
    const { PatientID, DoctorID, AppointmentDate, AppointmentTime, ReasonForVisit, Status } = req.body;
    try {
      const result = await pool.query(
        'INSERT INTO Appointments (PatientID, DoctorID, AppointmentDate, AppointmentTime, ReasonForVisit, Status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
        [PatientID, DoctorID, AppointmentDate, AppointmentTime, ReasonForVisit, Status]
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error(err);
      if (err.code === '23503') { // foreign_key_violation
        res.status(400).json({ error: 'Invalid PatientID or DoctorID' });
      } else {
        res.status(500).json({ error: 'Internal server error', details: err.message });
      }
    }
  });

// User authentication routes
app.post('/api/register', [
    body('Username').isLength({ min: 3 }).withMessage('Username must be at least 3 characters long'),
    body('Password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters long'),
    body('Role').isIn(['patient', 'doctor', 'admin']).withMessage('Invalid role')
  ], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
  
    const { Username, Password, Role } = req.body;
    try {
      const hashedPassword = await bcrypt.hash(Password, 10);
      const result = await pool.query(
        'INSERT INTO UserAccounts (Username, PasswordHash, Role) VALUES ($1, $2, $3) RETURNING UserID, Username, Role',
        [Username, hashedPassword, Role]
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error(err);
      if (err.code === '23505') { // unique_violation
        res.status(409).json({ error: 'Username already exists' });
      } else {
        res.status(500).json({ error: 'Internal server error', details: err.message });
      }
    }
  });

app.post('/api/login', [
    body('Username').notEmpty().withMessage('Username is required'),
    body('Password').notEmpty().withMessage('Password is required')
  ], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
  
    const { Username, Password } = req.body;
  
    try {
      const result = await pool.query('SELECT * FROM UserAccounts WHERE Username = $1', [Username]);
      if (result.rows.length > 0) {
        const user = result.rows[0];
        if (await bcrypt.compare(Password, user.passwordhash)) {
          const token = jwt.sign(
            { UserID: user.userid, Username: user.username, Role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
          );
          res.json({ message: 'Login successful', token, role: user.role });
        } else {
          res.status(401).json({ error: 'Invalid credentials' });
        }
      } else {
        res.status(401).json({ error: 'Invalid credentials' });
      }
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal server error', details: err.message });
    }
  });

app.post('/api/create-user', async (req, res) => {
  const { username, password, role } = req.body;
  
  if (!username || !password || !role) {
    return res.status(400).json({ message: 'Username, password, and role are required' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const query = 'INSERT INTO UserAccounts (Username, PasswordHash, Role) VALUES ($1, $2, $3) RETURNING *';
    const values = [username, hashedPassword, role];
    
    const result = await pool.query(query, values);
    res.json({ message: 'User created successfully', user: result.rows[0] });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ message: 'Error creating user' });
  }
});

// Medical record routes
app.get('/api/medical-records', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM MedicalRecords');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/medical-records', [
  body('PatientID').isInt().withMessage('Patient ID must be an integer'),
  body('DoctorID').isInt().withMessage('Doctor ID must be an integer'),
  body('VisitDate').isDate().withMessage('Visit date must be a valid date'),
  body('Diagnosis').notEmpty().withMessage('Diagnosis is required'),
  body('Treatment').notEmpty().withMessage('Treatment is required'),
], authenticateToken, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { PatientID, DoctorID, VisitDate, Diagnosis, Treatment, Notes } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO MedicalRecords (PatientID, DoctorID, VisitDate, Diagnosis, Treatment, Notes) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [PatientID, DoctorID, VisitDate, Diagnosis, Treatment, Notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    if (err.code === '23503') { // foreign_key_violation
      res.status(400).json({ error: 'Invalid PatientID or DoctorID' });
    } else {
      res.status(500).json({ error: 'Internal server error', details: err.message });
    }
  }
});


app.put('/api/medical-records/:id', [
  body('PatientID').isInt().withMessage('Patient ID must be an integer'),
  body('DoctorID').isInt().withMessage('Doctor ID must be an integer'),
  body('VisitDate').isDate().withMessage('Visit date must be a valid date'),
  body('Diagnosis').notEmpty().withMessage('Diagnosis is required'),
  body('Treatment').notEmpty().withMessage('Treatment is required'),
], authenticateToken, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { id } = req.params;
  const { PatientID, DoctorID, VisitDate, Diagnosis, Treatment, Notes } = req.body;
  try {
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
    if (err.code === '23503') { // foreign_key_violation
      res.status(400).json({ error: 'Invalid PatientID or DoctorID' });
    } else {
      res.status(500).json({ error: 'Internal server error', details: err.message });
    }
  }
});

app.get('/api/patient-overview', authenticateToken, async (req, res) => {
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

//deleting
app.delete('/api/patients/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query('DELETE FROM Patients WHERE PatientID = $1 RETURNING *', [id]);

    if (result.rows.length > 0) {
      res.json({ message: 'Patient deleted successfully' });
    } else {
      res.status(404).json({ error: 'Patient not found' });
    }
  } catch (err) {
    console.error('Error deleting patient:', err);

    if (err.code === '23503') {
      // foreign_key_violation
      res.status(400).json({
        error: 'Cannot delete patient. There are related records.',
        details: {
          constraint: err.constraint,
          table: err.table,
          column: err.column
        }
      });
    } else {
      res.status(500).json({
        error: 'Internal server error',
        details: {
          message: err.message,
          code: err.code,
          hint: err.hint,
          position: err.position,
          stack: err.stack
        }
      });
    }
  }
});



// adding patients
app.get('/api/patient-overview', authenticateToken, async (req, res) => {
  try {
    const totalPatients = await pool.query('SELECT COUNT(*) FROM Patients');
    const recentAppointments = await pool.query('SELECT * FROM Appointments ORDER BY AppointmentDate DESC LIMIT 5');
    const patientDemographics = await pool.query('SELECT Gender, COUNT(*) FROM Patients GROUP BY Gender');

    res.json({
      totalPatients: totalPatients.rows[0].count,
      recentAppointments: recentAppointments.rows,
      patientDemographics: patientDemographics.rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});


app.delete('/api/medical-records/:id', authenticateToken, async (req, res) => {
const { id } = req.params;
try {
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

const path = require('path');

// Serve static files from the React app
app.use(express.static(path.join(__dirname, '..', 'frontend', 'build')));

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
app.get('*', (req, res) => {
res.sendFile(path.join(__dirname, '..', 'frontend', 'build', 'index.html'));
});

