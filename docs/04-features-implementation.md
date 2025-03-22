# FebChat Features & Implementation

**Last Updated:** March 22, 2025

## PDF Management System

### Storage Options

**Development**: Files stored in `/public/pdfs/` with utility functions:
- `getLocalPdfPath`: Local PDF path
- `getExternalPdfUrl`: External PDF URL
- `getBestPdfUrl`: Environment-aware URL selection

**Production**: Vercel Blob Storage (recommended):
```typescript
import { put } from '@vercel/blob';
const { url } = await put(`bylaws/${bylawNumber}.pdf`, blob, { access: 'public' });
```

### PDF Processing Pipeline

1. **Extraction**: Extract text from PDFs
2. **Chunking**: Split into manageable chunks
3. **Metadata**: Extract bylaw number, title, sections
4. **Embedding**: Generate embeddings
5. **Storage**: Upload to vector database

### Management Scripts

```bash
# Organize filenames
pnpm tsx scripts/organize-bylaws.ts

# Upload to Pinecone
pnpm tsx scripts/upload-pdfs-to-pinecone.ts

# Upload with Llama embeddings
pnpm tsx scripts/upload-with-llama-embeddings.ts

# Namespaced upload
pnpm tsx scripts/pinecone-namespace-upload.ts <namespace> [pdf-file]

# Complete pipeline
pnpm pdfs:pipeline
```

## Bylaw Search Implementation

### Vector Database Setup

```javascript
import { Pinecone } from '@pinecone-database/pinecone';

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,
  environment: process.env.PINECONE_ENVIRONMENT,
});

const index = pinecone.index('oak-bay-bylaws');
```

### Embeddings Generation

```javascript
import { OpenAIEmbeddings } from 'langchain/embeddings/openai';

const embeddings = new OpenAIEmbeddings({
  openAIApiKey: process.env.OPENAI_API_KEY,
  model: 'text-embedding-3-large',
});
```

### Search Implementation

```javascript
async function searchBylaws(query) {
  const embedding = await embeddings.embedQuery(query);
  return await index.query({
    vector: embedding,
    topK: 5,
    includeMetadata: true,
  });
}
```

### API Integration

```javascript
// /app/(chat)/api/bylaws/search/route.ts
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return new Response('Unauthorized', { status: 401 });
  
  const { query } = await request.json();
  const results = await searchBylaws(query);
  return NextResponse.json(results);
}
```

## AI Model Integration

### Models Configuration

```typescript
export const myProvider = customProvider({
  languageModels: {
    'chat-model-small': openai('gpt-4o-mini'),
    'chat-model-large': anthropic('claude-3-5-sonnet'),
    'title-model': openai('gpt-4-turbo'),
  },
});
```

### RAG Implementation

```javascript
export async function searchBylawsTool(query: string) {
  const results = await searchBylaws(query);
  const context = results.matches.map(match =>
    `Bylaw ${match.metadata.bylaw_number}, Section ${match.metadata.section}: ${match.metadata.text}`
  ).join('\n\n');

  return {
    found: results.matches.length > 0,
    results: results.matches.map(match => ({
      bylawNumber: match.metadata.bylaw_number,
      title: match.metadata.title,
      section: match.metadata.section,
      content: match.metadata.text
    }))
  };
}
```

## UI Components

### BylawCitation Component

Provides interactive elements for bylaw citations:
- Title and section display
- Expandable excerpt view
- Copy functionality
- PDF viewer link

### EnhancedMarkdown Component

Automatically detects bylaw references in text and converts them to interactive components.

### PDF Viewer

- Modal-based PDF viewer with pagination
- Zoom and search capabilities
- Responsive design for all devices

## Best Practices

- Organize bylaw filenames consistently
- Use namespaces for efficient queries
- Process files in batches to avoid rate limits
- Cache PDF metadata for performance
- Implement version control for bylaws
- Keep separate test and production indexes