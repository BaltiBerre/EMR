// src/middleware/auditLogger.js
const { pool } = require('../config/database');

// This is the middleware responsible for auditing and tracking every time any API call happens
// It's implemented at the start right before any of the other routes in the server.js file

// The following tracks 
//    when the request happened
//    which user made it
//    what route was hit
//    which table affected
//    what action type (UPDATE or READ)
//    what the request body contained
//    whether it succeded (based on http status)



const auditLogger = async (req, res, next) => {
  // Store the original send method
  const originalSend = res.send;
  const originalJson = res.json;
  const originalEnd = res.end;
  
  try {
    // Capture request metadata
    const startTime = new Date();
    const method = req.method;
    const path = req.originalUrl;
    const ip = req.ip || req.connection.remoteAddress;
    
    // Add debug logs for troubleshooting
    console.log('--- Audit Logger ---');
    console.log('Path:', path);
    console.log('Method:', method);
    
    // Extract userId from the tokenUser property set by previous middleware
    // Or from req.user set by the auth middleware
    let userId = null;
    let username = null;
    
    // First try to get from tokenUser (set by our extraction middleware)
    if (req.tokenUser) {
      userId = req.tokenUser.userId;
      username = req.tokenUser.username;
      console.log('Using tokenUser for audit:', req.tokenUser);
    }
    // If not found, try from req.user (set by auth middleware)
    else if (req.user) {
      userId = req.user.UserID;
      username = req.user.Username;
      console.log('Using req.user for audit:', req.user);
    }
    // For login endpoints, don't try to log user info (it's not available yet)
    else if (path.includes('/api/auth/login')) {
      console.log('Login request - no user info expected');
    } 
    // For other endpoints without user info, log a warning
    else {
      console.log('WARNING: No user information available for audit logging');
    }
    
    console.log('Final userId for audit:', userId);
    console.log('Final username for audit:', username);
    
    // Function to determine action type based on HTTP method
    const getActionType = (method) => {
      switch (method) {
        case 'GET': return 'READ';
        case 'POST': return 'CREATE';
        case 'PUT': return 'UPDATE';
        case 'PATCH': return 'PARTIAL_UPDATE';
        case 'DELETE': return 'DELETE';
        default: return method;
      }
    };
    
    // Function to determine the affected table based on path
    const getTableAffected = (path) => {
      // Extract the resource from the path
      const pathParts = path.split('/');
      if (pathParts.length < 3) return 'unknown';
      
      // Map API endpoints to database tables more accurately
      const endpointToTable = {
        'patients': 'Patients',
        'doctors': 'Doctors',
        'appointments': 'Appointments',
        'medical-records': 'MedicalRecords',
        'auth': 'UserAccounts',
        'patient-overview': 'Patients',
        'my-patients': 'Doctors',
        'my-appointments': 'Appointments',
        'my-records': 'MedicalRecords'
      };
      
      const endpoint = pathParts[2].split('?')[0]; // Remove any query params
      return endpointToTable[endpoint] || endpoint;
    };
    
    // Extract record ID from path if present (e.g., /api/patients/123)
    const getRecordId = (path) => {
      const pathParts = path.split('/');
      // Check if we have a potential ID in the URL (position 3 in most RESTful APIs)
      if (pathParts.length >= 4) {
        const potentialId = pathParts[3].split('?')[0]; // Remove any query params
        // If it's a number, it's likely an ID
        if (/^\d+$/.test(potentialId)) {
          return parseInt(potentialId, 10);
        }
      }
      return null;
    };
    
    const tableAffected = getTableAffected(path);
    const recordId = getRecordId(path);
    const actionType = getActionType(method);
    
    // Sanitize request body for sensitive operations (remove passwords)
    const sanitizeBody = (body) => {
      if (!body) return null;
      
      const sanitized = { ...body };
      if (sanitized.Password) sanitized.Password = '[REDACTED]';
      if (sanitized.password) sanitized.password = '[REDACTED]';
      if (sanitized.PasswordHash) sanitized.PasswordHash = '[REDACTED]';
      if (sanitized.passwordHash) sanitized.passwordHash = '[REDACTED]';
      
      return JSON.stringify(sanitized);
    };
    
    // Log request body for debugging (sanitized)
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      console.log('Request body present:', !!req.body);
      console.log('Request body keys:', req.body ? Object.keys(req.body) : 'none');
    }
    
    // Only include request data for write operations
    const requestData = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) 
      ? sanitizeBody(req.body) 
      : null;
    
    // Create a monitoring function to capture response data and log
    const logRequest = (statusCode, responseTime) => {
      // Debug what we're about to log
      console.log('About to insert audit log with:');
      console.log('- userId:', userId);
      console.log('- username:', username);
      console.log('- action:', `${method} ${path} [${statusCode}] ${responseTime}ms`);
      console.log('- tableAffected:', tableAffected);
      console.log('- recordId:', recordId);
      console.log('- actionType:', actionType);
      console.log('- ip:', ip);
      console.log('- requestData:', requestData ? 'present (sanitized)' : 'none');
      
      // Skip audit logging for login attempts without user info
      if (path.includes('/api/auth/login') && !userId) {
        console.log('Skipping audit log for login attempt');
        return;
      }
      
      // Create audit log entry
      pool.query(
        `INSERT INTO auditlogs(
          userid, 
          username,
          action, 
          tableaffected, 
          recordid, 
          timestamp, 
          action_type, 
          ip_address, 
          request_data,
          success
        ) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          userId, 
          username,
          `${method} ${path} [${statusCode}] ${responseTime}ms`, 
          tableAffected,
          recordId,
          startTime,
          actionType,
          ip,
          requestData,
          statusCode < 400 // success is true if status code is less than 400
        ]
      ).catch(err => {
        console.error('Failed to create audit log:', err);
      });
    };
    
    // Override response methods to capture status code and timing
    res.send = function(data) {
      const responseTime = new Date() - startTime;
      logRequest(res.statusCode, responseTime);
      return originalSend.call(this, data);
    };
    
    res.json = function(data) {
      const responseTime = new Date() - startTime;
      logRequest(res.statusCode, responseTime);
      return originalJson.call(this, data);
    };
    
    res.end = function(data) {
      const responseTime = new Date() - startTime;
      logRequest(res.statusCode, responseTime);
      return originalEnd.call(this, data);
    };
    
    next();
  } catch (err) {
    console.error('Error in audit logger:', err);
    next(); // Continue even if logging fails
  }
};

module.exports = auditLogger;