/**
 * SEO JSON-LD structured data components for rich snippets in Google Search.
 */

interface BreadcrumbItem {
  name: string;
  url: string;
}

export function BreadcrumbJsonLd({ items }: { items: BreadcrumbItem[] }) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": items.map((item, i) => ({
      "@type": "ListItem",
      "position": i + 1,
      "name": item.name,
      "item": item.url,
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

interface VacationRentalProps {
  name: string;
  description: string;
  image: string;
  url: string;
  address: { locality?: string; region?: string; country: string };
  bedrooms?: number;
  bathrooms?: number;
  maxGuests?: number;
  pricePerNight?: number;
  currency?: string;
  rating?: number;
  reviewCount?: number;
  amenities?: string[];
  registrationNumber?: string;
}

export function VacationRentalJsonLd(props: VacationRentalProps) {
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "VacationRental",
    "name": props.name,
    "description": props.description,
    "image": props.image,
    "url": props.url,
    "address": {
      "@type": "PostalAddress",
      ...(props.address.locality && { "addressLocality": props.address.locality }),
      ...(props.address.region && { "addressRegion": props.address.region }),
      "addressCountry": props.address.country,
    },
    ...(props.bedrooms && { "numberOfBedrooms": props.bedrooms }),
    ...(props.bathrooms && { "numberOfBathroomsTotal": props.bathrooms }),
    ...(props.maxGuests && {
      "occupancy": {
        "@type": "QuantitativeValue",
        "maxValue": props.maxGuests,
      },
    }),
    ...(props.pricePerNight && {
      "offers": {
        "@type": "Offer",
        "price": props.pricePerNight,
        "priceCurrency": props.currency || "SEK",
        "availability": "https://schema.org/InStock",
        "validFrom": new Date().toISOString().split("T")[0],
      },
    }),
    ...(props.rating && props.reviewCount && {
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": props.rating,
        "reviewCount": props.reviewCount,
        "bestRating": 5,
        "worstRating": 1,
      },
    }),
    ...(props.amenities && props.amenities.length > 0 && {
      "amenityFeature": props.amenities.map((a) => ({
        "@type": "LocationFeatureSpecification",
        "name": a,
        "value": true,
      })),
    }),
    ...(props.registrationNumber && {
      "identifier": {
        "@type": "PropertyValue",
        "name": "EU Rental Registration Number",
        "value": props.registrationNumber,
      },
    }),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

interface ProductProps {
  name: string;
  description: string;
  image: string;
  url: string;
  price: number;
  currency?: string;
  availability?: boolean;
  sku?: string;
}

export function ProductJsonLd(props: ProductProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": props.name,
    "description": props.description,
    "image": props.image,
    "url": props.url,
    ...(props.sku && { "sku": props.sku }),
    "offers": {
      "@type": "Offer",
      "price": props.price,
      "priceCurrency": props.currency || "SEK",
      "availability": props.availability !== false
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      "seller": {
        "@type": "Organization",
        "name": "Nordic Getaways",
      },
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

interface FAQItem {
  question: string;
  answer: string;
}

export function FAQJsonLd({ items }: { items: FAQItem[] }) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": items.map((item) => ({
      "@type": "Question",
      "name": item.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": item.answer,
      },
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
