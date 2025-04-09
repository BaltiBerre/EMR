// console log just to confirm that server is running proper
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

app.use(cors({
  origin: [process.env.CORS_ORIGIN,'https://emr-1.onrender.com','http://localhost:5173', 'http://localhost:3000', 'http://localhost:4000'],
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

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
const patientOverviewRouter = require('./src/routes/patientOverview');
const fhirImportRouter = require(path.join(__dirname, './src/routes/fhirImport'));

// Use routes
app.use('/api/auth/login', loginLimiter);
app.use('/api/patients', patientsRouter);
app.use('/api/appointments', appointmentsRouter);
app.use('/api/auth', authRouter);
app.use('/api/medical-records', medicalRecordsRouter);
app.use('/api/patient-overview', patientOverviewRouter);
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

// Serve static files from the React app
// app.use(express.static(path.join(__dirname, '..', '..', 'frontend', 'build')));

// // The "catchall" handler: for any request that doesn't
// // match one above, send back React's index.html file.
// app.get('*', (req, res) => {
//   res.sendFile(path.join(__dirname, '..', '..', 'frontend', 'build', 'index.html'));
// });

// Temporary API 404 handler


app.listen(port, () => {
  console.log(`Server running on port ${port}`);
}).on('error', (err) => {ç
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${port} is already in use. Try setting a different port using the PORT environment variable:`);
    console.error(`Example: PORT=4001 node server.js`);
  } else {
    console.error('Error starting server:', err);
  }
});

const resourceInterval = setInterval(() => {
  const memoryUsage = process.memoryUsage();
  const cpuUsage = os.loadavg()[0] / os.cpus().length * 100; // Average load / cores
  
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    memory: Math.round(memoryUsage.rss / 1024 / 1024), // MB
    cpu: Math.round(cpuUsage)
  }));
}, 5000);

// Clear interval when done testing
process.on('SIGINT', () => {
  clearInterval(resourceInterval);
  process.exit();
});

app.use('*', (req, res) => {
  res.status(404).json({ message: 'API endpoint not found' });
});