/**
 * API endpoint for exposing performance metrics in development
 * This endpoint is only available in development mode
 */

import { NextResponse } from 'next/server';
import {
  getPerformanceMetrics,
  resetPerformanceMetrics,
} from '@/lib/optimization';

export async function GET(request: Request) {
  // Only available in development
  if (process.env.NODE_ENV === 'production') {
    return new Response('Not available in production', { status: 403 });
  }

  // Get query parameters
  const url = new URL(request.url);
  const reset = url.searchParams.get('reset') === 'true';

  // Get performance metrics
  const metrics = getPerformanceMetrics();

  // Reset metrics if requested
  if (reset) {
    resetPerformanceMetrics();
  }

  // Return metrics
  return NextResponse.json({
    timestamp: new Date().toISOString(),
    metrics,
    memoryUsage: process.memoryUsage(),
  });
}
