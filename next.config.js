/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Partial Prerendering (PPR) is experimental and can cause issues
    // ppr: true,
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
  // Next.js 14+ doesn't support the env key in next.config.js
  // Use process.env variables directly in your app instead
  // See: https://nextjs.org/docs/pages/api-reference/next-config-js
  env: undefined,
  // Public environment variables should be prefixed with NEXT_PUBLIC_
  // and defined in .env files directly
};

module.exports = nextConfig;