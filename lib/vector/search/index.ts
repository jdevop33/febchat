/**
 * Vector Search Module Index
 * This module provides optimized, batch-capable vector search functionality
 */

// Export main search service
export { searchBylawsOptimized } from './search-service';

// Export utility functions
export {
  extractKeywords,
  buildPineconeFilter,
  formatSearchResults,
} from './utils';

// Export embeddings functionality
export { getEmbeddingsModel, resetEmbeddingsModel } from './embeddings';

// Export batch processing
export { processBatchedQueries } from './batch-processor';

// Export types
export * from './types';
