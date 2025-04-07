// emrsoftware/security-testing/auth-test.mjs
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

async function runAuthTests() {
  console.log(chalk.blue.bold('\n=== Authentication Security Test ===\n'));
  
  const vulnerabilities = [];
  
  // Test 1: Brute Force Protection
  console.log(chalk.yellow('\nTest 1: Brute Force Protection'));
  
  let bruteForceVulnerable = true;
  let loginAttempts = 0;
  
  for (let i = 0; i < 10; i++) {
    try {
      await axios.post(`${config.apiUrl}${config.authEndpoint}`, {
        Username: config.credentials.admin.Username,
        Password: 'wrongpassword' + i
      });
      loginAttempts++;
    } catch (error) {
      loginAttempts++;
      
      // Check if we're being rate limited or locked out
      if (
        error.response && 
        (error.response.status === 429 || 
         (error.response.data && error.response.data.message && 
          (error.response.data.message.toLowerCase().includes('too many') ||
           error.response.data.message.toLowerCase().includes('locked') ||
           error.response.data.message.toLowerCase().includes('limit')))
        )
      ) {
        bruteForceVulnerable = false;
        console.log(chalk.green(`✓ Brute force protection detected after ${loginAttempts} attempts`));
        break;
      }
    }
    
    // Small delay between attempts
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  
  if (bruteForceVulnerable) {
    vulnerabilities.push({
      test: 'Brute Force Protection',
      details: `System allowed ${loginAttempts} consecutive failed login attempts without any rate limiting or account lockout.`
    });
    console.log(chalk.red(`✗ No brute force protection detected after ${loginAttempts} attempts`));
  }
  
  // Test 2: Password Strength Requirements
  console.log(chalk.yellow('\nTest 2: Password Strength Requirements'));
  
  const weakPasswords = [
    'password',
    '123456',
    'admin',
    'qwerty',
    'test'
  ];
  
  let passwordStrengthEnforced = false;
  
  for (const weakPassword of weakPasswords) {
    try {
      await axios.post(`${config.apiUrl}/api/auth/register`, {
        Username: 'testuser' + Date.now(),
        Password: weakPassword,
        Role: 'Patient'
      });
    } catch (error) {
      if (
        error.response && 
        error.response.data && 
        error.response.data.message && 
        (error.response.data.message.toLowerCase().includes('password') ||
         (error.response.data.errors && error.response.data.errors.some(e => 
           e.msg && e.msg.toLowerCase().includes('password'))))
      ) {
        passwordStrengthEnforced = true;
        console.log(chalk.green(`✓ Weak password "${weakPassword}" was rejected`));
        break;
      }
    }
    
    // Small delay between attempts
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  
  if (!passwordStrengthEnforced) {
    vulnerabilities.push({
      test: 'Password Strength Requirements',
      details: 'System accepted weak passwords during registration.'
    });
    console.log(chalk.red('✗ Password strength requirements not enforced'));
  }
  
  // Test 3: Session Timeout
  console.log(chalk.yellow('\nTest 3: Session Timeout'));
  
  try {
    const loginResponse = await axios.post(`${config.apiUrl}${config.authEndpoint}`, config.credentials.admin);
    const cookies = loginResponse.headers['set-cookie'];
    
    if (cookies) {
      const cookieExpirationInfo = cookies.find(c => c.includes('Expires='));
      
      if (cookieExpirationInfo) {
        // Extract and display session expiration time
        const expirationMatch = cookieExpirationInfo.match(/Expires=([^;]+)/);
        
        if (expirationMatch && expirationMatch[1]) {
          const expirationDate = new Date(expirationMatch[1]);
          const now = new Date();
          const diffMinutes = Math.round((expirationDate - now) / (1000 * 60));
          
          if (diffMinutes > 60) {
            vulnerabilities.push({
              test: 'Session Timeout',
              details: `Session timeout is set to ${diffMinutes} minutes, which exceeds the recommended maximum of 60 minutes for healthcare applications.`
            });
            console.log(chalk.red(`✗ Session timeout is too long: ${diffMinutes} minutes`));
          } else if (diffMinutes > 0) {
            console.log(chalk.green(`✓ Session timeout is appropriately set to ${diffMinutes} minutes`));
          } else {
            console.log(chalk.yellow(`! Session appears to have immediate or past expiration: ${expirationMatch[1]}`));
          }
        }
      } else {
        vulnerabilities.push({
          test: 'Session Timeout',
          details: 'No session expiration time found in cookies.'
        });
        console.log(chalk.red('✗ No session expiration time found in cookies'));
      }
    } else {
      console.log(chalk.yellow('! No cookies found in login response'));
    }
    
  } catch (error) {
    console.log(chalk.red('✗ Error testing session timeout:', error.message));
  }
  
  // Summary
  console.log(chalk.blue.bold('\n=== Authentication Security Test Summary ===\n'));
  
  if (vulnerabilities.length === 0) {
    console.log(chalk.green('✓ No authentication vulnerabilities detected'));
  } else {
    console.log(chalk.red(`✗ Found ${vulnerabilities.length} authentication vulnerabilities:`));
    
    vulnerabilities.forEach((vuln, index) => {
      console.log(chalk.red(`\nVulnerability #${index + 1}: ${vuln.test}`));
      console.log(chalk.yellow(`Details: ${vuln.details}`));
    });
    
    console.log(chalk.red('\nRecommendations:'));
    console.log(chalk.red('1. Implement rate limiting and account lockout mechanisms to prevent brute force attacks.'));
    console.log(chalk.red('2. Enforce password complexity requirements (minimum length, mixed case, numbers, special characters).'));
    console.log(chalk.red('3. Set appropriate session timeout values (30-60 minutes max for healthcare applications).'));
  }
}

// Run the tests
runAuthTests();