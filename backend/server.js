/**
 * EMR Backend Server
 * 
 * This is the main entry point for the Electronic Medical Records (EMR) system backend.
 * It sets up Express.js middleware, configures security measures, handles routing,
 * and manages the overall server lifecycle.
 * 
 * Key features:
 * - JWT authentication with cookie-based token storage
 * - CORS configuration for frontend integration
 * - Rate limiting for login attempts
 * - Audit logging for all API requests
 * - Health check and database connection test endpoints
 * - Graceful shutdown handling
 * 
 * Environment Dependencies:
 * - PORT: Server port (default 4000)
 * - JWT_SECRET: Secret key for JWT token verification
 * - Database connection details (via database config)
 */

// Server startup logging
console.log('Starting server...');

// Core dependencies
const express = require('express');                // Web framework
const cors = require('cors');                      // Cross-Origin Resource Sharing
const cookieParser = require('cookie-parser');     // Parse Cookie header
const path = require('path');                      // File path utilities
require('dotenv').config();                        // Load environment variables from .env file
const os = require('os');                          // Operating system utilities (included but not used)
const app = express();                             // Create Express application
const port = process.env.PORT || 4000;             // Server port configuration
const rateLimit = require('express-rate-limit');   // Rate limiting middleware
const jwt = require('jsonwebtoken');               // JSON Web Token functionality

/**
 * CORS Configuration
 * Enables cross-origin requests from the frontend applications
 * - localhost:5173: Vite development server
 * - localhost:3000: Common React development server
 * - localhost:4000: Backend server (self)
 * - credentials: true enables setting cookies cross-origin
 */
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:4000'],
  credentials: true
}));

// Parse JSON request bodies
app.use(express.json());

// Parse Cookie header and populate req.cookies
app.use(cookieParser());

/**
 * User ID Extraction Middleware
 * 
 * This middleware runs before audit logging to extract user information from JWT tokens.
 * It creates a req.tokenUser object containing user credentials from the JWT payload.
 * 
 * Flow:
 * 1. Check if token exists in cookies
 * 2. Verify token using JWT_SECRET
 * 3. Extract user information from decoded token
 * 4. Store in req.tokenUser for downstream middleware/routes
 * 
 * Note: Continues processing even if token verification fails to avoid blocking non-auth routes
 */
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

/**
 * Audit Logger Middleware
 * Placed after token extraction to have access to user information
 * Logs all API requests with user context for security and compliance
 */
const auditLogger = require('./src/middleware/auditlogger');
app.use('/api', auditLogger);

/**
 * Login Rate Limiter Configuration
 * Prevents brute force attacks on the login endpoint
 * - 15-minute window
 * - Maximum 5 attempts per IP per window
 * - Returns standard rate limit headers
 */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes window
  max: 5, // 5 attempts per window per IP
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Don't use the `X-RateLimit-*` headers
  message: 'Too many login attempts from this IP, please try again after 15 minutes'
});

/**
 * Import API Route Modules
 * 
 * Each module contains specific functionality:
 * - doctors: Doctor management and patient assignments
 * - patients: Patient CRUD operations and doctor relationships
 * - appointments: Appointment scheduling and management
 * - auth: Authentication (login, logout, user validation)
 * - medicalRecords: Medical records management
 * - fhirImport: FHIR (Fast Healthcare Interoperability Resources) data import
 */
const doctorsRouter = require('./src/routes/doctors');
const patientsRouter = require('./src/routes/patients');
const appointmentsRouter = require('./src/routes/appointments');
const authRouter = require('./src/routes/auth');
const medicalRecordsRouter = require('./src/routes/medicalRecords');
const fhirImportRouter = require(path.join(__dirname, './src/routes/fhirImport'));

/**
 * Mount API Routes
 * 
 * Note: auth/login route specifically has rate limiting applied
 * All routes are prefixed with /api for consistency
 */
app.use('/api/auth/login', loginLimiter);          // Apply rate limiting to login
app.use('/api/patients', patientsRouter);          // Patient management
app.use('/api/appointments', appointmentsRouter);   // Appointment management
app.use('/api/auth', authRouter);                  // Authentication routes
app.use('/api/medical-records', medicalRecordsRouter); // Medical records routes
app.use('/api/fhir', fhirImportRouter);            // FHIR import functionality
app.use('/api/doctors', doctorsRouter);            // Doctor management

/**
 * GET /api/health
 * Health check endpoint used by monitoring systems or load balancers
 * Returns simple JSON response to confirm server is running
 */
app.get('/api/health', (req, res) => {
  res.json({ message: 'Backend is healthy' });
});

/**
 * GET /api/test-db
 * Database connection test endpoint
 * Executes a simple SELECT NOW() query to verify database connectivity
 * Returns database server time on success
 */
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

/**
 * 404 Handler for Undefined API Routes
 * Catches all undefined routes and returns a JSON error response
 * Placed last to only catch routes not handled by specific routers
 */
app.use('*', (req, res) => {
  res.status(404).json({ message: 'API endpoint not found' });
});

/**
 * Start Express Server
 * 
 * Includes error handling for common issues:
 * - EADDRINUSE: Port already in use
 * - Other errors: General server startup issues
 * 
 * Provides helpful error messages for developers
 */
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

/**
 * Graceful Shutdown Handler
 * Handles SIGINT signal (Ctrl+C) to allow for graceful server shutdown
 * Could be extended to close database connections, finish pending requests, etc.
 */
process.on('SIGINT', () => {
  process.exit();
});