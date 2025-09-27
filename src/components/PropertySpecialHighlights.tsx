import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Property } from "@/hooks/useProperties";
import { 
  BookOpen, Sparkles, Mountain, Flame, Wifi, Car, Coffee, Utensils, Waves, 
  TreePine, Home, Bed, Bath, Users, UtensilsCrossed, Thermometer, Shield, 
  Tv, Dumbbell, PawPrint, Snowflake, LucideIcon 
} from "lucide-react";
import { AmenityDialog } from "@/components/AmenityDialog";

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
  const [selectedAmenity, setSelectedAmenity] = useState<{
    icon: LucideIcon;
    title: string;
    tagline: string;
    description: string;
    image_url?: string;
    features?: string[];
  } | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

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

  const featuredAmenities = (property.featured_amenities as AmenityData[]) || [];
  const allAmenities = (property.amenities_data as AmenityData[]) || [];
  const displayAmenities = featuredAmenities.length > 0 
    ? featuredAmenities.slice(0, 3)
    : allAmenities.slice(0, 3);

  const handleAmenityClick = (amenity: AmenityData) => {
    const IconComponent = getAmenityIcon(amenity.icon);
    setSelectedAmenity({
      ...amenity,
      icon: IconComponent
    });
    setIsDialogOpen(true);
  };

  if (!displayAmenities.length) return null;

  return (
    <section className="py-20 bg-gradient-to-br from-primary/5 to-secondary/10">
      <div className="container mx-auto px-6">
        <div className="max-w-6xl mx-auto">
          {/* Titel */}
          <h2 className="text-4xl md:text-5xl font-extrabold text-center mb-16 text-amber-900 relative">
            What Makes {property.title} Special
            <span className="block w-24 h-1 bg-amber-600 mx-auto mt-4 rounded-full"></span>
          </h2>

          {/* Highlights */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-16">
            {displayAmenities.map((amenity, index) => {
              const IconComponent = getAmenityIcon(amenity.icon);
              return (
                <div 
                  key={index} 
                  className="p-8 bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 text-center cursor-pointer group"
                  onClick={() => handleAmenityClick(amenity)}
                >
                  <div className="flex items-center justify-center w-20 h-20 bg-amber-100 rounded-full mx-auto mb-6 group-hover:bg-amber-200 transition">
                    <IconComponent className="h-10 w-10 text-amber-700" />
                  </div>
                  <h3 className="text-2xl font-bold mb-4 text-amber-900">{amenity.title}</h3>
                  <p className="text-lg text-muted-foreground leading-relaxed">
                    {amenity.description}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Guest Guide Knapp */}
          <div className="text-center">
            <Button 
              size="lg" 
              onClick={onViewGuide}
              className="text-lg px-10 py-6 rounded-full bg-amber-800 hover:bg-amber-900 text-white shadow-lg"
            >
              <BookOpen className="h-5 w-5 mr-2" />
              View Complete Guest Guide
            </Button>
          </div>
        </div>
      </div>

      <AmenityDialog 
        amenity={selectedAmenity}
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
      />
    </section>
  );
};

export default PropertySpecialHighlights;
