#!/bin/bash
# Vercel deployment test script
# This script tests if our build process works correctly in a Vercel-like environment

# Simulate Vercel environment
export VERCEL=1
export VERCEL_ENV="production"

# Set basic environment variables
export NODE_ENV="production"

# Essential API keys (using placeholders - Vercel will supply real ones)
export ANTHROPIC_API_KEY="sk-ant-api00000000-0000000000000000"
export OPENAI_API_KEY="sk-0000000000000000000000000000000000000000"

# Run build with these minimal settings
echo "=== 🚀 TESTING VERCEL DEPLOYMENT BUILD ==="
echo "This should succeed if our build process is Vercel compatible"
./build-with-db.sh

# Check result
if [ $? -eq 0 ]; then
  echo "✅ Build successful - Ready for Vercel deployment!"
else
  echo "❌ Build failed - Fix required before Vercel will deploy successfully"
  exit 1
fi