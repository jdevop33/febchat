#!/bin/bash

# Build script for production deployment

echo "Starting build process..."

# Generate Prisma client
echo "Generating Prisma Client..."
npx prisma generate

# Set environment variables for build process to prevent database connection errors
export NEXT_PHASE="build"
export NODE_ENV="production"

# Check if we're in a writable environment and can create a database
if [ -w "$(dirname "$(pwd)/prisma/dev.db")" ]; then
  echo "Environment appears to be writable, attempting to run migrations..."
  
  # Run database migrations
  npx prisma migrate deploy
else
  echo "Non-writable environment detected (likely Vercel), skipping migrations"
  echo "Database operations will fall back to file-based verification"
fi

# Provide a mock DATABASE_URL for the build process if not set
if [ -z "$DATABASE_URL" ] && [ -z "$POSTGRES_URL" ]; then
  echo "Setting mock DATABASE_URL for build process"
  export DATABASE_URL="postgresql://mock:mock@localhost:5432/mock_db?schema=public"
fi

# Run Next.js build
echo "Building Next.js application..."
next build

echo "Build completed successfully!"