// emrsoftware/security-testing/xss-test.mjs
import axios from 'axios';
import chalk from 'chalk';

// Configuration
const config = {
  apiUrl: 'http://localhost:4000',
  authEndpoint: '/api/auth/login',
  credentials: {
    admin: {
      Username: 'admin',
      Password: 'adminpassword'
    }
  }
};

// XSS payloads to test
const xssPayloads = [
  "<script>alert('XSS')</script>",
  "<img src=x onerror=alert('XSS')>",
  "<body onload=alert('XSS')>",
  "<svg/onload=alert('XSS')>",
  "javascript:alert('XSS')",
  "<iframe src=\"javascript:alert('XSS')\"></iframe>",
  "\"><script>alert('XSS')</script>"
];

// Endpoints to test for XSS
const endpoints = [
  { 
    url: '/api/patients', 
    method: 'post', 
    data: {
      FirstName: 'Test',
      LastName: 'Patient',
      DOB: '1990-01-01',
      Gender: 'Male',
      Address: '123 Test St',
      PhoneNumber: '555-555-5555',
      Email: 'test@example.com'
    }
  },
  {
    url: '/api/appointments',
    method: 'post',
    data: {
      PatientID: 1,
      DoctorID: 1,
      AppointmentDate: '2025-04-01',
      AppointmentTime: '14:00',
      ReasonForVisit: 'Check-up',
      Status: 'Confirmed'
    }
  },
  {
    url: '/api/medical-records',
    method: 'post',
    data: {
      PatientID: 1,
      DoctorID: 1,
      VisitDate: '2025-04-01',
      Diagnosis: 'Healthy',
      Treatment: 'None',
      Notes: 'Regular check-up'
    }
  }
];

async function runXSSTests() {
  console.log(chalk.blue.bold('\n=== Cross-Site Scripting (XSS) Vulnerability Test ===\n'));
  
  let authCookies = null;
  
  // First authenticate to get cookies
  try {
    const authResponse = await axios.post(`${config.apiUrl}${config.authEndpoint}`, config.credentials.admin);
    authCookies = authResponse.headers['set-cookie'];
    console.log(chalk.green('✓ Authentication successful'));
  } catch (error) {
    console.log(chalk.red('✗ Authentication failed:', error.message));
    return;
  }
  
  const vulnerabilities = [];
  
  // Test each endpoint with each payload
  for (const endpoint of endpoints) {
    console.log(chalk.yellow(`\nTesting endpoint: ${endpoint.url} [${endpoint.method.toUpperCase()}]`));
    
    for (const payload of xssPayloads) {
      try {
        const headers = { Cookie: authCookies };
        const modifiedData = { ...endpoint.data };
        
        // Inject payload into each string field
        Object.keys(modifiedData).forEach(key => {
          if (typeof modifiedData[key] === 'string') {
            modifiedData[key] = payload;
          }
        });
        
        const response = await axios.post(`${config.apiUrl}${endpoint.url}`, modifiedData, { headers });
        
        // Check for reflections of the payload in the response
        const responseText = JSON.stringify(response.data);
        
        if (responseText.includes(payload)) {
          vulnerabilities.push({
            endpoint: endpoint.url,
            method: endpoint.method,
            payload,
            reflection: true,
            field: 'response data',
            response: responseText.substring(0, 150) + '...' // Truncate long responses
          });
          console.log(chalk.red(`✗ Potential XSS vulnerability found: payload reflected in response`));
        } else {
          console.log(chalk.green(`✓ No reflection detected with payload: ${payload.substring(0, 30)}...`));
        }
        
      } catch (error) {
        // Check if the error response contains our payload
        if (error.response && error.response.data) {
          const responseText = JSON.stringify(error.response.data);
          
          if (responseText.includes(payload)) {
            vulnerabilities.push({
              endpoint: endpoint.url,
              method: endpoint.method,
              payload,
              reflection: true,
              field: 'error response',
              response: responseText.substring(0, 150) + '...' // Truncate long responses
            });
            console.log(chalk.red(`✗ Potential XSS vulnerability found: payload reflected in error response`));
          } else {
            console.log(chalk.yellow(`! Request failed but no reflection detected with payload: ${payload.substring(0, 30)}...`));
          }
        } else {
          console.log(chalk.yellow(`! Request failed with payload: ${payload.substring(0, 30)}... - ${error.message}`));
        }
      }
      
      // Small delay to avoid overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  }
  
  // Summary
  console.log(chalk.blue.bold('\n=== XSS Test Summary ===\n'));
  
  if (vulnerabilities.length === 0) {
    console.log(chalk.green('✓ No XSS vulnerabilities detected'));
  } else {
    console.log(chalk.red(`✗ Found ${vulnerabilities.length} potential XSS vulnerabilities:`));
    
    vulnerabilities.forEach((vuln, index) => {
      console.log(chalk.red(`\nVulnerability #${index + 1}:`));
      console.log(chalk.yellow(`Endpoint: ${vuln.endpoint} [${vuln.method.toUpperCase()}]`));
      console.log(chalk.yellow(`Payload: ${vuln.payload}`));
      console.log(chalk.yellow(`Reflection in: ${vuln.field}`));
      
      if (vuln.response) {
        console.log(chalk.yellow(`Response: ${vuln.response}`));
      }
    });
    
    console.log(chalk.red('\nRecommendation: Implement proper input validation and output encoding to prevent XSS attacks.'));
  }
}

// Run the tests
runXSSTests();