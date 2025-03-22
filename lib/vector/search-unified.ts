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
  options?: BylawSearchOptions,
): Promise<BylawSearchResult[]> {
  // Start performance tracking
  const startTime = Date.now();

  try {
    // Check cache first if enabled
    if (options?.useCache !== false) {
      const cacheKey = generateCacheKey(query, options);
      const cachedResult = searchCache.get(cacheKey);

      if (cachedResult && isCacheValid(cachedResult)) {
        logger.info(
          `Cache hit for query: "${query}" (${Date.now() - startTime}ms)`,
        );
        return cachedResult.results;
      }
    }

    // Get search parameters
    const limit = options?.limit || 5;
    const filters = options?.filters;
    const minScore = options?.minScore || 0.6;

    // We don't want to use mock search for demo day
    // Remove mock mode code to ensure we're using real data

    // Try Pinecone search first (production path)
    try {
      if (process.env.PINECONE_API_KEY && process.env.PINECONE_INDEX) {
        const results = await performPineconeSearch(
          query,
          filters,
          limit,
          minScore,
        );

        // Cache results if caching is enabled
        if (options?.useCache !== false) {
          const cacheKey = generateCacheKey(query, options);
          searchCache.set(cacheKey, {
            results,
            timestamp: Date.now(),
          });

          // Clean up expired cache entries periodically
          if (Math.random() < 0.1) {
            // 10% chance to clean up on each search
            cleanupCache();
          }
        }

        logger.info(`Pinecone search completed in ${Date.now() - startTime}ms`);
        return results;
      }
    } catch (error) {
      const errorObj =
        error instanceof Error ? error : new Error(String(error));
      logger.error(
        errorObj,
        'Pinecone search failed, falling back to keyword search',
      );
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
  minScore = 0.6,
): Promise<BylawSearchResult[]> {
  logger.info(`Performing Pinecone search for: "${query}"`);

  // Get Pinecone index
  const index = getPineconeIndex();

  // Get embeddings model based on environment configuration
  const embeddings = getEmbeddingsModel(
    process.env.EMBEDDING_PROVIDER === 'openai'
      ? EmbeddingProvider.OPENAI
      : EmbeddingProvider.LLAMAINDEX,
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
        {} as Record<string, any>,
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
    .filter((match) => (match.score || 0) >= minScore) // Filter by minimum score
    .slice(0, limit) // Limit results
    .map((match) => ({
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
  limit = 5,
): Promise<BylawSearchResult[]> {
  logger.info(`Performing keyword search for: "${query}"`);

  // For the real demo, we should use actual database queries instead of mock data
  logger.warn('Keyword search fallback is being used - results may be limited');
  
  try {
    // Read actual bylaw data from files - more reliable than mock data
    const fs = require('node:fs');
    const path = require('node:path');
    
    // Get paths to actual bylaw PDF files
    const pdfDirectory = path.join(process.cwd(), 'public', 'pdfs');
    
    // Check if directory exists
    if (!fs.existsSync(pdfDirectory)) {
      logger.error(`PDF directory not found: ${pdfDirectory}`);
      return [];
    }
    
    // Get list of PDF files
    const pdfFiles = fs.readdirSync(pdfDirectory)
      .filter((file: string) => file.toLowerCase().endsWith('.pdf'))
      .map((file: string) => ({
        filename: file,
        bylawNumber: extractBylawNumber(file),
        title: formatBylawTitle(file),
      }));
      
    // Filter by query
    const queryLower = query.toLowerCase();
    const matchingFiles = pdfFiles
      .filter((file: any) => 
        file.filename.toLowerCase().includes(queryLower) ||
        (file.title?.toLowerCase().includes(queryLower))
      )
      .slice(0, limit);
      
    // Convert to search results
    return matchingFiles.map((file: any, index: number) => ({
      text: `Bylaw ${file.bylawNumber || 'Unknown'}: ${file.title || file.filename}`,
      metadata: {
        bylawNumber: file.bylawNumber || 'Unknown',
        title: file.title || file.filename,
        section: '',
        filename: file.filename,
        url: `/pdfs/${file.filename}`
      },
      score: 0.8 - (index * 0.1), // Simple relevance score
      id: `file-${index}`
    }));
  } catch (error) {
    logger.error('Error in keyword search fallback:', error);
    return [];
  }
  
  // Helper function to extract bylaw number from filename
  function extractBylawNumber(filename: string): string | null {
    const match = filename.match(/(\d{4})/);
    return match ? match[1] : null;
  }
  
  // Helper function to format bylaw title
  function formatBylawTitle(filename: string): string {
    return filename
      .replace(/\.pdf$/i, '')
      .replace(/-/g, ' ')
      .replace(/\d{4}/, '')
      .trim();
  }
}

/**
 * Helper function to get real bylaw data
 */
export async function getRealBylawData(): Promise<BylawChunk[]> {
  try {
    // Attempt to load from verified bylaw answers file
    const fs = require('node:fs');
    const path = require('node:path');
    
    const verifiedDataPath = path.join(process.cwd(), 'data', 'verified-bylaw-answers.json');
    
    if (fs.existsSync(verifiedDataPath)) {
      const verifiedData = JSON.parse(fs.readFileSync(verifiedDataPath, 'utf8'));
      
      if (Array.isArray(verifiedData) && verifiedData.length > 0) {
        logger.info(`Loaded ${verifiedData.length} verified bylaw entries from file`);
        
        // Convert to BylawChunk format
        return verifiedData.map((item: any) => ({
          text: item.text || item.content || item.answer || '',
          metadata: {
            bylawNumber: item.bylawNumber || '',
            title: item.title || '',
            section: item.section || '',
            sectionTitle: item.sectionTitle || '',
            category: item.category || '',
            url: item.url || '',
            filename: item.filename || '',
          },
        }));
      }
    }
    
    // Fallback to empty array if no verified data
    logger.warn('No verified bylaw data found, using empty dataset');
    return [];
  } catch (error) {
    logger.error('Error loading real bylaw data:', error);
    return [];
  }
}
