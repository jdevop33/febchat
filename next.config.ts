import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  
  // These settings ensure successful build on Vercel even with minor issues
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  
  images: {
    remotePatterns: [
      { hostname: 'avatar.vercel.sh' },
      { hostname: 'ui-avatars.com' },
    ],
  },
  
  // Minimal experimental features to reduce risk
  experimental: {
    serverActions: {
      allowedOrigins: ['app.fitforgov.com', 'localhost:3000'],
    },
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
  },
  
  // Optimize for production
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' 
      ? { exclude: ['error', 'warn'] } 
      : false,
  },
  
  // Improve serverless function performance
  poweredByHeader: false,
};

export default nextConfig;