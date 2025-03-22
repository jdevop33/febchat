#!/bin/bash
#
# Enhanced build script for FebChat deployment
# This script handles building the application with proper database settings
# and ensures compatibility with Vercel's database branching
# With additional validation and debug information

echo "FebChat: Starting build process..."

# Set environment variables for the build
export NEXT_PHASE="build"
export NODE_ENV="production"

# Display environment information
echo "Build environment:"
echo "- NODE_ENV: $NODE_ENV"
echo "- NEXT_PHASE: $NEXT_PHASE"
echo "- VERCEL: ${VERCEL:-Not detected}"
echo "- VERCEL_ENV: ${VERCEL_ENV:-Not detected}"

# Check AI API keys
echo "Checking required API keys:"
if [ -n "$ANTHROPIC_API_KEY" ]; then
  echo "✅ ANTHROPIC_API_KEY: Detected"
else
  echo "⚠️ WARNING: ANTHROPIC_API_KEY not found - AI functionality will be unavailable"
  # Don't fail the build, but ensure the app handles this gracefully
fi

# Check if we're running in Vercel environment
if [ -n "$VERCEL" ]; then
  echo "🚀 Vercel deployment environment detected"
  
  # Check for Vercel Postgres integration
  if [ -n "$POSTGRES_URL" ]; then
    echo "✅ Vercel Postgres integration detected"
    
    # Display partial connection string for verification (hide credentials)
    SAFE_URL=$(echo "$POSTGRES_URL" | sed -E 's/postgres:\/\/[^:]+:[^@]+@/postgres:\/\/****:****@/')
    echo "Database connection: $SAFE_URL"
    
    # Verify other Postgres-related environment variables
    if [ -z "$POSTGRES_URL_NON_POOLING" ]; then
      echo "⚠️ WARNING: POSTGRES_URL_NON_POOLING is not set, but might be useful for non-pooled connections"
    fi
    
    # Export additional environment variables for compatibility
    if [ -n "$POSTGRES_URL" ] && [ -z "$DATABASE_URL" ]; then
      echo "Exporting POSTGRES_URL as DATABASE_URL for compatibility"
      export DATABASE_URL="$POSTGRES_URL"
    fi
  else
    echo "⚠️ WARNING: No Vercel Postgres URL found"
    echo "Database branching may not work correctly without a properly configured database"
    
    # Check for alternative database URLs
    if [ -n "$DATABASE_URL" ]; then
      echo "✅ DATABASE_URL detected, using this instead"
      export POSTGRES_URL="$DATABASE_URL"
    else
      # For build phase only, provide a mock database URL to allow build to complete
      echo "Setting mock database URL for build process only"
      export POSTGRES_URL="postgresql://mock:mock@localhost:5432/mock_db?schema=public"
      export DATABASE_URL="postgresql://mock:mock@localhost:5432/mock_db?schema=public"
    fi
  fi
  
  # Check for auth secret
  if [ -z "$NEXTAUTH_SECRET" ]; then
    echo "⚠️ WARNING: NEXTAUTH_SECRET is not set - authentication may not work correctly"
  fi
  
  # Check for URL
  if [ -z "$NEXTAUTH_URL" ]; then
    echo "⚠️ WARNING: NEXTAUTH_URL is not set - authentication may not work correctly"
  fi
else
  echo "Local or CI build environment detected"
  
  # For local builds, ensure database URL is set
  if [ -z "$POSTGRES_URL" ] && [ -z "$DATABASE_URL" ]; then
    echo "No database URL found, setting mock database URL for build only"
    export POSTGRES_URL="postgresql://mock:mock@localhost:5432/mock_db?schema=public"
    export DATABASE_URL="postgresql://mock:mock@localhost:5432/mock_db?schema=public"
  else
    echo "✅ Database URL detected"
    
    # Ensure compatibility between POSTGRES_URL and DATABASE_URL
    if [ -n "$POSTGRES_URL" ] && [ -z "$DATABASE_URL" ]; then
      export DATABASE_URL="$POSTGRES_URL"
    elif [ -n "$DATABASE_URL" ] && [ -z "$POSTGRES_URL" ]; then
      export POSTGRES_URL="$DATABASE_URL"
    fi
  fi
fi

# Set a generous timeout for the build
echo "Setting NODE_OPTIONS to increase memory limit and timeout"
export NODE_OPTIONS="--max-old-space-size=4096 --max-http-header-size=16384"

# Run Next.js build with optimized settings
echo "Building Next.js application..."
next build

# Verify build success
if [ $? -eq 0 ]; then
  echo "✅ Build completed successfully!"
else
  echo "❌ Build failed. Check the errors above."
  exit 1
fi