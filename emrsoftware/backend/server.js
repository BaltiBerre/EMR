const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('./db');

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

app.post('/api/patients', authenticateToken, async (req, res) => {
  const { FirstName, LastName, DOB, Gender, Address, PhoneNumber, Email } = req.body;
  try {
    const result = await db.query(
      'INSERT INTO Patients (FirstName, LastName, DOB, Gender, Address, PhoneNumber, Email) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [FirstName, LastName, DOB, Gender, Address, PhoneNumber, Email]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
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

app.post('/api/appointments', authenticateToken, async (req, res) => {
  const { PatientID, DoctorID, AppointmentDate, AppointmentTime, ReasonForVisit, Status } = req.body;
  try {
    const result = await db.query(
      'INSERT INTO Appointments (PatientID, DoctorID, AppointmentDate, AppointmentTime, ReasonForVisit, Status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [PatientID, DoctorID, AppointmentDate, AppointmentTime, ReasonForVisit, Status]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// User authentication routes
app.post('/api/register', async (req, res) => {
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
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/login', async (req, res) => {
  const { Username, Password } = req.body;
  try {
    const result = await db.query('SELECT * FROM UserAccounts WHERE Username = $1', [Username]);
    if (result.rows.length > 0) {
      const user = result.rows[0];
      if (await bcrypt.compare(Password, user.passwordhash)) {
        const token = jwt.sign({ UserID: user.userid, Username: user.username, Role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.json({ token });
      } else {
        res.status(400).json({ error: 'Invalid credentials' });
      }
    } else {
      res.status(400).json({ error: 'User not found' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});