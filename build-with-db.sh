#!/bin/bash
#
# Simplified build script for FebChat deployment
# This script handles building the application with proper database settings

echo "FebChat: Starting build process..."

# Set environment variables for the build
export NEXT_PHASE="build"
export NODE_ENV="production"

# Check if we're running in Vercel or similar environment
if [ -n "$VERCEL" ] || [ -n "$DEPLOY_ENV" ]; then
  echo "Deployment environment detected (Vercel or similar)"
  
  # Check for database URLs
  if [ -n "$POSTGRES_URL" ] || [ -n "$DATABASE_URL" ]; then
    echo "Database URL detected - will use Vercel Database integration"
  else
    echo "⚠️ WARNING: No database URLs found. Your app may not function correctly."
    # Set mock database URL for build process only
    export DATABASE_URL="postgresql://mock:mock@localhost:5432/mock_db?schema=public"
    export POSTGRES_URL="postgresql://mock:mock@localhost:5432/mock_db?schema=public"
  fi
  
  # Check for blob storage
  if [ -n "$BLOB_READ_WRITE_TOKEN" ]; then
    echo "Blob storage token detected - will use Vercel Blob Storage"
  else
    echo "⚠️ WARNING: No blob storage token found. File uploads may not work."
  fi
else
  echo "Local build environment detected"
  # Provide clear instructions for local builds
  if [ -z "$DATABASE_URL" ] && [ -z "$POSTGRES_URL" ]; then
    echo "Setting mock DATABASE_URL for build process"
    export DATABASE_URL="postgresql://mock:mock@localhost:5432/mock_db?schema=public"
    export POSTGRES_URL="postgresql://mock:mock@localhost:5432/mock_db?schema=public"
  fi
fi

# Run Next.js build
echo "Building Next.js application..."
next build

echo "Build completed successfully!"