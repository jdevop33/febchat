/**
 * Database connection test script
 * 
 * This script tests the database connection to ensure it's properly configured.
 * Run with: npx tsx scripts/test-db-connection.ts
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import { drizzle as vercelDrizzle } from 'drizzle-orm/vercel-postgres';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

async function testDatabaseConnection() {
  console.log('Testing database connection...');
  console.log(`Node Environment: ${process.env.NODE_ENV || 'development'}`);
  
  const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;
  
  if (!connectionString) {
    console.error('❌ No database connection string found in environment variables.');
    console.error('Please set POSTGRES_URL or DATABASE_URL environment variable.');
    process.exit(1);
  }
  
  console.log('Connection string found. Testing connection...');
  
  try {
    // Try to connect using postgres.js first
    console.log('Attempting to connect with postgres.js...');
    const client = postgres(connectionString, { 
      max: 1,
      ssl: true,
      idle_timeout: 20,
      connect_timeout: 30,
    });
    
    try {
      // Execute a simple query
      const result = await client.unsafe('SELECT 1 as connected');
      console.log('✅ postgres.js connection successful!');
      console.log('Result:', result);
    } catch (pgError) {
      console.error('❌ postgres.js query failed:', pgError);
    } finally {
      // Always close the connection
      await client.end();
      console.log('postgres.js connection closed.');
    }
    
    // Try to connect using Drizzle
    console.log('\nAttempting to connect with Drizzle ORM...');
    const db = drizzle(postgres(connectionString, { ssl: true }));
    
    try {
      const result = await db.execute(sql`SELECT current_database() as db_name, version() as pg_version`);
      console.log('✅ Drizzle ORM connection successful!');
      console.log('Database info:', result);
    } catch (drizzleError) {
      console.error('❌ Drizzle query failed:', drizzleError);
    }
    
    // Try Vercel Postgres connection if available
    if (process.env.POSTGRES_URL) {
      console.log('\nAttempting to connect with Vercel Postgres integration...');
      
      try {
        const { sql } = require('drizzle-orm');
        const vercelDb = vercelDrizzle();
        
        const result = await vercelDb.execute(sql`SELECT current_database() as db_name`);
        console.log('✅ Vercel Postgres connection successful!');
        console.log('Database info:', result);
      } catch (vercelError) {
        console.error('❌ Vercel Postgres connection failed:', vercelError);
      }
    }
    
    console.log('\n✅ Database connection tests completed!');
    
  } catch (error) {
    console.error('❌ Database connection test failed:', error);
    process.exit(1);
  }
}

// Run the test
testDatabaseConnection().catch(error => {
  console.error('Unhandled error in test script:', error);
  process.exit(1);
});