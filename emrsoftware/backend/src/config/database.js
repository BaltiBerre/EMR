// src/config/database.js
const { Pool } = require('pg');
require('dotenv').config();

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

// Initialize tables if they don't exist
const initializeTables = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS UserAccounts (
        UserID SERIAL PRIMARY KEY,
        Username VARCHAR(255) UNIQUE NOT NULL,
        PasswordHash VARCHAR(255) NOT NULL,
        Role VARCHAR(50) NOT NULL CHECK (Role IN ('patient', 'doctor', 'admin')),
        CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        LastLogin TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS Patients (
        PatientID SERIAL PRIMARY KEY,
        FirstName VARCHAR(100) NOT NULL,
        LastName VARCHAR(100) NOT NULL,
        DOB DATE NOT NULL,
        Gender VARCHAR(10) CHECK (Gender IN ('Male', 'Female', 'Other')),
        Address TEXT,
        PhoneNumber VARCHAR(20),
        Email VARCHAR(255) UNIQUE,
        CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS Appointments (
        AppointmentID SERIAL PRIMARY KEY,
        PatientID INTEGER REFERENCES Patients(PatientID),
        DoctorID INTEGER REFERENCES UserAccounts(UserID),
        AppointmentDate DATE NOT NULL,
        AppointmentTime TIME NOT NULL,
        ReasonForVisit TEXT,
        Status VARCHAR(20) CHECK (Status IN ('Scheduled', 'Completed', 'Cancelled')),
        CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS MedicalRecords (
        RecordID SERIAL PRIMARY KEY,
        PatientID INTEGER REFERENCES Patients(PatientID),
        DoctorID INTEGER REFERENCES UserAccounts(UserID),
        VisitDate DATE NOT NULL,
        Diagnosis TEXT NOT NULL,
        Treatment TEXT NOT NULL,
        Notes TEXT,
        CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Database tables initialized successfully');
    return true;
  } catch (err) {
    console.error('Error initializing database tables:', err.message);
    return false;
  }
};

module.exports = {
  pool,
  query: (text, params) => pool.query(text, params),
  testConnection,
  initializeTables
};