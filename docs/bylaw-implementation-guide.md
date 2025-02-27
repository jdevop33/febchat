# Oak Bay Bylaws Knowledge Base Implementation Guide

## 1. Document Processing Pipeline

### PDF Extraction

```
PDF Bylaws → Text Extraction → Cleaning → Chunking → Embedding → Vector Storage
```

1. **Install document processing libraries**:

   ```bash
   pnpm add pdf-parse langchain @pinecone-database/pinecone
   ```

2. **Create a document loader for PDF files**:

   - Extract text while preserving structural information
   - Keep track of bylaw numbers, sections, and hierarchy

3. **Implement text cleaning**:
   - Remove headers, footers, and page numbers
   - Fix common OCR errors
   - Normalize text formatting

## 2. Chunking Strategy

Effective chunking is critical for accurate retrieval:

1. **Hierarchical chunking**:

   - Primary chunks: Complete bylaw sections
   - Secondary chunks: Individual regulations
   - Overlap chunks by 10-20% to avoid losing context at boundaries

2. **Metadata enrichment**:
   - Attach metadata to each chunk:
     ```json
     {
       "bylaw_number": "4360",
       "title": "Zoning Bylaw",
       "section": "5.2",
       "date_enacted": "2022-06-15",
       "category": "zoning"
     }
     ```

## 3. Vector Database Implementation

We'll use Pinecone as our vector database:

1. **Set up Pinecone**:

   ```javascript
   import { Pinecone } from '@pinecone-database/pinecone';

   const pinecone = new Pinecone({
     apiKey: process.env.PINECONE_API_KEY,
     environment: process.env.PINECONE_ENVIRONMENT,
   });

   const index = pinecone.index('oak-bay-bylaws');
   ```

2. **Create embeddings**:

   ```javascript
   import { OpenAIEmbeddings } from 'langchain/embeddings/openai';

   const embeddings = new OpenAIEmbeddings({
     openAIApiKey: process.env.OPENAI_API_KEY,
     model: 'text-embedding-3-large',
   });
   ```

3. **Index documents**:

   ```javascript
   const vectors = await Promise.all(
     chunks.map(async (chunk, i) => {
       const embedding = await embeddings.embedQuery(chunk.text);
       return {
         id: `bylaw-${chunk.metadata.bylaw_number}-${chunk.metadata.section}-${i}`,
         values: embedding,
         metadata: chunk.metadata,
       };
     }),
   );

   await index.upsert(vectors);
   ```

## 4. Hybrid Search Implementation

Implement hybrid search combining vector similarity with keyword matching:

```javascript
async function searchBylaws(query) {
  // Generate embedding for the query
  const embedding = await embeddings.embedQuery(query);

  // Perform vector search
  const vectorResults = await index.query({
    vector: embedding,
    topK: 5,
    includeMetadata: true,
    filter: {}, // Can filter by bylaw type if needed
  });

  // Optional: Implement sparse vector search for keyword matching
  // Combine results using a reranking algorithm

  return vectorResults;
}
```

## 5. API Endpoint Integration

Create a specific endpoint for bylaw searches:

```javascript
// /app/(chat)/api/bylaws/search/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { searchBylaws } from '@/lib/search/bylaws';

export async function POST(request: Request) {
  const session = await auth();
  if (!session || !session.user) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { query } = await request.json();
  const results = await searchBylaws(query);

  return NextResponse.json(results);
}
```

## 6. Retrieval-Augmented Generation (RAG)

Enhance our existing search tool to implement RAG:

```javascript
// /lib/ai/tools/search-bylaws.ts
export async function searchBylawsTool(query: string) {
  // Search for relevant bylaw chunks
  const results = await searchBylaws(query);

  // Format the context for the LLM
  const context = results.matches.map(match =>
    `Bylaw ${match.metadata.bylaw_number} (${match.metadata.title}), Section ${match.metadata.section}: ${match.metadata.text}`
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

## 7. Regular Updates and Versioning

Implement a system to keep the knowledge base current:

1. **Version control for bylaws**:
   - Store bylaw version/date in metadata
   - Flag outdated information
2. **Update pipeline**:

   ```bash
   # Script to run monthly or when bylaws are updated
   pnpm run update-bylaws
   ```

3. **Incremental updates**:
   - Only reprocess and re-embed changed bylaws
   - Maintain version history

## 8. Advanced Features

### Citation Generation

Implement automatic citation generation for responses:

```typescript
function generateCitation(metadata) {
  return {
    bylawNumber: metadata.bylaw_number,
    title: metadata.title,
    section: metadata.section,
    url: `https://oakbay.civicweb.net/document/bylaw/${metadata.bylaw_number}?section=${metadata.section}`,
    dateAccessed: new Date().toISOString().split('T')[0],
  };
}
```

### Query Understanding

Implement a query classification system:

```typescript
async function classifyQuery(query) {
  // Use LLM to classify query type
  const classification = await classifyWithLLM(query);

  return {
    intent: classification.intent, // e.g., "find_regulation", "check_compliance"
    bylawType: classification.bylawType, // e.g., "zoning", "noise", "parking"
    queryComplexity: classification.complexity, // e.g., "simple", "complex"
  };
}
```

## 9. Monitoring and Analytics

Implement monitoring to improve the system over time:

1. **Track query patterns**:

   - Most common bylaw inquiries
   - Frequently confused bylaws
   - Queries with low confidence answers

2. **User feedback loop**:
   - Add thumbs up/down on responses
   - Track which answers are most helpful
   - Use feedback to improve embeddings and retrieval

## 10. Implementation Timeline

Phase 1 (Week 1-2):

- Set up PDF extraction pipeline
- Implement basic chunking
- Configure vector database

Phase 2 (Week 3-4):

- Implement search API
- Integrate with Claude
- Build citation component

Phase 3 (Week 5-6):

- Add advanced features
- Implement feedback system
- Deploy and test

## 11. Security Considerations

1. **Data protection**:

   - Encrypt sensitive information
   - Implement role-based access control

2. **Disclaimer system**:
   - Clearly indicate the system provides information, not legal advice
   - Version information with last-updated timestamps

## 12. Technical Requirements

- Node.js 18+
- Next.js 14+
- Pinecone or comparable vector database
- OpenAI API access for embeddings
- Anthropic API for Claude integration
- Cloud storage for PDF files
- CI/CD pipeline for updates
