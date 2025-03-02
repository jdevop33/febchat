import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    // Partial Prerendering (PPR) is experimental and can cause issues
    // ppr: true,
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
  // Next.js 14+ doesn't support the env key in next.config.js
  // Use process.env variables directly in your app instead
  // See: https://nextjs.org/docs/pages/api-reference/next-config-js
  env: undefined,
  // Public environment variables should be prefixed with NEXT_PUBLIC_
  // and defined in .env files directly
};

export default nextConfig;
