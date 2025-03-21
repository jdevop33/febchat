/**
 * Database initialization module
 * 
 * This module handles database connection setup for both Vercel Postgres integration
 * and direct PostgreSQL connections.
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import { drizzle as vercelDrizzle } from 'drizzle-orm/vercel-postgres';
import postgres from 'postgres';
import { env } from 'node:process';

import * as schema from './schema';

// Set up environment detection
const isProduction = env.NODE_ENV === 'production';
const isBuildPhase = env.NEXT_PHASE === 'build';

console.log(`Environment: ${env.NODE_ENV || 'development'}`);
console.log(`Database mode: PostgreSQL (${isProduction ? 'production' : 'development'})`);

// For TypeScript consistency
type DrizzleClient = ReturnType<typeof drizzle<typeof schema>>;

// Initialize the database
export function initializeDatabase(): DrizzleClient {
  // During build phase, provide a mock DB that doesn't actually connect
  if (isBuildPhase) {
    console.log('Setting up mock database for build process only');
    return {
      // Basic mock implementation for build phase
      query: () => Promise.resolve([]),
      execute: () => Promise.resolve([]),
      // Additional methods as needed
    } as unknown as DrizzleClient;
  }

  // Check for Vercel Postgres integration
  if (isProduction && env.POSTGRES_URL) {
    console.log('Using Vercel Postgres integration in production');
    
    // Initialize with Vercel's PostgreSQL client
    return vercelDrizzle(schema) as unknown as DrizzleClient;
  }
  
  // Fall back to direct connection for development or if Vercel integration isn't available
  const connectionString = env.POSTGRES_URL || env.DATABASE_URL;
  
  if (!connectionString) {
    throw new Error(
      'No database connection string found. Set POSTGRES_URL or DATABASE_URL environment variable.'
    );
  }
  
  console.log('Using direct PostgreSQL connection');
  
  // Create PostgreSQL client with pooling
  const client = postgres(connectionString, {
    max: Number.parseInt(env.DB_POOL_MAX || '10', 10),
    idle_timeout: Number.parseInt(env.DB_IDLE_TIMEOUT || '20', 10),
    connect_timeout: Number.parseInt(env.DB_CONNECT_TIMEOUT || '30', 10),
    ssl: env.DB_USE_SSL !== 'false',
  });
  
  // Initialize and return Drizzle ORM instance
  return drizzle(client, { schema }) as DrizzleClient;
}

// Export singleton database instance
const db = initializeDatabase();
export default db;