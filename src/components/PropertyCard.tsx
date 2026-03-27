import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import LazyImage from "@/components/LazyImage";
import {
  MapPin,
  Users,
  Bed,
  Bath,
  Heart,
  Share2,
  Home,
  HelpCircle,
  Star
} from "lucide-react";
import { useState, memo } from "react";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle } from "lucide-react";
import { getClosestMajorCity, calculateDriveTime, formatDistanceText, type Coordinates } from "@/lib/distance";
import { getAmenityIcon } from "@/lib/amenityIcons";
import { AmenityDetailDialog } from "./AmenityDetailDialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { convertForDisplay } from "@/lib/currencyConverter";

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
  const [imageError, setImageError] = useState(false);

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
  if (import.meta.env.DEV) {
    if (!property.id || !property.title) {
      console.warn('PropertyCard: Missing critical fields', { id: property.id, title: property.title });
    }
  }

  // Get amenity icon from shared utility and render with size
  const renderAmenityIcon = (amenity: unknown) => {
    const IconComponent = getAmenityIcon(amenity);
    return <IconComponent className="w-4 h-4" />;
  };

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
          {!imageError ? (
            <LazyImage
              src={safeProperty.hero_image_url}
              alt={safeProperty.title}
              fallbackSrc="/placeholder.jpg"
              priority={false}
              className="w-full h-full object-cover transition-all duration-300 group-hover:scale-105"
              decoding="async"
              width={800}
              height={600}
              onError={() => setImageError(true)}
            />
          ) : (
            /* BUG-047: Final fallback with colored placeholder */
            <div className="w-full h-full bg-gradient-to-br from-muted to-muted-foreground flex items-center justify-center">
              <div className="text-center p-4">
                <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground text-sm break-words max-w-[90%]">
                  {safeProperty.title}
                </p>
              </div>
            </div>
          )}

          {/* Image Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

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
            {safeProperty.review_rating && safeProperty.review_count && safeProperty.review_count > 0 && (
              <div className="flex items-center gap-1 shrink-0">
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                <span className="font-semibold text-sm">{safeProperty.review_rating.toFixed(1)}</span>
                <span className="text-muted-foreground text-xs">({safeProperty.review_count})</span>
              </div>
            )}
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

          {/* Featured Amenities - Just title, not clickable */}
          {safeProperty.featured_amenities.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {safeProperty.featured_amenities.slice(0, 3).map((amenity: any, index: number) => (
                <div
                  key={index}
                  className="flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-1 rounded-full border border-primary/20"
                >
                  <span className="font-medium">{amenity.title}</span>
                </div>
              ))}
              {safeProperty.amenities.length > 3 && (
                <div className="text-xs text-muted-foreground font-medium px-2 py-1">
                  +{safeProperty.amenities.length - 3} more
                </div>
              )}
            </div>
          )}

          {/* Price and CTA */}
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-foreground">
                  {Math.round((safeProperty.price_per_night || 0) * 1.1).toLocaleString()} {safeProperty.currency}
                </span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="w-4 h-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <div className="space-y-1">
                        <p className="font-semibold">Total price includes service fee</p>
                        <p className="text-xs">
                          Base: {Math.round((safeProperty.price_per_night || 0)).toLocaleString()} {safeProperty.currency}
                        </p>
                        <p className="text-xs">
                          Service fee (10%): {Math.round(((safeProperty.price_per_night || 0) * 0.1)).toLocaleString()} {safeProperty.currency}
                        </p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <span className="text-muted-foreground text-sm">/night incl. fees</span>
              {(() => {
                const totalPerNight = Math.round((safeProperty.price_per_night || 0) * 1.1 * 100);
                const converted = convertForDisplay(totalPerNight, safeProperty.currency);
                return converted ? (
                  <span className="text-xs text-muted-foreground">{converted.formatted}/night</span>
                ) : null;
              })()}
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
