#!/bin/bash
# Setup script for migrating to the new Pinecone index with llama-text-embed-v2

set -e  # Exit on error

echo "====================================================="
echo "Oak Bay Bylaws Assistant - Index Migration Setup"
echo "====================================================="
echo

# Check for required environment variables
if [ -z "$OPENAI_API_KEY" ]; then
  echo "❌ ERROR: OPENAI_API_KEY environment variable is not set."
  echo "Please set it in your .env.local file or export it in your shell."
  exit 1
fi

if [ -z "$PINECONE_API_KEY" ]; then
  echo "❌ ERROR: PINECONE_API_KEY environment variable is not set."
  echo "Please set it in your .env.local file or export it in your shell."
  exit 1
fi

# Step 1: Create or update the .env.local file
echo "📄 Updating .env.local file with new Pinecone index information..."

if [ -f .env.local ]; then
  # Backup existing file
  cp .env.local .env.local.bak
  echo "✅ Backed up existing .env.local to .env.local.bak"
fi

# Update or create environment file
cat > .env.local << EOF
# Updated by setup-new-index.sh script
OPENAI_API_KEY=$OPENAI_API_KEY
PINECONE_API_KEY=$PINECONE_API_KEY
PINECONE_INDEX=oak-bay-bylaws-v2
# AWS us-east-1 region (optional, can be removed if connecting directly to index)
PINECONE_ENVIRONMENT=us-east-1
EMBEDDING_PROVIDER=llamaindex
EOF

echo "✅ Created .env.local with new configuration"

# Step 2: Organize bylaw PDFs for better metadata extraction
echo
echo "📂 Organizing bylaw PDFs for better metadata extraction..."
pnpm tsx scripts/organize-bylaws.ts ./public/pdfs

# Step 3: Verify Pinecone connection
echo
echo "🔌 Verifying connection to new Pinecone index..."
pnpm tsx scripts/verify-pinecone.ts

# Step 4: Index the PDFs into the new Pinecone index
echo
echo "🔍 Would you like to index the PDFs into the new Pinecone index? (y/n)"
read -p "> " response

if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
  echo
  echo "🔄 Indexing PDFs into new Pinecone index..."
  pnpm tsx scripts/index-bylaws.ts ./public/pdfs
else
  echo
  echo "📝 Skipping indexing. You can run it later with:"
  echo "    pnpm tsx scripts/index-bylaws.ts ./public/pdfs"
fi

echo
echo "✨ Setup complete! ✨"
echo
echo "Next steps:"
echo "1. Run 'pnpm build' to verify the application builds successfully"
echo "2. Run 'pnpm dev' to start the development server"
echo "3. Test the bylaw search functionality"
echo