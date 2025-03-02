import type { NextConfig } from 'next';
import dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

const nextConfig: NextConfig = {
  experimental: {
    ppr: true,
  },
  images: {
    remotePatterns: [
      {
        hostname: 'avatar.vercel.sh',
      },
      {
        hostname: 'ui-avatars.com',
      },
    ],
  },
  // Export critical environment variables to client and server
  env: {
    // Database (only expose connection existence, not actual credentials)
    HAS_DATABASE: !!process.env.POSTGRES_URL,
    
    // API Keys (only expose existence, not actual keys)
    HAS_ANTHROPIC_API: !!process.env.ANTHROPIC_API_KEY,
    HAS_OPENAI_API: !!process.env.OPENAI_API_KEY,
    HAS_PINECONE_API: !!process.env.PINECONE_API_KEY,
    
    // Model names (safe to expose)
    CLAUDE_MODEL: process.env.CLAUDE_MODEL || 'claude-3-7-sonnet-20250219',
    CLAUDE_FALLBACK_MODEL: process.env.CLAUDE_FALLBACK_MODEL || 'claude-3-5-sonnet-20240620',
    
    // Pinecone index name (safe to expose)
    PINECONE_INDEX: process.env.PINECONE_INDEX || 'oak-bay-bylaws',
  },
};

export default nextConfig;
