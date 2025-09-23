import { useState, useMemo, useCallback, memo, Suspense, lazy } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Property } from "@/hooks/useProperties";
import { useOptimizedQuery } from "@/hooks/useOptimizedQuery";
import PropertyNavigation from "@/components/PropertyNavigation";
import PropertyHero from "@/components/PropertyHero";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import GuestGuideDialog from "@/components/GuestGuideDialog";

// Lazy-loaded heavy components
const PropertyGallery = lazy(() => import("@/components/PropertyGallery"));
const PropertyAmenities = lazy(() => import("@/components/PropertyAmenities"));
const PropertySpecialHighlights = lazy(() => import("@/components/PropertySpecialHighlights"));
const PropertyBooking = lazy(() => import("@/components/PropertyBooking"));
const PropertyFooter = lazy(() => import("@/components/PropertyFooter"));

const PropertyPage = memo(() => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isGuideDialogOpen, setIsGuideDialogOpen] = useState(false);

  /** Light query for fast first load */
  const propertyLightQueryFn = useCallback(async () => {
    const { data, error } = await supabase
      .from("properties")
      .select(`
        id,
        title,
        location,
        price_per_night,
        currency,
        max_guests,
        hero_image_url,
        tagline_line1,
        tagline_line2,
        review_rating,
        review_count,
        active
      `)
      .eq("id", id)
      .eq("active", true)
      .single();

    if (error) throw error;
    return { data, error: null };
  }, [id]);

  const { data: lightProperty, loading, error } = useOptimizedQuery(
    `property-light-${id}`,
    propertyLightQueryFn,
    {
      cacheTime: 10 * 60 * 1000,
      staleTime: 2 * 60 * 1000,
      enableRealtime: false,
    }
  );

  /** Heavy query (gallery, amenities, etc.) */
  const propertyHeavyQueryFn = useCallback(async () => {
    const { data, error } = await supabase
      .from("properties")
      .select(`
        id,
        gallery_images,
        video_urls,
        amenities,
        amenities_data,
        guidebook_sections,
        special_highlights,
        pricing_table,
        get_in_touch_info,
        footer_quick_links,
        gallery_metadata,
        video_metadata
      `)
      .eq("id", id)
      .eq("active", true)
      .single();

    if (error) throw error;
    return { data, error: null };
  }, [id]);

  const { data: heavyProperty } = useOptimizedQuery(
    `property-heavy-${id}`,
    propertyHeavyQueryFn,
    {
      cacheTime: 10 * 60 * 1000,
      staleTime: 5 * 60 * 1000,
      enableRealtime: false,
    }
  );

  const handleGuideOpen = useCallback(() => setIsGuideDialogOpen(true), []);
  const handleGuideClose = useCallback(() => setIsGuideDialogOpen(false), []);
  const handleBackToHome = useCallback(() => navigate("/"), [navigate]);

  /** Merge light + heavy query results */
  const property = useMemo(() => {
    if (!lightProperty) return null;

    return {
      ...lightProperty,
      ...heavyProperty,
      amenities: Array.isArray(heavyProperty?.amenities) ? heavyProperty?.amenities : [],
      gallery_images: Array.isArray(heavyProperty?.gallery_images) ? heavyProperty?.gallery_images : [],
      video_urls: Array.isArray(heavyProperty?.video_urls) ? heavyProperty?.video_urls : [],
      gallery_metadata: Array.isArray(heavyProperty?.gallery_metadata) ? heavyProperty?.gallery_metadata : [],
      video_metadata: Array.isArray(heavyProperty?.video_metadata) ? heavyProperty?.video_metadata : [],
      amenities_data: Array.isArray(heavyProperty?.amenities_data) ? heavyProperty?.amenities_data : [],
      guidebook_sections: Array.isArray(heavyProperty?.guidebook_sections) ? heavyProperty?.guidebook_sections : [],
      special_highlights: Array.isArray(heavyProperty?.special_highlights) ? heavyProperty?.special_highlights : [],
      footer_quick_links: Array.isArray(heavyProperty?.footer_quick_links)
        ? heavyProperty?.footer_quick_links
        : ["Photo Gallery", "Amenities", "Book Now", "Contact"],
      pricing_table: heavyProperty?.pricing_table ?? null,
    } as Property;
  }, [lightProperty, heavyProperty]);

  // Loading state
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

  // Error state
  if (error || !property) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center p-8">
          <h1 className="text-2xl font-bold text-foreground mb-4">
            Property Not Found
          </h1>
          <p className="text-muted-foreground mb-6">
            The property you're looking for doesn't exist or is no longer
            available.
          </p>
          <Button onClick={handleBackToHome} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Homepage
          </Button>
        </div>
      </div>
    );
  }

  // Render content
  return (
    <div className="min-h-screen bg-background">
      <PropertyNavigation />
      <PropertyHero property={property} />

      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <PropertyGallery property={property} />
      </Suspense>

      <Suspense fallback={<Skeleton className="h-32 w-full" />}>
        <PropertyAmenities property={property} />
      </Suspense>

      <Suspense fallback={<Skeleton className="h-24 w-full" />}>
        <PropertySpecialHighlights property={property} onViewGuide={handleGuideOpen} />
      </Suspense>

      <Suspense fallback={<Skeleton className="h-40 w-full" />}>
        <PropertyBooking property={property} />
      </Suspense>

      <Suspense fallback={<Skeleton className="h-20 w-full" />}>
        <PropertyFooter property={property} />
      </Suspense>

      <GuestGuideDialog
        isOpen={isGuideDialogOpen}
        onClose={handleGuideClose}
        property={property}
      />
    </div>
  );
});

PropertyPage.displayName = "PropertyPage";

export default PropertyPage;
