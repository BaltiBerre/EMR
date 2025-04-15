// EMR/backend/server.js
console.log('Starting server...');
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
require('dotenv').config();
const os = require('os');
const app = express();
const port = process.env.PORT || 4000;
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');

app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:4000'],
  credentials: true
}));

app.use(express.json());
app.use(cookieParser());

// User ID extraction middleware (runs before auditLogger)
// This will attempt to extract user information from the JWT token
// and make it available to subsequent middleware
app.use('/api', (req, res, next) => {
  if (req.cookies && req.cookies.token) {
    try {
      const decoded = jwt.verify(req.cookies.token, process.env.JWT_SECRET);
      // Create req.tokenUser property to store the user info from token
      req.tokenUser = {
        userId: decoded.UserID,
        username: decoded.Username,
        role: decoded.Role
      };
      console.log('Token user info extracted:', req.tokenUser);
    } catch (err) {
      console.error('Token verification failed:', err.message);
      // Continue processing even if token verification fails
    }
  }
  next();
});

// Now the auditLogger comes after token extraction
const auditLogger = require('./src/middleware/auditlogger');
app.use('/api', auditLogger);

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window per IP
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Don't use the `X-RateLimit-*` headers
  message: 'Too many login attempts from this IP, please try again after 15 minutes'
});

// Import routes
const doctorsRouter = require('./src/routes/doctors');
const patientsRouter = require('./src/routes/patients');
const appointmentsRouter = require('./src/routes/appointments');
const authRouter = require('./src/routes/auth');
const medicalRecordsRouter = require('./src/routes/medicalRecords');
const fhirImportRouter = require(path.join(__dirname, './src/routes/fhirImport'));

// Use routes
app.use('/api/auth/login', loginLimiter);
app.use('/api/patients', patientsRouter);
app.use('/api/appointments', appointmentsRouter);
app.use('/api/auth', authRouter);
app.use('/api/medical-records', medicalRecordsRouter);

app.use('/api/fhir', fhirImportRouter);
app.use('/api/doctors', doctorsRouter);

// Health check route
app.get('/api/health', (req, res) => {
  res.json({ message: 'Backend is healthy' });
});

// Database connection test route
app.get('/api/test-db', async (req, res) => {
  try {
    const pool = require('./config/database');
    const result = await pool.query('SELECT NOW()');
    res.json({ message: 'Database connected successfully', time: result.rows[0].now });
  } catch (err) {
    console.error('Database connection error:', err);
    res.status(500).json({ message: 'Database connection error', error: err.message });
  }
});

// Temporary API 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'API endpoint not found' });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${port} is already in use. Try setting a different port using the PORT environment variable:`);
    console.error(`Example: PORT=4001 node server.js`);
  } else {
    console.error('Error starting server:', err);
  }
});

process.on('SIGINT', () => {
  process.exit();
});