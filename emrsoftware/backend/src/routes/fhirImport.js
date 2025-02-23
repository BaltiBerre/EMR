// Required dependencies
const express = require('express');
const router = express.Router();
const fs = require('fs').promises;          // Promise-based filesystem operations
const path = require('path');               // Path manipulation utilities
const { importFHIRData } = require('../utils/fhirProcessor');  // FHIR data processing utility
const { pool } = require('../config/database');                // Database connection
const authenticateToken = require('../middleware/auth');       // JWT authentication

// POST /fhir/import/:filename
// Import a single FHIR JSON file into the database
// Requires admin privileges
router.post('/import/:filename', authenticateToken, async (req, res) => {
  // Check for admin privileges
  if (req.user.Role.toLowerCase() !== 'admin') {
    return res.status(403).json({ message: 'Only admins can import FHIR data' });
  }

  try {
    // Get filename from request parameters
    const filename = req.params.filename;
    // Construct absolute path to FHIR data file
    const filePath = path.join(__dirname, '../data/fhir', filename);
    
    // Read and process FHIR data file
    const fhirContent = await fs.readFile(filePath, 'utf8');
    await importFHIRData(pool, fhirContent);
    
    res.json({ message: `FHIR data from ${filename} imported successfully` });
  } catch (error) {
    // Log and return any errors during import
    console.error('FHIR import error:', error);
    res.status(500).json({ 
      message: 'Failed to import FHIR data', 
      error: error.message 
    });
  }
});

// POST /fhir/import-all
// Import all FHIR JSON files from the data directory
// Requires admin privileges
router.post('/import-all', authenticateToken, async (req, res) => {
  // Check for admin privileges
  if (req.user.Role.toLowerCase() !== 'admin') {
    return res.status(403).json({ message: 'Only admins can import FHIR data' });
  }

  try {
    // Get path to FHIR data directory
    const dirPath = path.join(__dirname, '../data/fhir');
    // Read all files in directory
    const files = await fs.readdir(dirPath);
    // Filter for JSON files only
    const jsonFiles = files.filter(file => file.endsWith('.json'));
    
    // Track import statistics
    let imported = 0;
    let failed = 0;
    
    // Process each JSON file
    for (const file of jsonFiles) {
      try {
        // Construct path and read file
        const filePath = path.join(dirPath, file);
        const fhirContent = await fs.readFile(filePath, 'utf8');
        // Import file contents
        await importFHIRData(pool, fhirContent);
        imported++;
        console.log(`Successfully imported ${file}`);
      } catch (error) {
        // Log individual file import failures but continue processing
        failed++;
        console.error(`Failed to import ${file}:`, error);
      }
    }
    
    // Return summary of import operation
    res.json({
      message: 'FHIR data import complete',
      summary: {
        total: jsonFiles.length,
        imported,
        failed
      }
    });
  } catch (error) {
    // Log and return any errors during the overall import process
    console.error('FHIR import error:', error);
    res.status(500).json({ 
      message: 'Failed to import FHIR data', 
      error: error.message 
    });
  }
});

// Export router for use in main application
module.exports = router;