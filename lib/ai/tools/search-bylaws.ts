import { z } from 'zod';
import { searchBylaws } from '@/lib/bylaw-search';
import type { BylawToolResult } from '@/lib/bylaw-search/types';

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
  
  try {
    console.log(`Searching bylaws with query: "${query}"${category ? `, category: "${category}"` : ''}${bylawNumber ? `, bylawNumber: "${bylawNumber}"` : ''}`);
    
    // Search for relevant bylaws
    const results = await searchBylaws(query, filter);
    
    console.log(`Bylaw search found ${results.length} results`);
    
    if (results.length === 0) {
      console.log("No relevant bylaws found");
      return {
        found: false,
        message: "No relevant bylaws found. Please try a different search or contact Oak Bay Municipal Hall for assistance."
      };
    }
    
    // Format results for Claude
    const formattedResults = results.map(result => ({
      bylawNumber: result.metadata.bylawNumber || "Unknown",
      title: result.metadata.title || "Untitled Bylaw",
      section: result.metadata.section || "Unknown Section",
      content: result.text,
      url: result.metadata.url || `https://oakbay.civicweb.net/document/bylaw/${result.metadata.bylawNumber || "Unknown"}?section=${result.metadata.section || "Unknown"}`
    }));
    
    console.log("Bylaw search results formatted successfully");
    
    return {
      found: true,
      results: formattedResults
    };
  } catch (error) {
    console.error("Error in searchBylawsTool:", error);
    
    // Return a meaningful error response
    return {
      found: false,
      message: "Error searching for bylaws. Please try again or contact Oak Bay Municipal Hall for assistance."
    };
  }
}