import { useState, useEffect, useMemo, useCallback, memo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Property } from "@/hooks/useProperties";
import { useOptimizedQuery } from '@/hooks/useOptimizedQuery';
import PropertyNavigation from "@/components/PropertyNavigation";
import PropertyHero from "@/components/PropertyHero";
import PropertyGallery from "@/components/PropertyGallery";
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
const MemoizedPropertyGallery = memo(PropertyGallery);
const MemoizedPropertyAmenities = memo(PropertyAmenities);
const MemoizedPropertySpecialHighlights = memo(PropertySpecialHighlights);
const MemoizedPropertyBooking = memo(PropertyBooking);
const MemoizedPropertyFooter = memo(PropertyFooter);

const PropertyPage = memo(() => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isGuideDialogOpen, setIsGuideDialogOpen] = useState(false);

  useEffect(() => {
    const fetchProperty = async () => {
      try {
        let propertyData = null;

        // Handle legacy routes
        if (window.location.pathname === '/villa-hacken') {
          const { data, error } = await supabase
            .from('properties')
            .select('*')
            .ilike('title', '%Villa Häcken%')
            .eq('active', true)
            .limit(1)
            .single();
          
          if (error && error.code !== 'PGRST116') throw error;
          propertyData = data;
        } else if (window.location.pathname === '/lakehouse-getaway') {
          const { data, error } = await supabase
            .from('properties')
            .select('*')
            .ilike('title', '%Lakehouse%')
            .eq('active', true)
            .limit(1)
            .single();
          
          if (error && error.code !== 'PGRST116') throw error;
          propertyData = data;
        } else if (id) {
          const { data, error } = await supabase
            .from('properties')
            .select('*')
            .eq('id', id)
            .eq('active', true)
            .single();

          if (error && error.code !== 'PGRST116') throw error;
          propertyData = data;
        }

        if (!propertyData) {
          setError("Property not found");
          return;
        }

        // Map the data to ensure proper structure
        const mappedProperty: Property = {
          ...propertyData,
          gallery_metadata: Array.isArray(propertyData.gallery_metadata) ? propertyData.gallery_metadata : [],
          guidebook_sections: Array.isArray(propertyData.guidebook_sections) ? propertyData.guidebook_sections : [],
          video_metadata: Array.isArray(propertyData.video_metadata) ? propertyData.video_metadata : [],
          amenities: Array.isArray(propertyData.amenities) ? propertyData.amenities : [],
          gallery_images: Array.isArray(propertyData.gallery_images) ? propertyData.gallery_images : [],
          video_urls: Array.isArray(propertyData.video_urls) ? propertyData.video_urls : [],
          amenities_data: Array.isArray(propertyData.amenities_data) ? propertyData.amenities_data : []
        };

        setProperty(mappedProperty);
      } catch (err) {
        console.error('Error fetching property:', err);
        setError('Failed to load property');
      } finally {
        setLoading(false);
      }
    };

    fetchProperty();

    // Set up real-time subscription for property updates
    const channel = supabase
      .channel('property-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'properties',
          filter: `id=eq.${id}`
        },
        (payload) => {
          console.log('Property updated:', payload);
          fetchProperty(); // Refetch property data
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, window.location.pathname]);

  if (loading) {
    return (
      <div className="min-h-screen">
        <PropertyNavigation />
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-96 w-full mb-8" />
          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-32 w-full" />
            </div>
            <div>
              <Skeleton className="h-64 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className="min-h-screen">
        <PropertyNavigation />
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">Property Not Found</h1>
          <p className="text-muted-foreground mb-8">{error || "The property you're looking for doesn't exist."}</p>
          <Button onClick={() => navigate('/')}>
            Return to Homepage
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <PropertyNavigation />
      
      {/* 1. Hero Section */}
      <PropertyHero property={property} />

      {/* 2. Gallery Section */}
      <PropertyGallery property={property} />

      {/* 3. Premium Amenities Section */}
      <PropertyAmenities property={property} />

      {/* 4. What Makes Special Section */}
      <PropertySpecialHighlights 
        property={property}
        onViewGuide={() => setGuideDialogOpen(true)}
      />

      {/* 5. Guest Guide Dialog */}
      <GuestGuideDialog
        isOpen={guideDialogOpen}
        onClose={() => setGuideDialogOpen(false)}
        property={property}
      />

      {/* 6. Book Your Stay Section */}
      <PropertyBooking property={property} />

      {/* 7. Property Footer */}
      <PropertyFooter property={property} />
    </div>
  );
};

export default PropertyPage;