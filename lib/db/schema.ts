import type { InferSelectModel } from 'drizzle-orm';
import {
  pgTable,
  varchar,
  timestamp,
  json,
  uuid,
  text,
  primaryKey,
  foreignKey,
  boolean,
  integer,
} from 'drizzle-orm/pg-core';

// Main application tables
export const user = pgTable('User', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  email: varchar('email', { length: 64 }).notNull(),
  password: varchar('password', { length: 64 }),
});

export type User = InferSelectModel<typeof user>;

export const chat = pgTable('Chat', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  createdAt: timestamp('createdAt').notNull(),
  title: text('title').notNull(),
  userId: uuid('userId')
    .notNull()
    .references(() => user.id),
  visibility: varchar('visibility', { enum: ['public', 'private'] })
    .notNull()
    .default('private'),
});

export type Chat = InferSelectModel<typeof chat>;

export const message = pgTable('Message', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  chatId: uuid('chatId')
    .notNull()
    .references(() => chat.id),
  role: varchar('role').notNull(),
  content: json('content').notNull(),
  createdAt: timestamp('createdAt').notNull(),
});

export type Message = InferSelectModel<typeof message>;

export const vote = pgTable(
  'Vote',
  {
    chatId: uuid('chatId')
      .notNull()
      .references(() => chat.id),
    messageId: uuid('messageId')
      .notNull()
      .references(() => message.id),
    isUpvoted: boolean('isUpvoted').notNull(),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.chatId, table.messageId] }),
    };
  },
);

export type Vote = InferSelectModel<typeof vote>;

export const document = pgTable(
  'Document',
  {
    id: uuid('id').notNull().defaultRandom(),
    createdAt: timestamp('createdAt').notNull(),
    title: text('title').notNull(),
    content: text('content'),
    kind: varchar('text', { enum: ['text', 'code', 'image', 'sheet'] })
      .notNull()
      .default('text'),
    userId: uuid('userId')
      .notNull()
      .references(() => user.id),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.id, table.createdAt] }),
    };
  },
);

export type Document = InferSelectModel<typeof document>;

export const suggestion = pgTable(
  'Suggestion',
  {
    id: uuid('id').notNull().defaultRandom(),
    documentId: uuid('documentId').notNull(),
    documentCreatedAt: timestamp('documentCreatedAt').notNull(),
    originalText: text('originalText').notNull(),
    suggestedText: text('suggestedText').notNull(),
    description: text('description'),
    isResolved: boolean('isResolved').notNull().default(false),
    userId: uuid('userId')
      .notNull()
      .references(() => user.id),
    createdAt: timestamp('createdAt').notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.id] }),
    documentRef: foreignKey({
      columns: [table.documentId, table.documentCreatedAt],
      foreignColumns: [document.id, document.createdAt],
    }),
  }),
);

export type Suggestion = InferSelectModel<typeof suggestion>;

// Bylaw verification tables (migrated from Prisma)
export const bylaw = pgTable('Bylaw', {
  bylawNumber: varchar('bylawNumber', { length: 20 }).primaryKey().notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  isConsolidated: boolean('isConsolidated').notNull().default(false),
  pdfPath: varchar('pdfPath', { length: 255 }).notNull(),
  officialUrl: varchar('officialUrl', { length: 255 }).notNull(),
  lastVerified: timestamp('lastVerified').notNull(),
  consolidatedDate: varchar('consolidatedDate', { length: 100 }),
  enactmentDate: varchar('enactmentDate', { length: 100 }),
  amendments: text('amendments'),
});

export type Bylaw = InferSelectModel<typeof bylaw>;

export const bylawSection = pgTable(
  'BylawSection',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    bylawNumber: varchar('bylawNumber', { length: 20 })
      .notNull()
      .references(() => bylaw.bylawNumber, {
        onDelete: 'cascade',
      }),
    sectionNumber: varchar('sectionNumber', { length: 50 }).notNull(),
    title: varchar('title', { length: 255 }),
    content: text('content').notNull(),
  },
  (table) => ({
    unq: primaryKey({ columns: [table.bylawNumber, table.sectionNumber] }),
  }),
);

export type BylawSection = InferSelectModel<typeof bylawSection>;

export const citationFeedback = pgTable('CitationFeedback', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  bylawNumber: varchar('bylawNumber', { length: 20 })
    .notNull()
    .references(() => bylaw.bylawNumber, {
      onDelete: 'cascade',
    }),
  section: varchar('section', { length: 50 }).notNull(),
  feedback: varchar('feedback', { length: 20 }).notNull(),
  userComment: text('userComment'),
  timestamp: timestamp('timestamp').notNull(),
});

export type CitationFeedback = InferSelectModel<typeof citationFeedback>;

export const vectorDatabaseEntry = pgTable(
  'VectorDatabaseEntry',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    bylawNumber: varchar('bylawNumber', { length: 20 }).notNull(),
    vectorId: varchar('vectorId', { length: 100 }).notNull(),
    section: varchar('section', { length: 50 }),
    timestamp: timestamp('timestamp').notNull(),
    metadata: json('metadata'),
  },
  (table) => ({
    unq: primaryKey({ columns: [table.bylawNumber, table.vectorId] }),
  }),
);

export type VectorDatabaseEntry = InferSelectModel<typeof vectorDatabaseEntry>;

export const bylawUpdate = pgTable('BylawUpdate', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  bylawNumber: varchar('bylawNumber', { length: 20 }).notNull(),
  updateType: varchar('updateType', { length: 20 }).notNull(),
  timestamp: timestamp('timestamp').notNull(),
  details: text('details'),
});

export type BylawUpdate = InferSelectModel<typeof bylawUpdate>;

export const webScrapeLog = pgTable('WebScrapeLog', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  url: varchar('url', { length: 255 }).notNull(),
  timestamp: timestamp('timestamp').notNull(),
  status: varchar('status', { length: 20 }).notNull(),
  newBylaws: integer('newBylaws').notNull().default(0),
  updatedBylaws: integer('updatedBylaws').notNull().default(0),
  errorDetails: text('errorDetails'),
});

export type WebScrapeLog = InferSelectModel<typeof webScrapeLog>;

export const searchQueryLog = pgTable('SearchQueryLog', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  query: varchar('query', { length: 500 }).notNull(),
  resultCount: integer('resultCount').notNull(),
  topResult: varchar('topResult', { length: 255 }),
  timestamp: timestamp('timestamp').notNull(),
  userFeedback: varchar('userFeedback', { length: 20 }),
});

export type SearchQueryLog = InferSelectModel<typeof searchQueryLog>;
