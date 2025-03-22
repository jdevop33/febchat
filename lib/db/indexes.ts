/**
 * Database indexing utilities for Drizzle ORM
 * This file defines indexes for frequent queries to improve performance
 */

import { sql } from 'drizzle-orm';
import db from './index';

// This function decides whether to use the real DB or a mock
function getDbForIndexes() {
  // In production builds, use a mock to avoid DB connections
  if (
    process.env.NODE_ENV === 'production' &&
    process.env.NEXT_PHASE === 'build'
  ) {
    console.log('Production build detected - using mock database for indexes');
    return {
      execute: async (query: any) => {
        console.log('Running database query:', query);
        return { rowCount: 0 };
      },
    };
  }

  // Otherwise use the real DB connection
  return db;
}

/**
 * Add indexes to the database
 * This function should be called during application initialization
 */
export async function createDatabaseIndexes() {
  console.log('⏳ Creating database indexes...');
  const start = Date.now();

  try {
    // Get the appropriate database instance
    const dbInstance = getDbForIndexes();

    // Create indexes for frequently queried columns
    // These are examples - adjust based on your actual query patterns

    // Index for user lookups by email (common during authentication)
    await dbInstance.execute(
      sql`CREATE INDEX IF NOT EXISTS idx_users_email ON "User" (email)`,
    );

    // Index for chat lookups by user ID (common for listing chats)
    await dbInstance.execute(
      sql`CREATE INDEX IF NOT EXISTS idx_chats_user_id ON "Chat" ("userId")`,
    );

    // Index for messages by chat ID (common for retrieving chat history)
    await dbInstance.execute(
      sql`CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON "Message" ("chatId")`,
    );

    // Compound index for messages ordered by chat_id and timestamp
    // This improves performance when retrieving messages in chronological order
    await dbInstance.execute(
      sql`CREATE INDEX IF NOT EXISTS idx_messages_chat_id_created_at ON "Message" ("chatId", "createdAt")`,
    );

    console.log(`✅ Database indexes created in ${Date.now() - start}ms`);
  } catch (error) {
    console.error('❌ Failed to create database indexes:', error);
    // Don't throw, as we want the application to continue starting up
    // even if index creation fails
  }
}

/**
 * Helper function to check if an index exists
 */
export async function indexExists(indexName: string): Promise<boolean> {
  try {
    // Get the appropriate database instance
    const dbInstance = getDbForIndexes();

    // This query works for PostgreSQL
    const result = await dbInstance.execute(
      sql`SELECT 1 FROM pg_indexes WHERE indexname = ${indexName}`,
    );

    return (result as any).rowCount > 0;
  } catch (error) {
    console.error(`Error checking if index ${indexName} exists:`, error);
    return false;
  }
}
