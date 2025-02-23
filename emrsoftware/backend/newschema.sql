-- Connect to the EMR database
\c emr_database;

-- Define custom enumeration types for data consistency and validation
-- Gender options for patient records
CREATE TYPE gender_type AS ENUM ('Male', 'Female', 'Other');
-- Status tracking for appointments
CREATE TYPE appointment_status AS ENUM ('Confirmed', 'Canceled', 'Completed', 'Pending');
-- Payment status for billing records
CREATE TYPE payment_status AS ENUM ('Paid', 'Pending', 'Overdue');
-- Access control levels for system security
CREATE TYPE access_level AS ENUM ('View', 'Edit');
-- User roles for permission management
CREATE TYPE user_role AS ENUM ('Admin', 'Doctor', 'Patient', 'Staff');

-- Core Tables

-- User authentication and access control
CREATE TABLE UserAccounts (
    UserID SERIAL PRIMARY KEY,
    Username VARCHAR(50) UNIQUE NOT NULL,  -- Unique username for login
    PasswordHash VARCHAR(255) NOT NULL,    -- Securely hashed password
    Role user_role NOT NULL,               -- User's role in the system
    LastLogin TIMESTAMP                    -- Track user activity
);

-- Patient demographics and contact information
CREATE TABLE Patients (
    PatientID SERIAL PRIMARY KEY,
    UserID INTEGER REFERENCES UserAccounts(UserID),  -- Link to user account
    FirstName VARCHAR(50) NOT NULL,
    LastName VARCHAR(50) NOT NULL,
    DOB DATE NOT NULL,                              -- Date of birth
    Gender gender_type NOT NULL,
    Address TEXT,
    PhoneNumber VARCHAR(20),
    Email VARCHAR(100)
);

-- Doctor profiles and specializations
CREATE TABLE Doctors (
    DoctorID SERIAL PRIMARY KEY,
    UserID INTEGER REFERENCES UserAccounts(UserID),  -- Link to user account
    FirstName VARCHAR(50) NOT NULL,
    LastName VARCHAR(50) NOT NULL,
    Specialization VARCHAR(100),                     -- Medical specialty
    PhoneNumber VARCHAR(20),
    Email VARCHAR(100)
);

-- Appointment scheduling and tracking
CREATE TABLE Appointments (
    AppointmentID SERIAL PRIMARY KEY,
    PatientID INTEGER REFERENCES Patients(PatientID),
    DoctorID INTEGER REFERENCES Doctors(DoctorID),
    AppointmentDate DATE NOT NULL,
    AppointmentTime TIME NOT NULL,
    ReasonForVisit TEXT,
    Status appointment_status DEFAULT 'Pending'      -- Track appointment status
);

-- Clinical documentation
CREATE TABLE MedicalRecords (
    RecordID SERIAL PRIMARY KEY,
    PatientID INTEGER REFERENCES Patients(PatientID),
    DoctorID INTEGER REFERENCES Doctors(DoctorID),
    VisitDate DATE NOT NULL,
    Diagnosis TEXT,
    Treatment TEXT,
    Notes TEXT
);

-- Medication management
CREATE TABLE Prescriptions (
    PrescriptionID SERIAL PRIMARY KEY,
    RecordID INTEGER REFERENCES MedicalRecords(RecordID),  -- Link to visit record
    MedicationName VARCHAR(100) NOT NULL,
    Dosage VARCHAR(50),                                    -- Medication strength
    Frequency VARCHAR(50),                                 -- How often to take
    StartDate DATE,
    EndDate DATE
);

-- Financial tracking
CREATE TABLE Billing (
    BillingID SERIAL PRIMARY KEY,
    PatientID INTEGER REFERENCES Patients(PatientID),
    AppointmentID INTEGER REFERENCES Appointments(AppointmentID) UNIQUE,  -- One bill per appointment
    ServiceDescription TEXT,
    AmountCharged DECIMAL(10,2),
    AmountPaid DECIMAL(10,2) DEFAULT 0.00,
    PaymentStatus payment_status DEFAULT 'Pending'
);

-- Patient allergy tracking
CREATE TABLE Allergies (
    AllergyID SERIAL PRIMARY KEY,
    PatientID INTEGER REFERENCES Patients(PatientID),
    AllergyType VARCHAR(100),
    Severity VARCHAR(50),
    Notes TEXT
);

-- System activity monitoring for security and compliance
CREATE TABLE AuditLogs (
    LogID SERIAL PRIMARY KEY,
    UserID INTEGER REFERENCES UserAccounts(UserID),
    Action TEXT NOT NULL,                    -- What was done
    TableAffected VARCHAR(50),               -- Where it was done
    RecordID INTEGER,                        -- Specific record affected
    Timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Initial Data Setup

-- Create admin account with hashed password
INSERT INTO UserAccounts (Username, PasswordHash, Role) 
VALUES ('admin', '$2b$10$tH6ysG8mwGZBJO9S/4KU4eIBWI7QVK7dVVVNB0q1CKZDTk9mV6KTm', 'Admin');

-- Create test doctor account
INSERT INTO UserAccounts (Username, PasswordHash, Role) 
VALUES ('testuser', '$2b$10$LlEp4eSnkxWcYI/mvDyMz.qFzGQCsEByZaHrMaAYsHnVZ6.nqKyKq', 'Doctor');

-- Create test patient account
INSERT INTO UserAccounts (Username, PasswordHash, Role) 
VALUES ('testpatient', '$2b$10$8T8VN3QzTtJ4kEPH3JU2yutQX1V8fZvUjvEi9Uu4p8HwKQiBybhOy', 'Patient');

-- Set up database permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO emr_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO emr_user;