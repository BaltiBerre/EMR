CREATE TABLE Patients (
  PatientID SERIAL PRIMARY KEY,
  FirstName VARCHAR(50) NOT NULL,
  LastName VARCHAR(50) NOT NULL,
  DOB DATE NOT NULL,
  Gender VARCHAR(10),
  Address TEXT,
  PhoneNumber VARCHAR(15),
  Email VARCHAR(100)
);

CREATE TABLE Doctors (
  DoctorID SERIAL PRIMARY KEY,
  FirstName VARCHAR(50) NOT NULL,
  LastName VARCHAR(50) NOT NULL,
  Specialization VARCHAR(100),
  PhoneNumber VARCHAR(15),
  Email VARCHAR(100)
);

CREATE TABLE Appointments (
  AppointmentID SERIAL PRIMARY KEY,
  PatientID INTEGER REFERENCES Patients(PatientID),
  DoctorID INTEGER REFERENCES Doctors(DoctorID),
  AppointmentDate DATE NOT NULL,
  AppointmentTime TIME NOT NULL,
  ReasonForVisit TEXT,
  Status VARCHAR(20)
);

CREATE TABLE MedicalRecords (
  RecordID SERIAL PRIMARY KEY,
  PatientID INTEGER REFERENCES Patients(PatientID),
  DoctorID INTEGER REFERENCES Doctors(DoctorID),
  VisitDate DATE NOT NULL,
  Diagnosis TEXT,
  Treatment TEXT,
  Notes TEXT
);

CREATE TABLE Prescriptions (
  PrescriptionID SERIAL PRIMARY KEY,
  RecordID INTEGER REFERENCES MedicalRecords(RecordID),
  MedicationName VARCHAR(100) NOT NULL,
  Dosage VARCHAR(50),
  Frequency VARCHAR(50),
  StartDate DATE,
  EndDate DATE
);

CREATE TABLE Billing (
  BillingID SERIAL PRIMARY KEY,
  PatientID INTEGER REFERENCES Patients(PatientID),
  AppointmentID INTEGER REFERENCES Appointments(AppointmentID),
  ServiceDescription TEXT,
  AmountCharged DECIMAL(10, 2),
  AmountPaid DECIMAL(10, 2),
  PaymentStatus VARCHAR(20)
);

CREATE TABLE Allergies (
  AllergyID SERIAL PRIMARY KEY,
  PatientID INTEGER REFERENCES Patients(PatientID),
  AllergyType VARCHAR(100),
  Severity VARCHAR(20),
  Notes TEXT
);

CREATE TABLE UserAccounts (
  UserID SERIAL PRIMARY KEY,
  Username VARCHAR(50) UNIQUE NOT NULL,
  PasswordHash VARCHAR(100) NOT NULL,
  Role VARCHAR(20) NOT NULL,
  LastLogin TIMESTAMP
);

CREATE TABLE PatientControlledAccess (
  AccessID SERIAL PRIMARY KEY,
  PatientID INTEGER REFERENCES Patients(PatientID),
  UserID INTEGER REFERENCES UserAccounts(UserID),
  AccessLevel VARCHAR(20),
  EffectiveDate DATE,
  ExpirationDate DATE
);

CREATE TABLE AuditLogs (
  LogID SERIAL PRIMARY KEY,
  UserID INTEGER REFERENCES UserAccounts(UserID),
  Action VARCHAR(100),
  TableAffected VARCHAR(50),
  RecordID INTEGER,
  Timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);