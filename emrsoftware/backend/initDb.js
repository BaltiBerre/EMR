const fs = require('fs');
const db = require('./db');

async function initializeDatabase() {
  try {
    const schema = fs.readFileSync('schema.sql', 'utf8');
    await db.query(schema);
    console.log('Database schema created successfully');
  } catch (err) {
    console.error('Error initializing database:', err);
  }
}

initializeDatabase();