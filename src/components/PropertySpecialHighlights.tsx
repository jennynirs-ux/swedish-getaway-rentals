import { Button } from "@/components/ui/button";
import { Property } from "@/hooks/useProperties";
import { BookOpen, Sparkles, Mountain, Flame, Wifi, Car, Coffee, Utensils, Waves, TreePine, Home, Bed, Bath, Users, UtensilsCrossed, Thermometer, Shield, Tv, Dumbbell, PawPrint, Snowflake } from "lucide-react";

interface PropertySpecialHighlightsProps {
  property: Property;
  onViewGuide: () => void;
}

interface AmenityData {
  icon: string;
  title: string;
  tagline: string;
  description: string;
  image_url?: string;
  features?: string[];
}

const PropertySpecialHighlights = ({ property, onViewGuide }: PropertySpecialHighlightsProps) => {
  // Icon mapping for amenities
  const getAmenityIcon = (iconName?: string) => {
    switch (iconName?.toLowerCase()) {
      case 'wifi': return Wifi;
      case 'parking': return Car;
      case 'coffee': return Coffee;
      case 'dining': return Utensils;
      case 'sauna': return Waves;
      case 'nature': return TreePine;
      case 'view': return Mountain;
      case 'home': return Home;
      case 'bed': return Bed;
      case 'bath': return Bath;
      case 'guests': return Users;
      case 'fire': return Flame;
      case 'kitchen': return UtensilsCrossed;
      case 'heating': return Thermometer;
      case 'security': return Shield;
      case 'tv': return Tv;
      case 'fitness': return Dumbbell;
      case 'pets': return PawPrint;
      case 'cooling': return Snowflake;
      default: return Sparkles;
    }
  };

  // Get featured amenities from the property
  const featuredAmenities = (property.featured_amenities as AmenityData[]) || [];
  const allAmenities = (property.amenities_data as AmenityData[]) || [];
  
  // Filter amenities based on featured selection (by title match)
  const displayAmenities = featuredAmenities.length > 0 
    ? featuredAmenities.slice(0, 3)
    : allAmenities.slice(0, 3);

  if (!displayAmenities.length) {
    return null;
  }
  return (
    <section className="py-16 bg-gradient-to-br from-primary/5 to-secondary/5">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          {/* Section Title */}
          <h2 className="text-4xl md:text-5xl font-bold text-center mb-16">
            What Makes {property.title} Special
          </h2>

          {/* Special Highlights Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            {displayAmenities.map((amenity, index) => {
              const IconComponent = getAmenityIcon(amenity.icon);
              
              return (
                <div key={index} className="text-center group">
                  <div className="inline-flex items-center justify-center w-20 h-20 bg-primary/10 rounded-full mb-6 group-hover:bg-primary/20 transition-all duration-300 group-hover:scale-110">
                    <IconComponent className="h-10 w-10 text-primary" />
                  </div>
                  <h3 className="text-2xl font-bold mb-4">{amenity.title}</h3>
                  <p className="text-lg text-muted-foreground leading-relaxed">
                    {amenity.description}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Guest Guide Button */}
          <div className="text-center">
            <Button 
              size="lg" 
              onClick={onViewGuide}
              className="text-lg px-8 py-6"
            >
              <BookOpen className="h-5 w-5 mr-2" />
              View Complete Guest Guide
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PropertySpecialHighlights;