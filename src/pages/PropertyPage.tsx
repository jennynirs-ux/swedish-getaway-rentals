import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Property } from "@/hooks/useProperties";
import PropertyNavigation from "@/components/PropertyNavigation";
import VillaFooter from "@/components/VillaFooter";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { MapPin, Users, Bed, Bath, Wifi, Car, Coffee, Utensils, Waves, TreePine, Mountain, Home } from "lucide-react";
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
  }, [id]);

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
      
      {/* Hero Section */}
      <section className="relative h-96 lg:h-[500px] overflow-hidden cursor-pointer" onClick={() => openGallery(0)}>
        <div className="absolute inset-0">
          <img 
            src={property.hero_image_url || property.gallery_images?.[0] || ''} 
            alt={property.title}
            className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"></div>
        </div>
        <div className="absolute bottom-8 left-8 text-white">
          <h1 className="text-4xl lg:text-5xl font-bold mb-2">{property.title}</h1>
          {property.location && (
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              <span className="text-lg">{property.location}</span>
            </div>
          )}
        </div>
      </section>

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Property Info */}
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                <span>Up to {property.max_guests} guests</span>
              </div>
              <div className="flex items-center gap-1">
                <Bed className="w-4 h-4" />
                <span>{property.bedrooms} bedroom{property.bedrooms !== 1 ? 's' : ''}</span>
              </div>
              <div className="flex items-center gap-1">
                <Bath className="w-4 h-4" />
                <span>{property.bathrooms} bathroom{property.bathrooms !== 1 ? 's' : ''}</span>
              </div>
            </div>

            {/* Description */}
            {property.description && (
              <div>
                <h2 className="text-2xl font-semibold mb-4">About this place</h2>
                <p className="text-muted-foreground leading-relaxed">{property.description}</p>
              </div>
            )}

            {/* What Makes This Property Special */}
            {property.what_makes_special && (
              <div>
                <h2 className="text-2xl font-semibold mb-4">What makes {property.title} special</h2>
                <p className="text-muted-foreground leading-relaxed">{property.what_makes_special}</p>
              </div>
            )}

            {/* Amenities */}
            {property.amenities && property.amenities.length > 0 && (
              <div>
                <h2 className="text-2xl font-semibold mb-4">Amenities</h2>
                <div className="grid sm:grid-cols-2 gap-3">
                  {property.amenities.map((amenity, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 rounded-lg border">
                      {getAmenityIcon(amenity)}
                      <span>{amenity}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Gallery */}
            {property.gallery_images && property.gallery_images.length > 0 && (
              <div>
                <h2 className="text-2xl font-semibold mb-4">Photos</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {property.gallery_images.slice(0, 6).map((image, index) => (
                    <div 
                      key={index} 
                      className="aspect-square overflow-hidden rounded-lg cursor-pointer"
                      onClick={() => openGallery(index)}
                    >
                      <img 
                        src={image} 
                        alt={`${property.title} photo ${index + 1}`}
                        className="w-full h-full object-cover hover:scale-105 transition-transform"
                      />
                    </div>
                  ))}
                </div>
                {property.gallery_images.length > 6 && (
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => openGallery(0)}
                  >
                    View all {property.gallery_images.length} photos
                  </Button>
                )}
              </div>
            )}

            {/* Guidebook */}
            {property.guidebook_sections && property.guidebook_sections.length > 0 && (
              <div>
                <h2 className="text-2xl font-semibold mb-4">Local Guide</h2>
                <div className="space-y-6">
                  {(property.guidebook_sections as GuidebookSection[]).map((section, index) => (
                    <Card key={index}>
                      <CardHeader>
                        <CardTitle>{section.title}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {section.image_url && (
                          <img 
                            src={section.image_url} 
                            alt={section.title}
                            className="w-full h-48 object-cover rounded-lg mb-4"
                          />
                        )}
                        <p className="text-muted-foreground">{section.content}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Booking Card */}
            <Card className="sticky top-4">
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

            {/* Contact */}
            <Card>
              <CardHeader>
                <CardTitle>Get in Touch</CardTitle>
              </CardHeader>
              <CardContent>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button className="w-full">Contact Host</Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Contact the Host</DialogTitle>
                      <DialogDescription>
                        Send a message about {property.title}
                      </DialogDescription>
                    </DialogHeader>
                    <ContactForm propertyId={property.id} />
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Gallery Modal */}
      <MediaDialog
        media={mediaItems}
        isOpen={galleryOpen}
        onClose={() => setGalleryOpen(false)}
        initialIndex={selectedImageIndex}
      />

      <VillaFooter />
    </div>
  );
};

export default PropertyPage;