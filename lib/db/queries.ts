import 'server-only';

import { genSaltSync, hashSync } from 'bcrypt-ts';
import { and, asc, desc, eq, gt, gte, inArray, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import { drizzle as vercelDrizzle } from 'drizzle-orm/vercel-postgres';
import postgres from 'postgres';
import { env } from 'node:process';

import {
  user,
  chat,
  type User,
  document,
  type Suggestion,
  suggestion,
  type Message,
  message,
  vote,
} from './schema';
import type { ArtifactKind } from '@/components/artifact';

const isProduction = env.NODE_ENV === 'production';

console.log(`Environment: ${env.NODE_ENV || 'development'}`);
console.log(`Database mode: REAL (PostgreSQL)`);

// Ensure database URL exists
if (!env.POSTGRES_URL && !env.DATABASE_URL) {
  console.error('CRITICAL ERROR: Neither POSTGRES_URL nor DATABASE_URL environment variable is set!');
  throw new Error('Database connection configuration missing');
}

// DB client and ORM initialization
// Use proper types instead of 'any'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type { PgDatabase } from 'drizzle-orm/pg-core';

let client: ReturnType<typeof postgres> | undefined;
let db: PostgresJsDatabase<{user: typeof user, chat: typeof chat, message: typeof message, vote: typeof vote, document: typeof document, suggestion: typeof suggestion}> | PgDatabase<{user: typeof user, chat: typeof chat, message: typeof message, vote: typeof vote, document: typeof document, suggestion: typeof suggestion}>;

try {
  if (isProduction) {
    // In production on Vercel, use the Vercel Postgres SDK
    console.log('Using Vercel Postgres integration in production');
    
    // Initialize Drizzle with Vercel's SQL client
    db = vercelDrizzle({
      schema: { user, chat, message, vote, document, suggestion }
    });
    
    // No need to test connection as Vercel handles this
    console.log('✅ Using Vercel Postgres integration');
  } else {
    // For development or other environments, use postgres-js
    console.log('Connecting to PostgreSQL database...');
    const connectionString = env.POSTGRES_URL || env.DATABASE_URL || '';
    
    if (!connectionString) {
      throw new Error('No database connection string available');
    }
    
    // Don't log any part of the connection string for security
    console.log('Database connection string available and will be used')
    
    // Create pooled client
    client = postgres(connectionString, {
      max: 10,
      idle_timeout: 20,
      connect_timeout: 30,
      connection: {
        application_name: 'febchat-app',
      },
      ssl: true,
    });
    
    console.log('Database connection pool initialized');
    
    // Initialize Drizzle ORM
    db = drizzle(client, {
      schema: { user, chat, message, vote, document, suggestion }
    });
    
    // Test connection
    try {
      const result = await db.execute(sql`SELECT 1 as test`);
      console.log('✅ Successfully connected to database');
    } catch (queryError) {
      console.error('❌ Failed to connect to database:', queryError);
      throw new Error('Database connection failed');
    }
  }
} catch (error) {
  console.error('Failed to initialize database connection:', error);
  throw new Error('Database connection initialization failed');
}

/**
 * Database operation error with contextual information
 */
class DbOperationError extends Error {
  constructor(operation: string, originalError: unknown) {
    const message = `Database operation '${operation}' failed: ${originalError instanceof Error ? originalError.message : String(originalError)}`;
    super(message);
    this.name = 'DbOperationError';
    this.cause = originalError;
  }
}

/**
 * Get a user by email
 */
export async function getUser(email: string): Promise<Array<User>> {
  try {
    return await db.select().from(user).where(eq(user.email, email));
  } catch (error) {
    console.error(`Failed to get user '${email}' from database:`, error);
    throw new DbOperationError('getUser', error);
  }
}

/**
 * Create a new user with hashed password
 */
export async function createUser(email: string, password: string) {
  // Get salt rounds from environment or use secure default
  const saltRounds = parseInt(env.PASSWORD_SALT_ROUNDS || '12', 10);
  const salt = genSaltSync(saltRounds);
  const hash = hashSync(password, salt);

  try {
    return await db.insert(user).values({ email, password: hash });
  } catch (error) {
    console.error(`Failed to create user '${email}' in database:`, error);
    throw new DbOperationError('createUser', error);
  }
}

/**
 * Save a new chat to the database
 */
export async function saveChat({
  id,
  userId,
  title,
  visibility = 'private',
}: {
  id: string;
  userId: string;
  title: string;
  visibility?: 'public' | 'private';
}) {  
  try {
    return await db.insert(chat).values({
      id,
      createdAt: new Date(),
      userId,
      title,
      visibility,
    });
  } catch (error) {
    console.error(`Failed to save chat ID '${id}' to database:`, error);
    throw new DbOperationError('saveChat', error);
  }
}

export async function deleteChatById({ id }: { id: string }) {
  try {
    await db.delete(vote).where(eq(vote.chatId, id));
    await db.delete(message).where(eq(message.chatId, id));

    return await db.delete(chat).where(eq(chat.id, id));
  } catch (error) {
    console.error(`Failed to delete chat ID '${id}' from database:`, error);
    throw new DbOperationError('deleteChatById', error);
  }
}

export async function getChatsByUserId({ id }: { id: string }) {
  try {
    return await db
      .select()
      .from(chat)
      .where(eq(chat.userId, id))
      .orderBy(desc(chat.createdAt));
  } catch (error) {
    console.error(`Failed to get chats for user ID '${id}' from database:`, error);
    throw new DbOperationError('getChatsByUserId', error);
  }
}

export async function getChatById({ id }: { id: string }) {
  try {
    const [selectedChat] = await db.select().from(chat).where(eq(chat.id, id));
    return selectedChat;
  } catch (error) {
    console.error(`Failed to get chat ID '${id}' from database:`, error);
    throw new DbOperationError('getChatById', error);
  }
}

/**
 * Save messages to the database
 */
export async function saveMessages({ messages }: { messages: Array<Message> }) {
  if (!messages.length) {
    return; // Nothing to save
  }
  
  try {
    return await db.insert(message).values(messages);
  } catch (error) {
    console.error(`Failed to save ${messages.length} messages to database:`, error);
    throw new DbOperationError('saveMessages', error);
  }
}

export async function getMessagesByChatId({ id }: { id: string }) {
  try {
    return await db
      .select()
      .from(message)
      .where(eq(message.chatId, id))
      .orderBy(asc(message.createdAt));
  } catch (error) {
    console.error(`Failed to get messages for chat ID '${id}' from database:`, error);
    throw new DbOperationError('getMessagesByChatId', error);
  }
}

export async function voteMessage({
  chatId,
  messageId,
  type,
}: {
  chatId: string;
  messageId: string;
  type: 'up' | 'down';
}) {
  try {
    // Verify chat exists first
    try {
      const chat = await getChatById({ id: chatId });
      if (!chat) {
        console.error(`Chat ${chatId} not found`);
        throw new Error(`Chat ${chatId} not found`);
      }
    } catch (chatError) {
      console.error(`Error verifying chat ${chatId}:`, chatError);
      throw new Error(`Failed to verify chat: ${chatError instanceof Error ? chatError.message : 'Unknown error'}`);
    }
    
    // Verify the message exists and belongs to this chat
    try {
      const [messageExists] = await db
        .select()
        .from(message)
        .where(and(eq(message.id, messageId), eq(message.chatId, chatId)));
        
      if (!messageExists) {
        console.error(`Message ${messageId} not found in chat ${chatId}`);
        throw new Error(`Message ${messageId} not found in chat ${chatId}`);
      }
    } catch (messageError) {
      console.error(`Error verifying message ${messageId}:`, messageError);
      throw new Error(`Failed to verify message: ${messageError instanceof Error ? messageError.message : 'Unknown error'}`);
    }
    
    // Check for existing vote with both message ID and chat ID
    try {
      const [existingVote] = await db
        .select()
        .from(vote)
        .where(and(eq(vote.messageId, messageId), eq(vote.chatId, chatId)));

      if (existingVote) {
        console.log(`Updating existing vote for message ${messageId} in chat ${chatId}`);
        return await db
          .update(vote)
          .set({ isUpvoted: type === 'up' })
          .where(and(eq(vote.messageId, messageId), eq(vote.chatId, chatId)));
      }
      
      console.log(`Creating new vote for message ${messageId} in chat ${chatId}`);
      return await db.insert(vote).values({
        chatId,
        messageId,
        isUpvoted: type === 'up',
      });
    } catch (dbError) {
      console.error(`Database error while ${type}voting message ${messageId} in chat ${chatId}:`, dbError);
      
      // Better error message for constraint violations
      if (dbError instanceof Error && 
         (dbError.message.includes('constraint') || dbError.message.includes('foreign key'))) {
        throw new Error(`Database constraint violation: The message or chat referenced may have been deleted.`);
      }
      
      throw new Error(`Database error: ${dbError instanceof Error ? dbError.message : 'Unknown error'}`);
    }
  } catch (error) {
    console.error(`Failed to ${type}vote message ${messageId} in chat ${chatId}:`, error);
    throw new DbOperationError('voteMessage', error);
  }
}

export async function getVotesByChatId({ id }: { id: string }) {
  try {
    console.log(`Getting votes for chat ${id}`);
    
    // First verify the chat exists
    const chatExists = await getChatById({ id });
    if (!chatExists) {
      console.log(`Chat ${id} not found, returning empty votes array`);
      return []; // Return empty array instead of throwing an error
    }
    
    const votes = await db.select().from(vote).where(eq(vote.chatId, id));
    console.log(`Found ${votes.length} votes for chat ${id}`);
    return votes;
  } catch (error) {
    console.error(`Failed to get votes for chat ${id} from database:`, error);
    // Return empty array instead of throwing to handle the case gracefully
    return [];
  }
}

export async function saveDocument({
  id,
  title,
  kind,
  content,
  userId,
}: {
  id: string;
  title: string;
  kind: ArtifactKind;
  content: string;
  userId: string;
}) {
  try {
    return await db.insert(document).values({
      id,
      title,
      kind,
      content,
      userId,
      createdAt: new Date(),
    });
  } catch (error) {
    console.error(`Failed to save document '${id}' in database:`, error);
    throw new DbOperationError('saveDocument', error);
  }
}

export async function getDocumentsById({ id }: { id: string }) {
  try {
    const documents = await db
      .select()
      .from(document)
      .where(eq(document.id, id))
      .orderBy(asc(document.createdAt));

    return documents;
  } catch (error) {
    console.error('Failed to get document by id from database');
    throw error;
  }
}

export async function getDocumentById({ id }: { id: string }) {
  try {
    const [selectedDocument] = await db
      .select()
      .from(document)
      .where(eq(document.id, id))
      .orderBy(desc(document.createdAt));

    return selectedDocument;
  } catch (error) {
    console.error('Failed to get document by id from database');
    throw error;
  }
}

export async function deleteDocumentsByIdAfterTimestamp({
  id,
  timestamp,
}: {
  id: string;
  timestamp: Date;
}) {
  try {
    await db
      .delete(suggestion)
      .where(
        and(
          eq(suggestion.documentId, id),
          gt(suggestion.documentCreatedAt, timestamp),
        ),
      );

    return await db
      .delete(document)
      .where(and(eq(document.id, id), gt(document.createdAt, timestamp)));
  } catch (error) {
    console.error(
      'Failed to delete documents by id after timestamp from database',
    );
    throw error;
  }
}

export async function saveSuggestions({
  suggestions,
}: {
  suggestions: Array<Suggestion>;
}) {
  try {
    return await db.insert(suggestion).values(suggestions);
  } catch (error) {
    console.error('Failed to save suggestions in database');
    throw error;
  }
}

export async function getSuggestionsByDocumentId({
  documentId,
}: {
  documentId: string;
}) {
  try {
    return await db
      .select()
      .from(suggestion)
      .where(and(eq(suggestion.documentId, documentId)));
  } catch (error) {
    console.error(
      'Failed to get suggestions by document version from database',
    );
    throw error;
  }
}

export async function getMessageById({ id }: { id: string }) {
  try {
    return await db.select().from(message).where(eq(message.id, id));
  } catch (error) {
    console.error('Failed to get message by id from database');
    throw error;
  }
}

export async function deleteMessagesByChatIdAfterTimestamp({
  chatId,
  timestamp,
}: {
  chatId: string;
  timestamp: Date;
}) {
  try {
    const messagesToDelete = await db
      .select({ id: message.id })
      .from(message)
      .where(
        and(eq(message.chatId, chatId), gte(message.createdAt, timestamp)),
      );

    const messageIds = messagesToDelete.map((message: { id: string }) => message.id);

    if (messageIds.length > 0) {
      await db
        .delete(vote)
        .where(
          and(eq(vote.chatId, chatId), inArray(vote.messageId, messageIds)),
        );

      return await db
        .delete(message)
        .where(
          and(eq(message.chatId, chatId), inArray(message.id, messageIds)),
        );
    }
  } catch (error) {
    console.error(
      'Failed to delete messages by id after timestamp from database',
    );
    throw error;
  }
}

export async function updateChatVisibilityById({
  chatId,
  visibility,
}: {
  chatId: string;
  visibility: 'private' | 'public';
}) {
  try {
    return await db.update(chat).set({ visibility }).where(eq(chat.id, chatId));
  } catch (error) {
    console.error('Failed to update chat visibility in database');
    throw error;
  }
}

// Legacy function name with typo for backward compatibility
export const updateChatVisiblityById = updateChatVisibilityById;
