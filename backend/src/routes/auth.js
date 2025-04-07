// Required dependencies
const authenticateToken = require('../middleware/auth');  // JWT authentication middleware
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');                        // Password hashing library
const jwt = require('jsonwebtoken');                     // JSON Web Token library
const { body, validationResult } = require('express-validator');  // Request validation
const { pool } = require('../config/database');          // Database connection pool
const xss = require('xss');

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

  // Sanitize inputs
  const Username = xss(req.body.Username);
  const Password = req.body.Password; // Don't sanitize passwords
  const Role = xss(req.body.Role);
  
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

  // Sanitize input
  const Username = xss(req.body.Username);
  const Password = req.body.Password; // Don't sanitize passwords
  
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
        res.cookie('token', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production', // Only use HTTPS in production
          sameSite: 'strict',
          maxAge: 3600000 // 1 hour in milliseconds
        }).json({ message: 'Login successful', role: user.role.toLowerCase() });
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

// POST /auth/logout
// Clear authentication cookie
router.post('/logout', (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  });
  
  res.json({ message: 'Logged out successfully' });
});


// DELETE /auth/users/:id
// Delte a user account (requires admin)
// DELETE /auth/users/:id
// Delete a user account (requires admin privileges)
router.delete('/users/:id', authenticateToken, async (req, res) => {
  // Check authorization
  if (req.user.Role.toLowerCase() !== 'admin') {
    return res.status(403).json({ message: 'Access denied. Insufficient privileges.' });
  }

  const { id } = req.params;
  try {
    // Delete user account
    const result = await pool.query('DELETE FROM UserAccounts WHERE UserID = $1 RETURNING *', [id]);
    
    if (result.rows.length > 0) {
      res.json({ message: 'User account deleted successfully' });
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  } catch (err) {
    console.error('Error deleting user:', err);
    
    if (err.code === '23503') { // Foreign key constraint violation
      res.status(400).json({ error: 'Cannot delete user. There are related records.' });
    } else {
      res.status(500).json({ error: 'Internal server error', details: err.message });
    }
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