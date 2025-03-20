/**
 * API endpoint for collecting bylaw citation feedback
 */

import { type NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { z } from 'zod';

// Validation schema for feedback
const feedbackSchema = z.object({
  bylawNumber: z.string().min(1),
  section: z.string().optional(),
  feedback: z.enum(['correct', 'incorrect', 'incomplete', 'outdated']),
  comment: z.string().optional(),
  source: z.string().optional(),
  searchQuery: z.string().optional(),
  citationText: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    // User authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse and validate request body
    const body = await request.json();
    const data = feedbackSchema.parse(body);

    // Save the feedback to database
    // For now, let's just log it since we haven't created the proper database table yet
    console.log('Would save feedback to database:', {
      userId: session.user.id,
      bylawNumber: data.bylawNumber,
      section: data.section || null,
      feedback: data.feedback,
      comment: data.comment || null,
      source: data.source || null,
      searchQuery: data.searchQuery || null,
      citationText: data.citationText || null,
      createdAt: new Date(),
    });

    // Log the feedback for monitoring
    console.log(
      `Bylaw feedback received: ${data.feedback} for bylaw ${data.bylawNumber}`,
    );

    return NextResponse.json({
      success: true,
      message: 'Feedback recorded successfully',
      // In a real implementation, you'd return the ID from the database
      feedbackId: Math.random().toString(36).substring(2, 9),
    });
  } catch (error) {
    console.error('Error saving bylaw feedback:', error);

    // Handle validation errors specifically
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid feedback data',
          details: error.errors,
        },
        { status: 400 },
      );
    }

    // General error handling
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to save feedback',
      },
      { status: 500 },
    );
  }
}
