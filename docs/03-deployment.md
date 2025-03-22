# FebChat Deployment Guide

**Last Updated:** March 22, 2025

## Prerequisites

- Vercel account with GitHub repo connection
- Pinecone account and API key
- OpenAI and Anthropic API keys
- PostgreSQL database (Neon or Vercel Postgres)

## Environment Configuration

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
CLAUDE_MODEL=claude-3-7-sonnet-20250219
CLAUDE_FALLBACK_MODEL=claude-3-5-sonnet-20240620
```

### Vector Search

```
PINECONE_API_KEY=your-pinecone-key
PINECONE_ENVIRONMENT=us-east-1
PINECONE_INDEX=oak-bay-bylaws
EMBEDDING_PROVIDER=llamaindex
```

### Blob Storage

```
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_token
```

## Pinecone Setup

1. Create Pinecone account at [pinecone.io](https://www.pinecone.io/)
2. Create index with these parameters:
   - Name: `oak-bay-bylaws`
   - Dimensions: 1536
   - Metric: cosine
   - Type: Dense
   - Mode: Serverless

## Vercel Deployment

### Database Setup

1. **Vercel Postgres**:

   - In project dashboard: Storage → Connect Database → Vercel Postgres
   - Vercel adds environment variables automatically

2. **OR External Database** (e.g., Neon):
   - Create database and get connection strings
   - Add connection strings to Vercel environment variables

### Deployment Steps

1. Push your changes to GitHub
2. In Vercel dashboard, connect repository
3. Configure environment variables
4. Deploy the project

## Content Indexing

1. Organize PDF files in a directory
2. Run indexing script: `pnpm tsx scripts/index-bylaws.ts "/path/to/bylaws"`
3. Verify indexing: `pnpm tsx scripts/verify-pinecone.ts`

## Production Checklist

- [ ] Pinecone API key configured
- [ ] OpenAI & Anthropic API keys set
- [ ] Authentication secrets generated
- [ ] Database connection configured
- [ ] PDFs processed and indexed
- [ ] Bylaw search tested
- [ ] HTTPS enabled
- [ ] Rate limiting configured

## Deployment Instructions

1. Verify configuration: `pnpm tsx scripts/verify-pinecone.ts`
2. Run migrations: `pnpm db:migrate`
3. Build application: `pnpm build`
4. Check linting: `pnpm lint`
5. Test chat functionality
6. Deploy: `vercel --prod`

## Post-Deployment Verification

1. Application loads correctly
2. Authentication works
3. Chat history saves and retrieves
4. Bylaw search returns relevant results
5. File uploads work correctly

For troubleshooting deployment issues, see [Optimization & Troubleshooting](./05-optimization-troubleshooting.md).
