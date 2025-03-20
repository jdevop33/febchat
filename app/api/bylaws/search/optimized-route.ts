/**
 * Optimized API endpoint for searching bylaws
 * This uses batch processing and improved caching
 */

import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { searchBylawsOptimized } from '@/lib/vector-search/optimized-search-service';
import { profiler } from '@/lib/utils/profiler';
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
  useOptimized: z.boolean().optional().default(true),
});

// LRU cache implementation with proper typing
class LRUCache<K, V> {
  private capacity: number;
  private cache = new Map<K, V>();
  private expiryTimes = new Map<K, number>();
  private ttl: number;

  constructor(capacity: number, ttlMs: number) {
    this.capacity = capacity;
    this.ttl = ttlMs;
  }

  get(key: K): V | undefined {
    if (!this.cache.has(key)) return undefined;

    const now = Date.now();
    const expiry = this.expiryTimes.get(key) || 0;

    // Check if entry is expired
    if (now > expiry) {
      this.cache.delete(key);
      this.expiryTimes.delete(key);
      return undefined;
    }

    // Move accessed item to the end (most recently used)
    const value = this.cache.get(key);
    this.cache.delete(key);
    this.cache.set(key, value as V);
    return value;
  }

  set(key: K, value: V): void {
    // If key exists, remove it first
    if (this.cache.has(key)) {
      this.cache.delete(key);
      this.expiryTimes.delete(key);
    }

    // If at capacity, remove oldest (first) item
    if (this.cache.size >= this.capacity) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey);
        this.expiryTimes.delete(oldestKey);
      }
    }

    // Add new item and set expiry time
    this.cache.set(key, value);
    this.expiryTimes.set(key, Date.now() + this.ttl);
  }

  // Clean expired entries
  cleanup(): void {
    const now = Date.now();
    for (const [key, expiry] of this.expiryTimes.entries()) {
      if (now > expiry) {
        this.cache.delete(key);
        this.expiryTimes.delete(key);
      }
    }
  }
}

// Initialize cache with 100 item capacity and 5 minute TTL
const searchCache = new LRUCache<string, any>(100, 5 * 60 * 1000);

// Clean expired cache entries periodically (every minute)
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    searchCache.cleanup();
  }, 60 * 1000);
}

/**
 * Generate a cache key from search parameters
 */
function generateCacheKey(query: string, options: any): string {
  return `${query.toLowerCase()}_${JSON.stringify(options)}`;
}

/**
 * POST handler for optimized bylaw search with enhanced caching
 */
export async function POST(request: Request) {
  return profiler.measure('bylaws-search-api', async () => {
    try {
      // Check authentication
      const session = await auth();
      if (!session?.user) {
        return new Response('Unauthorized', { status: 401 });
      }

      // Parse and validate request body
      const body = await request.json();
      const { query, filters, limit, minScore, useOptimized } =
        searchSchema.parse(body);

      // Search options
      const searchOptions = {
        limit,
        minScore,
        filters,
        userId: session.user.id,
      };

      // Create a cache key without the userId to allow sharing results between users
      const cacheKey = generateCacheKey(query, {
        limit,
        minScore,
        filters,
        optimized: useOptimized,
      });

      // Check cache first
      const cachedEntry = searchCache.get(cacheKey);

      if (cachedEntry) {
        // Use cached results
        return NextResponse.json({
          success: true,
          query,
          count: cachedEntry.results.length,
          fromCache: true,
          results: cachedEntry.results,
        });
      }

      // Perform search with the optimized service
      const searchFunction = useOptimized
        ? searchBylawsOptimized
        : (await import('@/lib/vector-search/search-service')).searchBylaws;

      const results = await searchFunction(query, searchOptions);

      // Format results
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

      // Cache results
      searchCache.set(cacheKey, {
        results: formattedResults,
        timestamp: Date.now(),
      });

      // Return response with cache control headers
      const response = NextResponse.json({
        success: true,
        query,
        count: formattedResults.length,
        fromCache: false,
        results: formattedResults,
      });

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
  });
}
