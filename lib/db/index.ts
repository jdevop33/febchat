/**
 * Centralized database client for the application
 *
 * This file provides a unified way to access the database from anywhere in the application.
 * It handles different environments and database providers.
 */
// Only import server-only when not in a script context
// This allows for testing and migration scripts to work
const isScriptContext = process.env.NODE_ENV === 'test' || 
                        process.argv[1]?.includes('tsx') ||
                        process.argv[1]?.includes('test') ||
                        process.argv[1]?.includes('scripts/');

if (!isScriptContext) {
  require('server-only');
}

import { env } from 'node:process';
import * as schema from './schema';

// Determine environment
const isProduction = env.NODE_ENV === 'production';
const isBuildPhase = env.NEXT_PHASE === 'build';

// Logging for initialization
console.log(
  `DB: Initializing database client (${isProduction ? 'production' : 'development'})`,
);

/**
 * Initialize the database client based on environment
 * This is the single source of truth for database connections
 */
export function createDatabaseClient() {
  // During build phase, provide a mock DB that doesn't actually connect
  if (isBuildPhase) {
    console.log('DB: Build phase detected, using mock database client');
    // Mock DB client for build phase - prevents real DB operations during build
    return {
      query: async () => [],
      execute: async () => [],
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
    };
  }

  // Try Vercel Postgres first (for production environments)
  try {
    if (env.POSTGRES_URL && isProduction) {
      console.log('DB: Using Vercel Postgres integration');
      
      // Dynamic import for Vercel Postgres
      const { db: vercelDb } = require('@vercel/postgres');
      const { drizzle } = require('drizzle-orm/vercel-postgres');
      
      // Test connection if not in build phase
      if (!isBuildPhase) {
        console.log('DB: Testing Vercel Postgres connection...');
        testConnection(vercelDb);
      }
      
      return drizzle(vercelDb, { schema });
    }
  } catch (vercelError) {
    console.error('DB: Failed to initialize with Vercel Postgres:', vercelError);
  }

  // Try Neon serverless if specified
  try {
    if (env.USE_NEON === 'true' && (env.POSTGRES_URL || env.DATABASE_URL)) {
      console.log('DB: Using Neon serverless client');
      
      const connectionString = env.POSTGRES_URL || env.DATABASE_URL;
      const { neon } = require('@neondatabase/serverless');
      const { drizzle } = require('drizzle-orm/neon-http');
      
      const client = neon(connectionString);
      return drizzle(client, { schema });
    }
  } catch (neonError) {
    console.error('DB: Failed to initialize with Neon:', neonError);
  }

  // Fall back to direct Postgres connection
  try {
    console.log('DB: Using direct PostgreSQL connection');
    
    const connectionString = env.POSTGRES_URL || env.DATABASE_URL;
    
    if (!connectionString) {
      throw new Error(
        'No database connection string found. Set POSTGRES_URL or DATABASE_URL environment variable.',
      );
    }
    
    const { drizzle } = require('drizzle-orm/postgres-js');
    const postgres = require('postgres');
    
    // Create PostgreSQL client with pooling
    const client = postgres(connectionString, {
      max: Number.parseInt(env.DB_POOL_MAX || '10', 10),
      idle_timeout: Number.parseInt(env.DB_IDLE_TIMEOUT || '20', 10),
      connect_timeout: Number.parseInt(env.DB_CONNECT_TIMEOUT || '30', 10),
      ssl: env.DB_USE_SSL !== 'false',
    });
    
    return drizzle(client, { schema });
  } catch (pgError) {
    console.error('DB: Failed to initialize with direct PostgreSQL:', pgError);
    
    // Last resort fallback
    console.warn('DB: Using fallback mock database client');
    return {
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
    };
  }
}

// Helper function to test database connection
async function testConnection(dbClient) {
  try {
    // Use a timeout to prevent hanging
    const connectionPromise = dbClient.query('SELECT 1 as connected');
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error('Database connection timeout')),
        5000,
      ),
    );

    const result = await Promise.race([
      connectionPromise,
      timeoutPromise,
    ]);
    console.log('DB: ✅ Successfully connected to database', result);

    // Additional test: Try querying schema version
    try {
      const versionResult = await dbClient.query('SELECT version()');
      console.log(
        'DB: PostgreSQL version:',
        versionResult.rows[0].version,
      );

      // Check if tables exist
      const tablesResult = await dbClient.query(
        "SELECT table_name FROM information_schema.tables WHERE table_schema='public'",
      );
      console.log(
        'DB: Found tables:',
        tablesResult.rows.map((r) => r.table_name).join(', '),
      );
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
    console.error(
      'DB: - Database logging level:',
      env.DB_LOG_LEVEL || 'Not set',
    );

    // Set a global flag to indicate DB connection failure
    globalThis.__DB_CONNECTION_FAILED = true;
  }
}

// Export the singleton database instance
const db = createDatabaseClient();
export default db;

// Re-export schema for convenience
export * from './schema';