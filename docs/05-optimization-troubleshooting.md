# FebChat Optimization & Troubleshooting

**Last Updated:** March 22, 2025

## Performance Optimizations

### Implemented Optimizations

1. **Code Structure**

   - Consolidated similar functionality in dedicated directories
   - Extracted shared types to type definition files
   - Restructured components to break circular dependencies

2. **Database**

   - Added strategic indexes for frequent queries
   - Optimized connection pooling
   - Implemented strong typing

3. **API Calls**

   - Batched similar requests
   - Added LRU caching with proper expiration
   - Implemented request debouncing
   - SWR integration for client-side caching

4. **Vector Search**

   - Batched embedding requests
   - Added result caching
   - Optimized query generation

5. **React Components**
   - Added memoization utilities
   - Implemented lazy loading
   - Created stable callback utilities
   - Optimized Tailwind class generation

### Usage Examples

**Profiling**:

```typescript
import { profiler } from '@/lib/utils/profiler';

profiler.start('operation-name');
// Code to measure
const duration = profiler.end('operation-name');

// Measure async function
const result = await profiler.measure('async-operation', async () => {
  /*...*/
});
```

**API Batching**:

```typescript
const batcher = new APIBatcher(
  async (inputs) => {
    /*...*/
  },
  {
    maxBatchSize: 5,
    maxWaitTime: 50,
  },
);

const result1 = await batcher.add(input1);
const result2 = await batcher.add(input2);
```

**Optimized Hooks**:

```typescript
// SWR-based data fetching
const { data } = useApi('/api/endpoint');

// Debounced search
const { data, updateSearch } = useSearch('/api/search', {
  defaultParams: { query: '' },
  debounceMs: 300,
});
```

## Common Troubleshooting Issues

### Environment Variables

**Problem**: Missing or incorrect environment variables.

**Check**:

```bash
node -e "require('dotenv').config({path:'.env.local'}); console.log('ANTHROPIC_API_KEY:', process.env.ANTHROPIC_API_KEY?.slice(0, 10));"
```

**Fix**: Ensure these variables are set in `.env.local` and deployment platform:

```
ANTHROPIC_API_KEY=sk-ant-api03-xxx...
OPENAI_API_KEY=sk-xxx...
PINECONE_API_KEY=xxx...
PINECONE_INDEX=oak-bay-bylaws
```

### Database Issues

**Problem**: Database connection failures.

**Check**: Run `node test-db.js`

**Fix**:

- Use mock database mode with `MOCK_DB=true`
- Verify connection strings are correct
- Check database access permissions

### AI Model Issues

**Problem**: "Server configuration error: Missing API key"

**Check**: Run `node test-anthropic.js`

**Fix**:

- Verify ANTHROPIC_API_KEY (should start with `sk-ant-`)
- Check model environment variables (CLAUDE_MODEL, CLAUDE_FALLBACK_MODEL)
- Try alternative models

### Bylaw Search Problems

**Problem**: Vector search not returning results.

**Check**: Run `node test-bylaw-search.js`

**Fix**:

- Verify Pinecone credentials
- Confirm bylaws are indexed
- Check embedding API keys

### Chat API 500 Errors

**Problem**: Internal server errors or streaming issues.

**Fix**:

- Check exact error in server logs
- Verify all API keys are valid
- Note: Streaming has been replaced with non-streaming approach

## Diagnostic Tools

- **Database**: `node test-db.js`
- **Anthropic API**: `node test-anthropic.js`
- **OpenAI API**: `node test-openai.js`
- **Bylaw Search**: `node test-bylaw-search.js`
- **Performance**: `GET /api/dev/metrics` with dev server

## Viewing Logs

```bash
# All logs
vercel logs febchat.vercel.app

# Filter for errors
vercel logs febchat.vercel.app | grep "error\\|Error"
```

## Future Optimization Opportunities

### High Priority

- Break down large components (BylawCitation, PDF Viewer)
- Consolidate duplicate API routes

### Medium Priority

- Standardize error handling
- Clean up dependencies
- Increase test coverage

### Future Work

- Implement SSR caching
- Add image optimization
- Add service worker for offline capabilities
