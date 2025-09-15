import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  MapPin, 
  Star, 
  Users, 
  Wifi, 
  TreePine, 
  Waves, 
  Calendar,
  Bed,
  Bath,
  Heart,
  Share2,
  Coffee,
  Utensils,
  Mountain,
  Home,
  Flame,
  UtensilsCrossed,
  Car,
  Thermometer,
  Tv,
  Dumbbell,
  PawPrint,
  Snowflake,
  Shower,
  Droplets,
  HeartHandshake,
  Cigarette,
  Sun,
  Wind
} from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface Property {
  id: string;
  title: string;
  description: string;
  location: string;
  price_per_night: number;
  currency: string;
  bedrooms: number;
  bathrooms: number;
  max_guests: number;
  amenities: string[];
  hero_image_url: string;
  gallery_images: string[];
  active: boolean;
  host_id: string;
}

interface PropertyCardProps {
  property: Property;
  onFavoriteToggle?: (propertyId: string) => void;
  isFavorite?: boolean;
  showFullDescription?: boolean;
  size?: "default" | "large";
}

const PropertyCard = ({ 
  property, 
  onFavoriteToggle, 
  isFavorite = false, 
  showFullDescription = false,
  size = "default" 
}: PropertyCardProps) => {
  const [imageLoading, setImageLoading] = useState(true);
  const { toast } = useToast();

  // Always use dynamic property routes
  const getPropertyRoute = (property: Property) => {
    return `/property/${property.id}`;
  };

  const getAmenityIcon = (amenity: string) => {
    const lower = amenity.toLowerCase();
  
    if (lower.includes('wifi') || lower.includes('internet')) return <Wifi className="w-4 h-4" />;
    if (lower.includes('parking') || lower.includes('garage')) return <Car className="w-4 h-4" />;
    if (lower.includes('coffee')) return <Coffee className="w-4 h-4" />;
    if (lower.includes('kitchen')) return <UtensilsCrossed className="w-4 h-4" />;
    if (lower.includes('dining') || lower.includes('restaurant')) return <Utensils className="w-4 h-4" />;
    if (lower.includes('sauna') || lower.includes('spa') || lower.includes('hot tub')) return <Waves className="w-4 h-4" />;
    if (lower.includes('pool') || lower.includes('swimming')) return <Droplets className="w-4 h-4" />;
    if (lower.includes('forest') || lower.includes('nature')) return <TreePine className="w-4 h-4" />;
    if (lower.includes('mountain') || lower.includes('view')) return <Mountain className="w-4 h-4" />;
    if (lower.includes('bedroom') || lower.includes('bed')) return <Bed className="w-4 h-4" />;
    if (lower.includes('bathroom') || lower.includes('bath')) return <Bath className="w-4 h-4" />;
    if (lower.includes('shower')) return <Shower className="w-4 h-4" />;
    if (lower.includes('guest') || lower.includes('people')) return <Users className="w-4 h-4" />;
    if (lower.includes('fireplace') || lower.includes('fire')) return <Flame className="w-4 h-4" />;
    if (lower.includes('heating') || lower.includes('warm')) return <Thermometer className="w-4 h-4" />;
    if (lower.includes('ac') || lower.includes('air') || lower.includes('cooling')) return <Snowflake className="w-4 h-4" />;
    if (lower.includes('tv') || lower.includes('television')) return <Tv className="w-4 h-4" />;
    if (lower.includes('gym') || lower.includes('fitness')) return <Dumbbell className="w-4 h-4" />;
    if (lower.includes('pet') || lower.includes('dog')) return <PawPrint className="w-4 h-4" />;
    if (lower.includes('smoking')) return <Cigarette className="w-4 h-4" />;
    if (lower.includes('outdoor') || lower.includes('sun')) return <Sun className="w-4 h-4" />;
    if (lower.includes('wind') || lower.includes('fan')) return <Wind className="w-4 h-4" />;
    if (lower.includes('romantic')) return <HeartHandshake className="w-4 h-4" />;
  
    return <Home className="w-4 h-4" />;
  };

  const handleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onFavoriteToggle?.(property.id);
    toast({
      title: isFavorite ? "Removed from favorites" : "Added to favorites",
      description: `${property.title} ${isFavorite ? "removed from" : "added to"} your favorites`,
    });
  };

  const handleShare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (navigator.share) {
      navigator.share({
        title: property.title,
        text: property.description,
        url: window.location.origin + getPropertyRoute(property),
      });
    } else {
      navigator.clipboard.writeText(window.location.origin + getPropertyRoute(property));
      toast({
        title: "Link copied",
        description: "Link has been copied to clipboard",
      });
    }
  };

  const cardHeight = size === "large" ? "h-80" : "h-64";
  const cardClass = size === "large" 
    ? "overflow-hidden hover-scale shadow-elegant group cursor-pointer" 
    : "overflow-hidden hover-scale group cursor-pointer";

  return (
    <Link to={getPropertyRoute(property)} className="block">
      <Card className={cardClass}>
        <div className={`relative ${cardHeight}`}>
          {/* Image */}
          <img 
            src={property.hero_image_url || '/placeholder.svg'} 
            alt={property.title} 
            className={`w-full h-full object-cover transition-all duration-300 group-hover:scale-105 ${
              imageLoading ? 'blur-sm' : ''
            }`}
            onLoad={() => setImageLoading(false)}
          />
          
          {/* Image Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          
          {/* Top Badges */}
          <div className="absolute top-4 left-4 flex gap-2">
            <Badge className="bg-primary text-primary-foreground shadow-md">
              <Star className="w-3 h-3 mr-1 fill-current" />
              5.0
            </Badge>
          </div>

          {/* Action Buttons */}
          <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <Button
              size="sm"
              variant="secondary"
              className="h-8 w-8 p-0 bg-white/20 backdrop-blur-sm hover:bg-white/30"
              onClick={handleShare}
            >
              <Share2 className="h-4 w-4 text-white" />
            </Button>
            <Button
              size="sm"
              variant="secondary"
              className={`h-8 w-8 p-0 backdrop-blur-sm hover:bg-white/30 ${
                isFavorite ? 'bg-red-500/80 text-white' : 'bg-white/20'
              }`}
              onClick={handleFavorite}
            >
              <Heart className={`h-4 w-4 ${isFavorite ? 'fill-current text-white' : 'text-white'}`} />
            </Button>
          </div>

          {/* Property Type Badge */}
          <div className="absolute bottom-4 left-4">
            <Badge variant="outline" className="bg-white/90 backdrop-blur-sm">
              {property.title.toLowerCase().includes('villa') ? 'Villa' :
               property.title.toLowerCase().includes('lakehouse') ? 'Lakehouse' : 'Property'}
            </Badge>
          </div>
        </div>

        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="font-semibold text-lg leading-tight group-hover:text-primary transition-colors">
                {property.title}
              </h3>
              <div className="flex items-center text-muted-foreground text-sm mt-1">
                <MapPin className="w-4 h-4 mr-1" />
                {property.location || 'Sverige'}
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          {/* Description */}
          <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
            {showFullDescription 
              ? property.description 
              : `${property.description?.substring(0, 120)}...`
            }
          </p>

          {/* Property Details */}
          <div className="flex items-center gap-4 mb-4 text-sm text-muted-foreground">
            <div className="flex items-center">
              <Users className="w-4 h-4 mr-1" />
              {property.max_guests} guests
            </div>
            <div className="flex items-center">
              <Bed className="w-4 h-4 mr-1" />
              {property.bedrooms} bedrooms
            </div>
            <div className="flex items-center">
              <Bath className="w-4 h-4 mr-1" />
              {property.bathrooms} bathrooms
            </div>
          </div>

          {/* Amenities */}
          <div className="flex flex-wrap gap-2 mb-4">
            {property.amenities?.slice(0, 3).map((amenity, index) => (
              <div key={index} className="flex items-center gap-1 text-xs bg-muted px-2 py-1 rounded-full">
                {getAmenityIcon(amenity)}
                <span className="capitalize">{amenity}</span>
              </div>
            ))}
            {property.amenities && property.amenities.length > 3 && (
              <div className="text-xs text-muted-foreground px-2 py-1">
                +{property.amenities.length - 3} more
              </div>
            )}
          </div>

          {/* Price and CTA */}
          <div className="flex items-center justify-between">
            <div>
               <span className="text-2xl font-bold text-foreground">
                 {(property.price_per_night || 0).toLocaleString()} {property.currency}
              </span>
              <span className="text-muted-foreground text-sm ml-1">/night</span>
            </div>
            <Button className="group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
              View Details
            </Button>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};

export default PropertyCard;
