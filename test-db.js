const postgres = require('postgres');

async function testConnection() {
  const connectionString = process.env.POSTGRES_URL;
  
  if (\!connectionString) {
    console.error('POSTGRES_URL environment variable is not set');
    process.exit(1);
  }
  
  console.log('Connecting to database...');
  
  try {
    const sql = postgres(connectionString, { ssl: true });
    const result = await sql`SELECT NOW() as time`;
    
    console.log('Connection successful\!');
    console.log('Server time:', result[0].time);
    
    await sql.end();
    
    return true;
  } catch (error) {
    console.error('Connection failed:', error.message);
    return false;
  }
}

testConnection()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(err => {
    console.error('Unexpected error:', err);
    process.exit(1);
  });
