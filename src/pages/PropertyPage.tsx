import { useState, useMemo, useCallback, memo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Property } from "@/hooks/useProperties";
import { useOptimizedQuery } from '@/hooks/useOptimizedQuery';
import PropertyNavigation from "@/components/PropertyNavigation";
import PropertyHero from "@/components/PropertyHero";
import PropertyGalleryOptimized from "@/components/PropertyGalleryOptimized";
import PropertyAmenities from "@/components/PropertyAmenities";
import PropertySpecialHighlights from "@/components/PropertySpecialHighlights";
import PropertyBooking from "@/components/PropertyBooking";
import PropertyFooter from "@/components/PropertyFooter";
import GuestGuideDialog from "@/components/GuestGuideDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

// Memoized components for better performance
const MemoizedPropertyHero = memo(PropertyHero);
const MemoizedPropertyGalleryOptimized = memo(PropertyGalleryOptimized);
const MemoizedPropertyAmenities = memo(PropertyAmenities);
const MemoizedPropertySpecialHighlights = memo(PropertySpecialHighlights);
const MemoizedPropertyBooking = memo(PropertyBooking);
const MemoizedPropertyFooter = memo(PropertyFooter);

const PropertyPage = memo(() => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isGuideDialogOpen, setIsGuideDialogOpen] = useState(false);

  // Optimized property fetching with caching and real-time updates
  const propertyQueryFn = useCallback(async () => {
    let propertyId = id;
    
    // Handle legacy routes with optimized single queries
    if (id === 'villa-hacken') {
      const { data: properties } = await supabase
        .from('properties')
        .select('id')
        .ilike('title', '%villa%')
        .eq('active', true)
        .limit(1)
        .single();
      
      if (properties) {
        propertyId = properties.id;
      }
    } else if (id === 'lakehouse-getaway') {
      const { data: properties } = await supabase
        .from('properties')
        .select('id')
        .or('title.ilike.%lakehouse%,title.ilike.%lake%')
        .eq('active', true)
        .limit(1)
        .single();
      
      if (properties) {
        propertyId = properties.id;
      }
    }

    if (!propertyId) {
      throw new Error('Property not found');
    }

    // Optimized query with only necessary fields for initial load
    const { data, error } = await supabase
      .from('properties')
      .select(`
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
        video_metadata,
        tagline_line1,
        tagline_line2,
        review_rating,
        review_count,
        active
      `)
      .eq('id', propertyId)
      .eq('active', true)
      .single();

    if (error) throw error;

    if (data) {
      const mappedProperty: Property = {
        ...data,
        amenities: Array.isArray(data.amenities) ? data.amenities : [],
        gallery_images: Array.isArray(data.gallery_images) ? data.gallery_images : [],
        video_urls: Array.isArray(data.video_urls) ? data.video_urls : [],
        gallery_metadata: Array.isArray(data.gallery_metadata) ? data.gallery_metadata as any[] : [],
        video_metadata: Array.isArray(data.video_metadata) ? data.video_metadata as any[] : [],
        amenities_data: Array.isArray(data.amenities_data) ? data.amenities_data as any[] : [],
        guidebook_sections: Array.isArray(data.guidebook_sections) ? data.guidebook_sections as any[] : [],
        special_highlights: Array.isArray(data.special_highlights) ? data.special_highlights as any[] : [],
        footer_quick_links: Array.isArray(data.footer_quick_links) ? data.footer_quick_links as string[] : ["Photo Gallery", "Amenities", "Book Now", "Contact"],
        pricing_table: data.pricing_table as any
      };
      return { data: mappedProperty, error: null };
    }

    return { data: null, error: null };
  }, [id]);

  const { data: property, loading, error } = useOptimizedQuery(
    `property-${id}`,
    propertyQueryFn,
    {
      cacheTime: 10 * 60 * 1000, // 10 minutes
      staleTime: 2 * 60 * 1000, // 2 minutes
      enableRealtime: true,
      realtimeFilter: {
        event: '*',
        schema: 'public',
        table: 'properties',
        filter: `id=eq.${id}`
      }
    }
  );

  // Memoized handlers for optimal performance
  const handleGuideOpen = useCallback(() => setIsGuideDialogOpen(true), []);
  const handleGuideClose = useCallback(() => setIsGuideDialogOpen(false), []);
  const handleBackToHome = useCallback(() => navigate('/'), [navigate]);

  // Memoized property content with error boundaries
  const propertyContent = useMemo(() => {
    if (!property) return null;

    return (
      <>
        <MemoizedPropertyHero property={property} />
        <MemoizedPropertyGalleryOptimized property={property} />
        <MemoizedPropertyAmenities property={property} />
        <MemoizedPropertySpecialHighlights 
          property={property}
          onViewGuide={handleGuideOpen}
        />
        <MemoizedPropertyBooking property={property} />
        <MemoizedPropertyFooter property={property} />
        
        <GuestGuideDialog
          isOpen={isGuideDialogOpen}
          onClose={handleGuideClose}
          property={property}
        />
      </>
    );
  }, [property, isGuideDialogOpen, handleGuideOpen, handleGuideClose]);

  // Loading state with optimized skeleton
  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <PropertyNavigation />
        <div className="relative h-96 md:h-[500px]">
          <Skeleton className="w-full h-full" />
        </div>
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <Skeleton className="h-32" />
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <Skeleton key={i} className="h-24" />
                ))}
              </div>
            </div>
            <div className="space-y-6">
              <Skeleton className="h-64" />
              <Skeleton className="h-32" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state with better UX
  if (error) {
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

  return (
    <div className="min-h-screen bg-background">
      <PropertyNavigation />
      {propertyContent}
    </div>
  );
});

PropertyPage.displayName = 'PropertyPage';

export default PropertyPage;
