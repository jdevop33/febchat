# FebChat Performance Optimizations

This document outlines the performance optimizations implemented in the FebChat project to improve reliability, speed, and efficiency.

## Optimization Strategies

### 1. Profiling and Logging

- **Profiler Utility**: A lightweight profiling system for measuring performance of operations (`lib/utils/profiler/index.ts`)
- **Performance Metrics API**: Development-only API endpoint for accessing performance metrics (`app/api/dev/metrics/route.ts`)
- **Runtime Performance Monitoring**: Automatic measurement of key operations with output in logs

### 2. Database Optimizations

- **Indexed Queries**: Strategic database indexes for frequently queried fields (`lib/db/indexes.ts`)
- **Connection Pooling**: Optimized database connection pool configuration for PostgreSQL
- **Schema Typing**: Strong TypeScript typing for database schema to prevent runtime errors

### 3. API Call Optimization

- **Batched API Calls**: Groups multiple similar requests into single batched calls (`lib/utils/api-batching.ts`)
- **LRU Caching**: Improved implementation of LRU cache with proper expiration
- **Request Debouncing**: Debounced search requests to reduce unnecessary API calls
- **SWR Integration**: Optimized data fetching hooks with SWR for client-side caching (`lib/hooks/use-optimized-api.ts`)

### 4. Vector Search Enhancements

- **Batched Embeddings**: Process multiple embedding requests in a single API call
- **Query Optimization**: Improved keyword extraction and result ranking
- **Result Caching**: Efficient caching of search results with proper invalidation
- **Optimized API Route**: Enhanced API endpoint with batching and caching (`app/api/bylaws/search/optimized-route.ts`)

### 5. React Component Optimization

- **Memoization Utilities**: Helpers for proper component memoization (`lib/utils/component-optimization.ts`)
- **Lazy Loading**: Component lazy-loading wrapper for code splitting (`lib/components/ui/lazy-wrapper.tsx`)
- **Stable Callbacks**: Utilities to prevent unnecessary re-renders from callback changes
- **Class Name Optimization**: Memoized Tailwind class name generation

## Usage

### Profiling

```typescript
import { profiler } from '@/lib/utils/profiler';

// Simple start/end measurement
profiler.start('operation-name');
// ... code to measure
const duration = profiler.end('operation-name'); // returns duration in ms

// Measure an async function
const result = await profiler.measure('async-operation', async () => {
  // ... async code to measure
  return someValue;
});

// Get all collected metrics
const metrics = profiler.getMetrics();
```

### Database Indexes

Database indexes are automatically created during application startup in production environments. You can manually trigger index creation:

```typescript
import { createDatabaseIndexes } from '@/lib/db/indexes';

// Create all configured indexes
await createDatabaseIndexes();
```

### API Batching

```typescript
import { APIBatcher } from '@/lib/utils/api-batching';

// Create a batch processor for a specific API operation
const batcher = new APIBatcher(
  // Function that processes an array of requests in a single call
  async (inputs) => {
    // Process all inputs in one batch
    return results; // Array of results matching inputs order
  },
  { 
    maxBatchSize: 5,
    maxWaitTime: 50 // ms
  }
);

// Add requests to the batch - they'll be automatically processed in batches
const result1 = await batcher.add(input1);
const result2 = await batcher.add(input2);
```

### Optimized Hooks

```typescript
import { useApi, useSearch } from '@/lib/hooks/use-optimized-api';

// Simple data fetching with SWR
const { data, error, isLoading } = useApi('/api/some-endpoint');

// Search with automatic debouncing
const { 
  data, 
  error, 
  isLoading, 
  searchParams, 
  updateSearch 
} = useSearch('/api/search', {
  defaultParams: { query: '' },
  debounceMs: 300
});

// Update search parameters (automatically debounced)
updateSearch({ query: 'new search term' });
```

## Performance Testing

To view performance metrics in development:

1. Start the development server with optimizations enabled:
   ```
   ENABLE_OPTIMIZATIONS=true pnpm dev
   ```

2. Access the metrics API endpoint:
   ```
   GET /api/dev/metrics
   ```

3. Reset metrics (optional):
   ```
   GET /api/dev/metrics?reset=true
   ```

## Future Optimizations

- Server-side rendering (SSR) caching for frequently accessed pages
- Image optimization pipeline
- WebSocket connection pooling for chat functionality
- Service worker implementation for offline capabilities