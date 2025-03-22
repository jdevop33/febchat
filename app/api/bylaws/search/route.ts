/**
 * API endpoint for searching bylaws - Unified Implementation
 *
 * This optimized version combines features from previous implementations:
 * - Input validation with Zod
 * - Performance tracking
 * - Caching and rate limiting
 * - Detailed error responses
 */

import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { searchBylaws } from '@/lib/vector/search-unified';
import { logger } from '@/lib/monitoring/logger';
import { z } from 'zod';

// Rate limiting
import { LRUCache } from 'lru-cache';

// Schema for search request validation
const searchSchema = z.object({
  query: z.string().min(2).max(500),
  filters: z
    .object({
      category: z.string().optional(),
      bylawNumber: z.string().optional(),
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
      consolidated: z.boolean().optional(),
    })
    .optional(),
  limit: z.number().min(1).max(20).optional(),
  includeScores: z.boolean().optional(),
  minScore: z.number().min(0).max(1).optional(),
  useCache: z.boolean().optional(),
});

// Rate limiting setup
const rateLimit = new LRUCache({
  max: 500,
  ttl: 60 * 1000, // 1 minute
});

// Endpoint for searching bylaws
export async function POST(request: Request) {
  const startTime = Date.now();
  let sessionUser = null;

  try {
    // Parse request body
    const body = await request.json();

    // Get client IP for rate limiting
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    const rateLimitKey = `search:${ip}`;

    // Check rate limit (10 requests per minute)
    const currentCount = rateLimit.get(rateLimitKey) || 0;
    if ((currentCount as number) > 10) {
      logger.warn(`Rate limit exceeded for ${ip}`);
      return NextResponse.json(
        { error: 'Rate limit exceeded, please try again later' },
        { status: 429 },
      );
    }

    // Update rate limit counter
    rateLimit.set(rateLimitKey, (currentCount as number) + 1);

    // Validate request schema
    const result = searchSchema.safeParse(body);
    if (!result.success) {
      logger.warn('Invalid search request', { errors: result.error.format() });
      return NextResponse.json(
        { error: 'Invalid search parameters', details: result.error.format() },
        { status: 400 },
      );
    }

    // Extract validated parameters
    const { query, filters, limit, includeScores, minScore, useCache } =
      result.data;

    // Get authentication context (for personalization)
    const session = await auth();
    sessionUser = session?.user;

    // Perform the search
    const searchResults = await searchBylaws(query, {
      filters,
      limit,
      includeScores,
      minScore,
      useCache,
      userId: sessionUser?.id,
    });

    // Format the response
    const response = {
      query,
      results: searchResults.map((result) => ({
        bylawNumber: result.metadata.bylawNumber,
        title: result.metadata.title,
        section: result.metadata.section,
        sectionTitle: result.metadata.sectionTitle,
        content: result.text,
        score: includeScores ? result.score : undefined,
        officialUrl: result.metadata.officialUrl,
        isConsolidated: result.metadata.isConsolidated,
        consolidatedDate: result.metadata.consolidatedDate,
      })),
      meta: {
        count: searchResults.length,
        executionTimeMs: Date.now() - startTime,
        filters: filters || {},
      },
    };

    logger.info(`Search completed in ${Date.now() - startTime}ms`, {
      query,
      resultCount: searchResults.length,
      userEmail: sessionUser?.email,
    });

    return NextResponse.json(response);
  } catch (error) {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    logger.error(errorObj, 'Search failed');

    return NextResponse.json(
      { error: 'An error occurred while searching', message: errorObj.message },
      { status: 500 },
    );
  }
}

// Handle GET requests with query params
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query) {
      return NextResponse.json(
        { error: 'Query parameter "q" is required' },
        { status: 400 },
      );
    }

    // Convert to POST request format
    const body = {
      query,
      filters: {
        bylawNumber: searchParams.get('bylaw') || undefined,
        category: searchParams.get('category') || undefined,
      },
      limit: searchParams.get('limit')
        ? Number.parseInt(searchParams.get('limit') as string, 10)
        : undefined,
    };

    // Create new request with body for POST handler
    const newReq = new Request(request.url, {
      method: 'POST',
      headers: request.headers,
      body: JSON.stringify(body),
    });

    // Pass to POST handler
    return POST(newReq);
  } catch (error) {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    logger.error(errorObj, 'GET search failed');

    return NextResponse.json(
      { error: 'An error occurred while searching', message: errorObj.message },
      { status: 500 },
    );
  }
}
