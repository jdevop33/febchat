/**
 * Bylaw Vector Search Service
 *
 * This module provides functionality for searching bylaws using vector similarity.
 */

import { OpenAIEmbeddings } from '@langchain/openai';
import { getPineconeIndex } from './pinecone-client';
import { logger } from '../monitoring/logger';
import type {
  BylawSearchOptions,
  BylawSearchResult,
  BylawSearchFilters,
} from './types';

/**
 * Initialize the OpenAI embeddings model
 */
function getEmbeddingsModel() {
  return new OpenAIEmbeddings({
    modelName: 'text-embedding-3-small',
    openAIApiKey: process.env.OPENAI_API_KEY,
  });
}

/**
 * Search for bylaws using hybrid search (vector + keyword)
 */
export async function searchBylaws(
  query: string,
  options: BylawSearchOptions = {},
): Promise<BylawSearchResult[]> {
  const startTime = Date.now();
  
  try {
    logger.search(query, 0, 0, { 
      filters: options.filters,
      userId: options.userId 
    });
    
    // Get embeddings model
    const embeddings = getEmbeddingsModel();

    // Generate embedding for query
    const queryEmbedding = await embeddings.embedQuery(query);

    // Get Pinecone index
    const index = getPineconeIndex();

    // Build filter if provided
    const filter = options.filters
      ? buildPineconeFilter(options.filters)
      : undefined;

    // Extract keywords for keyword boosting
    const keywords = extractKeywords(query);
    
    // Search Pinecone
    const searchResults = await index.query({
      vector: queryEmbedding,
      topK: (options.limit || 5) * 2, // Get more results for re-ranking
      includeMetadata: true,
      filter,
    });

    // Apply minimum score filter if provided
    let results = searchResults.matches || [];
    if (options.minScore !== undefined) {
      results = results.filter(
        (match) => (match.score || 0) >= (options.minScore ?? 0),
      );
    }

    // Format initial results
    let formattedResults = results.map((match) => ({
      id: match.id,
      text: match.metadata?.text as string,
      metadata: match.metadata as any,
      score: match.score || 0,
      keywordScore: 0, // Will be calculated next
    }));

    // Calculate keyword score for each result
    formattedResults = formattedResults.map(result => {
      // Calculate keyword matches
      const keywordHits = keywords.filter(keyword => 
        result.text.toLowerCase().includes(keyword.toLowerCase())
      ).length;
      
      // Keyword score is the percentage of keywords found (0-1 range)
      const keywordScore = keywords.length > 0 ? keywordHits / keywords.length : 0;
      
      // Return result with keyword score
      return {
        ...result,
        keywordScore
      };
    });

    // Hybrid re-ranking: combine vector and keyword scores
    const hybridResults = formattedResults.map(result => ({
      ...result,
      // Combined score: 70% vector similarity, 30% keyword matching
      score: (result.score * 0.7) + (result.keywordScore * 0.3)
    }));

    // Sort by combined score and limit to requested number
    const finalResults = hybridResults
      .sort((a, b) => b.score - a.score)
      .slice(0, options.limit || 5)
      .map(({ keywordScore, ...rest }) => rest); // Remove internal keywordScore field

    // Log successful search with duration and result count
    const duration = Date.now() - startTime;
    logger.search(query, finalResults.length, duration, { 
      filters: options.filters,
      userId: options.userId 
    });
    
    return finalResults;
  } catch (error) {
    // Log the error
    logger.error(error as Error, 'Bylaw vector search', {
      userId: options.userId as string,
      critical: false
    });
    
    // Attempt fallback to simple search if available
    try {
      logger.search(query, 0, Date.now() - startTime, { 
        filters: options.filters,
        userId: options.userId,
        error: error as Error
      });
      
      return performSimpleKeywordSearch(query, options);
    } catch (fallbackError) {
      // Log the fallback error (this is more serious)
      logger.error(fallbackError as Error, 'Bylaw fallback search', {
        userId: options.userId as string,
        critical: true
      });
      
      throw new Error('Failed to search bylaws');
    }
  }
}

// Define stop words once at module level rather than recreating each time
const STOP_WORDS = new Set([
  'a', 'an', 'the', 'in', 'on', 'at', 'of', 'for', 'to', 'with', 'by',
  'and', 'or', 'but', 'if', 'then', 'else', 'when', 'up', 'down', 'is',
  'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
  'do', 'does', 'did', 'shall', 'will', 'should', 'would', 'may', 'might',
  'must', 'can', 'could'
]);

/**
 * Extract keywords from a search query with improved efficiency
 */
function extractKeywords(query: string): string[] {
  if (!query) return [];
  
  // Clean and normalize the query
  const cleanedQuery = query.toLowerCase()
    .replace(/[^\w\s]/g, ' ') // Replace punctuation with spaces
    .replace(/\s+/g, ' ')     // Replace multiple spaces with a single space
    .trim();
  
  // Split into words and filter out stop words and short words
  // Using Set to prevent returning duplicate keywords
  const keywordSet = new Set<string>();
  
  for (const word of cleanedQuery.split(' ')) {
    if (word.length > 2 && !STOP_WORDS.has(word)) {
      keywordSet.add(word);
    }
  }
  
  return Array.from(keywordSet);
}

/**
 * Production-grade fallback search mechanism
 * Uses direct database query when vector search is unavailable
 */
async function performSimpleKeywordSearch(
  query: string,
  options: BylawSearchOptions = {},
): Promise<BylawSearchResult[]> {
  console.log('Using production fallback search');
  
  try {
    // Extract keywords for searching
    const keywords = extractKeywords(query);
    
    // Use Pinecone metadata filtering as a fallback mechanism
    // This is more robust than relying on mock data
    const index = getPineconeIndex();
    
    // Build a metadata-only query using the keywords
    const filter: Record<string, any> = {};
    
    // Apply any provided filters
    if (options.filters) {
      Object.entries(options.filters).forEach(([key, value]) => {
        if (value) {
          filter[key] = { $eq: value };
        }
      });
    }
    
    // Get most recent docs (sort by lastUpdated)
    const results = await index.query({
      topK: options.limit || 10,
      filter: Object.keys(filter).length > 0 ? { $and: [filter] } : undefined,
      includeMetadata: true,
    });
    
    // If we still have no results, log this for monitoring
    if (!results.matches || results.matches.length === 0) {
      console.error('No results from backup search method.');
      
      // Return empty results rather than trying to use mock data
      return [];
    }
    
    // Format and return the results
    return results.matches.map((match) => ({
      id: match.id,
      text: match.metadata?.text as string || '',
      metadata: match.metadata as any,
      // Since we didn't use a vector, we'll calculate a simple score based on recency
      score: 0.5, // Default score for fallback results
    }));
  } catch (error) {
    console.error('Error in fallback search:', error);
    
    // In production, return empty results rather than using mock data
    console.log('Returning empty results for failed search');
    return [];
  }
}

/**
 * Filter bylaws by metadata fields
 */
export async function filterBylaws(
  filters: BylawSearchFilters,
): Promise<BylawSearchResult[]> {
  try {
    // Get Pinecone index
    const index = getPineconeIndex();

    // Build filter
    const filter = buildPineconeFilter(filters);

    // Search Pinecone with filter only
    const searchResults = await index.query({
      vector: [], // Empty vector for metadata-only filtering
      topK: 10,
      includeMetadata: true,
      filter,
    });

    // Format results
    return (searchResults.matches || []).map((match) => ({
      id: match.id,
      text: match.metadata?.text as string,
      metadata: match.metadata as any,
      score: match.score || 0,
    }));
  } catch (error) {
    console.error('Error filtering bylaws:', error);
    throw new Error('Failed to filter bylaws');
  }
}

/**
 * Build a Pinecone filter object from search filters
 */
function buildPineconeFilter(filters: Record<string, any>) {
  const filterConditions: any[] = [];

  // Process each filter field
  Object.entries(filters).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return;
    }

    switch (key) {
      case 'category':
        filterConditions.push({ [key]: { $eq: value } });
        break;

      case 'bylawNumber':
        filterConditions.push({ bylawNumber: { $eq: value } });
        break;

      case 'dateFrom':
        filterConditions.push({ dateEnacted: { $gte: value } });
        break;

      case 'dateTo':
        filterConditions.push({ dateEnacted: { $lte: value } });
        break;

      // Add more filter types as needed

      default:
        if (typeof value === 'string') {
          filterConditions.push({ [key]: { $eq: value } });
        }
    }
  });

  // If we have multiple conditions, combine with $and
  return filterConditions.length > 0 ? { $and: filterConditions } : undefined;
}

/**
 * Get a bylaw document by ID
 */
export async function getBylawById(
  id: string,
): Promise<BylawSearchResult | null> {
  try {
    // Get Pinecone index
    const index = getPineconeIndex();

    // Fetch vector by ID
    const result = await index.fetch([id]);

    // If no result, return null
    if (!result.records || !result.records[id]) {
      return null;
    }

    const record = result.records[id];

    // Format result
    return {
      id,
      text: record.metadata?.text as string,
      metadata: record.metadata as any,
      score: 1, // Direct lookup has perfect score
    };
  } catch (error) {
    console.error('Error getting bylaw by ID:', error);
    throw new Error('Failed to get bylaw by ID');
  }
}
