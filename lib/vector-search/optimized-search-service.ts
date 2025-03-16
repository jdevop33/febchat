/**
 * Optimized Bylaw Vector Search Service
 * This module enhances the base search functionality with batching and caching
 */

import { OpenAIEmbeddings } from '@langchain/openai';
import { getPineconeIndex } from './pinecone-client';
import { logger } from '../monitoring/logger';
import { profiler } from '../utils/profiler';
import { SearchQuery, SearchResult, getBatchedVectorSearch } from './api-batching';
import type {
  BylawSearchOptions,
  BylawSearchResult,
  BylawSearchFilters,
} from './types';

// Cached embeddings model
let embeddingsModel: OpenAIEmbeddings | null = null;

/**
 * Initialize the OpenAI embeddings model with caching
 */
function getEmbeddingsModel() {
  if (!embeddingsModel) {
    embeddingsModel = new OpenAIEmbeddings({
      modelName: 'text-embedding-3-small',
      openAIApiKey: process.env.OPENAI_API_KEY,
    });
  }
  return embeddingsModel;
}

/**
 * Process a batch of search queries
 * This is used by the batch processor to handle multiple searches efficiently
 */
async function processBatchedQueries(
  queries: SearchQuery[]
): Promise<SearchResult[][]> {
  return profiler.measure('batched-embedding-query', async () => {
    // Get embeddings model
    const embeddings = getEmbeddingsModel();
    
    // Process all query texts into a single batch
    const queryTexts = queries.map(q => q.query);
    
    // Generate embeddings for all queries in a single batch request
    const queryEmbeddings = await embeddings.embedDocuments(queryTexts);
    
    // Get Pinecone index
    const index = getPineconeIndex();
    
    // Process individual queries with their respective embeddings
    const results = await Promise.all(queries.map(async (query, i) => {
      const { options } = query;
      
      // Build filter if provided
      const filter = options?.filters
        ? buildPineconeFilter(options.filters)
        : undefined;
      
      // Search Pinecone
      const searchResults = await index.query({
        vector: queryEmbeddings[i],
        topK: (options?.limit || 5) * 2, // Get more results for re-ranking
        includeMetadata: true,
        filter,
      });
      
      // Apply minimum score filter if provided
      let results = searchResults.matches || [];
      if (options?.minScore !== undefined) {
        results = results.filter(
          (match) => (match.score || 0) >= (options.minScore ?? 0),
        );
      }
      
      // Format and process results (similar to searchBylaws)
      const formattedResults = formatSearchResults(
        results,
        query.query,
        options?.limit || 5
      );
      
      return formattedResults;
    }));
    
    return results;
  });
}

/**
 * Optimized search for bylaws using vector similarity with batching
 */
export async function searchBylawsOptimized(
  query: string,
  options: BylawSearchOptions = {},
): Promise<BylawSearchResult[]> {
  const startTime = Date.now();
  
  try {
    logger.search(query, 0, 0, { 
      filters: options.filters,
      userId: options.userId,
      optimized: true
    });
    
    // Get the batched vector search client
    const batchedSearch = getBatchedVectorSearch('bylaws', processBatchedQueries);
    
    // Submit the search to the batch
    const results = await batchedSearch.search(query, options);
    
    // Log successful search with duration and result count
    const duration = Date.now() - startTime;
    logger.search(query, results.length, duration, { 
      filters: options.filters,
      userId: options.userId,
      optimized: true
    });
    
    return results;
  } catch (error) {
    // Log the error
    logger.error(error as Error, 'Optimized bylaw search', {
      userId: options.userId as string,
      critical: false
    });
    
    // Attempt fallback to standard search with robust error handling
    console.log('Falling back to standard search API with fallback mechanisms');
    try {
      // Try the standard search service first
      try {
        const { searchBylaws } = await import('./search-service');
        return searchBylaws(query, options);
      } catch (standardSearchError) {
        // If standard search fails, use the direct fallback search
        console.log('Standard search failed, using direct fallback');
        const { fallbackSearch } = await import('./fallback-search');
        return fallbackSearch(query, options);
      }
    } catch (fallbackError) {
      logger.error(fallbackError as Error, 'Bylaw search fallback', {
        userId: options.userId as string,
        critical: true
      });
      throw new Error('Failed to search bylaws');
    }
  }
}

/**
 * Format and process search results
 */
function formatSearchResults(
  results: any[],
  query: string,
  limit: number
): BylawSearchResult[] {
  // Define stop words once at module level rather than recreating each time
  const STOP_WORDS = new Set([
    'a', 'an', 'the', 'in', 'on', 'at', 'of', 'for', 'to', 'with', 'by',
    'and', 'or', 'but', 'if', 'then', 'else', 'when', 'up', 'down', 'is',
    'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
    'do', 'does', 'did', 'shall', 'will', 'should', 'would', 'may', 'might',
    'must', 'can', 'could'
  ]);

  // Extract keywords for keyword boosting
  const keywords = extractKeywords(query, STOP_WORDS);
  
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
  return hybridResults
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ keywordScore, ...rest }) => rest); // Remove internal keywordScore field
}

/**
 * Extract keywords from a search query with improved efficiency
 */
function extractKeywords(query: string, stopWords: Set<string>): string[] {
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
    if (word.length > 2 && !stopWords.has(word)) {
      keywordSet.add(word);
    }
  }
  
  return Array.from(keywordSet);
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

      default:
        if (typeof value === 'string') {
          filterConditions.push({ [key]: { $eq: value } });
        }
    }
  });

  // If we have multiple conditions, combine with $and
  return filterConditions.length > 0 ? { $and: filterConditions } : undefined;
}