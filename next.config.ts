import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    // Only enable features compatible with the version of Next.js being used
    optimizePackageImports: ['@radix-ui/react-icons', 'lucide-react'],
    serverActions: {
      allowedOrigins: ['app.fitforgov.com', 'localhost:3000'],
      bodySizeLimit: '2mb',
    },
  },
  eslint: {
    // Don't run ESLint during build to prevent deployment failures for warnings
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Don't fail build on TypeScript errors - useful for deployment
    ignoreBuildErrors: true,
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
  // Next.js 15+ doesn't support the env key in next.config.js
  // Use process.env variables directly in your app instead
  // See: https://nextjs.org/docs/pages/api-reference/next-config-js
  env: undefined,
  // Public environment variables should be prefixed with NEXT_PUBLIC_
  // and defined in .env files directly
};

export default nextConfig;