// Required dependencies
const authenticateToken = require('../middleware/auth');  // JWT authentication middleware
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');                        // Password hashing library
const jwt = require('jsonwebtoken');                     // JSON Web Token library
const { body, validationResult } = require('express-validator');  // Request validation
const { pool } = require('../config/database');          // Database connection pool

// POST /auth/register  
// Register a new user account
router.post('/register', [
  // Validation middleware
  body('Username').isLength({ min: 3 }).withMessage('Username must be at least 3 characters long'),
  body('Password').isLength({ min: 4 }).withMessage('Password must be at least 8 characters long'),
  body('Role').isIn(['Admin', 'Doctor', 'Patient', 'Staff']).withMessage('Invalid role')
], async (req, res) => {
  // Check for validation errors
  console.log("Register request body:", req.body); // Log the incoming request
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { Username, Password, Role } = req.body;
  try {
    // Hash password before storing
    const hashedPassword = await bcrypt.hash(Password, 10);
    // Insert new user into database
    const result = await pool.query(
      'INSERT INTO UserAccounts (Username, PasswordHash, Role) VALUES ($1, $2, $3) RETURNING UserID, Username, Role',
      [Username, hashedPassword, Role]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    if (err.code === '23505') { // PostgreSQL unique constraint violation
      res.status(409).json({ error: 'Username already exists' });
    } else {
      res.status(500).json({ error: 'Internal server error', details: err.message });
    }
  }
});

// POST /auth/login
// Authenticate user and issue JWT token
router.post('/login', [
  // Validation middleware
  body('Username').notEmpty().withMessage('Username is required'),
  body('Password').notEmpty().withMessage('Password is required')
], async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { Username, Password } = req.body;
  console.log('Login attempt for username:', Username);

  try {
    // Find user in database
    const result = await pool.query('SELECT * FROM UserAccounts WHERE Username = $1', [Username]);
    console.log('Database result:', result.rows);
    
    if (result.rows.length > 0) {
      const user = result.rows[0];
      console.log('Found user:', user.username);
      console.log('User role:', user.role);
      console.log('Stored hash:', user.passwordhash);
      
      // Compare provided password with stored hash
      const isMatch = await bcrypt.compare(Password, user.passwordhash);
      console.log('Password match:', isMatch);

      if (isMatch) {
        // Normalize role to lowercase
        const userRole = user.role ? String(user.role).toLowerCase() : 'user';

        // Generate JWT token with user information
        const token = jwt.sign(
          { UserID: user.userid, Username: user.username, Role: user.role },
          process.env.JWT_SECRET,
          { expiresIn: '1h' }
        );
        res.json({ message: 'Login successful', token, role: user.role.toLowerCase() });
      } else {
        res.status(401).json({ error: 'Invalid credentials' });
      }
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

// GET /auth/staff-count
// Get count of staff members (doctors and admins)
// Requires authentication
router.get('/staff-count', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT COUNT(*) FROM UserAccounts WHERE Role IN ('doctor', 'admin')"
    );
    res.json({ count: parseInt(result.rows[0].count) });
  } catch (err) {
    console.error('Error getting staff count:', err);
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

// POST /auth/create-user
// Create a new user account (administrative endpoint)
router.post('/create-user', async (req, res) => {
  const { username, password, role } = req.body;
  
  // Validate required fields
  if (!username || !password || !role) {
    return res.status(400).json({ message: 'Username, password, and role are required' });
  }

  try {
    // Hash password and create user
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

// Export router for use in main application
module.exports = router;