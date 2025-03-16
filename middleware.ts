import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import NextAuth from 'next-auth';
import { authConfig } from '@/app/(auth)/auth.config';

// Auth middleware
const auth = NextAuth(authConfig).auth;

// Rate limiting configuration
type RateLimitData = {
  count: number;
  timestamp: number;
};

const RATE_LIMIT_DURATION = 60 * 1000; // 1 minute in milliseconds
const AUTH_PATHS_MAX_REQUESTS = 10; // Max 10 requests per minute for auth endpoints
const API_PATHS_MAX_REQUESTS = 60; // Max 60 requests per minute for API endpoints

// In-memory store for rate limiting (consider using Redis in production)
const rateLimitStore = new Map<string, RateLimitData>();

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, data] of rateLimitStore.entries()) {
    if (now - data.timestamp > RATE_LIMIT_DURATION) {
      rateLimitStore.delete(key);
    }
  }
}, 60 * 1000); // Clean up every minute

async function rateLimit(request: NextRequest, maxRequests: number): Promise<boolean> {
  const ip = request.ip || 'anonymous';
  const key = `${ip}:${request.nextUrl.pathname}`;
  const now = Date.now();
  
  // Get or initialize rate limit data
  const rateLimitData = rateLimitStore.get(key) || { count: 0, timestamp: now };
  
  // Reset counter if the time window has passed
  if (now - rateLimitData.timestamp > RATE_LIMIT_DURATION) {
    rateLimitData.count = 0;
    rateLimitData.timestamp = now;
  }
  
  // Increment request count
  rateLimitData.count++;
  rateLimitStore.set(key, rateLimitData);
  
  // Check if rate limit is exceeded
  return rateLimitData.count <= maxRequests;
}

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Apply rate limiting based on path
  let maxRequests = API_PATHS_MAX_REQUESTS;
  
  // Stricter rate limiting for auth-related endpoints
  if (pathname.startsWith('/login') || 
      pathname.startsWith('/register') || 
      pathname.startsWith('/api/auth')) {
    maxRequests = AUTH_PATHS_MAX_REQUESTS;
  }
  
  // Check rate limit
  const isWithinLimit = await rateLimit(request, maxRequests);
  
  if (!isWithinLimit) {
    // Return 429 Too Many Requests
    return new NextResponse(
      JSON.stringify({
        error: 'Too many requests',
        message: 'Rate limit exceeded. Please try again later.'
      }),
      { 
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': '60'
        }
      }
    );
  }
  
  // Continue with auth middleware
  return auth(request);
}

export const config = {
  matcher: ['/', '/:id', '/api/:path*', '/login', '/register'],
};
