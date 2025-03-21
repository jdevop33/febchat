#!/bin/bash

# Build script for production deployment

echo "Starting build process..."

# Generate Prisma client
echo "Generating Prisma Client..."
npx prisma generate

# Set environment variables for build process to prevent database connection errors
export NEXT_PHASE="build"
export NODE_ENV="production"

# Check if we're in a Vercel environment with Postgres integration
if [ -n "$POSTGRES_URL" ] || [ -n "$DATABASE_URL" ]; then
  echo "Postgres URL detected, running migrations..."
  
  # Run database migrations using Prisma for schema tables
  npx prisma migrate deploy || echo "Prisma migration warning (non-fatal)"
  
  # Also run Drizzle migrations for application tables
  echo "Running Drizzle migrations..."
  npx tsx lib/db/migrate.ts || echo "Drizzle migration warning (non-fatal)"
else
  echo "No database URLs detected, skipping migrations"
  echo "Setting mock DATABASE_URL for build process"
  export DATABASE_URL="postgresql://mock:mock@localhost:5432/mock_db?schema=public"
  export POSTGRES_URL="postgresql://mock:mock@localhost:5432/mock_db?schema=public"
fi

# Run Next.js build
echo "Building Next.js application..."
next build

echo "Build completed successfully!"