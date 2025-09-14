import { useState } from "react";
import { Property } from "@/hooks/useProperties";
import { AmenityDialog } from "@/components/AmenityDialog";
import { 
  Wifi, Car, Coffee, Utensils, Waves, TreePine, Mountain, Home, 
  Bed, Bath, Users, Flame, UtensilsCrossed, Car as Parking,
  Thermometer, Shield, Tv, Dumbbell, PawPrint, Snowflake,
  ShowerHead, Droplet, Spa, WashingMachine, Baby, Key, Accessibility 
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
// Ikon-mappning
const amenityIconMap: Record<string, any> = {
  wifi: Wifi,
  internet: Wifi,
  parking: Parking,
  garage: Parking,
  coffee: Coffee,
  kitchen: Utensils,
  dining: UtensilsCrossed,
  spa: Spa,
  hottub: Bath,
  jacuzzi: Bath,
  pool: Droplet,
  shower: ShowerHead,
  forest: TreePine,
  mountain: Mountain,
  view: Mountain,
  bed: Bed,
  bath: Bath,
  guest: Users,
  fireplace: Flame,
  heating: Thermometer,
  security: Shield,
  tv: Tv,
  gym: Dumbbell,
  pet: PawPrint,
  air: Snowflake,
  laundry: WashingMachine,
  baby: Baby,
  key: Key,
  accessible: Accessibility
};

const getAmenityIcon = (title: string) => {
  const key = Object.keys(amenityIconMap).find(k =>
    title.toLowerCase().includes(k)
  );
  return key ? amenityIconMap[key] : Home;
};

  // Prepare amenities data - use new amenities_data structure if available
  const amenitiesData: AmenityData[] = property.amenities_data?.slice(0, 8).map(amenity => ({
    icon: getAmenityIcon(amenity.icon),
    title: amenity.title,
    tagline: amenity.tagline,
    description: amenity.description,
    image_url: amenity.image_url,
    features: amenity.features || []
  })) || (property.amenities || []).slice(0, 8).map((amenity, index) => ({
    icon: getAmenityIcon(amenity),
    title: amenity,
    tagline: `Enjoy ${amenity.toLowerCase()} during your stay`,
    description: property.amenities_descriptions?.[amenity] || `Experience premium ${amenity.toLowerCase()} facilities during your stay at our property.`,
    features: []
  }));

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

          {/* Amenities Grid - First 8 amenities */}
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
