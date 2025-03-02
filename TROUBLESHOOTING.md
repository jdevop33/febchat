# FebChat Troubleshooting Guide

This guide provides steps to diagnose and fix common issues with the FebChat application, particularly related to the chat API and bylaw search functionality.

## 🔑 Environment Variables

The most common issue with the application is missing or incorrectly formatted environment variables. Make sure these are properly set in both your `.env.local` file and on your deployment platform (e.g., Vercel).

### Key Environment Variables

```
ANTHROPIC_API_KEY=sk-ant-api03-xxxxxxxxxxxx...
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxx...
POSTGRES_URL=postgres://user:password@host/database
PINECONE_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxx...
PINECONE_INDEX=oak-bay-bylaws
```

### Testing Environment Variables

Run the following command to check if your environment variables are loading correctly:

```bash
node -e "require('dotenv').config({path:'.env.local'}); console.log('ANTHROPIC_API_KEY:', process.env.ANTHROPIC_API_KEY?.slice(0, 10)); console.log('POSTGRES_URL:', process.env.POSTGRES_URL?.slice(0, 20))"
```

## 🧪 Diagnostic Test Scripts

We've created several test scripts to help diagnose issues with different components of the system:

### Testing Database Connection

```bash
node test-db.js
```

This will check if your Postgres database connection is working properly.

### Testing Anthropic API

```bash
node test-anthropic.js
```

This tests the Anthropic Claude API connection to ensure it's properly set up.

### Testing OpenAI API

```bash
node test-openai.js
```

This verifies that your OpenAI API key is valid and working.

### Testing Bylaw Search

```bash
node test-bylaw-search.js
```

This tests the connection to Pinecone vector database and the bylaw search functionality.

## 🛠️ Common Issues and Fixes

### 1. "Server configuration error: Missing API key"

**Cause:** The ANTHROPIC_API_KEY environment variable is missing or not loading correctly.

**Fix:**
- Check if ANTHROPIC_API_KEY is in `.env.local`
- Run `node test-anthropic.js` to verify API key
- Ensure the API key starts with `sk-ant-`

### 2. Database Connection Errors

**Cause:** Incorrect POSTGRES_URL or database access issues.

**Fix:**
- Run `node test-db.js` to see detailed diagnostics
- Check if your IP is allowed to access the database
- Verify the database connection string format

### 3. Bylaw Search Not Working

**Cause:** Issues with Pinecone vector database or OpenAI embeddings.

**Fix:**
- Run `node test-bylaw-search.js` to diagnose the issue
- Check PINECONE_API_KEY and PINECONE_INDEX environment variables
- Verify OPENAI_API_KEY is valid

### 4. Chat API 500 Error

**Cause:** Multiple potential issues, typically related to API keys or database.

**Fix:**
- Check server logs for the exact error message
- Verify all environment variables are set correctly
- Run each test script to isolate the failing component

## 🚀 Production Deployment Checks

Before deploying to production, run through this checklist:

1. Run `node test-anthropic.js` to verify Claude API works
2. Run `node test-db.js` to verify database connection
3. Run `node test-bylaw-search.js` to verify search functionality
4. Make sure all required environment variables are set in the production environment

## 📊 Viewing Logs

To view logs on Vercel:

```bash
vercel logs febchat.vercel.app
```

To filter for specific error types:

```bash
vercel logs febchat.vercel.app | grep "error\|Error"
```

## 🆘 Getting More Help

If you're still experiencing issues after following this guide, please create an issue on the repository with the following information:

1. The exact error message
2. Output from any test scripts you've run
3. Your environment (operating system, Node.js version)
4. Steps to reproduce the issue