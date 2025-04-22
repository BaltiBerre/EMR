const fs = require('fs');
const path = require('path');

// Here's what this file does

// connects to the database using environment variables
// Reads all .json files from a fhir folder
// for each file looks for patient entries ( resourceType === 'Patient' )
// For each patient: 
//    extracts name gender birth email phone and address
//    creates a user account for them in the database
//    adds patient record to the patients table and links it to their account
// also handles errors and database transactions
// closes connection at the end

// this file was only really meant to be a one-time thing as i just needed to import all the patients that I downloaded from the 
// synthesised database.

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
});




// Process FHIR patient data
async function importPatients() {
  try {
    // Read all JSON files in the FHIR directory
    const fhirDir = path.join(__dirname, 'fhir');
    const files = fs.readdirSync(fhirDir).filter(file => file.endsWith('.json'));
    
    console.log(`Found ${files.length} FHIR files to process`);
    
    for (const file of files) {
      const filePath = path.join(fhirDir, file);
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      
      // Process each patient entry
      for (const entry of data.entry || []) {
        if (entry.resource?.resourceType === 'Patient') {
          await processPatient(entry.resource);
        }
      }
    }
    
    console.log('Import completed successfully');
  } catch (error) {
    console.error('Import failed:', error);
  } finally {
    pool.end();
  }
}

// Process individual patient
async function processPatient(patient) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Extract patient data
    const firstName = patient.name?.[0]?.given?.[0] || 'Unknown';
    const lastName = patient.name?.[0]?.family || 'Unknown';
    const gender = mapGender(patient.gender);
    const dob = patient.birthDate || '1900-01-01';
    const email = patient.telecom?.find(t => t.system === 'email')?.value || `${firstName}.${lastName}@example.com`;
    const phone = patient.telecom?.find(t => t.system === 'phone')?.value || '';
    const address = patient.address?.[0]?.line?.[0] || '';
    
    // Create user account first
    const userResult = await client.query(
      'INSERT INTO useraccounts (username, passwordhash, role) VALUES ($1, $2, $3) RETURNING userid',
      [`patient_${firstName.toLowerCase()}_${lastName.toLowerCase()}`, '$2b$10$defaulthashedpassword', 'Patient']
    );
    
    const userId = userResult.rows[0].userid;
    
    // Insert patient record
    await client.query(
      'INSERT INTO patients (userid, firstname, lastname, dob, gender, address, phonenumber, email) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
      [userId, firstName, lastName, dob, gender, address, phone, email]
    );
    
    await client.query('COMMIT');
    console.log(`Imported patient: ${firstName} ${lastName}`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`Failed to import patient: ${error.message}`);
  } finally {
    client.release();
  }
}

// Map FHIR gender to database enum
function mapGender(fhirGender) {
  const map = {
    'male': 'Male',
    'female': 'Female'
  };
  return map[fhirGender?.toLowerCase()] || 'Other';
}

// Run the import
importPatients();