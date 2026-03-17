import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createServerClient } from '../../lib/supabase-server';
import PropertyClient from './property-client';
import { Property } from '@/types/property';

// ISR: Revalidate property pages every hour
export const revalidate = 3600;

async function getPropertyBySlug(slug: string): Promise<Property | null> {
  try {
    const supabase = createServerClient();

    // Try to fetch by ID directly first
    let { data: directProperty, error: directError } = await supabase
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
        bedrooms,
        bathrooms,
        max_guests,
        amenities,
        hero_image_url,
        tagline_line1,
        tagline_line2,
        review_rating,
        review_count,
        active,
        latitude,
        longitude,
        city
      `
      )
      .eq('id', slug)
      .eq('active', true)
      .single();

    if (directProperty && !directError) {
      return directProperty as Property;
    }

    // If no direct match, try legacy slug resolution
    let propertyId = slug;
    if (slug === 'villa-hacken') {
      const { data } = await supabase
        .from('properties')
        .select('id')
        .ilike('title', '%villa%')
        .eq('active', true)
        .limit(1)
        .single();
      if (data) propertyId = data.id;
    } else if (slug === 'lakehouse-getaway') {
      const { data } = await supabase
        .from('properties')
        .select('id')
        .or('title.ilike.%lakehouse%,title.ilike.%lake%')
        .eq('active', true)
        .limit(1)
        .single();
      if (data) propertyId = data.id;
    }

    // Fetch the resolved property
    const { data: property, error } = await supabase
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
        bedrooms,
        bathrooms,
        max_guests,
        amenities,
        hero_image_url,
        tagline_line1,
        tagline_line2,
        review_rating,
        review_count,
        active,
        latitude,
        longitude,
        city
      `
      )
      .eq('id', propertyId)
      .eq('active', true)
      .single();

    if (error || !property) {
      return null;
    }

    return property as Property;
  } catch (error) {
    console.error('Failed to fetch property:', error);
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const property = await getPropertyBySlug(params.slug);

  if (!property) {
    return {
      title: 'Property Not Found',
      description: 'The property you are looking for does not exist.',
    };
  }

  const imageUrl = property.hero_image_url || '/og-image.jpg';

  return {
    title: `${property.title} - Nordic Getaways`,
    description:
      property.description ||
      `Book ${property.title} - ${property.bedrooms} bedrooms, ${property.bathrooms} bathrooms for ${property.max_guests} guests`,
    keywords: [
      property.title,
      property.location,
      property.city || 'Nordic',
      'vacation rental',
      'accommodation',
    ],
    openGraph: {
      type: 'website',
      url: `https://nordic-getaways.com/property/${params.slug}`,
      title: `${property.title} - Nordic Getaways`,
      description:
        property.description ||
        `Book ${property.title} - ${property.bedrooms} bedrooms, ${property.bathrooms} bathrooms for ${property.max_guests} guests`,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: property.title,
        },
      ],
      siteName: 'Nordic Getaways',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${property.title} - Nordic Getaways`,
      description: property.description || property.title,
      images: [imageUrl],
    },
  };
}

export async function generateStaticParams() {
  try {
    const supabase = createServerClient();

    const { data: properties, error } = await supabase
      .from('properties')
      .select('id')
      .eq('active', true)
      .limit(50); // Limit to prevent long build times

    if (error || !properties) {
      return [];
    }

    return properties.map((property) => ({
      slug: property.id,
    }));
  } catch (error) {
    console.error('Failed to generate static params:', error);
    return [];
  }
}

function PropertyJsonLd({ property }: { property: Property }) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'VacationRental',
    name: property.title,
    description: property.description,
    image: property.hero_image_url,
    url: `https://nordic-getaways.com/property/${property.id}`,
    address: {
      '@type': 'PostalAddress',
      streetAddress: property.location,
      addressLocality: property.city || undefined,
      addressCountry: 'SE',
    },
    numberOfBedrooms: property.bedrooms,
    numberOfBathroomsTotal: property.bathrooms,
    occupancy: {
      '@type': 'QuantitativeValue',
      maxValue: property.max_guests,
    },
    ...(property.amenities?.length ? {
      amenityFeature: property.amenities.map((a: string) => ({
        '@type': 'LocationFeatureSpecification',
        name: a,
        value: true,
      })),
    } : {}),
    ...(property.review_count && property.review_rating ? {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: property.review_rating,
        reviewCount: property.review_count,
        bestRating: 5,
        worstRating: 1,
      },
    } : {}),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

export default async function PropertyPage({ params }: { params: { slug: string } }) {
  const property = await getPropertyBySlug(params.slug);

  if (!property) {
    notFound();
  }

  return (
    <>
      <PropertyJsonLd property={property} />
      <PropertyClient initialLightProperty={property} slug={params.slug} />
    </>
  );
}
