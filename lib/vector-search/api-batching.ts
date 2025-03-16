/**
 * Batching utilities for vector search operations
 */

import { APIBatcher } from '../utils/api-batching';
import { profiler } from '../utils/profiler';
import type { PineconeRecord } from '@pinecone-database/pinecone';

export type SearchQuery = {
  query: string;
  options?: {
    limit?: number;
    minScore?: number;
    filters?: Record<string, any>;
  };
};

export type SearchResult = PineconeRecord<any> & { score: number };

/**
 * Batched vector search client
 */
export class BatchedVectorSearch {
  private batcher: APIBatcher<SearchQuery, SearchResult[]>;
  
  constructor(searchFn: (queries: SearchQuery[]) => Promise<SearchResult[][]>) {
    this.batcher = new APIBatcher(searchFn, {
      maxBatchSize: 5,  // Batch up to 5 queries
      maxWaitTime: 50,  // Wait max 50ms before processing
    });
  }
  
  /**
   * Search vector database with automatic batching
   */
  public async search(query: string, options?: SearchQuery['options']): Promise<SearchResult[]> {
    return profiler.measure('batched-vector-search', async () => {
      return this.batcher.add({ query, options });
    });
  }
}

// Map to store reusable instances by vector namespace
const batcherInstances = new Map<string, BatchedVectorSearch>();

/**
 * Get a batched vector search instance for the given namespace
 */
export function getBatchedVectorSearch(namespace: string, searchFn: (queries: SearchQuery[]) => Promise<SearchResult[][]>): BatchedVectorSearch {
  if (!batcherInstances.has(namespace)) {
    batcherInstances.set(namespace, new BatchedVectorSearch(searchFn));
  }
  return batcherInstances.get(namespace)!;
}