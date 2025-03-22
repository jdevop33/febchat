/**
 * Batch processing for vector search queries
 */
import { profiler } from '../../utils/profiler';
import { getPineconeIndex } from '../pinecone-client';
import { getEmbeddingsModel } from './embeddings';
import { formatSearchResults, buildPineconeFilter } from './utils';
import type {
  SearchQuery as ApiBatchingSearchQuery,
  SearchResult as ApiBatchingSearchResult,
} from '../api-batching';

/**
 * Process a batch of search queries
 * This is used by the batch processor to handle multiple searches efficiently
 */
export const processBatchedQueries = async (
  queries: ApiBatchingSearchQuery[],
): Promise<ApiBatchingSearchResult[][]> => {
  return profiler.measure('batched-embedding-query', async () => {
    // Get embeddings model
    const embeddings = getEmbeddingsModel();

    // Process all query texts into a single batch
    const queryTexts = queries.map((q) => q.query);

    // Generate embeddings for all queries in a single batch request
    const queryEmbeddings = await embeddings.embedDocuments(queryTexts);

    // Get Pinecone index
    const index = getPineconeIndex();

    // Process individual queries with their respective embeddings
    const results = await Promise.all(
      queries.map(async (query, i) => {
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

        // Format and process results
        const formattedResults = formatSearchResults(
          results,
          query.query,
          options?.limit || 5,
        );

        return formattedResults;
      }),
    );

    return results;
  });
};
