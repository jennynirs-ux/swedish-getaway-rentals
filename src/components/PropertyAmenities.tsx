import { useState, useMemo } from "react";
import { Property } from "@/hooks/useProperties";
import { AmenityDialog } from "@/components/AmenityDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { 
  Wifi, Car, Coffee, Utensils, Waves, TreePine, Mountain, Home, 
  Bed, Bath, Users, Flame, UtensilsCrossed, Car as Parking,
  Thermometer, Shield, Tv, Dumbbell, PawPrint, Snowflake
} from "lucide-react";

interface PropertyAmenitiesProps {
  property: Property;
}

interface AmenityData {
  icon: any;
  title: string;
  tagline: string;
  description: string;
  image_url?: string;
  features?: string[];
}

const PropertyAmenities = ({ property }: PropertyAmenitiesProps) => {
  const [selectedAmenity, setSelectedAmenity] = useState<AmenityData | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [showAllAmenities, setShowAllAmenities] = useState(false);

  // Icon mapping for amenities
  const getAmenityIcon = (amenity: string) => {
    const amenityLower = amenity.toLowerCase();
    if (amenityLower.includes('wifi') || amenityLower.includes('internet')) return Wifi;
    if (amenityLower.includes('parking') || amenityLower.includes('garage')) return Parking;
    if (amenityLower.includes('coffee') || amenityLower.includes('kitchen')) return Coffee;
    if (amenityLower.includes('dining') || amenityLower.includes('restaurant')) return Utensils;
    if (amenityLower.includes('sauna') || amenityLower.includes('spa') || amenityLower.includes('hot tub')) return Waves;
    if (amenityLower.includes('forest') || amenityLower.includes('nature')) return TreePine;
    if (amenityLower.includes('view') || amenityLower.includes('mountain')) return Mountain;
    if (amenityLower.includes('bedroom') || amenityLower.includes('bed')) return Bed;
    if (amenityLower.includes('bathroom') || amenityLower.includes('bath')) return Bath;
    if (amenityLower.includes('guest') || amenityLower.includes('people')) return Users;
    if (amenityLower.includes('fireplace') || amenityLower.includes('fire')) return Flame;
    if (amenityLower.includes('heating') || amenityLower.includes('warm')) return Thermometer;
    if (amenityLower.includes('security') || amenityLower.includes('safe')) return Shield;
    if (amenityLower.includes('tv') || amenityLower.includes('television')) return Tv;
    if (amenityLower.includes('gym') || amenityLower.includes('fitness')) return Dumbbell;
    if (amenityLower.includes('pet') || amenityLower.includes('dog')) return PawPrint;
    if (amenityLower.includes('air') || amenityLower.includes('cooling')) return Snowflake;
    return Home;
  };

  // Helper function to categorize amenities
  const categorizeAmenity = (title: string): string => {
    const lower = title.toLowerCase();
    if (lower.includes('wifi') || lower.includes('parking') || lower.includes('heating')) return "Essentials";
    if (lower.includes('kitchen') || lower.includes('coffee') || lower.includes('dining')) return "Kitchen & Dining";
    if (lower.includes('bed') || lower.includes('bath') || lower.includes('towel') || lower.includes('linen')) return "Comfort";
    if (lower.includes('tv') || lower.includes('game') || lower.includes('book')) return "Entertainment";
    if (lower.includes('outdoor') || lower.includes('garden') || lower.includes('bbq') || lower.includes('pool') || lower.includes('sauna')) return "Outdoor";
    return "Other";
  };

  // Premium amenities (What Makes Special) - from featured_amenities
  const premiumAmenities: AmenityData[] = useMemo(() => {
    const featuredAmenities = (property.featured_amenities || []) as any[];
    return featuredAmenities.map((amenity: any) => ({
      icon: getAmenityIcon(amenity.icon || amenity.title),
      title: amenity.title || '',
      tagline: amenity.tagline || '',
      description: amenity.description || '',
      image_url: amenity.image_url || undefined,
      features: Array.isArray(amenity.features) ? amenity.features : []
    }));
  }, [property.featured_amenities]);

  // Standard amenities - ALL from amenities_data, categorized
  const standardAmenitiesByCategory = useMemo(() => {
    const categories: Record<string, AmenityData[]> = {
      "Essentials": [],
      "Kitchen & Dining": [],
      "Comfort": [],
      "Entertainment": [],
      "Outdoor": [],
      "Other": []
    };

    // Get featured amenity titles to exclude from standard
    const featuredTitles = new Set((property.featured_amenities || []).map((a: any) => (a.title || '').toLowerCase()));

    // Process ALL amenities from amenities_data - this is the main source
    if (property.amenities_data && Array.isArray(property.amenities_data)) {
      property.amenities_data
        .filter((amenity: any) => !featuredTitles.has((amenity.title || '').toLowerCase()))
        .forEach((amenity: any) => {
          const amenityData: AmenityData = {
            icon: getAmenityIcon(amenity.icon || amenity.title || ''),
            title: amenity.title || '',
            tagline: amenity.tagline || '',
            description: amenity.description || '',
            image_url: amenity.image_url || undefined,
            features: Array.isArray(amenity.features) ? amenity.features : []
          };
          
          const category = categorizeAmenity(amenityData.title);
          categories[category].push(amenityData);
        });
    }

    return categories;
  }, [property.amenities_data, property.featured_amenities]);

  const totalStandardAmenities = Object.values(standardAmenitiesByCategory).flat().length;

  const handleAmenityClick = (amenity: AmenityData) => {
    setSelectedAmenity(amenity);
    setIsDialogOpen(true);
  };

  if (!premiumAmenities.length && totalStandardAmenities === 0) {
    return null;
  }

  return (
    <section className="py-16 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Premium Amenities
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Everything you need for an unforgettable stay, from modern conveniences 
              to unique experiences that celebrate Nordic culture.
            </p>
          </div>

          {/* Premium Amenities Grid */}
          {premiumAmenities.length > 0 ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {premiumAmenities.map((amenity, index) => (
                  <div 
                    key={index} 
                    className="text-center p-6 rounded-lg bg-background hover:bg-muted/50 transition-all duration-300 cursor-pointer group hover:scale-105"
                    onClick={() => handleAmenityClick(amenity)}
                  >
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-xl mb-4 group-hover:bg-primary/20 transition-colors duration-300">
                      <amenity.icon className="h-8 w-8 text-primary" />
                    </div>
                    
                    <h3 className="text-lg font-semibold mb-2">
                      {amenity.title}
                    </h3>
                    
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {amenity.tagline}
                    </p>
                  </div>
                ))}
              </div>

              {/* Show Standard Amenities Button */}
              {totalStandardAmenities > 0 && (
                <div className="text-center mt-6">
                  <Button
                    variant="outline"
                    onClick={() => setShowAllAmenities(true)}
                    className="text-primary"
                  >
                    +{totalStandardAmenities} Standard Amenities
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground text-lg">
                No premium amenities listed for this property yet.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Amenity Detail Dialog */}
      <AmenityDialog 
        amenity={selectedAmenity}
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
      />

      {/* All Standard Amenities Dialog */}
      <Dialog open={showAllAmenities} onOpenChange={setShowAllAmenities}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Standard Amenities</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 mt-4">
            {Object.entries(standardAmenitiesByCategory).map(([category, amenities]) => {
              if (amenities.length === 0) return null;
              return (
                <div key={category}>
                  <h3 className="text-lg font-semibold mb-3">{category}</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {amenities.map((amenity, index) => (
                      <div 
                        key={index}
                        className="flex flex-col items-center gap-2 p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer text-center"
                        onClick={() => {
                          handleAmenityClick(amenity);
                          setShowAllAmenities(false);
                        }}
                      >
                        <div className="flex-shrink-0">
                          <amenity.icon className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <span className="text-sm font-semibold block">{amenity.title}</span>
                          {amenity.tagline && (
                            <span className="text-xs text-muted-foreground block mt-1">{amenity.tagline}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default PropertyAmenities;