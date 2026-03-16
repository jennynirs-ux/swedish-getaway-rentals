/**
 * IMP-013: Routing System Architecture
 *
 * DUAL ROUTING SYSTEMS - This project uses TWO separate routing systems during transition:
 *
 * 1. CURRENT PRODUCTION ROUTER (Active):
 *    - Location: src/App.tsx + Vite (Vite SPA)
 *    - React Router for client-side routing
 *    - All active pages and features use this system
 *    - Entry point: src/main.tsx -> src/App.tsx
 *
 * 2. TARGET MIGRATION ROUTER (In progress):
 *    - Location: app/ directory (Next.js App Router)
 *    - This file: app/layout.tsx
 *    - Being gradually migrated to this system
 *    - Will eventually replace the Vite-based router
 *
 * TODO: Complete migration from Vite (src/App.tsx) to Next.js (app/ directory)
 * See also: src/App.tsx (TODO reference to this file)
 *
 * Note: The app/ directory structure is prepared but not yet active in production.
 * New features should be added to src/ and routed through src/App.tsx until
 * the migration is complete.
 */

import type { Metadata } from 'next';
import { Inter, Playfair_Display } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-playfair' });

export const metadata: Metadata = {
  title: {
    default: 'Nordic Getaways - Premium Nordic Vacation Rentals',
    template: '%s | Nordic Getaways',
  },
  description: 'Discover your perfect Nordic retreat. Unique stays across Scandinavia with modern amenities, breathtaking views, and authentic experiences.',
  metadataBase: new URL('https://nordic-getaways.com'),
  openGraph: {
    type: 'website',
    siteName: 'Nordic Getaways',
    images: ['/og-image.jpg'],
  },
  twitter: {
    card: 'summary_large_image',
  },
  robots: {
    index: true,
    follow: true,
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
