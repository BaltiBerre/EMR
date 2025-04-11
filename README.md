# EMR Software

A comprehensive Electronic Medical Records system designed for healthcare institutions. This system helps manage patient data, medical records, appointments, and more in a secure, HIPAA-compliant environment.

## Project Overview

This EMR software is an Independent Study (IS) project that implements a full-stack web application for managing healthcare data. The system provides role-based access control (admin, doctor, patient) and features for managing various aspects of patient care and administration.

## Key Features

- **User Authentication & Authorization**: Secure login with JWT-based authentication and role-based access control
- **Patient Management**: Add, view, update, and delete patient records
- **Doctor Management**: Admin tools for managing healthcare providers
- **Appointment Scheduling**: Schedule and manage patient appointments
- **Medical Records**: Create, view, and manage patient medical history
- **FHIR Integration**: Support for importing healthcare data in FHIR format
- **Security Features**: HIPAA compliance measures, password hashing, XSS protection
- **Responsive UI**: Modern interface built with React and Tailwind CSS

## Technology Stack

### Backend
- Node.js
- Express.js
- PostgreSQL
- JSON Web Tokens (JWT)
- bcrypt for password hashing

### Frontend
- React
- React Router
- Axios
- Tailwind CSS
- Lucide React (icons)

## Project Structure

```
EMR/
├── backend/
│   ├── config/
│   │   └── database.js
│   ├── middleware/
│   │   └── auth.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── appointments.js
│   │   ├── doctors.js
│   │   ├── fhirImport.js
│   │   ├── medicalRecords.js
│   │   ├── patients.js
│   │   └── patientOverview.js
│   ├── src/
│   │   └── utils/
│   │       └── fhirProcessor.js
│   ├── server.js
│   └── package.json
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── admin/
│   │   │   │   └── DoctorManagement.js
│   │   │   ├── Login.js
│   │   │   ├── PatientDetails.js
│   │   │   ├── PatientList.js
│   │   │   ├── PatientOverview.js
│   │   │   └── RegisterForm.js
│   │   ├── AdminDashboard.js
│   │   ├── App.js
│   │   ├── DoctorDashboard.js
│   │   ├── PatientDashboard.js
│   │   ├── RoleBasedRouter.js
│   │   └── index.js
│   ├── package.json
│   ├── tailwind.config.js
│   └── postcss.config.js
└── package.json
```

## Installation & Setup

### Prerequisites
- Node.js (v14 or higher)
- PostgreSQL database
- npm or yarn

### Backend Setup
1. Navigate to the backend directory:
   ```
   cd backend
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file in the backend directory with the following variables:
   ```
   PORT=4000
   DB_USER=your_db_username
   DB_HOST=localhost
   DB_NAME=emr_database
   DB_PASSWORD=your_db_password
   DB_PORT=5432
   JWT_SECRET=your_secure_jwt_secret
   ```

4. Initialize the database:
   ```
   # Log into PostgreSQL
   psql -U your_db_username
   
   # Create the database
   CREATE DATABASE emr_database;
   
   # Connect to the database
   \c emr_database
   
   # Tables will be automatically created when the server starts
   ```

5. Start the backend server:
   ```
   npm start
   ```

### Frontend Setup
1. Navigate to the frontend directory:
   ```
   cd frontend
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file in the frontend directory:
   ```
   REACT_APP_API_URL=http://localhost:4000
   ```

4. Start the frontend development server:
   ```
   npm start
   ```

## Usage

### Default User Accounts
The system comes with default test accounts for demonstration:

- **Admin**
  - Username: admin
  - Password: adminpassword

- **Doctor**
  - Username: testuser
  - Password: testpassword

- **Patient**
  - Username: testpatient
  - Password: securepassword

### Accessing the Application
Once both backend and frontend servers are running:

1. Open your browser and navigate to `http://localhost:3000`
2. Log in with one of the default accounts based on your role
3. Use the role-specific dashboard to interact with the system features

## Security Considerations

This application implements several security features:
- Password hashing using bcrypt
- JWT-based authentication with HTTPOnly cookies
- XSS protection
- Rate limiting for login attempts
- Input validation and sanitization

However, for a production environment, additional security measures should be implemented:
- HTTPS configuration
- Enhanced audit logging
- Regular security updates
- Additional database security measures


### Adding Features
When adding new features:
1. Create or modify backend routes in the appropriate file
2. Implement frontend components to interact with the API
3. Ensure proper authentication and authorization
4. Test across different user roles
5. Document the changes

## License

I don't know just don't steal it I guess

## Acknowledgments

This project was developed as an Independent Study at The College of Wooster, Department of Mathematical & Computational Sciences.
