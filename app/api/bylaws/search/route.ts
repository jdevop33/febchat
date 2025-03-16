/**
 * API endpoint for searching bylaws
 */

import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { searchBylaws } from '@/lib/vector-search/search-service';
import { z } from 'zod';

// Schema for search request validation
const searchSchema = z.object({
  query: z.string().min(2).max(500),
  filters: z
    .object({
      category: z.string().optional(),
      bylawNumber: z.string().optional(),
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
    })
    .optional(),
  limit: z.number().min(1).max(20).optional().default(5),
  minScore: z.number().min(0).max(1).optional().default(0.5),
});

// Simple in-memory LRU cache for search results
// In production, use a distributed cache like Redis
const MAX_CACHE_SIZE = 100;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface CacheEntry {
  results: any;
  timestamp: number;
}

const searchCache = new Map<string, CacheEntry>();

/**
 * Generate a cache key from search parameters
 */
function generateCacheKey(query: string, options: any): string {
  return `${query.toLowerCase()}_${JSON.stringify(options)}`;
}

/**
 * Clean old cache entries periodically (called on each request)
 */
function cleanExpiredCacheEntries(): void {
  const now = Date.now();
  for (const [key, entry] of searchCache.entries()) {
    if (now - entry.timestamp > CACHE_TTL_MS) {
      searchCache.delete(key);
    }
  }
}

/**
 * POST handler for bylaw search with caching
 */
export async function POST(request: Request) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user) {
      return new Response('Unauthorized', { status: 401 });
    }

    // Parse and validate request body
    const body = await request.json();
    const { query, filters, limit, minScore } = searchSchema.parse(body);

    // Search options
    const searchOptions = {
      limit,
      minScore,
      filters,
      userId: session.user.id // Include user ID for logging but not for cache key
    };
    
    // Create a cache key without the userId to allow sharing results between users
    const cacheKey = generateCacheKey(query, {
      limit,
      minScore,
      filters
    });
    
    // Clean expired cache entries
    cleanExpiredCacheEntries();
    
    // Check cache first
    const cachedEntry = searchCache.get(cacheKey);
    let results: Awaited<ReturnType<typeof searchBylaws>> = [];
    let fromCache = false;
    
    if (cachedEntry && (Date.now() - cachedEntry.timestamp < CACHE_TTL_MS)) {
      // Use cached results
      results = cachedEntry.results;
      fromCache = true;
    } else {
      // Perform search
      results = await searchBylaws(query, searchOptions);
      
      // Cache results
      if (searchCache.size >= MAX_CACHE_SIZE) {
        // Remove oldest entry if cache is full
        const oldestKey = searchCache.keys().next().value;
        searchCache.delete(oldestKey);
      }
      
      searchCache.set(cacheKey, { 
        results, 
        timestamp: Date.now() 
      });
    }

    // Format and return results with cache indicator
    const formattedResults = results.map((result: any) => ({
      id: result.id,
      bylawNumber: result.metadata.bylawNumber,
      title: result.metadata.title,
      section: result.metadata.section,
      content: result.text,
      url:
        result.metadata.url ||
        `https://oakbay.civicweb.net/document/bylaw/${result.metadata.bylawNumber}?section=${result.metadata.section}`,
      score: result.score,
      metadata: {
        category: result.metadata.category,
        dateEnacted: result.metadata.dateEnacted,
        lastUpdated: result.metadata.lastUpdated,
      },
    }));
    
    const response = NextResponse.json({
      success: true,
      query,
      count: results.length,
      fromCache,
      results: formattedResults,
    });
    
    // Add cache control headers
    response.headers.set('Cache-Control', 'private, max-age=300');
    
    return response;
  } catch (error) {
    console.error('Bylaw search error:', error);

    // Handle validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid search parameters',
          details: error.errors,
        },
        { status: 400 },
      );
    }

    // Handle other errors
    return NextResponse.json(
      {
        success: false,
        error: 'Search failed',
      },
      { status: 500 },
    );
  }
}
