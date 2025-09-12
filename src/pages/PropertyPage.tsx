import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Property } from "@/hooks/useProperties";
import PropertyNavigation from "@/components/PropertyNavigation";
import PropertyReviewSection from "@/components/PropertyReviewSection";
import PropertyHeader from "@/components/PropertyHeader";
import PropertyIntroduction from "@/components/PropertyIntroduction";
import PropertySpecialHighlights from "@/components/PropertySpecialHighlights";
import PropertyPricingTable from "@/components/PropertyPricingTable";
import PropertyContact from "@/components/PropertyContact";
import PropertyFooter from "@/components/PropertyFooter";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Wifi, Car, Coffee, Utensils, Waves, TreePine, Mountain, Home, Bed, Bath, Users, BookOpen, Calendar } from "lucide-react";
import ContactForm from "@/components/ContactForm";
import BookingForm from "@/components/BookingForm";
import { MediaDialog } from "@/components/MediaDialog";

interface GuidebookSection {
  title: string;
  content: string;
  image_url?: string;
}

interface MediaItem {
  type: 'image' | 'video';
  url: string;
  title?: string;
  description?: string;
  alt?: string;
}

const PropertyPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [guideDialogOpen, setGuideDialogOpen] = useState(false);
  const bookingSectionRef = useRef<HTMLDivElement>(null);

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
          video_urls: Array.isArray(propertyData.video_urls) ? propertyData.video_urls : []
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
  }, [id, window.location.pathname]);

  const getAmenityIcon = (amenity: string) => {
    const amenityLower = amenity.toLowerCase();
    if (amenityLower.includes('wifi') || amenityLower.includes('internet')) return <Wifi className="w-4 h-4" />;
    if (amenityLower.includes('parking') || amenityLower.includes('garage')) return <Car className="w-4 h-4" />;
    if (amenityLower.includes('coffee') || amenityLower.includes('kitchen')) return <Coffee className="w-4 h-4" />;
    if (amenityLower.includes('dining') || amenityLower.includes('restaurant')) return <Utensils className="w-4 h-4" />;
    if (amenityLower.includes('sauna') || amenityLower.includes('spa')) return <Waves className="w-4 h-4" />;
    if (amenityLower.includes('forest') || amenityLower.includes('nature')) return <TreePine className="w-4 h-4" />;
    if (amenityLower.includes('view') || amenityLower.includes('mountain')) return <Mountain className="w-4 h-4" />;
    return <Home className="w-4 h-4" />;
  };

  const openGallery = (index: number = 0) => {
    setSelectedImageIndex(index);
    setGalleryOpen(true);
  };

  const scrollToBooking = () => {
    bookingSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const mediaItems: MediaItem[] = [
    ...(property?.gallery_images || []).map((url, index) => ({
      type: 'image' as const,
      url,
      title: property?.gallery_metadata?.[index]?.title || `${property?.title} - Image ${index + 1}`,
      description: property?.gallery_metadata?.[index]?.description,
      alt: property?.gallery_metadata?.[index]?.alt || `${property?.title} photo ${index + 1}`
    })),
    ...(property?.video_urls || []).map((url, index) => ({
      type: 'video' as const,
      url,
      title: property?.video_metadata?.[index]?.title || `${property?.title} - Video ${index + 1}`,
      description: property?.video_metadata?.[index]?.description,
      alt: `${property?.title} video ${index + 1}`
    }))
  ];

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
      
      {/* Review Section */}
      <div className="container mx-auto px-4 pt-8">
        <PropertyReviewSection 
          rating={property.review_rating || 5.0}
          reviewCount={property.review_count || 0}
        />
      </div>

      {/* Header Section */}
      <PropertyHeader
        title={property.title}
        taglineLine1={property.tagline_line1 || 'Experience luxury in the heart of Swedish nature.'}
        taglineLine2={property.tagline_line2 || 'Your perfect escape awaits.'}
        location={property.location || ''}
        maxGuests={property.max_guests}
        availability={property.availability_text || 'Available year-round'}
        onBookStay={scrollToBooking}
        onViewGallery={() => openGallery(0)}
      />

      {/* Hero Image */}
      <section className="relative h-96 lg:h-[500px] overflow-hidden cursor-pointer" onClick={() => openGallery(0)}>
        <div className="absolute inset-0">
          <img 
            src={property.hero_image_url || property.gallery_images?.[0] || ''} 
            alt={property.title}
            className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
          />
        </div>
      </section>

      {/* Introduction */}
      <PropertyIntroduction
        title={property.title}
        introductionText={property.introduction_text || 'Every corner has been thoughtfully designed to provide the ultimate combination of luxury, comfort, and connection with nature.'}
      />

      {/* Gallery */}
      {property.gallery_images && property.gallery_images.length > 0 && (
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              <h2 className="text-4xl font-bold text-center mb-12">Photo Gallery</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {property.gallery_images.slice(0, 8).map((image, index) => (
                  <div 
                    key={index} 
                    className="aspect-square overflow-hidden rounded-lg cursor-pointer group"
                    onClick={() => openGallery(index)}
                  >
                    <img 
                      src={image} 
                      alt={property.gallery_metadata?.[index]?.title || `${property.title} photo ${index + 1}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                ))}
              </div>
              {property.gallery_images.length > 8 && (
                <div className="text-center mt-8">
                  <Button 
                    variant="outline" 
                    size="lg"
                    onClick={() => openGallery(0)}
                  >
                    View all {property.gallery_images.length} photos
                  </Button>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Premium Amenities */}
      {property.amenities && property.amenities.length > 0 && (
        <section className="py-16 bg-background">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-4xl font-bold text-center mb-6">Premium Amenities</h2>
              <p className="text-xl text-muted-foreground text-center mb-12">
                Everything you need for an unforgettable stay, from modern conveniences to unique experiences that celebrate Nordic culture.
              </p>
              
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {property.amenities.map((amenity, index) => (
                  <div key={index} className="flex items-start gap-4 p-6 rounded-lg border bg-card">
                    <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center">
                      {getAmenityIcon(amenity)}
                    </div>
                    <div>
                      <h3 className="font-semibold mb-2">{amenity}</h3>
                      {property.amenities_descriptions?.[amenity] && (
                        <p className="text-sm text-muted-foreground">
                          {property.amenities_descriptions[amenity]}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Special Highlights */}
      {property.special_highlights && property.special_highlights.length > 0 && (
        <PropertySpecialHighlights
          propertyTitle={property.title}
          highlights={property.special_highlights}
        />
      )}

      {/* Guest Guide */}
      {property.guidebook_sections && property.guidebook_sections.length > 0 && (
        <section className="py-16 bg-background">
          <div className="container mx-auto px-4">
            <div className="text-center">
              <h2 className="text-4xl font-bold mb-8">Guest Guide</h2>
              <Dialog open={guideDialogOpen} onOpenChange={setGuideDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="lg" className="text-lg px-8">
                    <BookOpen className="w-5 h-5 mr-2" />
                    View Complete Guest Guide
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="text-2xl">Guest Guide - {property.title}</DialogTitle>
                    <DialogDescription>
                      Everything you need to know for your stay
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-6 mt-6">
                    {(property.guidebook_sections as GuidebookSection[]).map((section, index) => (
                      <div key={index} className="border-b pb-6 last:border-b-0">
                        <h3 className="text-xl font-semibold mb-4">{section.title}</h3>
                        {section.image_url && (
                          <img 
                            src={section.image_url} 
                            alt={section.title}
                            className="w-full h-48 object-cover rounded-lg mb-4"
                          />
                        )}
                        <p className="text-muted-foreground leading-relaxed">{section.content}</p>
                      </div>
                    ))}
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </section>
      )}

      {/* Booking Form */}
      <section ref={bookingSectionRef} className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-4xl font-bold text-center mb-6">Book Your Stay</h2>
            <p className="text-xl text-muted-foreground text-center mb-12">
              Ready to experience the magic of {property.title}? Send an inquiry to check availability and pricing.
            </p>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="text-2xl font-bold">
                    {((property.price_per_night || 0) / 100).toLocaleString()} {property.currency}
                  </span>
                  <span className="text-sm text-muted-foreground">per night</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <BookingForm 
                  propertyId={property.id}
                  propertyTitle={property.title}
                  pricePerNight={property.price_per_night}
                  currency={property.currency}
                  maxGuests={property.max_guests}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Pricing Information */}
      {property.pricing_table && (
        <PropertyPricingTable pricingData={property.pricing_table} />
      )}

      {/* Contact */}
      {property.get_in_touch_info && (
        <PropertyContact
          contactInfo={property.get_in_touch_info}
          responseTime={property.contact_response_time || 'We typically respond to inquiries within 2 hours.'}
        />
      )}

      {/* Gallery Modal */}
      <MediaDialog
        media={mediaItems}
        isOpen={galleryOpen}
        onClose={() => setGalleryOpen(false)}
        initialIndex={selectedImageIndex}
      />

      {/* Property Footer */}
      <PropertyFooter
        title={property.title}
        taglineLine1={property.tagline_line1 || 'Experience luxury in the heart of Swedish nature.'}
        location={property.location || ''}
        quickLinks={property.footer_quick_links || ['Photo Gallery', 'Amenities', 'Book Now', 'Contact']}
        contactInfo={property.get_in_touch_info}
      />
    </div>
  );
};

export default PropertyPage;