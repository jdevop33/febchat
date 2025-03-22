/**
 * Utility functions for optimized vector search
 */
import type { PineconeFilter, SearchFilters } from './types';
import type { SearchResult as ApiBatchingSearchResult } from '../api-batching';

// Common stop words for text processing - defined once for reuse
export const STOP_WORDS = new Set([
  'a',
  'an',
  'the',
  'in',
  'on',
  'at',
  'of',
  'for',
  'to',
  'with',
  'by',
  'and',
  'or',
  'but',
  'if',
  'then',
  'else',
  'when',
  'up',
  'down',
  'is',
  'are',
  'was',
  'were',
  'be',
  'been',
  'being',
  'have',
  'has',
  'had',
  'do',
  'does',
  'did',
  'shall',
  'will',
  'should',
  'would',
  'may',
  'might',
  'must',
  'can',
  'could',
]);

/**
 * Extract keywords from a search query with improved efficiency
 */
export function extractKeywords(
  query: string,
  stopWords: Set<string> = STOP_WORDS,
): string[] {
  if (!query) return [];

  // Clean and normalize the query
  const cleanedQuery = query
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ') // Replace punctuation with spaces
    .replace(/\s+/g, ' ') // Replace multiple spaces with a single space
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
export function buildPineconeFilter(
  filters: SearchFilters,
): PineconeFilter | undefined {
  const filterConditions: Record<string, any>[] = [];

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

/**
 * Format and process search results
 */
export function formatSearchResults(
  results: any[],
  query: string,
  limit: number,
): ApiBatchingSearchResult[] {
  // Extract keywords for keyword boosting
  const keywords = extractKeywords(query);

  // Format initial results
  let formattedResults = results.map((match) => ({
    id: match.id,
    text: match.metadata?.text as string,
    metadata: match.metadata as any,
    score: match.score || 0,
    keywordScore: 0, // Will be calculated next
  }));

  // Calculate keyword score for each result
  formattedResults = formattedResults.map((result) => {
    // Calculate keyword matches
    const keywordHits = keywords.filter((keyword) =>
      result.text.toLowerCase().includes(keyword.toLowerCase()),
    ).length;

    // Keyword score is the percentage of keywords found (0-1 range)
    const keywordScore =
      keywords.length > 0 ? keywordHits / keywords.length : 0;

    // Return result with keyword score
    return {
      ...result,
      keywordScore,
    };
  });

  // Hybrid re-ranking: combine vector and keyword scores
  const hybridResults = formattedResults.map((result) => ({
    ...result,
    // Combined score: 70% vector similarity, 30% keyword matching
    score: result.score * 0.7 + (result.keywordScore || 0) * 0.3,
  }));

  // Sort by combined score and limit to requested number
  return hybridResults
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ keywordScore, ...rest }) => ({
      ...rest,
      text: rest.text || '', // Ensure text is always defined
    })); // Remove internal keywordScore field and ensure text is present
}
