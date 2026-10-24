import type { Property } from "@/hooks/useProperties";
import { SITE_NAME, SITE_URL } from "@/hooks/usePageMeta";
import { withServiceFee } from "@/lib/constants";
import type { PropertyContent } from "@/content/propertyContent";
import { amenityLabel } from "@/content/amenities";
import { type Copy, type Lang, LOCALES, localizedPath } from "@/i18n";

export type SeoProperty = Pick<
  Property,
  | "id" | "slug" | "title" | "description" | "location" | "city" | "country" | "price_per_night" | "currency"
  | "bedrooms" | "bathrooms" | "max_guests" | "amenities" | "hero_image_url" | "gallery_images"
  | "review_rating" | "review_count" | "latitude" | "longitude" | "service_fee_rate"
> & {
  /** "16:00:00" from the database */
  check_in_time?: string | null;
  check_out_time?: string | null;
};

// Hosts type the country in English or Swedish, or leave it empty
const SWEDEN = new Set(["", "sweden", "sverige", "se"]);

// city is stored lower-case ("lerum")
const capitalise = (text: string) => text.replace(/(^|[\s-])(\p{L})/gu, (_, sep, letter) => sep + letter.toUpperCase());

export const propertyPath = (p: Pick<Property, "id" | "slug">) => `/property/${p.slug || p.id}`;

// Search results cut longer descriptions off
export const META_DESCRIPTION_MAX = 155;
// A shorter scrap of the host's text says nothing ("Villa Häcken: a…")
const MIN_HOST_TEXT = 40;

// English keeps its plain numbers ("8800 SEK", "4.98/5"); the others their own style ("8 800 SEK", "4,98/5")
const num = (n: number, lang: Lang) => (lang === "en" ? String(n) : n.toLocaleString(LOCALES[lang]));

const en = {
  sweden: "Sweden",
  facts: (guests: number, bedrooms: number, price: string, currency: string) =>
    `Sleeps ${guests}, ${bedrooms} bedroom${bedrooms === 1 ? "" : "s"}, from ${price} ${currency}/night incl. service fee.`,
  airbnbRating: (rating: string, count: number) => ` Airbnb rating ${rating}/5 from ${count} guests.`,
  rating: (rating: string, count: number) => ` Rated ${rating}/5 by ${count} guests.`,
  intro: (name: string, location: string, rest: string) => `${name} in ${location}. ${rest}`,
  priceRange: (price: string, currency: string) => `From ${price} ${currency} per night incl. service fee`,
};
const COPY: Copy<typeof en> = {
  en,
  sv: {
    sweden: "Sverige",
    facts: (guests, bedrooms, price, currency) => `Plats för ${guests}, ${bedrooms} sovrum, från ${price} ${currency}/natt inkl. serviceavgift.`,
    airbnbRating: (rating, count) => ` Airbnb-betyg ${rating}/5 från ${count} ${count === 1 ? "gäst" : "gäster"}.`,
    rating: (rating, count) => ` Betyg ${rating}/5 från ${count} ${count === 1 ? "gäst" : "gäster"}.`,
    intro: (name, location, rest) => `${name} i ${location}. ${rest}`,
    priceRange: (price, currency) => `Från ${price} ${currency} per natt inkl. serviceavgift`,
  },
  de: {
    sweden: "Schweden",
    facts: (guests, bedrooms, price, currency) =>
      `Für ${guests} ${guests === 1 ? "Gast" : "Gäste"}, ${bedrooms} Schlafzimmer, ab ${price} ${currency}/Nacht inkl. Servicegebühr.`,
    airbnbRating: (rating, count) => ` Airbnb-Bewertung ${rating}/5 von ${count} ${count === 1 ? "Gast" : "Gästen"}.`,
    rating: (rating, count) => ` Bewertet mit ${rating}/5 von ${count} ${count === 1 ? "Gast" : "Gästen"}.`,
    intro: (name, location, rest) => `${name} in ${location}. ${rest}`,
    priceRange: (price, currency) => `Ab ${price} ${currency} pro Nacht inkl. Servicegebühr`,
  },
};

const firstSentences = (text: string, max = META_DESCRIPTION_MAX) => {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length <= max ? clean : `${clean.slice(0, max - 1).replace(/\s+\S*$/, "")}…`;
};

/** The page title, before " | Nordic Getaways" */
export const propertyPageTitle = (p: Pick<SeoProperty, "title" | "location">, content?: PropertyContent, lang: Lang = "en") =>
  content ? `${content.nickname}: ${content.seoTitle}` : `${p.title} – ${p.location ?? COPY[lang].sweden}`;

/**
 * Pass the cabin's PROPERTY_CONTENT entry for the owners' cabins: their ratings
 * are Airbnb's. Nothing records where other listings' ratings come from, so
 * those get no source. In the page's language: pass the listing with its text
 * translated and the content in that language (propertyContentFor).
 */
export const propertyMetaDescription = (p: SeoProperty, content?: PropertyContent, lang: Lang = "en") => {
  const t = COPY[lang];
  const facts = t.facts(p.max_guests, p.bedrooms, num(Math.round(withServiceFee(p.price_per_night, p.service_fee_rate)), lang), p.currency);
  // Source before the numbers, so a cut-off snippet can't keep the numbers and drop the source
  const rating = !p.review_rating || !p.review_count
    ? ""
    : content
      ? t.airbnbRating(num(p.review_rating, lang), p.review_count)
      : t.rating(num(p.review_rating, lang), p.review_count);
  const head = firstSentences(t.intro(content?.nickname ?? p.title, p.location ?? t.sweden, `${facts}${rating}`));
  const room = META_DESCRIPTION_MAX - head.length - 1;
  return p.description?.trim() && room >= MIN_HOST_TEXT ? `${head} ${firstSentences(p.description, room)}` : head;
};

/** schema.org VacationRental, read by Google and by AI assistants */
export const buildPropertyJsonLd = (p: SeoProperty, content?: PropertyContent, lang: Lang = "en") => {
  const t = COPY[lang];
  // One place in every language (@id), at the address of the page's language
  const id = `${SITE_URL}${propertyPath(p)}`;
  const url = `${SITE_URL}${localizedPath(propertyPath(p), lang)}`;
  const images = [p.hero_image_url, ...(p.gallery_images ?? [])].filter(Boolean).slice(0, 10);
  const [locationTown, locationCountry] = (p.location ?? "").split(",").map((s) => s.trim());
  const country = (p.country ?? locationCountry ?? "").trim();
  const locality = p.city?.trim() ? capitalise(p.city.trim()) : locationTown;

  const rental = {
    "@context": "https://schema.org",
    "@type": "VacationRental",
    "@id": id,
    identifier: p.id,
    url,
    name: content ? `${content.nickname} – ${p.title}` : p.title,
    description: content ? content.intro.join(" ") : p.description,
    image: images,
    brand: { "@type": "Brand", name: SITE_NAME },
    address: {
      "@type": "PostalAddress",
      addressLocality: locality || undefined,
      addressCountry: SWEDEN.has(country.toLowerCase()) ? "SE" : country,
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
        name: amenityLabel(name, lang) ?? name,
        value: true,
      })),
    },
    priceRange: t.priceRange(num(Math.round(withServiceFee(p.price_per_night, p.service_fee_rate)), lang), p.currency),
    // Each host sets their own times and pet rules, so only what the listing says
    ...(p.check_in_time ? { checkinTime: p.check_in_time.slice(0, 5) } : {}),
    ...(p.check_out_time ? { checkoutTime: p.check_out_time.slice(0, 5) } : {}),
    // No aggregateRating: the ratings are Airbnb's, and Google's review
    // snippet rules don't allow marking up reviews collected elsewhere
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
