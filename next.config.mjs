/**
 * Next.js Configuration
 *
 * IMPORTANT: This is the FUTURE production build system.
 * Currently, the primary build system is Vite (see package.json).
 *
 * Vite scripts (production):
 *   - npm run build       (Vite - used by CI)
 *   - npm run dev        (Vite dev server)
 *
 * Next.js scripts (future):
 *   - npm run build:next  (Next.js build)
 *   - npm run dev:next   (Next.js dev server)
 *   - npm run start:next (Next.js production start)
 *
 * When transitioning to Next.js as the primary build:
 * 1. Update CI to use "npm run build:next" instead of "npm run build"
 * 2. Update deployment scripts to use start:next
 * 3. Remove Vite build configuration from package.json
 */

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typescript: {
    // Type errors are caught by Vite build (primary) — skip in Next.js build
    ignoreBuildErrors: true,
  },
  eslint: {
    // ESLint runs as separate CI job — skip in Next.js build
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'bbuutvozqfzbsnllsiai.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
    // Optimize image loading
    formats: ['image/avif', 'image/webp'],
  },
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
  },
  // Enable proper caching for static generation
  onDemandEntries: {
    maxInactiveAge: 60 * 1000,
    pagesBufferLength: 5,
  },
  // Proper redirects from old routes if needed
  async redirects() {
    return [
      // Add legacy route redirects here if needed
      // {
      //   source: '/legacy/:path*',
      //   destination: '/new/:path*',
      //   permanent: true,
      // },
    ];
  },
};

export default nextConfig;
