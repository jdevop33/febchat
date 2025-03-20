/**
 * API endpoint for searching bylaws
 */

import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { searchBylaws } from '@/lib/vector-search/search-service';
import {
  searchBylawsWithVerification,
  recordSearchQuery,
} from '@/lib/vector-search/enhanced-search';
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
      userId: session.user.id, // Include user ID for logging but not for cache key
    };

    // Create a cache key without the userId to allow sharing results between users
    const cacheKey = generateCacheKey(query, {
      limit,
      minScore,
      filters,
    });

    // Clean expired cache entries
    cleanExpiredCacheEntries();

    // Check cache first
    const cachedEntry = searchCache.get(cacheKey);
    let results: Awaited<ReturnType<typeof searchBylaws>> = [];
    let fromCache = false;

    if (cachedEntry && Date.now() - cachedEntry.timestamp < CACHE_TTL_MS) {
      // Use cached results
      results = cachedEntry.results;
      fromCache = true;
    } else {
      // Perform search with verification
      try {
        // Convert searchOptions to enhanced search format
        const enhancedOptions = {
          topK: limit,
          bylawFilter: filters?.bylawNumber,
          categoryFilter: filters?.category,
          dateRange:
            filters?.dateFrom || filters?.dateTo
              ? {
                  start: filters.dateFrom,
                  end: filters.dateTo,
                }
              : undefined,
        };

        // Use the enhanced search with verification
        const verifiedResults = await searchBylawsWithVerification(
          query,
          enhancedOptions,
        );

        // Record query for analytics
        await recordSearchQuery(query, verifiedResults);

        // Convert verified results to expected format and cast to proper type
        results = verifiedResults.map((result) => ({
          id: `bylaw-${result.bylawNumber}-${result.section}`,
          score: result.score,
          text: result.content,
          metadata: {
            bylawNumber: result.bylawNumber,
            title: result.title,
            section: result.section,
            sectionTitle: result.sectionTitle,
            category: result.section.includes('1') ? 'general' : 'specific', // Placeholder
            dateEnacted: result.enactmentDate || 'unknown', // Ensure string value
            text: result.content, // Add text field required by BylawMetadata
            lastUpdated: result.consolidatedDate || 'unknown', // Ensure string value
            isVerified: result.isVerified,
            pdfPath: result.pdfPath,
            officialUrl: result.officialUrl,
            isConsolidated: result.isConsolidated,
          },
        })) as any; // Cast to any to bypass type checking
      } catch (error) {
        console.error(
          'Enhanced search failed, falling back to standard search:',
          error,
        );
        // Fall back to original search if enhanced search fails
        results = await searchBylaws(query, searchOptions);
      }

      // Cache results
      if (searchCache.size >= MAX_CACHE_SIZE) {
        // Remove oldest entry if cache is full
        const oldestKey = searchCache.keys().next().value;
        if (oldestKey !== undefined) {
          searchCache.delete(oldestKey);
        }
      }

      searchCache.set(cacheKey, {
        results,
        timestamp: Date.now(),
      });
    }

    // Format and return results with cache indicator and verification info
    const formattedResults = results.map((result: any) => ({
      id: result.id,
      bylawNumber: result.metadata.bylawNumber,
      title: result.metadata.title,
      section: result.metadata.section,
      sectionTitle: result.metadata.sectionTitle,
      content: result.text,
      url:
        result.metadata.officialUrl ||
        `https://oakbay.civicweb.net/document/bylaw/${result.metadata.bylawNumber}?section=${result.metadata.section}`,
      pdfPath:
        result.metadata.pdfPath || `/pdfs/${result.metadata.bylawNumber}.pdf`,
      score: result.score,
      isVerified:
        result.metadata.isVerified === undefined
          ? false
          : result.metadata.isVerified,
      isConsolidated: result.metadata.isConsolidated || false,
      metadata: {
        category: result.metadata.category,
        dateEnacted: result.metadata.dateEnacted,
        lastUpdated:
          result.metadata.lastUpdated || result.metadata.consolidatedDate,
        amendedBylaw: result.metadata.amendedBylaw,
      },
    }));

    // Count verified results
    const verifiedCount = formattedResults.filter(
      (result) => result.isVerified,
    ).length;

    const response = NextResponse.json({
      success: true,
      query,
      count: results.length,
      verifiedCount,
      verificationRate: results.length > 0 ? verifiedCount / results.length : 0,
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
