import { useState, useMemo } from "react";
import { Property } from "@/hooks/useProperties";
import { AmenityDialog } from "@/components/AmenityDialog";
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

  // Combine amenities from both amenities_data and amenities arrays, excluding featured ones
  const amenitiesData: AmenityData[] = useMemo(() => {
    const allAmenities: AmenityData[] = [];
    
    // Get featured amenities titles for filtering
    const featuredTitles = new Set((property.featured_amenities || []).map((amenity: any) => amenity.title?.toLowerCase()));
    
    // Add from amenities_data if it exists
    if (property.amenities_data && Array.isArray(property.amenities_data) && property.amenities_data.length > 0) {
      const dataAmenities = property.amenities_data
        .filter((amenity: any) => !featuredTitles.has((amenity.title || amenity.name || '').toLowerCase()))
        .map((amenity: any) => ({
          icon: getAmenityIcon(amenity.name || amenity.title || ''),
          title: amenity.title || amenity.name || '',
          tagline: amenity.tagline || amenity.description || '',
          description: amenity.description || '',
          image_url: amenity.image_url,
          features: amenity.features || []
        }));
      allAmenities.push(...dataAmenities);
    }
    
    // Add from amenities array (avoid duplicates and featured ones)
    if (property.amenities && property.amenities.length > 0) {
      const existingTitles = new Set(allAmenities.map(a => a.title.toLowerCase()));
      const basicAmenities = property.amenities
        .filter((amenity: string) => 
          !existingTitles.has(amenity.toLowerCase()) && 
          !featuredTitles.has(amenity.toLowerCase())
        )
        .map((amenity: string) => ({
          icon: getAmenityIcon(amenity),
          title: amenity,
          tagline: `Enjoy ${amenity.toLowerCase()} during your stay`,
          description: property.amenities_descriptions?.[amenity] || `Experience premium ${amenity.toLowerCase()} facilities during your stay at our property.`,
          image_url: undefined,
          features: []
        }));
      allAmenities.push(...basicAmenities);
    }
    
    return allAmenities.slice(0, 8);
  }, [property.amenities_data, property.amenities, property.amenities_descriptions, property.featured_amenities]);

  const handleAmenityClick = (amenity: AmenityData) => {
    setSelectedAmenity(amenity);
    setIsDialogOpen(true);
  };

  if (!amenitiesData.length) {
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

          {/* Check if amenities exist */}
          {amenitiesData.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground text-lg">
                No amenities listed for this property yet.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {amenitiesData.map((amenity, index) => (
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
          )}
        </div>
      </div>

      {/* Amenity Detail Dialog */}
      <AmenityDialog 
        amenity={selectedAmenity}
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
      />
    </section>
  );
};

export default PropertyAmenities;