#!/bin/bash

# Build script for production deployment

echo "Starting build process..."

# Generate Prisma client
echo "Generating Prisma Client..."
npx prisma generate

# Check if we're in a writable environment and can create a database
if [ -w "$(dirname "$(pwd)/prisma/dev.db")" ]; then
  echo "Environment appears to be writable, attempting to run migrations..."
  
  # Run database migrations
  npx prisma migrate deploy
else
  echo "Non-writable environment detected (likely Vercel), skipping migrations"
  echo "Database operations will fall back to file-based verification"
fi

# Run Next.js build
echo "Building Next.js application..."
next build

echo "Build completed successfully!"