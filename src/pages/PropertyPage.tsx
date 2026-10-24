import { useState, useMemo, useCallback, memo, Suspense, lazy, type ReactNode } from "react";
import { useParams } from "react-router-dom";
import { useNavigate } from "@/i18n/router";
import { supabase } from "@/integrations/supabase/client";
import { Property } from "@/hooks/useProperties";
import { useOptimizedQuery } from "@/hooks/useOptimizedQuery";
import PropertyNavigation from "@/components/PropertyNavigation";
import PropertyHero from "@/components/PropertyHero";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import GuestGuideDialog from "@/components/GuestGuideDialog";
import { usePageMeta } from "@/hooks/usePageMeta";
import PropertyAbout from "@/components/PropertyAbout";
import { propertyContentFor } from "@/content/propertyContent";
import { amenityLabel } from "@/content/amenities";
import { buildPropertyJsonLd, propertyMetaDescription, propertyPageTitle, propertyPath } from "@/lib/propertySeo";
import { type Copy, type Lang, useCopy, useLang } from "@/i18n";
import {
  type ListingTranslation,
  SHOW_ORIGINAL,
  translatedFromText,
  translateListing,
  useListingTranslation,
} from "@/i18n/listingTexts";
import { type ListingTexts, listingTexts, textHash } from "../../supabase/functions/_shared/listing-text";

const en = {
  aboutPlace: "About this place",
  notFound: "Property Not Found",
  notFoundText: "The property you're looking for doesn't exist or is no longer available.",
  backHome: "Back to Homepage",
};
const COPY: Copy<typeof en> = {
  en,
  sv: {
    aboutPlace: "Om boendet",
    notFound: "Boendet hittades inte",
    notFoundText: "Boendet du letar efter finns inte eller är inte längre tillgängligt.",
    backHome: "Tillbaka till startsidan",
  },
  de: {
    aboutPlace: "Über diese Unterkunft",
    notFound: "Unterkunft nicht gefunden",
    notFoundText: "Die Unterkunft, die du suchst, gibt es nicht oder sie ist nicht mehr verfügbar.",
    backHome: "Zurück zur Startseite",
  },
};

/**
 * The host's fields a guest reads translated on this page: translations of the
 * text as it is now, leaving out what the page doesn't show (special_highlights;
 * the host's description on the owners' cabins, which have copy of their own;
 * amenities shown with our own label)
 */
const shownTranslatedFields = (translation: ListingTranslation, originals: ListingTexts, lang: Lang, hasContent: boolean) =>
  Object.keys(translation.texts).filter((field) => {
    const original = originals[field];
    if (original === undefined || translation.hashes[field] !== textHash(original)) return false;
    if (field.startsWith("special_highlights.")) return false;
    if (hasContent && (field === "description" || field === "introduction_text")) return false;
    if (field.startsWith("amenity:") && amenityLabel(original, lang)) return false;
    return true;
  });

/** "Translated from Swedish · Show original", Airbnb style: switches the whole page */
const TranslationNote = ({ from, showingOriginal, onToggle }: { from: Lang | "other"; showingOriginal: boolean; onToggle: () => void }) => {
  const lang = useLang();
  return (
    <p className="text-sm text-muted-foreground mb-6">
      {!showingOriginal && <>{translatedFromText(lang, from)} · </>}
      <button type="button" onClick={onToggle} className="font-medium text-foreground underline hover:no-underline">
        {showingOriginal ? SHOW_ORIGINAL[lang].translation : SHOW_ORIGINAL[lang].original}
      </button>
    </p>
  );
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Lazy-loaded heavy components
const PropertyGallery = lazy(() => import("@/components/PropertyGallery"));
const PropertyAmenities = lazy(() => import("@/components/PropertyAmenities"));
const PropertySpecialHighlights = lazy(() => import("@/components/PropertySpecialHighlights"));
const PropertyBooking = lazy(() => import("@/components/PropertyBooking"));
const PropertyFooter = lazy(() => import("@/components/PropertyFooter"));
const PropertyLocation = lazy(() => import("@/components/PropertyLocation"));
const PropertyGuestbook = lazy(() => import("@/components/PropertyGuestbook"));
const NearbyProperties = lazy(() => import("@/components/NearbyProperties"));

// Wrapper component to fetch nearby properties
const NearbyPropertiesWrapper = memo(({ currentPropertyId, currentCoordinates }: { 
  currentPropertyId: string; 
  currentCoordinates: { latitude: number; longitude: number };
}) => {
  const fetchNearbyPropertiesFn = useCallback(async () => {
    const { data, error } = await supabase
      .from("properties")
      .select("id, title, hero_image_url, latitude, longitude, location")
      .eq("active", true)
      .not("latitude", "is", null)
      .not("longitude", "is", null);
    
    if (error) throw error;
    return { data: data || [], error: null };
  }, []);

  const { data: allProperties = [] } = useOptimizedQuery(
    "all-properties-nearby",
    fetchNearbyPropertiesFn,
    {
      cacheTime: 15 * 60 * 1000,
      staleTime: 5 * 60 * 1000,
      enableRealtime: false,
    }
  );

  return (
    <NearbyProperties
      currentPropertyId={currentPropertyId}
      currentCoordinates={currentCoordinates}
      allProperties={allProperties}
    />
  );
});

NearbyPropertiesWrapper.displayName = "NearbyPropertiesWrapper";

/**
 * "About this place" for listings without hand-written PROPERTY_CONTENT, which
 * is every host's listing: the host's introduction and description as they
 * typed them, line breaks kept. Always rendered, so the prerendered page gives
 * search engines the text too. The columns have no defaults: when the host has
 * written neither, the section is left out.
 */
const ListingAbout = ({
  introduction,
  description,
  translationNote,
}: {
  introduction?: string | null;
  description?: string | null;
  translationNote?: ReactNode;
}) => {
  const t = useCopy(COPY);
  const text = description?.trim();
  // Hosts sometimes paste the same text in both boxes
  const intro = introduction?.trim() !== text ? introduction?.trim() : undefined;
  if (!intro && !text) {
    // Nothing to read here, but other parts of the page are translated
    return translationNote ? (
      <div className="container mx-auto px-4 pt-8">
        <div className="max-w-4xl mx-auto">{translationNote}</div>
      </div>
    ) : null;
  }
  return (
    <section className="py-16" aria-labelledby="about-heading">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <h2 id="about-heading" className="text-3xl md:text-4xl font-bold mb-6">
            {t.aboutPlace}
          </h2>
          {translationNote}
          {intro && <p className="text-xl leading-relaxed mb-6 whitespace-pre-line break-words">{intro}</p>}
          {text && (
            <div className="text-lg text-muted-foreground leading-relaxed whitespace-pre-line break-words">{text}</div>
          )}
        </div>
      </div>
    </section>
  );
};

const PropertyPage = memo(() => {
  const t = useCopy(COPY);
  const lang = useLang();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [showOriginal, setShowOriginal] = useState(false);
  const [isGuideDialogOpen, setIsGuideDialogOpen] = useState(false);
  const [guideSectionId, setGuideSectionId] = useState<string | undefined>();

  /** Resolve a slug (e.g. "lakehouse-getaway") or uuid → property id */
  const resolvePropertyId = useCallback(async (incomingId: string) => {
    if (UUID_REGEX.test(incomingId)) return incomingId;

    const { data } = await supabase
      .from("properties")
      .select("id")
      .eq("slug", incomingId)
      .eq("active", true)
      .maybeSingle();

    return data?.id ?? incomingId;
  }, []);

  /** Light query */
  const propertyLightQueryFn = useCallback(async () => {
    const propertyId = await resolvePropertyId(id!);

    const { data, error } = await supabase
      .from("properties")
      .select(`
        id,
        host_id,
        title,
        description,
        introduction_text,
        location,
        price_per_night,
        currency,
        bedrooms,
        bathrooms,
        max_guests,
        amenities,
        hero_image_url,
        tagline_line1,
        availability_text,
        tagline_line2,
        contact_response_time,
        review_rating,
        review_count,
        active,
        latitude,
        longitude,
        city,
        country,
        check_in_time,
        check_out_time,
        slug
      `)
      .eq("id", propertyId)
      .eq("active", true)
      .single();

    if (error) throw error;
    // Guest fee for the "from" price in the page description and JSON-LD
    const { data: fee } = await supabase.rpc("property_service_fee_rate", { _property_id: data.id });
    return { data: { ...data, service_fee_rate: fee == null ? null : Number(fee) }, error: null };
  }, [id, resolvePropertyId]);

  const { data: lightProperty, loading, error } = useOptimizedQuery(
    `property-light-${id}`,
    propertyLightQueryFn,
    {
      cacheTime: 10 * 60 * 1000,
      staleTime: 2 * 60 * 1000,
      enableRealtime: false,
    }
  );

  /** Heavy query */
  const propertyHeavyQueryFn = useCallback(async () => {
    const propertyId = await resolvePropertyId(id!);

    const { data, error } = await supabase
      .from("properties")
      .select(`
        id,
        gallery_images,
        video_urls,
        amenities_data,
        guidebook_sections,
        min_nights,
        holiday_min_nights,
        pets_allowed,
        smoking_allowed,
        events_allowed,
        min_guest_age,
        special_highlights,
        featured_amenities,
        pricing_table,
        get_in_touch_info,
        footer_quick_links,
        gallery_metadata,
        video_metadata
      `)
      .eq("id", propertyId)
      .eq("active", true)
      .single();

    if (error) throw error;
    return { data, error: null };
  }, [id, resolvePropertyId]);

  const { data: heavyProperty } = useOptimizedQuery(
    `property-heavy-${id}`,
    propertyHeavyQueryFn,
    {
      cacheTime: 10 * 60 * 1000,
      staleTime: 5 * 60 * 1000,
      enableRealtime: false,
    }
  );

  const handleGuideOpen = useCallback((sectionId?: string) => {
    setGuideSectionId(sectionId);
    setIsGuideDialogOpen(true);
  }, []);
  const handleGuideClose = useCallback(() => {
    setIsGuideDialogOpen(false);
    setGuideSectionId(undefined);
  }, []);
  const handleBackToHome = useCallback(() => navigate("/"), [navigate]);

  /** Merge queries */
  const property = useMemo(() => {
    if (!lightProperty) return null;

    return {
      ...lightProperty,
      ...heavyProperty,
      amenities: Array.isArray(lightProperty?.amenities) ? lightProperty.amenities : [],
      gallery_images: Array.isArray(heavyProperty?.gallery_images) ? heavyProperty.gallery_images : [],
      video_urls: Array.isArray(heavyProperty?.video_urls) ? heavyProperty.video_urls : [],
      gallery_metadata: Array.isArray(heavyProperty?.gallery_metadata) ? heavyProperty.gallery_metadata : [],
      video_metadata: Array.isArray(heavyProperty?.video_metadata) ? heavyProperty.video_metadata : [],
      amenities_data: Array.isArray(heavyProperty?.amenities_data) ? heavyProperty.amenities_data : [],
      guidebook_sections: Array.isArray(heavyProperty?.guidebook_sections) ? heavyProperty.guidebook_sections : [],
      special_highlights: Array.isArray(heavyProperty?.special_highlights) ? heavyProperty.special_highlights : [],
      featured_amenities: Array.isArray(heavyProperty?.featured_amenities) ? heavyProperty.featured_amenities : [],
      footer_quick_links: Array.isArray(heavyProperty?.footer_quick_links)
        ? heavyProperty.footer_quick_links
        : ["Photo Gallery", "Amenities", "Book Now", "Contact"],
      pricing_table: heavyProperty?.pricing_table ?? null,
      latitude: lightProperty.latitude ?? null,
      longitude: lightProperty.longitude ?? null,
      city: lightProperty.city ?? null,
      // For the structured data (addressCountry, checkinTime, checkoutTime)
      country: lightProperty.country ?? null,
      check_in_time: lightProperty.check_in_time ?? null,
      check_out_time: lightProperty.check_out_time ?? null,
    } as Property & { check_in_time: string | null; check_out_time: string | null };
  }, [lightProperty, heavyProperty]);

  const content = propertyContentFor(property?.slug, lang);

  // What the host wrote, in the page's language where it has been translated.
  // `property` stays the host's own words: names are matched to icons and
  // URLs built from it
  const translation = useListingTranslation(property?.id);
  const originals = useMemo(() => (property ? listingTexts({ ...property }) : {}), [property]);
  const translated = useMemo(
    () => (property ? translateListing({ ...property }, translation, originals) : null),
    [property, translation, originals],
  );
  const shownFields = useMemo(
    () => shownTranslatedFields(translation, originals, lang, !!content),
    [translation, originals, lang, content],
  );
  const translatedFrom = shownFields.length > 0 ? translation.translatedFrom : null;
  const toggleOriginal = useCallback(() => setShowOriginal((value) => !value), []);
  // What guests read: the translation, or the host's own words after "Show original"
  const shown = showOriginal || !translated ? property : translated;
  const shownTranslation = showOriginal ? undefined : translation;
  const translationNote = translatedFrom ? (
    <TranslationNote from={translatedFrom} showingOriginal={showOriginal} onToggle={toggleOriginal} />
  ) : undefined;
  // The guide dialog covers the page, so it has the same switch inside
  const guideTranslationToggle =
    translatedFrom && shownFields.some((field) => field.startsWith("guidebook_sections."))
      ? { from: translatedFrom, showingOriginal: showOriginal, onToggle: toggleOriginal }
      : undefined;

  // Search engines get the page's language whatever the switch says
  usePageMeta({
    ready: !!property,
    title: translated ? propertyPageTitle(translated, content, lang) : "",
    description: translated ? propertyMetaDescription(translated, content, lang) : "",
    path: property ? propertyPath(property) : undefined,
    image: property?.hero_image_url,
    jsonLd: translated ? buildPropertyJsonLd(translated, content, lang) : undefined,
  });

  // Loading
  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <PropertyNavigation />
        <div className="relative h-96 md:h-[500px]">
          <Skeleton className="w-full h-full" />
        </div>
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-10 w-1/3 mb-6" />
          <Skeleton className="h-32 w-full mb-6" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  // Error
  if (error || !property) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center p-8">
          <h1 className="text-2xl font-bold text-foreground mb-4">{t.notFound}</h1>
          <p className="text-muted-foreground mb-6">
            {t.notFoundText}
          </p>
          <Button onClick={handleBackToHome} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            {t.backHome}
          </Button>
        </div>
      </div>
    );
  }

  // Render
  return (
    <div className="min-h-screen bg-background">
      <PropertyNavigation />
      <PropertyHero property={shown} />

      {content ? (
        <PropertyAbout
          content={content}
          rating={property.review_rating}
          reviewCount={property.review_count}
          city={property.city}
          translationNote={translationNote}
        />
      ) : (
        <ListingAbout
          introduction={shown.introduction_text}
          description={shown.description}
          translationNote={translationNote}
        />
      )}

      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <PropertyGallery property={shown} />
      </Suspense>

      <Suspense fallback={<Skeleton className="h-32 w-full" />}>
        <PropertyAmenities property={shown} original={property} translation={shownTranslation} />
      </Suspense>

      <Suspense fallback={<Skeleton className="h-24 w-full" />}>
        {/* Skickar in onViewGuide så knappen i highlights fungerar */}
        <PropertySpecialHighlights property={shown} onViewGuide={handleGuideOpen} />
      </Suspense>

      {/* Guestbook Section */}
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        {/* Renders nothing until there are entries */}
        <PropertyGuestbook propertyId={property.id} />
      </Suspense>

      <Suspense fallback={<Skeleton className="h-40 w-full" />}>
        <PropertyBooking property={shown} onOpenGuidebook={handleGuideOpen} />
      </Suspense>

      <Suspense fallback={<Skeleton className="h-[400px] w-full" />}>
        <PropertyLocation
          gettingHere={content?.gettingHere}
          latitude={property.latitude}
          longitude={property.longitude}
          propertyTitle={shown.title}
          location={property.location}
          city={property.city}
        />
      </Suspense>

      {property.latitude && property.longitude && (
        <Suspense fallback={<Skeleton className="h-64 w-full" />}>
          <NearbyPropertiesWrapper
            currentPropertyId={property.id}
            currentCoordinates={{
              latitude: property.latitude,
              longitude: property.longitude
            }}
          />
        </Suspense>
      )}

      <Suspense fallback={<Skeleton className="h-20 w-full" />}>
        <PropertyFooter property={shown} />
      </Suspense>

      <GuestGuideDialog
        isOpen={isGuideDialogOpen}
        onClose={handleGuideClose}
        property={shown}
        initialSectionId={guideSectionId}
        translationToggle={guideTranslationToggle}
      />
    </div>
  );
});

PropertyPage.displayName = "PropertyPage";

export default PropertyPage;
