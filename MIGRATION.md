# Oak Bay Bylaws Assistant - Migration Guide

This guide explains how to migrate your Oak Bay Bylaws Assistant to use the new Pinecone index with the llama-text-embed-v2 embedding model.

## Why Migrate?

The migration offers several benefits:

1. **Better embedding quality**: The llama-text-embed-v2 model provides more accurate semantic understanding of bylaw text
2. **Improved search results**: More relevant search results for user queries
3. **Robust fallback mechanisms**: Multiple fallback layers ensure the system continues to work even if vector search is unavailable
4. **TypeScript error fixes**: The codebase has been updated to fix TypeScript errors that were causing deployment failures

## Migration Steps

### Automated Migration

We've prepared a script that automates most of the migration process:

```bash
# Make the script executable
chmod +x scripts/setup-new-index.sh

# Run the migration script
./scripts/setup-new-index.sh
```

The script will:

1. Update your `.env.local` file with the new Pinecone index and embedding model configuration
2. Organize your bylaw PDF files for better metadata extraction
3. Verify connection to the new Pinecone index
4. Index your PDFs into the new Pinecone index (optional)

### Manual Migration

If you prefer to migrate manually, follow these steps:

1. **Update environment variables**:
   
   Create or update your `.env.local` file with:
   
   ```
   PINECONE_INDEX=oak-bay-bylaws-v2
   PINECONE_ENVIRONMENT=us-east-1
   EMBEDDING_PROVIDER=llamaindex
   ```

2. **Organize bylaw PDFs**:
   
   ```bash
   pnpm tsx scripts/organize-bylaws.ts ./public/pdfs
   ```

3. **Verify Pinecone connection**:
   
   ```bash
   pnpm tsx scripts/verify-pinecone.ts
   ```

4. **Index PDFs into the new Pinecone index**:
   
   ```bash
   pnpm tsx scripts/index-bylaws.ts ./public/pdfs
   ```

5. **Build and test**:
   
   ```bash
   pnpm build
   pnpm dev
   ```

## Testing the Migration

After migrating, test the system by:

1. Running the development server: `pnpm dev`
2. Navigating to http://localhost:3000
3. Trying various bylaw-related queries in the chat interface
4. Checking that the system returns accurate and relevant bylaw information

## Troubleshooting

### Vector Search Issues

If you encounter issues with vector search:

1. **Check Pinecone connection**:
   
   ```bash
   pnpm tsx scripts/verify-pinecone.ts
   ```

2. **Review API keys**:
   
   Ensure your Pinecone API key is correct in `.env.local`

3. **Fallback to direct search**:
   
   The system includes robust fallback mechanisms and will automatically switch to text-based search if vector search fails.

### Build Errors

If you encounter TypeScript errors during build:

1. **Check TypeScript version**:
   
   ```bash
   pnpm tsc --version
   ```
   
   Ensure you're using TypeScript 5.6.x or later.

2. **Clear build cache**:
   
   ```bash
   rm -rf .next
   pnpm build
   ```

## Deployment

### Updating Vercel Environment Variables

Before deploying, you need to update the environment variables in your Vercel project:

1. Go to the Vercel dashboard and select your project
2. Navigate to the "Settings" tab and select "Environment Variables"
3. Update the following variables:
   - `PINECONE_INDEX`: Set to `oak-bay-bylaws-v2`
   - `PINECONE_ENVIRONMENT`: If your current value is different from the AWS region (us-east-1), update it or remove it as the code will connect directly to the index
   - Add a new variable `EMBEDDING_PROVIDER`: Set to `llamaindex`

> **Important**: You should **replace** the old Pinecone index (don't keep both), as the application is now configured to work with the new index.

### Deploying to Vercel

After updating environment variables, deploy to Vercel:

```bash
vercel deploy
```

Or configure automatic deployments from your GitHub repository.

## Need Help?

If you encounter any issues during migration, please:

1. Check the error messages for specific details
2. Review the fallback mechanisms provided in the codebase
3. Contact the maintainers for further assistance

---

Thank you for using the Oak Bay Bylaws Assistant. This migration will significantly improve the reliability and quality of bylaw search results for your users.