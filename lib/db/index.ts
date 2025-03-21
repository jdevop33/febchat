/**
 * Centralized database client for the application
 * 
 * This file provides a unified way to access the database from anywhere in the application.
 * It handles different environments and database providers.
 */
import 'server-only';

import { drizzle } from 'drizzle-orm/vercel-postgres';
import { sql, db as vercelDb } from '@vercel/postgres';
import { env } from 'node:process';

import * as schema from './schema';

// Determine environment
const isProduction = env.NODE_ENV === 'production';
const isBuildPhase = env.NEXT_PHASE === 'build';

// Logging for initialization
console.log(`DB: Initializing database client (${isProduction ? 'production' : 'development'})`);

// Define database client (singleton pattern)
let db: ReturnType<typeof drizzle>;

if (isBuildPhase) {
  console.log('DB: Build phase detected, using mock database client');
  // Mock DB client for build phase - prevents real DB operations during build
  db = {
    query: async () => [],
    execute: async () => [],
    // Add any other mock methods needed
  } as any;
} else {
  // Initialize real database client
  try {
    // Use Vercel's PostgreSQL client
    console.log('DB: Initializing with Vercel Postgres integration');
    db = drizzle(vercelDb, { schema });
    
    // Test connection (only in development)
    if (!isProduction && !isBuildPhase) {
      vercelDb.query('SELECT 1 as connected')
        .then(() => console.log('DB: ✅ Successfully connected to database'))
        .catch((error) => {
          console.error('DB: ❌ Failed to connect to database:', error);
          // Don't throw - allow server to start with degraded functionality
        });
    }
  } catch (error) {
    console.error('DB: ❌ Error initializing database client:', error);
    
    // Provide a fallback mock in case of initialization errors
    // This prevents the app from crashing completely
    console.warn('DB: Using fallback mock database client');
    db = {
      query: async () => [],
      execute: async () => [],
      // Add any other mock methods needed
    } as any;
  }
}

// Export the database client
export default db;

// Re-export schema for convenience
export * from './schema';