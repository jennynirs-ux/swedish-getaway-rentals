/**
 * IMP-013: Routing System Architecture - SSR MIGRATION COMPLETE
 *
 * MIGRATION STATUS: In Progress → Next.js App Router
 *
 * KEY PAGES NOW SSR-CAPABLE:
 * - app/page.tsx (Homepage) ✓
 * - app/property/[slug]/page.tsx (Property Detail) ✓
 * - app/shop/page.tsx (Shop) ✓
 *
 * SSR IMPROVEMENTS:
 * - Server-side data fetching via app/lib/supabase-server.ts
 * - Dynamic metadata generation per page
 * - generateStaticParams for property pages
 * - Proper SEO tags (og:image, twitter cards, etc.)
 * - Separation of server and client components
 *
 * See also:
 * - app/lib/supabase-server.ts (Server client for reads)
 * - app/page.tsx (Homepage with SSR)
 * - app/property/[slug]/page.tsx (Property detail with dynamic metadata)
 * - app/shop/page.tsx (Shop with SSR)
 */

import type { Metadata } from 'next';
import { Inter, Playfair_Display } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  fallback: ['system-ui', 'arial']
});
const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  fallback: ['Georgia', 'serif']
});

export const metadata: Metadata = {
  title: {
    default: 'Nordic Getaways - Premium Nordic Vacation Rentals',
    template: '%s | Nordic Getaways',
  },
  description:
    'Discover your perfect Nordic retreat. Unique stays across Scandinavia with modern amenities, breathtaking views, and authentic experiences.',
  metadataBase: new URL('https://nordic-getaways.com'),
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'Nordic Getaways',
    title: 'Nordic Getaways - Premium Nordic Vacation Rentals',
    description:
      'Discover your perfect Nordic retreat. Unique stays across Scandinavia with modern amenities, breathtaking views, and authentic experiences.',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Nordic Getaways',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Nordic Getaways - Premium Nordic Vacation Rentals',
    description:
      'Discover your perfect Nordic retreat. Unique stays across Scandinavia with modern amenities, breathtaking views, and authentic experiences.',
    images: ['/og-image.jpg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-snippet': -1,
      'max-image-preview': 'large',
      'max-video-preview': -1,
    },
  },
  alternates: {
    canonical: 'https://nordic-getaways.com',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable}`}>
      <body className={inter.className}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
