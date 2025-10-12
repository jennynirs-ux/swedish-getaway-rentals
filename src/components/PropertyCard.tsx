import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import LazyImage from "@/components/LazyImage";
import { 
  MapPin, 
  Star, 
  Users, 
  Wifi, 
  TreePine, 
  Waves,
  Anchor,
  Bed,
  Bath,
  Sparkles,
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
  Droplets,
  HeartHandshake,
  Cigarette,
  Sun,
  Wind
} from "lucide-react";
import { useState, memo, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { getClosestMajorCity, calculateDriveTime, formatDistanceText, type Coordinates } from "@/lib/distance";
import { AmenityDetailDialog } from "./AmenityDetailDialog";

export interface PropertyCardData {
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
  active: boolean;
  host_id: string;
  review_rating?: number;
  review_count?: number;
  property_type?: string;
  special_amenities?: string[];
  featured_amenities?: { icon: string; title: string; tagline: string; description: string; image_url?: string; features?: string[] }[];
  amenities_data?: any[];
  latitude?: number | null;
  longitude?: number | null;
  city?: string | null;
}

interface PropertyCardProps {
  property: PropertyCardData;
  onFavoriteToggle?: (propertyId: string) => void;
  isFavorite?: boolean;
  showFullDescription?: boolean;
  size?: "default" | "large";
}

const PropertyCard = memo(({ 
  property, 
  onFavoriteToggle, 
  isFavorite = false, 
  showFullDescription = false,
  size = "default" 
}: PropertyCardProps) => {
  const { toast } = useToast();
  const [selectedAmenity, setSelectedAmenity] = useState<any>(null);
  const [isAmenityDialogOpen, setIsAmenityDialogOpen] = useState(false);

  // Defensive data normalization
  const safeProperty = {
    ...property,
    amenities: Array.isArray(property.amenities) ? property.amenities : [],
    featured_amenities: Array.isArray(property.featured_amenities) ? property.featured_amenities : [],
    special_amenities: Array.isArray(property.special_amenities) ? property.special_amenities : [],
    hero_image_url: property.hero_image_url || "/placeholder.jpg",
    description: property.description || "",
    currency: property.currency || "SEK",
  };

  // Always use dynamic property routes
  const getPropertyRoute = (p: PropertyCardData) => `/property/${p.id}`;

  // Dev warning for missing critical fields
  if (process.env.NODE_ENV === 'development') {
    if (!property.id || !property.title) {
      console.warn('PropertyCard: Missing critical fields', { id: property.id, title: property.title });
    }
  }

  // Memoized amenity icon mapping for performance
  const getAmenityIcon = useMemo(() => {
    return (amenity: unknown) => {
      if (typeof amenity !== "string" || !amenity) {
        return <Home className="w-4 h-4" />;
      }
      
      const lower = amenity.toLowerCase().trim();
      
      // Exact matches first for consistency
      if (lower === "lake access") return <Waves className="w-4 h-4" />;
      if (lower === "ocean access") return <Waves className="w-4 h-4" />;
      if (lower === "beach access") return <Waves className="w-4 h-4" />;
      if (lower === "wifi") return <Wifi className="w-4 h-4" />;
      if (lower === "parking") return <Car className="w-4 h-4" />;
      if (lower === "kitchen") return <UtensilsCrossed className="w-4 h-4" />;
      if (lower === "hot tub") return <Sparkles className="w-4 h-4" />;
      if (lower === "sauna") return <Flame className="w-4 h-4" />;
      if (lower === "fireplace") return <Flame className="w-4 h-4" />;
      if (lower === "pool") return <Droplets className="w-4 h-4" />;
      
      // Partial matches for flexibility
      if (lower.includes("wifi") || lower.includes("internet")) return <Wifi className="w-4 h-4" />;
      if (lower.includes("lake") || lower.includes("ocean") || lower.includes("beach")) return <Waves className="w-4 h-4" />;
      if (lower.includes("parking") || lower.includes("garage")) return <Car className="w-4 h-4" />;
      if (lower.includes("coffee")) return <Coffee className="w-4 h-4" />;
      if (lower.includes("kitchen")) return <UtensilsCrossed className="w-4 h-4" />;
      if (lower.includes("boat") || lower.includes("canoe") || lower.includes("kayak")) return <Anchor className="w-4 h-4" />;
      if (lower.includes("dining") || lower.includes("restaurant")) return <Utensils className="w-4 h-4" />;
      if (lower.includes("jacuzzi") || lower.includes("spa") || lower.includes("hot tub")) return <Sparkles className="w-4 h-4" />;
      if (lower.includes("pool") || lower.includes("swimming")) return <Droplets className="w-4 h-4" />;
      if (lower.includes("forest") || lower.includes("nature")) return <TreePine className="w-4 h-4" />;
      if (lower.includes("mountain") || lower.includes("view")) return <Mountain className="w-4 h-4" />;
      if (lower.includes("bedroom") || lower.includes("bed")) return <Bed className="w-4 h-4" />;
      if (lower.includes("bathroom") || lower.includes("bath")) return <Bath className="w-4 h-4" />;
      if (lower.includes("guest") || lower.includes("people")) return <Users className="w-4 h-4" />;
      if (lower.includes("fireplace") || lower.includes("fire") || lower.includes("sauna")) return <Flame className="w-4 h-4" />;
      if (lower.includes("heating") || lower.includes("warm")) return <Thermometer className="w-4 h-4" />;
      if (lower.includes("ac") || lower.includes("air") || lower.includes("cooling")) return <Snowflake className="w-4 h-4" />;
      if (lower.includes("tv") || lower.includes("television")) return <Tv className="w-4 h-4" />;
      if (lower.includes("gym") || lower.includes("fitness")) return <Dumbbell className="w-4 h-4" />;
      if (lower.includes("pet") || lower.includes("dog")) return <PawPrint className="w-4 h-4" />;
      if (lower.includes("smoking")) return <Cigarette className="w-4 h-4" />;
      if (lower.includes("outdoor") || lower.includes("sun")) return <Sun className="w-4 h-4" />;
      if (lower.includes("wind") || lower.includes("fan")) return <Wind className="w-4 h-4" />;
      if (lower.includes("romantic")) return <HeartHandshake className="w-4 h-4" />;
      
      return <Home className="w-4 h-4" />;
    };
  }, []);

  const handleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onFavoriteToggle?.(safeProperty.id);
    toast({
      title: isFavorite ? "Removed from favorites" : "Added to favorites",
      description: `${safeProperty.title} ${isFavorite ? "removed from" : "added to"} your favorites`,
    });
  };

  const handleShare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (navigator.share) {
      navigator.share({
        title: safeProperty.title,
        text: safeProperty.description,
        url: window.location.origin + getPropertyRoute(safeProperty),
      });
    } else {
      navigator.clipboard.writeText(window.location.origin + getPropertyRoute(safeProperty));
      toast({
        title: "Link copied",
        description: "Link has been copied to clipboard",
      });
    }
  };

  const cardHeight = size === "large" ? "h-80" : "h-64";
  const cardClass =
    size === "large"
      ? "overflow-hidden hover-scale shadow-elegant group cursor-pointer"
      : "overflow-hidden hover-scale group cursor-pointer";

  return (
    <Link to={getPropertyRoute(safeProperty)} className="block">
      <Card className={cardClass}>
        <div className={`relative ${cardHeight}`}>
          {/* Image with LazyImage for performance */}
          <LazyImage
            src={safeProperty.hero_image_url}
            alt={safeProperty.title}
            fallbackSrc="/placeholder.jpg"
            priority={false}
            className="w-full h-full object-cover transition-all duration-300 group-hover:scale-105"
            decoding="async"
            width={800}
            height={600}
          />

          {/* Image Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

          {/* Top Badges */}
          <div className="absolute top-4 left-4 flex gap-2">
            {safeProperty.review_rating && (
              <Badge className="bg-primary text-primary-foreground shadow-md">
                <Star className="w-3 h-3 mr-1 fill-current" />
                {safeProperty.review_rating.toFixed(1)}{" "}
                {safeProperty.review_count ? `(${safeProperty.review_count})` : ""}
              </Badge>
            )}
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
                isFavorite ? "bg-red-500/80 text-white" : "bg-white/20"
              }`}
              onClick={handleFavorite}
            >
              <Heart className={`h-4 w-4 ${isFavorite ? "fill-current text-white" : "text-white"}`} />
            </Button>
          </div>

          {/* Property Type Badge */}
          <div className="absolute bottom-4 left-4">
            <Badge variant="outline" className="bg-white/90 backdrop-blur-sm">
              {safeProperty.property_type || "Property"}
            </Badge>
          </div>
        </div>

        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="font-semibold text-lg leading-tight group-hover:text-primary transition-colors">
                {safeProperty.title}
              </h3>
              <div className="flex items-center text-muted-foreground text-sm mt-1">
                <MapPin className="w-4 h-4 mr-1" />
                {safeProperty.city 
                  ? `${safeProperty.city.charAt(0).toUpperCase() + safeProperty.city.slice(1)}, Sweden`
                  : (safeProperty.location || "Sweden")}
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          {/* Description */}
          <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
            {showFullDescription
              ? safeProperty.description
              : safeProperty.description
              ? `${safeProperty.description.substring(0, 120)}...`
              : ""}
          </p>

          {/* Property Details */}
          <div className="flex items-center gap-4 mb-4 text-sm text-muted-foreground">
            <div className="flex items-center">
              <Users className="w-4 h-4 mr-1" />
              {safeProperty.max_guests} guests
            </div>
            <div className="flex items-center">
              <Bed className="w-4 h-4 mr-1" />
              {safeProperty.bedrooms} bedrooms
            </div>
            <div className="flex items-center">
              <Bath className="w-4 h-4 mr-1" />
              {safeProperty.bathrooms} bathrooms
            </div>
          </div>

          {/* Special Amenities - Icon, Title, Tagline (non-clickable) */}
          {safeProperty.featured_amenities.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {safeProperty.featured_amenities.slice(0, 3).map((amenity: any, index: number) => (
                <div
                  key={index}
                  className="flex items-start gap-2 bg-primary/5 p-2 rounded-lg border border-primary/20 flex-1 min-w-[140px]"
                >
                  <div className="text-primary mt-0.5 shrink-0">
                    {getAmenityIcon(amenity.icon || amenity.title)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-foreground leading-tight">
                      {amenity.title}
                    </div>
                    {amenity.tagline && (
                      <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                        {amenity.tagline}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {safeProperty.amenities.length > 0 && (
                <div className="text-xs text-primary font-medium px-3 py-2 bg-muted rounded-lg flex items-center">
                  +{safeProperty.amenities.length} amenities
                </div>
              )}
            </div>
          )}

          <AmenityDetailDialog
            open={isAmenityDialogOpen}
            onOpenChange={setIsAmenityDialogOpen}
            amenity={selectedAmenity}
          />

          {/* Price and CTA */}
          <div className="flex items-center justify-between">
            <div>
              <span className="text-2xl font-bold text-foreground">
                {Math.round((safeProperty.price_per_night || 0) * 1.1).toLocaleString()} {safeProperty.currency}
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
});

PropertyCard.displayName = "PropertyCard";

export default PropertyCard;
