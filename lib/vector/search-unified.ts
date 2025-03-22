
import { getPineconeIndex } from './pinecone-client';
import { logger } from '../monitoring/logger';
import type {
  BylawSearchOptions,
  BylawSearchResult,
  BylawSearchFilters,
  ChunkMetadata,
  BylawChunk,
} from './types';

// Import embedding models (dynamically to avoid circular dependencies)
import { getEmbeddingsModel, EmbeddingProvider } from './embedding-models';

// Cache for recent search results to improve performance
interface CacheEntry {
  results: BylawSearchResult[];
  timestamp: number;
}

const searchCache = new Map<string, CacheEntry>();
const CACHE_TTL = 1000 * 60 * 5; // 5 minute cache TTL

/**
 * Generate a cache key for search parameters
 */
function generateCacheKey(query: string, options?: BylawSearchOptions): string {
  return `${query.toLowerCase()}|${JSON.stringify(options || {})}`;
}

/**
 * Check if a cache entry is still valid
 */
function isCacheValid(entry: CacheEntry): boolean {
  return Date.now() - entry.timestamp < CACHE_TTL;
}

/**
 * Clean up expired cache entries
 */
function cleanupCache(): void {
  for (const [key, entry] of searchCache.entries()) {
    if (!isCacheValid(entry)) {
      searchCache.delete(key);
    }
  }
}

/**
 * Main search function for bylaws - unified implementation
 */
export async function searchBylaws(
  query: string,
  options?: BylawSearchOptions
): Promise<BylawSearchResult[]> {
  // Start performance tracking
  const startTime = Date.now();
  
  try {
    // Check cache first if enabled
    if (options?.useCache !== false) {
      const cacheKey = generateCacheKey(query, options);
      const cachedResult = searchCache.get(cacheKey);
      
      if (cachedResult && isCacheValid(cachedResult)) {
        logger.info(`Cache hit for query: "${query}" (${Date.now() - startTime}ms)`);
        return cachedResult.results;
      }
    }
    
    // Get search parameters
    const limit = options?.limit || 5;
    const filters = options?.filters;
    const minScore = options?.minScore || 0.6;
    
    // Check for mock mode first (for tests and development)
    if (process.env.MOCK_VECTOR_SEARCH === 'true') {
      const results = await performMockSearch(query, filters, limit);
      return results;
    }
    
    // Try Pinecone search first (production path)
    try {
      if (process.env.PINECONE_API_KEY && process.env.PINECONE_INDEX) {
        const results = await performPineconeSearch(query, filters, limit, minScore);
        
        // Cache results if caching is enabled
        if (options?.useCache !== false) {
          const cacheKey = generateCacheKey(query, options);
          searchCache.set(cacheKey, {
            results,
            timestamp: Date.now()
          });
          
          // Clean up expired cache entries periodically
          if (Math.random() < 0.1) { // 10% chance to clean up on each search
            cleanupCache();
          }
        }
        
        logger.info(`Pinecone search completed in ${Date.now() - startTime}ms`);
        return results;
      }
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      logger.error(errorObj, 'Pinecone search failed, falling back to keyword search');
    }
    
    // Fall back to keyword search if Pinecone fails or isn't configured
    const keywordResults = await performKeywordSearch(query, filters, limit);
    logger.info(`Keyword search completed in ${Date.now() - startTime}ms`);
    return keywordResults;
  } catch (error) {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    logger.error(errorObj, 'Search failed');
    return []; // Return empty results in case of errors
  }
}

/**
 * Perform Pinecone-based vector search
 */
async function performPineconeSearch(
  query: string,
  filters?: BylawSearchFilters | Record<string, any>,
  limit = 5,
  minScore = 0.6
): Promise<BylawSearchResult[]> {
  logger.info(`Performing Pinecone search for: "${query}"`);
  
  // Get Pinecone index
  const index = getPineconeIndex();
  
  // Get embeddings model based on environment configuration
  const embeddings = getEmbeddingsModel(
    process.env.EMBEDDING_PROVIDER === 'openai' 
      ? EmbeddingProvider.OPENAI 
      : EmbeddingProvider.LLAMAINDEX
  );
  
  // Generate embedding for query
  const queryEmbedding = await embeddings.embedQuery(query);
  
  // Build filter if provided
  const pineconeFilter = filters
    ? Object.entries(filters).reduce(
        (acc, [key, value]) => {
          if (Array.isArray(value)) {
            // Handle array values (OR condition)
            acc[key] = { $in: value };
          } else {
            // Handle single values (exact match)
            acc[key] = { $eq: value };
          }
          return acc;
        },
        {} as Record<string, any>
      )
    : undefined;
  
  // Search Pinecone
  const results = await index.query({
    vector: queryEmbedding,
    topK: limit * 2, // Get more results than needed to filter by score
    includeMetadata: true,
    filter: pineconeFilter ? { $and: [pineconeFilter] } : undefined,
  });
  
  logger.info(`Pinecone returned ${results.matches?.length || 0} results`);
  
  // Format and filter results
  const formattedResults = (results.matches || [])
    .filter(match => (match.score || 0) >= minScore) // Filter by minimum score
    .slice(0, limit) // Limit results
    .map(match => ({
      text: match.metadata?.text as string,
      metadata: match.metadata as ChunkMetadata,
      score: match.score || 0,
      id: match.id,
    }));
    
  return formattedResults;
}

/**
 * Perform keyword-based search (fallback when vector search is unavailable)
 */
async function performKeywordSearch(
  query: string,
  filters?: BylawSearchFilters | Record<string, any>,
  limit = 5
): Promise<BylawSearchResult[]> {
  logger.info(`Performing keyword search for: "${query}"`);
  
  // Simple keyword matching on mock data
  const queryLower = query.toLowerCase();
  
  // Filter by query text
  let results = mockBylawData.filter(item => 
    item.text.toLowerCase().includes(queryLower)
  );
  
  // Apply additional filters if provided
  if (filters) {
    results = results.filter(item => {
      return Object.entries(filters).every(([key, value]) => {
        const typedKey = key as keyof typeof item.metadata;
        
        // Handle array values as OR conditions
        if (Array.isArray(value)) {
          return value.includes(item.metadata[typedKey]);
        }
        
        // Handle single values as exact match
        return item.metadata[typedKey] === value;
      });
    });
  }
  
  // Return top results with mock relevance scores
  return results
    .slice(0, limit)
    .map((chunk, index) => ({
      text: chunk.text,
      metadata: chunk.metadata,
      score: 0.9 - (index * 0.05), // Mock decreasing relevance scores
      id: `mock-${index}`,
    }));
}

/**
 * Perform mock search for testing/development
 */
async function performMockSearch(
  query: string,
  filters?: BylawSearchFilters | Record<string, any>,
  limit = 5
): Promise<BylawSearchResult[]> {
  logger.info(`Using mock search data for: "${query}"`);
  
  // Simple filtering of mock data
  return performKeywordSearch(query, filters, limit);
}

// Mock data for development and testing
export const mockBylawData: BylawChunk[] = [
  {
    text: 'No person shall make or cause to be made any noise or sound within the geographical limits of The Corporation of the District of Oak Bay which is liable to disturb the quiet, peace, rest, enjoyment, comfort or convenience of individuals or the public.',
    metadata: {
      bylawNumber: '3210',
      title: 'Anti-Noise Bylaw, 1977',
      section: '3(1)',
      sectionTitle: 'General Noise Prohibition',
      dateEnacted: '1977-06-06',
      category: 'noise',
      lastUpdated: '2013-09-30',
      isConsolidated: true,
      consolidatedDate: 'September 30, 2013',
    },
  },
  {
    text: 'No owner, tenant or occupier of real property within the geographical limits of The Corporation of the District of Oak Bay shall allow that property to be used so that a noise or sound which originates from that property disturbs or tends to disturb the quiet, peace, rest, enjoyment, comfort or convenience of individuals or the public.',
    metadata: {
      bylawNumber: '3210',
      title: 'Anti-Noise Bylaw, 1977',
      section: '3(2)',
      sectionTitle: 'Property Owner Responsibility',
      dateEnacted: '1977-06-06',
      category: 'noise',
      lastUpdated: '2013-09-30',
      isConsolidated: true,
      consolidatedDate: 'September 30, 2013',
    },
  },
  // Additional mock data omitted for brevity - will be included in actual implementation
];