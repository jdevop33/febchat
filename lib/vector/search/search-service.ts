/**
 * Optimized Bylaw Vector Search Service
 * This module enhances the base search functionality with batching and caching
 */
import { logger } from '../../monitoring/logger';
import { getBatchedVectorSearch } from '../api-batching';
import { processBatchedQueries } from './batch-processor';
import type { BylawSearchOptions, BylawSearchResult } from './types';

/**
 * Optimized search for bylaws using vector similarity with batching
 */
export async function searchBylawsOptimized(
  query: string,
  options: BylawSearchOptions = {},
): Promise<BylawSearchResult[]> {
  const startTime = Date.now();

  try {
    // Create search parameters for logging
    const createSearchParams = () => ({
      filters: options.filters,
      userId: options.userId,
      // Extra properties that don't match the type
      ...(options as any),
    });

    // Log the start of the search
    logger.search(query, 0, 0, createSearchParams());

    // Get the batched vector search client
    const batchedSearch = getBatchedVectorSearch(
      'bylaws',
      processBatchedQueries,
    );

    // Submit the search to the batch
    const results = await batchedSearch.search(query, options);

    // Log successful search with duration and result count
    const duration = Date.now() - startTime;
    logger.search(query, results.length, duration, createSearchParams());

    // Ensure results have all required properties for BylawSearchResult
    return results.map((result) => {
      // Ensure we have all required fields
      if (!result.metadata) {
        result.metadata = {
          bylawNumber: 'unknown',
          title: 'Unknown Bylaw',
          section: 'unknown',
          category: 'unknown',
          dateEnacted: 'unknown',
          lastUpdated: new Date().toISOString(),
          text: result.text || '',
          isVerified: false,
          pdfPath: '',
          officialUrl: '',
          isConsolidated: false,
        };
      } else if (!result.metadata.text) {
        // Ensure metadata has text field
        result.metadata.text = result.text || '';
      }

      return {
        ...result,
        text: result.text || '',
        metadata: result.metadata,
      };
    });
  } catch (error) {
    // Log the error
    logger.error(error as Error, 'Optimized bylaw search', {
      userId: options.userId as string,
      critical: false,
    });

    return handleSearchError(query, options, error as Error);
  }
}

/**
 * Handle errors in the search process with fallback mechanisms
 */
async function handleSearchError(
  query: string,
  options: BylawSearchOptions,
  error: Error,
): Promise<BylawSearchResult[]> {
  // Attempt fallback to standard search with robust error handling
  console.log('Falling back to standard search API with fallback mechanisms');
  
  try {
    // Try the standard search service first
    try {
      const { searchBylaws } = await import('../search-service');
      return searchBylaws(query, options);
    } catch (standardSearchError) {
      // If standard search fails, use the direct fallback search
      console.log('Standard search failed, using direct fallback');
      const { fallbackSearch } = await import('../fallback-search');
      return fallbackSearch(query, options);
    }
  } catch (fallbackError) {
    logger.error(fallbackError as Error, 'Bylaw search fallback', {
      userId: options.userId as string,
      critical: true,
    });
    throw new Error('Failed to search bylaws');
  }
}