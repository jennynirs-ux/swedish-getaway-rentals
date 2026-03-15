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
