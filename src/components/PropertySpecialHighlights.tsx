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

  // Show only the 3 special amenities that the host selected
  const featuredAmenities = (property.featured_amenities as AmenityData[]) || [];
  const displayAmenities = featuredAmenities.slice(0, 3);

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
    <section className="py-16 bg-primary">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          {/* Titel */}
          <h2 className="text-4xl md:text-5xl font-bold text-center mb-16 text-white">
            What Makes {property.title} Special
          </h2>

          {/* Ikoner på rad */}
          <div className="flex flex-wrap justify-center gap-8 mb-12">
            {displayAmenities.map((amenity, index) => {
              const IconComponent = getAmenityIcon(amenity.icon);
              return (
                <div 
                  key={index} 
                  className="text-center group cursor-pointer w-40"
                  onClick={() => handleAmenityClick(amenity)}
                >
                  <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 rounded-full mb-4 group-hover:bg-white/30 transition-all duration-300 group-hover:scale-110">
                    <IconComponent className="h-10 w-10 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">{amenity.title}</h3>
                  <p className="text-sm text-white/80">{amenity.tagline}</p>
                </div>
              );
            })}
          </div>

          {/* Guest Guide Knapp */}
          <div className="text-center">
            <Button 
              size="lg" 
              onClick={onViewGuide}
              className="text-lg px-8 py-6 bg-white text-primary hover:bg-white/90"
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
