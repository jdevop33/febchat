// Helper script to enable mock database mode
const fs = require('node:fs');
const path = require('node:path');

// Path to .env.local file
const envFilePath = path.join(__dirname, '.env.local');

// Read the file if it exists
let envContent = '';
try {
  if (fs.existsSync(envFilePath)) {
    envContent = fs.readFileSync(envFilePath, 'utf8');
    console.log('Read existing .env.local file');
  } else {
    console.log('No existing .env.local file, will create one');
  }
} catch (err) {
  console.error('Error reading .env.local file:', err);
  process.exit(1);
}

// Check if MOCK_DB already exists in the file
if (envContent.includes('MOCK_DB=')) {
  // Update the value
  envContent = envContent.replace(/MOCK_DB=.*$/m, 'MOCK_DB=true');
  console.log('Updated existing MOCK_DB entry to true');
} else {
  // Add the variable
  envContent += '\n# Mock database for testing without PostgreSQL\nMOCK_DB=true\n';
  console.log('Added MOCK_DB=true to environment variables');
}

// Write the updated content back to the file
try {
  fs.writeFileSync(envFilePath, envContent);
  console.log('Successfully updated .env.local file');
  console.log('Mock database mode is now enabled');
} catch (err) {
  console.error('Error writing to .env.local file:', err);
  process.exit(1);
}

console.log('\n✅ To use mock database mode:');
console.log('1. Restart your development server');
console.log('2. You should see "[MOCK]" in console logs when database operations are performed');
console.log('3. All data will be stored in memory and lost when the server restarts');
console.log('\nTo disable mock database mode, run:');
console.log('- Edit .env.local and change MOCK_DB=true to MOCK_DB=false or remove the line entirely');