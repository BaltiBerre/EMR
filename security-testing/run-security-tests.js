// emrsoftware/security-testing/run-security-tests.js
const ZapClient = require('zaproxy');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { program } = require('commander');
const chalk = require('chalk');
const ora = require('ora');
const config = require('./zap-config');

// Configure command line options
program
  .option('-m, --mode <mode>', 'scan mode: baseline, full, or api', 'baseline')
  .option('-r, --report <format>', 'report format: html, xml, json, or md', 'html')
  .option('-o, --output <directory>', 'output directory for reports', './reports')
  .parse(process.argv);

const options = program.opts();

// Create ZAP client
const zapOptions = {
  apiKey: process.env.ZAP_API_KEY || '', // Set this if you've configured an API key in ZAP
  proxy: {
    host: 'localhost',
    port: 8080 // Default ZAP proxy port
  }
};

// Ensure output directory exists
if (!fs.existsSync(options.output)) {
  fs.mkdirSync(options.output, { recursive: true });
}

// Initialize ZAP client
const zaproxy = new ZapClient(zapOptions);

// Function to run the security tests
async function runSecurityTests() {
  const spinner = ora('Starting security tests').start();
  
  try {
    // Start a new session in ZAP
    spinner.text = 'Creating new ZAP session';
    await zaproxy.core.newSession('EMR-Security-Test-' + new Date().toISOString(), true);
    
    // Access the API to seed the proxy with URLs
    spinner.text = 'Seeding proxy with API endpoints';
    await seedProxy();
    
    // Run spider to discover content
    spinner.text = 'Running spider to discover content';
    const scanId = await zaproxy.spider.scan(config.apiUrl, null, null, null, null);
    
    // Wait for spider to complete
    await waitForSpiderToComplete(scanId, spinner);
    
    // Run active scan if full mode is selected
    if (options.mode === 'full' || options.mode === 'api') {
      spinner.text = 'Starting active scan';
      const activeScanId = await zaproxy.ascan.scan(config.apiUrl, null, null, null, null, null);
      
      // Wait for active scan to complete
      await waitForActiveScanToComplete(activeScanId, spinner);
    }
    
    // Generate the report
    spinner.text = 'Generating report';
    const reportPath = path.join(options.output, `security-report-${new Date().toISOString().split('T')[0]}.${options.report}`);
    
    let reportData;
    if (options.report === 'html') {
      reportData = await zaproxy.core.htmlreport();
    } else if (options.report === 'xml') {
      reportData = await zaproxy.core.xmlreport();
    } else if (options.report === 'json') {
      const jsonData = await zaproxy.core.jsonreport();
      reportData = JSON.stringify(JSON.parse(jsonData), null, 2); // Pretty print JSON
    } else if (options.report === 'md') {
      reportData = await zaproxy.core.mdreport();
    }
    
    fs.writeFileSync(reportPath, reportData);
    
    // Get alerts summary
    const alerts = await zaproxy.core.alerts(config.apiUrl, null, null);
    const parsedAlerts = JSON.parse(alerts);
    
    spinner.succeed(`Security tests completed. Report saved to ${reportPath}`);
    
    // Display summary of findings
    console.log('\n' + chalk.bold('Security Test Results Summary:'));
    console.log(chalk.bold('Total Alerts:'), parsedAlerts.alerts.length);
    
    // Count alerts by risk level
    const riskCounts = parsedAlerts.alerts.reduce((counts, alert) => {
      counts[alert.risk] = (counts[alert.risk] || 0) + 1;
      return counts;
    }, {});
    
    // Display alerts by risk level with colored output
    if (riskCounts['3'] > 0) console.log(chalk.red.bold('High Risk:'), riskCounts['3'] || 0);
    if (riskCounts['2'] > 0) console.log(chalk.yellow.bold('Medium Risk:'), riskCounts['2'] || 0);
    if (riskCounts['1'] > 0) console.log(chalk.blue.bold('Low Risk:'), riskCounts['1'] || 0);
    if (riskCounts['0'] > 0) console.log(chalk.gray.bold('Informational:'), riskCounts['0'] || 0);
    
    console.log(chalk.green(`\nFull report available at: ${reportPath}`));
    
  } catch (error) {
    spinner.fail('Security tests failed');
    console.error('Error running security tests:', error);
  }
}

// Function to wait for spider to complete
async function waitForSpiderToComplete(scanId, spinner) {
  let status = 0;
  while (status < 100) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    const response = await zaproxy.spider.status(scanId);
    status = parseInt(response.status);
    spinner.text = `Spider scan in progress: ${status}% complete`;
  }
  spinner.text = 'Spider scan completed';
}

// Function to wait for active scan to complete
async function waitForActiveScanToComplete(scanId, spinner) {
  let status = 0;
  while (status < 100) {
    await new Promise(resolve => setTimeout(resolve, 2000));
    const response = await zaproxy.ascan.status(scanId);
    status = parseInt(response.status);
    spinner.text = `Active scan in progress: ${status}% complete`;
  }
  spinner.text = 'Active scan completed';
}

// Function to seed the proxy with API endpoints
async function seedProxy() {
  // First authenticate to get a token
  try {
    const authResponse = await axios.post(`${config.apiUrl}${config.authEndpoint}`, config.credentials.admin);
    const cookies = authResponse.headers['set-cookie'];
    
    // Use the token to access endpoints
    for (const endpoint of config.endpointsToTest) {
      try {
        await axios.get(`${config.apiUrl}${endpoint}`, {
          headers: {
            Cookie: cookies
          }
        });
      } catch (error) {
        // Ignore errors, we just want to seed the proxy
      }
    }
  } catch (error) {
    console.log('Error seeding proxy (authentication may have failed):', error.message);
  }
}

// Run the tests
runSecurityTests();