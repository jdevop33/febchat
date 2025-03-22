/**
 * Centralized database client for the application
 *
 * This file provides a unified way to access the database from anywhere in the application.
 * It handles different environments and database providers.
 */
import 'server-only';

import { drizzle } from 'drizzle-orm/vercel-postgres';
import { env } from 'node:process';

// Dynamic import for Vercel Postgres to avoid ESM/CJS conflicts
let vercelDb;
try {
  // This is imported dynamically to allow it to work in both ESM and CommonJS environments
  vercelDb = (await import('@vercel/postgres')).db;
} catch (error) {
  console.error('Failed to import Vercel Postgres:', error);
}

import * as schema from './schema';

// Determine environment
const isProduction = env.NODE_ENV === 'production';
const isBuildPhase = env.NEXT_PHASE === 'build';

// Logging for initialization
console.log(
  `DB: Initializing database client (${isProduction ? 'production' : 'development'})`,
);

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
    // Check if Vercel Postgres client is available
    if (!vercelDb) {
      console.error('DB: ❌ Vercel Postgres client is not available');
      throw new Error('Vercel Postgres client is undefined');
    }

    // Use Vercel's PostgreSQL client
    console.log('DB: Initializing with Vercel Postgres integration');
    db = drizzle(vercelDb, { schema });

    // Test connection (in any environment except build, to catch issues early)
    if (!isBuildPhase) {
      // We'll use a self-executing async function to test the connection
      // without awaiting it at the top level
      (async () => {
        try {
          console.log('DB: Testing database connection...');
          // Use a timeout to prevent hanging
          const connectionPromise = vercelDb.query('SELECT 1 as connected');
          const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(
              () => reject(new Error('Database connection timeout')),
              5000,
            ),
          );

          const result = await Promise.race([connectionPromise, timeoutPromise]);
          console.log('DB: ✅ Successfully connected to database', result);
          
          // Additional test: Try querying schema version
          try {
            const versionResult = await vercelDb.query('SELECT version()');
            console.log('DB: PostgreSQL version:', versionResult.rows[0].version);
            
            // Check if tables exist
            const tablesResult = await vercelDb.query(
              "SELECT table_name FROM information_schema.tables WHERE table_schema='public'"
            );
            console.log('DB: Found tables:', tablesResult.rows.map(r => r.table_name).join(', '));
          } catch (schemaError) {
            console.error('DB: Error checking schema:', schemaError);
          }
        } catch (connError) {
          console.error('DB: ❌ Failed to connect to database:', connError);
          // Log environment variables status (not the values) for debugging
          console.error('DB: Environment variables check:');
          console.error(
            'DB: - POSTGRES_URL:',
            env.POSTGRES_URL ? 'Set' : 'Not set',
          );
          console.error(
            'DB: - DATABASE_URL:',
            env.DATABASE_URL ? 'Set' : 'Not set',
          );
          console.error(
            'DB: - POSTGRES_USER:',
            env.POSTGRES_USER ? 'Set' : 'Not set',
          );
          console.error('DB: - NODE_ENV:', env.NODE_ENV || 'Not set');
          console.error('DB: - Database logging level:', env.DB_LOG_LEVEL || 'Not set');
          
          // Set a global flag to indicate DB connection failure
          globalThis.__DB_CONNECTION_FAILED = true;
        }
      })().catch((error) => {
        console.error('DB: Failed to test database connection:', error);
        // Set a global flag to indicate DB connection failure
        globalThis.__DB_CONNECTION_FAILED = true;
      });
    }
  } catch (error) {
    console.error('DB: ❌ Error initializing database client:', error);

    // Provide a more robust fallback mock client
    console.warn('DB: Using fallback mock database client');
    db = {
      query: async () => {
        console.warn('DB: Mock query executed - database is not available');
        return [];
      },
      execute: async () => {
        console.warn('DB: Mock execute called - database is not available');
        return [];
      },
      select: () => ({
        from: () => ({
          where: () => Promise.resolve([]),
          orderBy: () => Promise.resolve([]),
          limit: () => Promise.resolve([]),
        }),
      }),
      insert: () => ({
        values: () => Promise.resolve([]),
      }),
      update: () => ({
        set: () => ({
          where: () => Promise.resolve([]),
        }),
      }),
      delete: () => ({
        where: () => Promise.resolve([]),
      }),
    } as any;
  }
}

// Export the database client
export default db;

// Re-export schema for convenience
export * from './schema';
