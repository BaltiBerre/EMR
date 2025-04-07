// emrsoftware/security-testing/hipaa-test.mjs
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import axios from 'axios';
import { fileURLToPath } from 'url';

// Fix for __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

async function runHIPAATest() {
  console.log(chalk.blue.bold('\n=== HIPAA Compliance Security Test ===\n'));
  
  const complianceIssues = [];
  
  console.log(chalk.yellow('Running HIPAA compliance checks for healthcare application...'));
  
  // Test 1: Authentication and Access Controls
  console.log(chalk.yellow('\nTest 1: Authentication and Access Controls'));
  
  // 1.1 Check for authentication requirement
  try {
    await axios.get(`${config.apiUrl}/api/patients`);
    // If this succeeds without authentication, it's a compliance issue
    complianceIssues.push({
      category: 'Authentication',
      severity: 'High',
      description: 'API endpoints accessible without authentication',
      requirement: 'HIPAA requires access controls to verify that a person seeking access to ePHI is authorized to do so',
      remediation: 'Implement authentication middleware for all API endpoints that access PHI'
    });
    console.log(chalk.red('✗ API endpoints are accessible without authentication'));
  } catch (error) {
    if (error.response && error.response.status === 401) {
      console.log(chalk.green('✓ Authentication is required for API access'));
    } else {
      console.log(chalk.yellow(`! Could not determine authentication requirement: ${error.message}`));
    }
  }
  
  // 1.2 Role-based access controls
  let authCookies = null;
  try {
    // Authenticate as admin
    const authResponse = await axios.post(`${config.apiUrl}${config.authEndpoint}`, config.credentials.admin);
    authCookies = authResponse.headers['set-cookie'];
    
    // Test if cookies contain role information (basic check)
    const cookieString = authCookies ? authCookies.join('; ') : '';
    if (!cookieString.toLowerCase().includes('role') && !cookieString.includes('jwt')) {
      complianceIssues.push({
        category: 'Access Controls',
        severity: 'Medium',
        description: 'No evidence of role-based access control in authentication tokens',
        requirement: 'HIPAA requires implementation of role-based access controls',
        remediation: 'Implement role-based access controls and include role information in authentication tokens'
      });
      console.log(chalk.red('✗ No evidence of role-based access control in authentication tokens'));
    } else {
      console.log(chalk.green('✓ Authentication tokens likely include role information'));
    }
  } catch (error) {
    console.log(chalk.red(`✗ Authentication failed: ${error.message}`));
  }
  
  // Test 2: Audit Controls
  console.log(chalk.yellow('\nTest 2: Audit Controls'));
  
  // 2.1 Check for audit logging
  try {
    // Make a request that should be logged
    if (authCookies) {
      try {
        await axios.get(`${config.apiUrl}/api/auditlogs`, {
          headers: { Cookie: authCookies }
        });
        console.log(chalk.green('✓ Audit logs endpoint exists'));
      } catch (error) {
        if (error.response && error.response.status === 404) {
          complianceIssues.push({
            category: 'Audit Controls',
            severity: 'High',
            description: 'No audit logging endpoint found',
            requirement: 'HIPAA requires mechanisms to record and examine system activity',
            remediation: 'Implement comprehensive audit logging for all actions related to PHI'
          });
          console.log(chalk.red('✗ No audit logging endpoint found'));
        } else if (error.response && error.response.status === 403) {
          console.log(chalk.green('✓ Audit logs endpoint exists but is properly restricted'));
        } else {
          console.log(chalk.yellow(`! Could not determine audit logging capability: ${error.message}`));
        }
      }
    }
  } catch (error) {
    console.log(chalk.red(`✗ Error checking audit controls: ${error.message}`));
  }
  
  // Test 3: Transmission Security
  console.log(chalk.yellow('\nTest 3: Transmission Security'));
  
  // 3.1 Check for HTTPS
  const url = new URL(config.apiUrl);
  if (url.protocol !== 'https:') {
    complianceIssues.push({
      category: 'Transmission Security',
      severity: 'High',
      description: 'Application does not use HTTPS for secure transmission',
      requirement: 'HIPAA requires encryption and integrity controls when transmitting ePHI',
      remediation: 'Implement HTTPS with TLS 1.2+ for all data transmission'
    });
    console.log(chalk.red('✗ Application is not using HTTPS'));
  } else {
    console.log(chalk.green('✓ Application is using HTTPS'));
  }
  
  // Test 4: Data Privacy
  console.log(chalk.yellow('\nTest 4: Data Privacy'));
  
  // 4.1 Check for sensitive data in responses
  try {
    if (authCookies) {
      const response = await axios.get(`${config.apiUrl}/api/patients`, {
        headers: { Cookie: authCookies }
      });
      
      if (response.data && Array.isArray(response.data) && response.data.length > 0) {
        const patientData = response.data[0];
        
        // Check if sensitive data is returned in clear text
        const sensitiveFields = [];
        if (patientData.ssn) sensitiveFields.push('SSN');
        if (patientData.dob) sensitiveFields.push('Date of Birth');
        if (patientData.address) sensitiveFields.push('Address');
        if (patientData.phonenumber) sensitiveFields.push('Phone Number');
        
        if (sensitiveFields.length > 0) {
          complianceIssues.push({
            category: 'Data Privacy',
            severity: 'Medium',
            description: `Sensitive information (${sensitiveFields.join(', ')}) returned in API responses`,
            requirement: 'HIPAA requires minimum necessary disclosure of PHI',
            remediation: 'Implement field-level access controls and data minimization in API responses'
          });
          console.log(chalk.red(`✗ Sensitive information (${sensitiveFields.join(', ')}) returned in API responses`));
        } else {
          console.log(chalk.green('✓ No obvious sensitive information in API responses'));
        }
      }
    }
  } catch (error) {
    console.log(chalk.red(`✗ Error checking data privacy: ${error.message}`));
  }
  
  // Test 5: Session Management
  console.log(chalk.yellow('\nTest 5: Session Management'));
  
  // 5.1 Check for session timeout
  try {
    if (authCookies) {
      const cookieString = authCookies.join('; ');
      const maxAgePart = cookieString.match(/Max-Age=(\d+)/i);
      const expiresPart = cookieString.match(/Expires=([^;]+)/i);
      
      if (maxAgePart) {
        const maxAge = parseInt(maxAgePart[1]);
        const maxAgeHours = maxAge / 3600;
        
        if (maxAgeHours > 12) {
          complianceIssues.push({
            category: 'Session Management',
            severity: 'Medium',
            description: `Session timeout is set to ${maxAgeHours.toFixed(2)} hours, which is long for healthcare apps`,
            requirement: 'HIPAA requires automatic logoff after a predetermined time of inactivity',
            remediation: 'Reduce session timeout to 30-60 minutes maximum for healthcare applications'
          });
          console.log(chalk.red(`✗ Session timeout is too long: ${maxAgeHours.toFixed(2)} hours`));
        } else if (maxAgeHours > 1) {
          console.log(chalk.yellow(`! Session timeout is ${maxAgeHours.toFixed(2)} hours, which is acceptable but not ideal for healthcare`));
        } else {
          console.log(chalk.green(`✓ Session timeout is appropriately short: ${maxAgeHours.toFixed(2)} hours`));
        }
      } else if (expiresPart) {
        const expires = new Date(expiresPart[1]);
        const now = new Date();
        const diffHours = (expires - now) / (1000 * 60 * 60);
        
        if (diffHours > 12) {
          complianceIssues.push({
            category: 'Session Management',
            severity: 'Medium',
            description: `Session timeout is set to ${diffHours.toFixed(2)} hours, which is long for healthcare apps`,
            requirement: 'HIPAA requires automatic logoff after a predetermined time of inactivity',
            remediation: 'Reduce session timeout to 30-60 minutes maximum for healthcare applications'
          });
          console.log(chalk.red(`✗ Session timeout is too long: ${diffHours.toFixed(2)} hours`));
        } else if (diffHours > 1) {
          console.log(chalk.yellow(`! Session timeout is ${diffHours.toFixed(2)} hours, which is acceptable but not ideal for healthcare`));
        } else {
          console.log(chalk.green(`✓ Session timeout is appropriately short: ${diffHours.toFixed(2)} hours`));
        }
      } else {
        complianceIssues.push({
          category: 'Session Management',
          severity: 'Medium',
          description: 'No session timeout detected in cookies',
          requirement: 'HIPAA requires automatic logoff after a predetermined time of inactivity',
          remediation: 'Implement session timeout of 30-60 minutes maximum'
        });
        console.log(chalk.red('✗ No session timeout detected in cookies'));
      }
    }
  } catch (error) {
    console.log(chalk.red(`✗ Error checking session management: ${error.message}`));
  }
  
  // Test 6: Emergency Access
  console.log(chalk.yellow('\nTest 6: Emergency Access'));
  console.log(chalk.yellow('! This test requires manual verification - check if the system has a break-glass mechanism for emergency access'));
  
  complianceIssues.push({
    category: 'Emergency Access',
    severity: 'Medium',
    description: 'Emergency access procedure not detected during automated testing',
    requirement: 'HIPAA requires procedures for obtaining necessary ePHI during an emergency',
    remediation: 'Implement and document emergency access procedures ("break-glass" functionality)'
  });
  
  // Test 7: Business Associate Agreements
  console.log(chalk.yellow('\nTest 7: Business Associate Agreements'));
  console.log(chalk.yellow('! This test requires manual verification - check if appropriate BAAs are in place with any third-party services'));
  
  complianceIssues.push({
    category: 'Business Associate Agreements',
    severity: 'Medium',
    description: 'Business Associate Agreements status cannot be determined through automated testing',
    requirement: 'HIPAA requires Business Associate Agreements with all vendors who access PHI',
    remediation: 'Ensure BAAs are in place with all third-party services that may access PHI'
  });
  
  // Summary
  console.log(chalk.blue.bold('\n=== HIPAA Compliance Test Summary ===\n'));
  
  if (complianceIssues.length === 0) {
    console.log(chalk.green('✓ No HIPAA compliance issues detected'));
  } else {
    console.log(chalk.red(`✗ Found ${complianceIssues.length} potential HIPAA compliance issues:`));
    
    // Group issues by severity
    const highSeverity = complianceIssues.filter(issue => issue.severity === 'High');
    const mediumSeverity = complianceIssues.filter(issue => issue.severity === 'Medium');
    const lowSeverity = complianceIssues.filter(issue => issue.severity === 'Low');
    
    console.log(chalk.red(`\nHigh Severity Issues: ${highSeverity.length}`));
    console.log(chalk.yellow(`Medium Severity Issues: ${mediumSeverity.length}`));
    console.log(chalk.blue(`Low Severity Issues: ${lowSeverity.length}`));
    
    console.log(chalk.red('\nDetails:'));
    
    complianceIssues.forEach((issue, index) => {
      const severityColor = issue.severity === 'High' ? chalk.red : 
                           issue.severity === 'Medium' ? chalk.yellow : chalk.blue;
      
      console.log(severityColor(`\nIssue #${index + 1} (${issue.severity}): ${issue.category}`));
      console.log(chalk.white(`Description: ${issue.description}`));
      console.log(chalk.white(`HIPAA Requirement: ${issue.requirement}`));
      console.log(chalk.white(`Remediation: ${issue.remediation}`));
    });
  }
  
  return {
    issues: complianceIssues,
    summary: {
      total: complianceIssues.length,
      highSeverity: complianceIssues.filter(issue => issue.severity === 'High').length,
      mediumSeverity: complianceIssues.filter(issue => issue.severity === 'Medium').length,
      lowSeverity: complianceIssues.filter(issue => issue.severity === 'Low').length
    }
  };
}

// Run the test if executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runHIPAATest();
}

export default runHIPAATest;