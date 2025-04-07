// emrsoftware/security-testing/zap-config.js
module.exports = {
    apiUrl: 'http://localhost:4000', // Your backend API URL
    authEndpoint: '/api/auth/login',
    credentials: {
      admin: {
        Username: 'admin',
        Password: 'adminpassword'
      },
      doctor: {
        Username: 'testuser',
        Password: 'testpassword'
      },
      patient: {
        Username: 'testpatient',
        Password: 'securepassword'
      }
    },
    endpointsToTest: [
      // Authentication endpoints
      '/api/auth/login',
      '/api/auth/register',
      // Patient endpoints
      '/api/patients',
      '/api/patients/1',
      // Doctor endpoints
      '/api/doctors',
      '/api/doctors/1',
      // Appointment endpoints
      '/api/appointments',
      // Medical records endpoints
      '/api/medical-records',
      // Overview endpoints
      '/api/patient-overview'
    ]
  };