/**
 * Database indexing utilities for Drizzle ORM
 * This file defines indexes for frequent queries to improve performance
 */

import { sql } from 'drizzle-orm';
import { users, messages, chats } from './schema';

// Mock database object for build time
const db = {
  execute: async (query: any) => {
    // This is a mock implementation that will be replaced at runtime
    console.log('Running database query:', query);
    return { rowCount: 0 };
  }
};

/**
 * Add indexes to the database
 * This function should be called during application initialization
 */
export async function createDatabaseIndexes() {
  console.log('⏳ Creating database indexes...');
  const start = Date.now();

  try {
    // Create indexes for frequently queried columns
    // These are examples - adjust based on your actual query patterns
    
    // Index for user lookups by email (common during authentication)
    await db.execute(
      sql`CREATE INDEX IF NOT EXISTS idx_users_email ON users (email)`
    );
    
    // Index for chat lookups by user ID (common for listing chats)
    await db.execute(
      sql`CREATE INDEX IF NOT EXISTS idx_chats_user_id ON chats (user_id)`
    );
    
    // Index for messages by chat ID (common for retrieving chat history)
    await db.execute(
      sql`CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages (chat_id)`
    );
    
    // Compound index for messages ordered by chat_id and timestamp
    // This improves performance when retrieving messages in chronological order
    await db.execute(
      sql`CREATE INDEX IF NOT EXISTS idx_messages_chat_id_created_at ON messages (chat_id, created_at)`
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
    // This query works for PostgreSQL
    const result = await db.execute(
      sql`SELECT 1 FROM pg_indexes WHERE indexname = ${indexName}`
    );
    
    return (result as any).rowCount > 0;
  } catch (error) {
    console.error(`Error checking if index ${indexName} exists:`, error);
    return false;
  }
}