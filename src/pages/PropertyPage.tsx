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
const PropertyLocation = lazy(() => import("@/components/PropertyLocation"));
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

const PropertyPage = memo(() => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isGuideDialogOpen, setIsGuideDialogOpen] = useState(false);

  /** Resolve legacy routes → actual property id */
  const resolvePropertyId = useCallback(async (incomingId: string) => {
    let propertyId = incomingId;

    if (incomingId === "villa-hacken") {
      const { data } = await supabase
        .from("properties")
        .select("id")
        .ilike("title", "%villa%")
        .eq("active", true)
        .limit(1)
        .single();
      if (data) propertyId = data.id;
    } else if (incomingId === "lakehouse-getaway") {
      const { data } = await supabase
        .from("properties")
        .select("id")
        .or("title.ilike.%lakehouse%,title.ilike.%lake%")
        .eq("active", true)
        .limit(1)
        .single();
      if (data) propertyId = data.id;
    }

    return propertyId;
  }, []);

  /** Light query */
  const propertyLightQueryFn = useCallback(async () => {
    let propertyId = await resolvePropertyId(id!);

    const { data, error } = await supabase
      .from("properties")
      .select(`
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
      `)
      .eq("id", propertyId)
      .eq("active", true)
      .single();

    if (error) throw error;
    return { data, error: null };
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
    let propertyId = await resolvePropertyId(id!);

    const { data, error } = await supabase
      .from("properties")
      .select(`
        id,
        gallery_images,
        video_urls,
        amenities_data,
        guidebook_sections,
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

  const handleGuideOpen = useCallback(() => setIsGuideDialogOpen(true), []);
  const handleGuideClose = useCallback(() => setIsGuideDialogOpen(false), []);
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
    } as Property;
  }, [lightProperty, heavyProperty]);

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
          <h1 className="text-2xl font-bold text-foreground mb-4">Property Not Found</h1>
          <p className="text-muted-foreground mb-6">
            The property you're looking for doesn't exist or is no longer available.
          </p>
          <Button onClick={handleBackToHome} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Homepage
          </Button>
        </div>
      </div>
    );
  }

  // Render
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
        {/* Skickar in onViewGuide så knappen i highlights fungerar */}
        <PropertySpecialHighlights property={property} onViewGuide={handleGuideOpen} />
      </Suspense>

      <Suspense fallback={<Skeleton className="h-40 w-full" />}>
        <PropertyBooking property={property} />
      </Suspense>

      <Suspense fallback={<Skeleton className="h-[400px] w-full" />}>
        <PropertyLocation
          latitude={property.latitude}
          longitude={property.longitude}
          propertyTitle={property.title}
          location={property.location}
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
