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

/**
 * POST handler for bylaw search
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
    };

    // Perform search
    const results = await searchBylaws(query, searchOptions);

    // Return formatted results
    return NextResponse.json({
      success: true,
      query,
      count: results.length,
      results: results.map((result) => ({
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
      })),
    });
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
