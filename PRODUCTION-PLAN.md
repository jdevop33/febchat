# Oak Bay Bylaws Assistant: Production Implementation Plan [UPDATED]

## 1. Infrastructure Setup

### Vector Database: Pinecone

- **Account Setup**: Create a Pinecone account (https://www.pinecone.io/)
- **Index Configuration**:
  - Index name: `oak-bay-bylaws`
  - Dimensions: 1536 (for OpenAI embeddings) or 384 (for more efficient models)
  - Metric: cosine similarity
  - Pod type: p1 or s1 (based on budget/performance needs)

### Cloud Storage

- Set up GCP Cloud Storage bucket for PDF storage
- Configure access control and lifecycle policies
- Organize bylaws by category and update date

### Environment Variables

```
# Vector Database
PINECONE_API_KEY=your-api-key
PINECONE_ENVIRONMENT=your-environment
PINECONE_INDEX=oak-bay-bylaws

# OpenAI (for embeddings)
OPENAI_API_KEY=your-api-key

# Anthropic (for LLM)
ANTHROPIC_API_KEY=your-api-key

# Storage
GCP_PROJECT_ID=your-project-id
GCP_BUCKET_NAME=oak-bay-bylaws
GCP_CREDENTIALS=json-credentials-string
```

## 2. Document Processing Pipeline

### Dependency Installation

```bash
pnpm add @pinecone-database/pinecone langchain openai pdf-parse pdf-lib @google-cloud/storage
```

### PDF Processing System

1. **Document Preprocessing**

   - Create `/lib/bylaw-processing/preprocess.ts` for PDF preparation
   - Implement OCR correction and text standardization
   - Handle multi-column layouts and tables

2. **Chunking Strategy**

   - Create `/lib/bylaw-processing/chunking.ts`
   - Implement semantic chunking based on section boundaries
   - Handle hierarchical document structure
   - Maintain context and relationships

3. **Embedding Generation**

   - Create `/lib/bylaw-processing/embeddings.ts`
   - Set up batch processing for efficient embedding generation
   - Implement caching for previously processed documents

4. **Metadata Extraction**

   - Extract bylaw numbers, effective dates, and sections
   - Create standardized metadata schema
   - Generate citation information

5. **Ingestion CLI**
   - Create `/scripts/ingest-bylaws.ts` CLI tool
   - Support batch processing, incremental updates
   - Schedule regular updates via cron

## 3. Vector Search Implementation

### Pinecone Integration

1. **Client Setup**

```typescript
// /lib/vector-search/pinecone-client.ts
import { Pinecone } from '@pinecone-database/pinecone';

export function getPineconeClient() {
  const apiKey = process.env.PINECONE_API_KEY;
  const environment = process.env.PINECONE_ENVIRONMENT;

  if (!apiKey || !environment) {
    throw new Error('Pinecone API key and environment must be defined');
  }

  return new Pinecone({
    apiKey,
    environment,
  });
}
```

2. **Search Service**

```typescript
// /lib/vector-search/search-service.ts
import { getPineconeClient } from './pinecone-client';
import { OpenAIEmbeddings } from 'langchain/embeddings/openai';

export async function searchBylaws(query: string, options = {}) {
  const pinecone = getPineconeClient();
  const index = pinecone.index(process.env.PINECONE_INDEX || 'oak-bay-bylaws');

  const embeddings = new OpenAIEmbeddings({
    modelName: 'text-embedding-3-small',
  });

  const queryEmbedding = await embeddings.embedQuery(query);

  const results = await index.query({
    vector: queryEmbedding,
    topK: 5,
    includeMetadata: true,
    ...options,
  });

  return results.matches.map((match) => ({
    id: match.id,
    text: match.metadata?.text,
    metadata: match.metadata,
    score: match.score,
  }));
}
```

3. **Hybrid Search Implementation**
   - Implement hybrid search combining vector similarity with keyword search
   - Implement category and facet filtering
   - Add re-ranking for improved precision

## 4. API Implementation

### Search API Endpoint

```typescript
// /app/(chat)/api/bylaws/search/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { searchBylaws } from '@/lib/vector-search/search-service';
import { z } from 'zod';

const searchSchema = z.object({
  query: z.string().min(3),
  filters: z
    .object({
      category: z.string().optional(),
      bylawNumber: z.string().optional(),
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
    })
    .optional(),
  limit: z.number().min(1).max(20).optional().default(5),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const body = await request.json();
    const { query, filters, limit } = searchSchema.parse(body);

    const searchOptions = {
      topK: limit,
      filter: filters
        ? {
            $and: Object.entries(filters)
              .filter(([_, value]) => value)
              .map(([key, value]) => ({ [key]: { $eq: value } })),
          }
        : undefined,
    };

    const results = await searchBylaws(query, searchOptions);

    return NextResponse.json({
      success: true,
      results: results.map((result) => ({
        bylawNumber: result.metadata.bylawNumber,
        title: result.metadata.title,
        section: result.metadata.section,
        content: result.text,
        url: `https://oakbay.civicweb.net/document/bylaw/${result.metadata.bylawNumber}?section=${result.metadata.section}`,
        score: result.score,
      })),
    });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof z.ZodError
            ? 'Invalid search parameters'
            : 'Search failed',
      },
      { status: 400 },
    );
  }
}
```

### Claude Tool Implementation

```typescript
// /lib/ai/tools/search-bylaws.ts
import { searchBylaws } from '@/lib/vector-search/search-service';
import { z } from 'zod';

export const searchBylawsSchema = z.object({
  query: z.string().describe('The search query for bylaws information'),
  category: z.string().optional().describe('Optional category to filter by'),
  bylawNumber: z
    .string()
    .optional()
    .describe('Optional bylaw number to filter by'),
});

export async function searchBylawsTool(
  query: string,
  category?: string,
  bylawNumber?: string,
) {
  const filters = {};
  if (category) filters.category = category;
  if (bylawNumber) filters.bylawNumber = bylawNumber;

  const results = await searchBylaws(query, {
    topK: 5,
    filter: Object.keys(filters).length > 0 ? filters : undefined,
  });

  if (results.length === 0) {
    return {
      found: false,
      message:
        'No relevant bylaws found. Please try a different search or contact Oak Bay Municipal Hall for assistance.',
    };
  }

  return {
    found: true,
    results: results.map((result) => ({
      bylawNumber: result.metadata.bylawNumber,
      title: result.metadata.title,
      section: result.metadata.section,
      content: result.text,
      url: `https://oakbay.civicweb.net/document/bylaw/${result.metadata.bylawNumber}?section=${result.metadata.section}`,
    })),
  };
}
```

## 5. Enhanced User Interface

### Bylaw Citation Component Improvements

```tsx
// /components/bylaw-citation.tsx
'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from './ui/card';
import {
  FileText,
  ArrowUpRight,
  Copy,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Button } from './ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { toast } from 'sonner';

interface BylawCitationProps {
  bylawNumber: string;
  section: string;
  title?: string;
  excerpt?: string;
  url?: string;
  className?: string;
}

export function BylawCitation({
  bylawNumber,
  section,
  title,
  excerpt,
  url,
  className,
}: BylawCitationProps) {
  const [expanded, setExpanded] = useState(false);
  const formattedTitle = title || `Bylaw No. ${bylawNumber}`;
  const citationUrl =
    url ||
    `https://oakbay.civicweb.net/document/bylaw/${bylawNumber}?section=${section}`;

  const copyToClipboard = () => {
    const citation = `${formattedTitle}, Section ${section}: ${excerpt}`;
    navigator.clipboard.writeText(citation);
    toast.success('Citation copied to clipboard');
  };

  return (
    <Card
      className={cn(
        'my-3 border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/20',
        className,
      )}
    >
      <CardContent className="pb-3 pt-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
            <FileText size={16} className="shrink-0" />
            <div className="font-medium">{formattedTitle}</div>
          </div>
          <div className="text-sm text-muted-foreground">Section {section}</div>
        </div>

        {excerpt && (
          <div
            className={cn(
              'mt-2 border-l-2 border-blue-300 pl-3 text-sm dark:border-blue-700',
              expanded ? 'line-clamp-none' : 'line-clamp-3',
            )}
          >
            <p className="italic">{excerpt}</p>
          </div>
        )}

        <div className="mt-3 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? (
              <>
                <ChevronUp size={14} className="mr-1" />
                Show Less
              </>
            ) : (
              <>
                <ChevronDown size={14} className="mr-1" />
                Show More
              </>
            )}
          </Button>

          <div className="flex gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-xs"
                  onClick={copyToClipboard}
                >
                  <Copy size={14} className="mr-1" />
                  Copy
                </Button>
              </TooltipTrigger>
              <TooltipContent>Copy citation to clipboard</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-xs"
                  onClick={() => window.open(citationUrl, '_blank')}
                >
                  <ArrowUpRight size={14} className="mr-1" />
                  View Full Bylaw
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                Open the full bylaw text in a new tab
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

### Search Filters Component

```tsx
// /components/bylaw-search-filters.tsx
'use client';

import React from 'react';
import { Button } from './ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { FilterIcon, XIcon } from 'lucide-react';

interface BylawSearchFiltersProps {
  onApplyFilters: (filters: {
    category?: string;
    bylawNumber?: string;
    dateFrom?: string;
    dateTo?: string;
  }) => void;
}

const CATEGORIES = [
  { value: 'zoning', label: 'Zoning & Land Use' },
  { value: 'trees', label: 'Tree Protection' },
  { value: 'animals', label: 'Animal Control' },
  { value: 'noise', label: 'Noise Control' },
  { value: 'building', label: 'Building & Construction' },
  { value: 'traffic', label: 'Traffic & Parking' },
];

export function BylawSearchFilters({
  onApplyFilters,
}: BylawSearchFiltersProps) {
  const [category, setCategory] = React.useState('');
  const [bylawNumber, setBylawNumber] = React.useState('');
  const [dateFrom, setDateFrom] = React.useState('');
  const [dateTo, setDateTo] = React.useState('');

  const handleApplyFilters = () => {
    onApplyFilters({
      category: category || undefined,
      bylawNumber: bylawNumber || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    });
  };

  const handleReset = () => {
    setCategory('');
    setBylawNumber('');
    setDateFrom('');
    setDateTo('');
    onApplyFilters({});
  };

  return (
    <div className="mb-4 space-y-4 rounded-lg border p-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="flex items-center gap-2 font-medium">
          <FilterIcon size={16} />
          Search Filters
        </h3>

        <Button variant="ghost" size="sm" onClick={handleReset}>
          <XIcon size={14} className="mr-1" />
          Reset
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="category">Bylaw Category</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger id="category">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Categories</SelectItem>
              {CATEGORIES.map((category) => (
                <SelectItem key={category.value} value={category.value}>
                  {category.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="bylawNumber">Bylaw Number</Label>
          <Input
            id="bylawNumber"
            placeholder="e.g. 4620"
            value={bylawNumber}
            onChange={(e) => setBylawNumber(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="dateFrom">From Date</Label>
          <Input
            id="dateFrom"
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="dateTo">To Date</Label>
          <Input
            id="dateTo"
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </div>
      </div>

      <Button onClick={handleApplyFilters} className="w-full">
        Apply Filters
      </Button>
    </div>
  );
}
```

## 6. Performance Optimization

### Caching Implementation

1. **Implement Redis caching for search results**

   - Set up Redis client
   - Cache frequent search results with expiration
   - Use query fingerprinting for cache keys

2. **Edge Caching**

   - Configure Next.js ISR where appropriate
   - Set up proper cache headers
   - Implement stale-while-revalidate

3. **Progressive Loading**
   - Show initial results quickly while loading more
   - Implement skeleton UI for citation loading
   - Add lazy loading for long search results

## 7. Monitoring and Analytics

### Application Monitoring

1. **Sentry Integration**

   - Set up error tracking and performance monitoring
   - Configure custom context for bylaw-specific errors
   - Implement release tracking with source maps

2. **Search Analytics Dashboard**

   - Track popular searches and bylaw references
   - Monitor search effectiveness and refinements
   - Analyze user interaction patterns

3. **Feedback Loop System**
   - Implement thumbs up/down on search results
   - Track which citations were helpful
   - Use feedback to improve embeddings and retrieval

## 8. Continuous Updates

### Bylaw Update Pipeline

1. **Scheduled Updates**

   - Set up GitHub Actions workflow for regular updates
   - Create incremental update process
   - Validate bylaw data integrity

2. **Admin Dashboard**
   - Create an admin interface for bylaw management
   - Support manual upload and processing
   - Version control for bylaw updates

## 9. Deployment Strategy

### Production Environment

1. **Vercel Deployment**

   - Configure Vercel for production deployment
   - Set up preview environments for testing
   - Implement environment-specific configurations

2. **Database Configuration**

   - Set up proper Postgres pooling
   - Configure connection limits
   - Implement database migrations

3. **Security Hardening**
   - Implement rate limiting for search API
   - Set up proper CORS and CSP headers
   - Configure authentication scopes

## 10. Implementation Timeline

| Phase | Duration | Tasks                                          |
| ----- | -------- | ---------------------------------------------- |
| 1     | Week 1   | Set up infrastructure, configure Pinecone      |
| 2     | Week 2   | Implement PDF processing pipeline              |
| 3     | Week 3   | Build vector search API and Claude integration |
| 4     | Week 4   | Enhance UI components and implement caching    |
| 5     | Week 5   | Set up monitoring and analytics                |
| 6     | Week 6   | Testing, optimization, and deployment          |

## 11. Success Metrics

- **Search Accuracy**: >95% relevant results on test queries
- **Response Time**: <1 second for vector search results
- **User Satisfaction**: >90% positive ratings on responses
- **Coverage**: 100% of bylaws indexed and searchable
- **Uptime**: 99.9% system availability

## 12. Recent Updates and Fixes

- **Model Configuration**: Updated to use configurable Claude models via environment variables:
  - Primary: `CLAUDE_MODEL=claude-3-7-sonnet-20250219` (or -latest for development)
  - Fallback: `CLAUDE_FALLBACK_MODEL=claude-3-5-sonnet-20240620`
- **API Integration**: Fixed Anthropic API integration with improved error handling and model failover
- **Database Resilience**: Enhanced database connection pooling with error handling
- **Vector Search**: Improved Pinecone integration with better error handling and fallback mechanisms
- **Authentication**: Fixed authentication workflow and user management with better debugging
- **UI Integration**: Added support for UI avatars and improved image configuration
- **Build Process**: Streamlined build process and TypeScript compatibility improvements
- **Deployment Process**: Updated deployment checklist with environment variable configuration
