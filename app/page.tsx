import type { Metadata } from 'next';
import { createServerClient } from './lib/supabase-server';
import HomeClient from './home-client';

// ISR: Revalidate homepage every 30 minutes
export const revalidate = 1800;

export const metadata: Metadata = {
  title: 'Nordic Getaways - Premium Nordic Vacation Rentals',
  description:
    'Discover your perfect Nordic retreat. Unique stays across Scandinavia with modern amenities, breathtaking views, and authentic experiences.',
  keywords: [
    'Nordic vacation rentals',
    'Swedish retreats',
    'Scandinavian getaways',
    'Nordic properties',
    'vacation homes',
  ],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://nordic-getaways.com',
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
};

async function getHomepageProperties() {
  try {
    const supabase = createServerClient();

    const { data, error } = await supabase
      .from('properties')
      .select(
        `
        id,
        host_id,
        title,
        description,
        location,
        price_per_night,
        currency,
        max_guests,
        bedrooms,
        bathrooms,
        hero_image_url,
        amenities,
        active,
        review_rating,
        review_count,
        property_type,
        special_amenities,
        featured_amenities,
        latitude,
        longitude,
        city
      `
      )
      .eq('active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching properties:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Failed to fetch homepage properties:', error);
    return [];
  }
}

export default async function HomePage() {
  const properties = await getHomepageProperties();

  return <HomeClient initialProperties={properties} />;
}
