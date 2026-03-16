/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
