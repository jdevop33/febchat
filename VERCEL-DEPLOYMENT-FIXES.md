# FebChat Vercel Deployment Troubleshooting Guide

This guide addresses common issues encountered when deploying FebChat to Vercel, particularly focusing on database integration and query handling.

## Common Issues and Solutions

### 1. Build Failures on Vercel (but Success on GitHub)

**Potential Causes:**
- Missing environment variables on Vercel
- Insufficient memory or timeouts during build
- Vercel PostgreSQL integration issues

**Solutions:**
- Verify all required environment variables are set in Vercel project settings
- Use the enhanced build script that includes environment variable checks
- Increase Node.js memory limit with NODE_OPTIONS in build settings
- Ensure database is properly connected and accessible

### 2. Query Failures in Production

**Potential Causes:**
- Database connection issues
- Environment-specific code that works locally but not in production
- Missing fallbacks for database operations
- Authentication or permission issues with the database

**Solutions:**
- The updated `lib/db/index.ts` includes better error handling and fallbacks
- Enhanced logging helps identify the source of query issues
- Centralized database client with proper environment checks
- Improved error handling in API routes

## Required Environment Variables

Ensure these environment variables are set in your Vercel project:

### Database Configuration
```
POSTGRES_URL=postgres://user:password@host:port/database
DATABASE_URL=postgres://user:password@host:port/database
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
```

## Deployment Checklist

### Before Deployment
1. Test your application locally with production environment settings:
   ```bash
   NODE_ENV=production npm run dev
   ```
2. Verify all required environment variables are set in your Vercel project
3. Run the database connection test script:
   ```bash
   node dev-tests/test-db.js
   ```

### During Deployment
1. Monitor build logs for warnings and errors
2. Check that the database connection is successful
3. Verify that environment variables are correctly loaded

### After Deployment
1. Test authentication functionality
2. Test chat functionality with simple queries
3. Monitor server logs for any errors
4. Check database connection status

## Recent Fixes Implemented

1. **Enhanced Database Client**
   - Added robust error handling
   - Implemented better fallback mechanisms
   - Added connection timeouts to prevent hanging

2. **Improved Build Script**
   - Added environment variable validation
   - Better compatibility between different database URL formats
   - Node.js memory optimization settings

3. **Enhanced API Error Handling**
   - Better logging with context-specific information
   - More detailed error responses in development
   - Graceful degradation when services are unavailable

## Troubleshooting Steps

If you encounter issues after deployment:

1. **Check Vercel Logs**
   - Go to your Vercel project dashboard
   - Navigate to the Deployments tab
   - Select the latest deployment
   - View the Function Logs

2. **Verify Environment Variables**
   - Go to your Vercel project settings
   - Check that all required environment variables are set
   - Verify there are no typos or trailing spaces

3. **Test Database Connection**
   - Use the Vercel dashboard to access your database
   - Verify the database has been created and is accessible
   - Check that tables have been properly created

4. **Check Auth Configuration**
   - Verify NEXTAUTH_SECRET and NEXTAUTH_URL are correctly set
   - Test login and registration functionality
   - Check for auth-related errors in logs

## If All Else Fails

1. **Reset Database Integration**
   - Remove the Vercel Postgres integration
   - Re-add the integration to generate new credentials
   - Update environment variables with the new values

2. **Contact Vercel Support**
   - If database branching issues persist, contact Vercel support
   - Provide error logs and deployment details
   - Mention you're using Next.js with Vercel Postgres

Remember that Vercel's database branching feature requires specific setup. If you've recently changed your database schema or configuration, you may need to reset the database integration to ensure proper branching.