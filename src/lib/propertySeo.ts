import type { Property } from "@/hooks/useProperties";
import { SITE_NAME, SITE_URL } from "@/hooks/usePageMeta";
import type { PropertyContent } from "@/content/propertyContent";

type SeoProperty = Pick<
  Property,
  | "id" | "slug" | "title" | "description" | "location" | "city" | "price_per_night" | "currency"
  | "bedrooms" | "bathrooms" | "max_guests" | "amenities" | "hero_image_url" | "gallery_images"
  | "review_rating" | "review_count" | "latitude" | "longitude"
>;

export const propertyPath = (p: Pick<Property, "id" | "slug">) => `/property/${p.slug || p.id}`;

const firstSentences = (text: string, max = 155) => {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length <= max ? clean : `${clean.slice(0, max - 1).replace(/\s+\S*$/, "")}…`;
};

export const propertyMetaDescription = (p: SeoProperty) => {
  const facts = `Sleeps ${p.max_guests}, ${p.bedrooms} bedroom${p.bedrooms === 1 ? "" : "s"}, from ${p.price_per_night} ${p.currency}/night.`;
  const rating = p.review_rating && p.review_count ? ` Rated ${p.review_rating}/5 by ${p.review_count} guests.` : "";
  return firstSentences(`${p.title} in ${p.location}. ${facts}${rating} ${p.description ?? ""}`);
};

/** schema.org VacationRental, read by Google and by AI assistants */
export const buildPropertyJsonLd = (p: SeoProperty, content?: PropertyContent) => {
  const url = `${SITE_URL}${propertyPath(p)}`;
  const images = [p.hero_image_url, ...(p.gallery_images ?? [])].filter(Boolean).slice(0, 10);
  const [locality, country] = (p.location ?? "").split(",").map((s) => s.trim());

  const rental = {
    "@context": "https://schema.org",
    "@type": "VacationRental",
    "@id": url,
    url,
    name: content ? `${content.nickname} – ${p.title}` : p.title,
    description: content ? content.intro.join(" ") : p.description,
    image: images,
    brand: { "@type": "Brand", name: SITE_NAME },
    address: {
      "@type": "PostalAddress",
      addressLocality: locality || p.city || undefined,
      addressCountry: country === "Sweden" || !country ? "SE" : country,
    },
    // Rounded to ~1 km: enough for "near Gothenburg" answers without exposing the exact house
    ...(p.latitude != null && p.longitude != null
      ? {
          geo: {
            "@type": "GeoCoordinates",
            latitude: Math.round(p.latitude * 100) / 100,
            longitude: Math.round(p.longitude * 100) / 100,
          },
        }
      : {}),
    containsPlace: {
      "@type": "Accommodation",
      additionalType: "EntirePlace",
      occupancy: { "@type": "QuantitativeValue", maxValue: p.max_guests },
      numberOfBedrooms: p.bedrooms,
      numberOfBathroomsTotal: p.bathrooms,
      amenityFeature: (p.amenities ?? []).map((name) => ({
        "@type": "LocationFeatureSpecification",
        name,
        value: true,
      })),
    },
    priceRange: `From ${p.price_per_night} ${p.currency} per night`,
    ...(p.review_rating && p.review_count
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: Number(p.review_rating),
            reviewCount: p.review_count,
            bestRating: 5,
          },
        }
      : {}),
  };

  if (!content) return rental;

  return [
    rental,
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: content.faq.map(({ q, a }) => ({
        "@type": "Question",
        name: q,
        acceptedAnswer: { "@type": "Answer", text: a },
      })),
    },
  ];
};
