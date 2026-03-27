/**
 * Next.js Configuration — PRIMARY BUILD SYSTEM
 *
 * Scripts:
 *   - npm run dev         (Next.js dev server)
 *   - npm run build       (Next.js production build)
 *   - npm run start       (Next.js production server)
 *
 * Vite is retained only for unit tests (vitest).
 */

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typescript: {
    // ESLint + TypeScript run as separate CI jobs
    ignoreBuildErrors: true,
  },
  eslint: {
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
  async redirects() {
    return [
      {
        source: '/villa-hacken',
        destination: '/property/villa-hacken',
        permanent: true,
      },
      {
        source: '/villa-hacken/guide',
        destination: '/property/villa-hacken/guide',
        permanent: true,
      },
      {
        source: '/lakehouse-getaway',
        destination: '/property/lakehouse-getaway',
        permanent: true,
      },
      {
        source: '/lakehouse-getaway/guide',
        destination: '/property/lakehouse-getaway/guide',
        permanent: true,
      },
      {
        source: '/product/:id',
        destination: '/shop/:id',
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(self)',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
