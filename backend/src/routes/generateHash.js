// src/routes/generateHash.js
const bcrypt = require('bcrypt');

// Define our test users and their credentials
const TEST_USERS = {
    admin: {
        username: 'admin',
        password: 'adminpassword',
        currentHash: '$2b$10$tH6ysG8mwGZBJO9S/4KU4eIBWI7QVK7dVVVNB0q1CKZDTk9mV6KTm'
    },
    testuser: {
        username: 'testuser',
        password: 'testpassword',
        currentHash: '$2b$10$LlEp4eSnkxWcYI/mvDyMz.qFzGQCsEByZaHrMaAYsHnVZ6.nqKyKq'
    },
    testpatient: {
        username: 'testpatient',
        password: 'securepassword',
        currentHash: '$2b$10$fihHhb60.rifIMF7xCoB.uxOnUcKPv1p6bjuP9hsB3zNsdb6.ygmK'
    }
};

async function generateHash() {
    // We'll check all users' hashes
    console.log('=== Password Hash Verification ===\n');

    for (const [key, user] of Object.entries(TEST_USERS)) {
        // Generate a new hash for comparison
        const newHash = await bcrypt.hash(user.password, 10);
        
        // Test both current and new hashes
        const isCurrentValid = await bcrypt.compare(user.password, user.currentHash);
        const isNewValid = await bcrypt.compare(user.password, newHash);
        
        console.log(`=== ${user.username.toUpperCase()} USER CHECK ===`);
        console.log('Username:', user.username);
        console.log('Password:', user.password);
        console.log('Current hash:', user.currentHash);
        console.log('Current hash works?:', isCurrentValid);
        console.log('New hash:', newHash);
        console.log('New hash works?:', isNewValid);
        
        // If current hash doesn't work, provide SQL to fix it
        if (!isCurrentValid) {
            console.log('\nSQL to update hash:');
            console.log(`UPDATE UserAccounts SET PasswordHash = '${newHash}' WHERE Username = '${user.username}';`);
        }
        console.log('\n');
    }
}

// Run the function
generateHash();

// Export for use in other files if needed
module.exports = { generateHash };