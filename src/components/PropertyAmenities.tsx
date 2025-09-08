import { Property } from "@/hooks/useProperties";
import { Wifi, Car, Utensils, TreePine, Waves, Coffee, Bed, Bath } from "lucide-react";

interface PropertyAmenitiesProps {
  property?: Property;
}

const PropertyAmenities = ({ property }: PropertyAmenitiesProps) => {
  const getAmenityIcon = (amenity: string) => {
    const lower = amenity.toLowerCase();
    if (lower.includes('wifi') || lower.includes('internet')) return <Wifi className="w-8 h-8" />;
    if (lower.includes('parking') || lower.includes('car')) return <Car className="w-8 h-8" />;
    if (lower.includes('kitchen') || lower.includes('cooking')) return <Utensils className="w-8 h-8" />;
    if (lower.includes('sauna') || lower.includes('wellness')) return <TreePine className="w-8 h-8" />;
    if (lower.includes('lake') || lower.includes('water')) return <Waves className="w-8 h-8" />;
    if (lower.includes('coffee') || lower.includes('breakfast')) return <Coffee className="w-8 h-8" />;
    return <TreePine className="w-8 h-8" />;
  };

  const defaultAmenities = [
    'High-speed WiFi',
    'Fully equipped kitchen',
    'Parking included',
    'Sauna & wellness',
    'Coffee & breakfast',
    'Premium location'
  ];

  const amenities = property?.amenities && property.amenities.length > 0 
    ? property.amenities 
    : defaultAmenities;

  return (
    <section className="villa-section">
      <div className="villa-container">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-display font-bold mb-6">
            Premium Amenities
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Every detail has been carefully considered to ensure your comfort and enjoyment during your stay.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {amenities.map((amenity, index) => (
            <div key={index} className="text-center group">
              <div className="flex items-center justify-center w-20 h-20 mx-auto mb-6 rounded-full bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
                {getAmenityIcon(amenity)}
              </div>
              <h3 className="text-xl font-display font-semibold mb-3 group-hover:text-primary transition-colors">
                {amenity}
              </h3>
            </div>
          ))}
        </div>

        {/* Property Details */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          <div className="group">
            <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
              <Bed className="w-8 h-8" />
            </div>
            <h4 className="text-lg font-semibold mb-2">{property?.bedrooms || 4} Bedrooms</h4>
            <p className="text-muted-foreground">Comfortable sleeping areas</p>
          </div>
          <div className="group">
            <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
              <Bath className="w-8 h-8" />
            </div>
            <h4 className="text-lg font-semibold mb-2">{property?.bathrooms || 2} Bathrooms</h4>
            <p className="text-muted-foreground">Modern facilities</p>
          </div>
          <div className="group">
            <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
              <TreePine className="w-8 h-8" />
            </div>
            <h4 className="text-lg font-semibold mb-2">Up to {property?.max_guests || 8} Guests</h4>
            <p className="text-muted-foreground">Perfect for groups</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PropertyAmenities;