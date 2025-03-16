# Oak Bay Bylaws PDF Upload Guide

This guide explains how to upload and index PDF bylaw documents to the new Pinecone index with llama-text-embed-v2 embeddings.

## Setup

Before running any of the scripts, make sure your environment is properly configured:

1. Ensure your `.env.local` file contains the required variables:
   ```
   PINECONE_API_KEY=your-pinecone-api-key
   PINECONE_INDEX=oak-bay-bylaws-v2
   PINECONE_ENVIRONMENT=us-east-1
   OPENAI_API_KEY=your-openai-api-key
   EMBEDDING_PROVIDER=llamaindex
   ```

2. Place your PDF files in the `public/pdfs` directory.

## Available Scripts

We provide several scripts to help you upload and index PDF documents:

### 1. Organize Bylaws

This script organizes your PDF filenames for better metadata extraction:

```bash
pnpm tsx scripts/organize-bylaws.ts
```

It renames files to a consistent format: `bylaw-NUMBER-title.pdf`

### 2. Upload PDFs to Pinecone

This script processes PDFs and uploads them to Pinecone using OpenAI embeddings:

```bash
pnpm tsx scripts/upload-pdfs-to-pinecone.ts
```

### 3. Upload with Llama Embeddings

This script uses simulated llama-text-embed-v2 embeddings (can be updated with real API access):

```bash
pnpm tsx scripts/upload-with-llama-embeddings.ts
```

### 4. Namespaced Upload

This script uploads PDFs to a specific namespace in the Pinecone index:

```bash
pnpm tsx scripts/pinecone-namespace-upload.ts <namespace> [pdf-file]
```

Example:
```bash
# Upload all PDFs to the "zoning" namespace
pnpm tsx scripts/pinecone-namespace-upload.ts zoning

# Upload a specific PDF to the "finance" namespace
pnpm tsx scripts/pinecone-namespace-upload.ts finance ./public/pdfs/bylaw-4747-reserve-funds.pdf
```

## PDF Processing Pipeline

The PDF processing pipeline involves these steps:

1. **PDF Extraction**: The PDF content is extracted and cleaned
2. **Chunking**: Long texts are split into manageable chunks
3. **Metadata Extraction**: Information like bylaw number and title is extracted
4. **Embedding Generation**: Text is converted to numerical embeddings
5. **Vector Upload**: Embeddings and metadata are uploaded to Pinecone

## Best Practices

- **Organize filenames**: Run the organize-bylaws.ts script first for better metadata extraction
- **Use namespaces**: Group related bylaws in namespaces for more efficient queries
- **Batch processing**: Process files in batches to avoid hitting API rate limits
- **Verify uploads**: Check Pinecone console to verify vectors have been uploaded

## Troubleshooting

### Common Issues

1. **API Key Errors**: Make sure your API keys in .env.local are valid
2. **PDF Extraction Fails**: Some PDFs may be scanned or secured; convert them first
3. **Connection Timeouts**: Pinecone may have connection issues; retry later
4. **Rate Limiting**: If hitting API limits, increase delays between batches

### Checking Upload Status

To verify uploads were successful, run:

```bash
pnpm tsx scripts/verify-pinecone.ts
```

This will connect to your Pinecone index and verify vectors are present.

## Advanced: Using a Real Llama Embedding API

The current implementation uses a simulated llama-text-embed-v2 embedding generator. To use a real API:

1. Update the `getLlamaEmbeddings` function in `scripts/upload-with-llama-embeddings.ts`
2. Replace the simulation code with an actual API call to a service that provides llama-text-embed-v2

Example implementation (pseudo-code):

```typescript
async function getLlamaEmbeddings(texts: string[]): Promise<number[][]> {
  const response = await fetch('https://your-llama-api-endpoint.com/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.LLAMA_API_KEY}`
    },
    body: JSON.stringify({ texts, model: 'llama-text-embed-v2' })
  });
  
  const data = await response.json();
  return data.embeddings;
}
```