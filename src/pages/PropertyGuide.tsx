import { useState, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import GuestGuideDialog from "@/components/GuestGuideDialog";
import { Property } from "@/hooks/useProperties";
import MainNavigation from "@/components/MainNavigation";
import { usePageMeta } from "@/hooks/usePageMeta";
import { type Copy, type Lang, useCopy } from "@/i18n";
import { translateListing, useListingTranslation } from "@/i18n/listingTexts";
import { listingTexts } from "../../supabase/functions/_shared/listing-text";

const en = {
  metaTitle: (title: string) => `${title} – guest guide`,
  metaTitleFallback: "Guest guide",
  loading: "Loading...",
  notFound: "Property not found",
};
const COPY: Copy<typeof en> = {
  en,
  sv: {
    metaTitle: (title) => `${title} – gästguide`,
    metaTitleFallback: "Gästguide",
    loading: "Laddar…",
    notFound: "Boendet hittades inte",
  },
  de: {
    metaTitle: (title) => `${title} – Gästeinfo`,
    metaTitleFallback: "Gästeinfo",
    loading: "Wird geladen…",
    notFound: "Unterkunft nicht gefunden",
  },
};

const PropertyGuide = () => {
  const t = useCopy(COPY);
  const { id } = useParams();
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [showOriginal, setShowOriginal] = useState(false);

  // The guide in the page's language, where the host's text has been
  // translated; the host's own words a click away
  const translation = useListingTranslation(property?.id);
  const { translated, translatedFrom } = useMemo((): { translated: Property | null; translatedFrom: Lang | "other" | null } => {
    if (!property) return { translated: null, translatedFrom: null };
    const listing = property as unknown as Record<string, unknown>;
    const originals = listingTexts(listing);
    const copy = translateListing(listing, translation, originals);
    const shownTexts = listingTexts(copy);
    const changed = Object.entries(originals).some(([field, text]) => shownTexts[field] !== text);
    return {
      translated: copy as unknown as Property,
      translatedFrom: changed ? translation.translatedFrom ?? "other" : null,
    };
  }, [property, translation]);
  const shown = translatedFrom && !showOriginal ? translated : property;

  // Meant for booked guests, so kept out of search results
  usePageMeta({
    title: shown ? t.metaTitle(shown.title) : t.metaTitleFallback,
    noindex: true,
    ready: !loading,
  });

  useEffect(() => {
    if (id) {
      fetchProperty(id);
    }
  }, [id]);

  const fetchProperty = async (propertyId: string) => {
    try {
      const { data, error } = await supabase
        .from("properties")
        // Public page: request only what the guide renders, never select("*")
        // (keeps any private/host-only columns out of the anonymous response).
        .select("id, title, slug, guidebook_sections, min_nights, holiday_min_nights, pets_allowed, smoking_allowed, events_allowed, min_guest_age")
        .eq(/^[0-9a-f-]{36}$/i.test(propertyId) ? "id" : "slug", propertyId)
        .single();

      if (error) throw error;
      setProperty(data as unknown as Property);
    } catch (error) {
      console.error("Error fetching property:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">{t.loading}</h2>
        </div>
      </div>
    );
  }

  if (!property || !shown) {
    return (
      <div className="min-h-screen bg-background">
        <MainNavigation />
        <div className="container mx-auto px-4 py-12">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2">{t.notFound}</h2>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <MainNavigation />
      <div className="pt-16">
        <GuestGuideDialog
          isOpen={true}
          onClose={() => window.history.back()}
          property={shown}
          translationToggle={
            translatedFrom
              ? { from: translatedFrom, showingOriginal: showOriginal, onToggle: () => setShowOriginal((value) => !value) }
              : undefined
          }
        />
      </div>
    </div>
  );
};

export default PropertyGuide;
