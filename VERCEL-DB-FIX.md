# Febchat Database Integration Guide

## Overview

This guide addresses database integration issues in the Febchat application, particularly focusing on resolving deployment problems on Vercel where 'Create database branch for deployment' was failing.

## Problem Summary

The application was experiencing the following issues:

1. **Multiple ORM Conflicts**: Simultaneous use of both Prisma and Drizzle ORM with different schemas.
2. **Inconsistent Database Client Initialization**: Multiple database client implementations with different configurations.
3. **Environment Variable Confusion**: Conflicting environment variable usage (POSTGRES_URL, DATABASE_URL, etc.).
4. **TypeScript Errors**: Type errors in the database client configuration.

## Solution Implemented

### 1. Unified Database Client

We've created a centralized database client in `/lib/db/index.ts` that:

- Uses Vercel's PostgreSQL client correctly
- Properly handles database connections in different environments
- Provides fallbacks for build time and error scenarios
- Fixes TypeScript typing issues

```typescript
// Sample of the updated client
import { drizzle } from 'drizzle-orm/vercel-postgres';
import { sql, db as vercelDb } from '@vercel/postgres';

// Initialize with proper typing
const db = drizzle(vercelDb, { schema });

export default db;
export * from './schema';
```

### 2. Environment Variable Standardization

For consistent database connections across environments, use these environment variables:

- **Development and Production**:

  ```
  POSTGRES_URL=postgres://user:password@host:port/database
  ```

- **Vercel-specific** (automatically added when you create a Vercel Postgres database):
  ```
  POSTGRES_URL=...
  POSTGRES_PRISMA_URL=...
  POSTGRES_URL_NON_POOLING=...
  POSTGRES_USER=...
  POSTGRES_HOST=...
  POSTGRES_PASSWORD=...
  POSTGRES_DATABASE=...
  ```

### 3. Database Selection

We've standardized on Drizzle ORM for database access. While the Prisma schema is still present for reference, new development should use Drizzle with the schema defined in `/lib/db/schema.ts`.

## Deployment Checklist

1. **Pre-deployment**:

   - Run `pnpm db:generate` to ensure your migrations are up to date
   - Run `pnpm build` locally to verify the build succeeds
   - Commit all migration files to your repository

2. **Vercel Setup**:

   - Create a new Postgres database from the Vercel dashboard
   - Connect your database to your project
   - Add any additional environment variables

3. **Post-deployment Verification**:
   - Check the deployment logs for database connection errors
   - Test authentication to ensure database access works
   - Verify that all database-dependent features function correctly

## Database Usage Guidelines

1. **Database Access**:

   - Always import the database client from `/lib/db/index.ts`
   - Never create new database connections elsewhere

   ```typescript
   import db from '@/lib/db';
   import { user } from '@/lib/db'; // Schema exports are available

   // Example query
   const users = await db.select().from(user);
   ```

2. **Migrations**:

   - Use Drizzle migrations for schema changes
   - Generate migrations with `pnpm db:generate`
   - Run migrations with `pnpm db:migrate`

3. **Local Development**:
   - Use a local PostgreSQL database for development
   - Set up your `.env.local` file with proper connection strings

## Common Issues and Solutions

1. **"Create database branch for deployment" fails**:

   - Check that your schema files are valid TypeScript
   - Ensure all environment variables are configured
   - Verify that Vercel has proper permissions to create database branches

2. **Database connection errors**:

   - Check your PostgreSQL connection string format
   - Ensure SSL is enabled if required
   - Verify database user permissions

3. **TypeScript errors**:
   - Use the correct imports from '@vercel/postgres'
   - Ensure proper typing with Drizzle and Vercel Postgres

## Conclusion

By implementing these changes, we've created a more robust, maintainable database configuration that works consistently across environments and resolves the deployment issues on Vercel.
