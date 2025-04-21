/**
 * Database Connection Test Script
 * 
 * This script tests the PostgreSQL database connection by:
 * 1. Creating a connection pool using configuration from environment variables
 * 2. Connecting to the database
 * 3. Executing a simple query to retrieve the current timestamp
 * 4. Handling errors appropriately
 * 5. Properly closing the connection pool
 * 
 * Environment Variables Required:
 * - DB_USER: Database username
 * - DB_HOST: Database host address
 * - DB_NAME: Database name
 * - DB_PASSWORD: Database password
 * - DB_PORT: Database port (typically 5432 for PostgreSQL)
 */

// Import the Pool class from pg module for PostgreSQL connection pooling
const { Pool } = require('pg');

// Load environment variables from .env file
require('dotenv').config();

/**
 * Create a connection pool with configuration from environment variables
 * Pool manages multiple database connections efficiently, reusing them as needed
 * Each property maps to a specific environment variable for database credentials
 */
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

/**
 * Test database connection function
 * 
 * This async function:
 * 1. Acquires a client from the pool
 * 2. Runs a simple query to verify connectivity
 * 3. Releases the client back to the pool
 * 4. Handles errors
 * 5. Ensures the pool is closed properly
 */
async function testConnection() {
  try {
    // Get a client from the connection pool
    const client = await pool.connect();
    console.log('Successfully connected to the database');
    
    // Execute a simple query to retrieve current timestamp from database
    // This verifies both connection and query execution capabilities
    const res = await client.query('SELECT NOW()');
    console.log('Current time from database:', res.rows[0].now);
    
    // Return the client to the pool for reuse
    client.release();
  } catch (err) {
    // Log any connection or query errors
    console.error('Error connecting to the database', err);
  } finally {
    // Ensure the connection pool is closed
    // This is important for properly terminating the script
    await pool.end();
  }
}

// Execute the test function
testConnection();