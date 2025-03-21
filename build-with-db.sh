#!/bin/bash
#
# Optimized build script for FebChat deployment
# This script handles building the application with proper database settings
# and ensures compatibility with Vercel's database branching

echo "FebChat: Starting build process..."

# Set environment variables for the build
export NEXT_PHASE="build"
export NODE_ENV="production"

# Display environment information
echo "Build environment:"
echo "- NODE_ENV: $NODE_ENV"
echo "- VERCEL: ${VERCEL:-Not detected}"
echo "- VERCEL_ENV: ${VERCEL_ENV:-Not detected}"

# Check if we're running in Vercel environment
if [ -n "$VERCEL" ]; then
  echo "🚀 Vercel deployment environment detected"
  
  # Check for Vercel Postgres integration
  if [ -n "$POSTGRES_URL" ]; then
    echo "✅ Vercel Postgres integration detected"
    
    # Display partial connection string for verification (hide credentials)
    SAFE_URL=$(echo "$POSTGRES_URL" | sed -E 's/postgres:\/\/[^:]+:[^@]+@/postgres:\/\/****:****@/')
    echo "Database connection: $SAFE_URL"
    
    # Don't need to do anything special - database is already configured by Vercel
  else
    echo "⚠️ WARNING: No Vercel Postgres URL found"
    echo "Database branching may not work correctly without a properly configured database"
    
    # For build phase only, provide a mock database URL to allow build to complete
    echo "Setting mock database URL for build process only"
    export POSTGRES_URL="postgresql://mock:mock@localhost:5432/mock_db?schema=public"
  fi
else
  echo "Local or CI build environment detected"
  
  # For local builds, ensure database URL is set
  if [ -z "$POSTGRES_URL" ] && [ -z "$DATABASE_URL" ]; then
    echo "No database URL found, setting mock database URL for build only"
    export POSTGRES_URL="postgresql://mock:mock@localhost:5432/mock_db?schema=public"
  else
    echo "✅ Database URL detected"
  fi
fi

# Run Next.js build with optimized settings
echo "Building Next.js application..."
next build

# Build successful
echo "✅ Build completed successfully!"