import { z } from 'zod';
import { searchBylaws } from '@/lib/bylaw-search';
import { BylawToolResult } from '@/lib/bylaw-search/types';

/**
 * Zod schema for the search bylaws tool
 */
export const searchBylawsSchema = z.object({
  query: z.string().describe('The search query for bylaws information'),
  category: z.string().optional().describe('Optional bylaw category to filter by (e.g., "zoning", "trees", "noise")'),
  bylawNumber: z.string().optional().describe('Optional specific bylaw number to search within')
});

/**
 * Claude tool for searching bylaws
 * Uses the bylaw search system to find relevant bylaw information
 */
export async function searchBylawsTool(
  query: string, 
  category?: string, 
  bylawNumber?: string
): Promise<BylawToolResult> {
  const filter: Record<string, string> = {};
  
  // Apply optional filters
  if (category) filter.category = category;
  if (bylawNumber) filter.bylawNumber = bylawNumber;
  
  // Search for relevant bylaws
  const results = await searchBylaws(query, filter);
  
  if (results.length === 0) {
    return {
      found: false,
      message: "No relevant bylaws found. Please try a different search or contact Oak Bay Municipal Hall for assistance."
    };
  }
  
  return {
    found: true,
    results: results.map(result => ({
      bylawNumber: result.metadata.bylawNumber,
      title: result.metadata.title,
      section: result.metadata.section,
      content: result.text,
      url: result.metadata.url || `https://oakbay.civicweb.net/document/bylaw/${result.metadata.bylawNumber}?section=${result.metadata.section}`
    }))
  };
}