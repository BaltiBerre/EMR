// src/config/database.js
const { Pool } = require('pg');
require('dotenv').config();

//opens up a pool of connections using information from .env to authorise entry into the database

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
});

// Test database connection
const testConnection = async () => {
  try {
    const client = await pool.connect();
    console.log('Database connection successful');
    client.release(); 
    return true;
  } catch (err) {
    console.error('Database connection error:', err.message);
    return false;
  }
};

module.exports = {
  pool,
  query: (text, params) => pool.query(text, params),
  testConnection,
};