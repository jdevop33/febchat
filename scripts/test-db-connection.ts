/**
 * Database connection test script
 *
 * This script tests the database connection to ensure it's properly configured.
 * Run with: npx tsx scripts/test-db-connection.ts
 */

import { sql } from 'drizzle-orm';
import { config } from 'dotenv';
import { createDatabaseClient } from '../lib/db';

// Load environment variables
config({ path: '.env.local' });

async function testDatabaseConnection() {
  console.log('Testing database connection...');
  console.log(`Node Environment: ${process.env.NODE_ENV || 'development'}`);

  const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;

  if (!connectionString) {
    console.error(
      '❌ No database connection string found in environment variables.',
    );
    console.error(
      'Please set POSTGRES_URL or DATABASE_URL environment variable.',
    );
    process.exit(1);
  }

  console.log('Connection string found. Testing connection...');

  try {
    // Create database client using our unified approach
    console.log('Initializing database client...');
    const db = createDatabaseClient();

    try {
      // Test query using our database client
      console.log('Executing test query...');
      const result = await db.execute(
        sql`SELECT current_database() as db_name, version() as pg_version`,
      );
      console.log('✅ Database connection successful!');
      console.log('Database info:', result);
      
      // Check for expected tables
      console.log('\nChecking for database tables...');
      const tablesResult = await db.execute(
        sql`SELECT table_name FROM information_schema.tables WHERE table_schema='public'`,
      );
      
      if (tablesResult.length === 0) {
        console.warn('⚠️ No tables found in the database. You may need to run migrations.');
      } else {
        console.log('✅ Found tables:', tablesResult.map((r: any) => r.table_name).join(', '));
      }
      
      console.log('\n✅ Database connection tests completed successfully!');
    } catch (queryError) {
      console.error('❌ Database query failed:', queryError);
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Database connection test failed:', error);
    process.exit(1);
  }
}

// Run the test
testDatabaseConnection().catch((error) => {
  console.error('Unhandled error in test script:', error);
  process.exit(1);
});