/**
 * Search service type definitions
 */
import type { BylawSearchOptions, BylawSearchResult } from "../types";

// Embedding model types
export interface EmbeddingModel {
  embedDocuments: (texts: string[]) => Promise<number[][]>;
  embedQuery: (text: string) => Promise<number[]>;
}

// Search processing types
export type ProcessBatchedQueriesFunction = (
  queries: SearchQuery[],
) => Promise<SearchResult[][]>;

// Re-export base types
export type { BylawSearchOptions, BylawSearchResult };

// Extended search query with options
export interface SearchQuery {
  query: string;
  options?: BylawSearchOptions;
}

// Search result with metadata
export interface SearchResult extends BylawSearchResult {
  keywordScore?: number;
}

// Pinecone filter types
export interface PineconeFilter {
  $and?: Record<string, any>[];
  [key: string]: any;
}

// Search filters type
export interface SearchFilters {
  category?: string;
  bylawNumber?: string;
  dateFrom?: string;
  dateTo?: string;
  [key: string]: any;
}
