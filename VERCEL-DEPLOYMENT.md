# FebChat Vercel Deployment Guide

This updated guide provides instructions for deploying FebChat to Vercel with proper database integration.

## Prerequisites

- A [Vercel](https://vercel.com) account connected to your GitHub repository
- Access to the Pinecone console to obtain your API key and index details
- A PostgreSQL database (Neon or Vercel Postgres)

## Environment Variables Setup

Set the following environment variables in your Vercel project settings:

### Database Configuration
```
DATABASE_URL=postgres://user:password@host:port/database
POSTGRES_URL=postgres://user:password@host:port/database
POSTGRES_PRISMA_URL=postgres://user:password@host:port/database?pgbouncer=true&connect_timeout=15
POSTGRES_URL_NON_POOLING=postgres://user:password@host:port/database
```

### Authentication
```
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=https://your-app-url.vercel.app
AUTH_SECRET=your-auth-secret
```

### AI Models
```
ANTHROPIC_API_KEY=your-anthropic-key
OPENAI_API_KEY=your-openai-key
```

### Pinecone Vector Search
```
PINECONE_API_KEY=your-pinecone-key
PINECONE_ENVIRONMENT=us-east-1
PINECONE_INDEX=oak-bay-bylaws-v2
EMBEDDING_PROVIDER=llamaindex
```

### Vercel Blob Storage
```
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_token
```

## Database Integration Steps

1. **Setup Vercel Postgres**
   - Go to your Vercel project dashboard
   - Select "Storage" from the menu
   - Click "Connect Database"
   - Choose "Vercel Postgres"
   - Follow the setup instructions
   - Vercel will automatically add all required Postgres environment variables

2. **OR Setup External Postgres Database (Neon.tech)**
   - Create a new database in Neon.tech
   - Get the connection strings
   - Add them to Vercel environment variables manually
   - Make sure to include all the connection strings listed above

## Deployment Steps

1. **Push your changes to your GitHub repository**:

   ```bash
   git add .
   git commit -m "Updated database configuration for Vercel deployment"
   git push
   ```

2. **Deploy to Vercel**:
   - Connect your repository on Vercel
   - Set up the environment variables
   - Deploy the project

## Troubleshooting Database Integration Issues

If you encounter database deployment issues:

1. **Check database connection**:
   - Verify all database environment variables are correct
   - Make sure your database is accessible from Vercel's servers

2. **Database initialization**:
   - The app now uses a centralized database client in `/lib/db/index.ts`
   - This client handles different environments automatically
   - It provides fallbacks for build-time and error scenarios

3. **Connection errors**:
   - Check Vercel logs for specific database connection errors
   - Verify that SSL is enabled if required by your database provider
   - Make sure your database user has the correct permissions

## Post-Deployment Verification

After deploying, verify that:

1. The application loads correctly
2. User authentication (login/register) works properly
3. Chat history is saved and retrieved from the database
4. Bylaw search functionality returns relevant results
5. File uploads work correctly using Vercel Blob Storage

## Important Code Changes

Recent updates have simplified the database configuration:

1. **Centralized Database Client**:
   - Single database client in `/lib/db/index.ts`
   - Automatic handling of different environments
   - Fallback mechanisms for resilience

2. **Build Process**:
   - Updated build script with better error handling
   - Smarter detection of environment variables
   - Fallback mechanisms for build phase

3. **Environment Variables**:
   - Consistent naming across development and production
   - Support for both direct Postgres and Vercel integration

Refer to the code comments for detailed information about each component.