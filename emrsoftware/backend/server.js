const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('./db');
const { body, validationResult } = require('express-validator');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Middleware for JWT authentication
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) return res.sendStatus(401);

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// Patient routes
app.get('/api/patients', authenticateToken, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM Patients');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
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
      const result = await db.query(
        'INSERT INTO Patients (FirstName, LastName, DOB, Gender, Address, PhoneNumber, Email) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
        [FirstName, LastName, DOB, Gender, Address, PhoneNumber, Email]
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal server error', details: err.message });
    }
  });

// Appointment routes
app.get('/api/appointments', authenticateToken, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM Appointments');
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
      const result = await db.query(
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
      const result = await db.query(
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
      const result = await db.query('SELECT * FROM UserAccounts WHERE Username = $1', [Username]);
      if (result.rows.length > 0) {
        const user = result.rows[0];
        if (await bcrypt.compare(Password, user.passwordhash)) {
          const token = jwt.sign({ UserID: user.userid, Username: user.username, Role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
          res.json({ token, role: user.role });
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

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

// Update a patient
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
      const result = await db.query(
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
  
  // Delete a patient
  app.delete('/api/patients/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
      const result = await db.query('DELETE FROM Patients WHERE PatientID = $1 RETURNING *', [id]);
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


  // Get all medical records
app.get('/api/medical-records', authenticateToken, async (req, res) => {
    try {
      const result = await db.query('SELECT * FROM MedicalRecords');
      res.json(result.rows);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
  

  // Create a new medical record
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
      const result = await db.query(
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
  
  // Update a medical record
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
      const result = await db.query(
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
  
  // Delete a medical record
  app.delete('/api/medical-records/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
      const result = await db.query('DELETE FROM MedicalRecords WHERE RecordID = $1 RETURNING *', [id]);
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

  // Get access permissions for a patient
app.get('/api/access-permissions/:patientId', authenticateToken, async (req, res) => {
    const { patientId } = req.params;
    try {
      const result = await db.query('SELECT * FROM PatientControlledAccess WHERE PatientID = $1', [patientId]);
      res.json(result.rows);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
  
 // Set access permission for a patient
app.post('/api/access-permissions', [
    body('PatientID').isInt().withMessage('Patient ID must be an integer'),
    body('UserID').isInt().withMessage('User ID must be an integer'),
    body('AccessLevel').isIn(['read', 'write']).withMessage('Access level must be read or write'),
    body('EffectiveDate').isDate().withMessage('Effective date must be a valid date'),
    body('ExpirationDate').isDate().withMessage('Expiration date must be a valid date')
  ], authenticateToken, async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
  
    const { PatientID, UserID, AccessLevel, EffectiveDate, ExpirationDate } = req.body;
    try {
      const result = await db.query(
        'INSERT INTO PatientControlledAccess (PatientID, UserID, AccessLevel, EffectiveDate, ExpirationDate) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [PatientID, UserID, AccessLevel, EffectiveDate, ExpirationDate]
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error(err);
      if (err.code === '23503') { // foreign_key_violation
        res.status(400).json({ error: 'Invalid PatientID or UserID' });
      } else {
        res.status(500).json({ error: 'Internal server error', details: err.message });
      }
    }
  });
  
  // Update access permission
  app.put('/api/access-permissions/:id', [
    body('AccessLevel').isIn(['read', 'write']).withMessage('Access level must be read or write'),
    body('EffectiveDate').isDate().withMessage('Effective date must be a valid date'),
    body('ExpirationDate').isDate().withMessage('Expiration date must be a valid date')
  ], authenticateToken, async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
  
    const { id } = req.params;
    const { AccessLevel, EffectiveDate, ExpirationDate } = req.body;
    try {
      const result = await db.query(
        'UPDATE PatientControlledAccess SET AccessLevel = $1, EffectiveDate = $2, ExpirationDate = $3 WHERE AccessID = $4 RETURNING *',
        [AccessLevel, EffectiveDate, ExpirationDate, id]
      );
      if (result.rows.length > 0) {
        res.json(result.rows[0]);
      } else {
        res.status(404).json({ error: 'Access permission not found' });
      }
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal server error', details: err.message });
    }
  });
  
  // Update access permission
  app.put('/api/access-permissions/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { AccessLevel, EffectiveDate, ExpirationDate } = req.body;
    try {
      const result = await db.query(
        'UPDATE PatientControlledAccess SET AccessLevel = $1, EffectiveDate = $2, ExpirationDate = $3 WHERE AccessID = $4 RETURNING *',
        [AccessLevel, EffectiveDate, ExpirationDate, id]
      );
      if (result.rows.length > 0) {
        res.json(result.rows[0]);
      } else {
        res.status(404).json({ error: 'Access permission not found' });
      }
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
  
  // Delete access permission
  app.delete('/api/access-permissions/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
      const result = await db.query('DELETE FROM PatientControlledAccess WHERE AccessID = $1 RETURNING *', [id]);
      if (result.rows.length > 0) {
        res.json({ message: 'Access permission deleted successfully' });
      } else {
        res.status(404).json({ error: 'Access permission not found' });
      }
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });