import { Link } from "@/i18n/router";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import LazyImage from "@/components/LazyImage";
import { 
  MapPin, 
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
  Wind,
  Star
} from "lucide-react";
import { useState, memo, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { AmenityDetailDialog } from "./AmenityDetailDialog";
import { propertyPath } from "@/lib/propertySeo";
import { PROPERTY_CONTENT } from "@/content/propertyContent";
import { withServiceFee } from "@/lib/constants";
import { isNewListing } from "@/lib/homeListings";
import { type Copy, type Lang, localizedPath, useCopy, useLang, useLocale } from "@/i18n";

const en = {
  property: "Property",
  isNew: "New",
  sweden: "Sweden",
  inSweden: (town: string) => `${town}, Sweden`,
  reviews: (n: number, onAirbnb: boolean) => `${n} reviews${onAirbnb ? " on Airbnb" : ""}`,
  guests: (n: number) => `${n} guests`,
  bedrooms: (n: number) => `${n} ${n === 1 ? "bedroom" : "bedrooms"}`,
  bathrooms: (n: number) => `${n} ${n === 1 ? "bathroom" : "bathrooms"}`,
  moreAmenities: (n: number) => `+${n} amenities`,
  perNight: "/night incl. service fee",
  checkAvailability: "Check availability",
  favoriteAdded: "Added to favorites",
  favoriteRemoved: "Removed from favorites",
  favoriteAddedText: (title: string) => `${title} added to your favorites`,
  favoriteRemovedText: (title: string) => `${title} removed from your favorites`,
  linkCopied: "Link copied",
  linkCopiedText: "Link has been copied to clipboard",
};
const COPY: Copy<typeof en> = {
  en,
  sv: {
    property: "Boende",
    isNew: "Ny",
    sweden: "Sverige",
    inSweden: (town) => `${town}, Sverige`,
    reviews: (n, onAirbnb) => `${n} ${n === 1 ? "omdöme" : "omdömen"}${onAirbnb ? " på Airbnb" : ""}`,
    guests: (n) => `${n} ${n === 1 ? "gäst" : "gäster"}`,
    bedrooms: (n) => `${n} sovrum`,
    // Half bathrooms (a toilet without a shower): "1,5"
    bathrooms: (n) => `${String(n).replace(".", ",")} badrum`,
    moreAmenities: (n) => `+${n} bekvämligheter`,
    perNight: "/natt inkl. serviceavgift",
    checkAvailability: "Se lediga datum",
    favoriteAdded: "Sparad i favoriter",
    favoriteRemoved: "Borttagen från favoriter",
    favoriteAddedText: (title) => `${title} har sparats i dina favoriter`,
    favoriteRemovedText: (title) => `${title} har tagits bort från dina favoriter`,
    linkCopied: "Länken har kopierats",
    linkCopiedText: "Länken finns nu i urklipp",
  },
  de: {
    property: "Unterkunft",
    isNew: "Neu",
    sweden: "Schweden",
    inSweden: (town) => `${town}, Schweden`,
    reviews: (n, onAirbnb) => `${n} ${n === 1 ? "Bewertung" : "Bewertungen"}${onAirbnb ? " auf Airbnb" : ""}`,
    guests: (n) => `${n} ${n === 1 ? "Gast" : "Gäste"}`,
    bedrooms: (n) => `${n} Schlafzimmer`,
    bathrooms: (n) => `${String(n).replace(".", ",")} ${n === 1 ? "Bad" : "Bäder"}`,
    moreAmenities: (n) => `+${n} Ausstattungsmerkmale`,
    perNight: "/Nacht inkl. Servicegebühr",
    checkAvailability: "Verfügbarkeit prüfen",
    favoriteAdded: "Zu Favoriten hinzugefügt",
    favoriteRemoved: "Aus Favoriten entfernt",
    favoriteAddedText: (title) => `${title} ist jetzt in deinen Favoriten`,
    favoriteRemovedText: (title) => `${title} wurde aus deinen Favoriten entfernt`,
    linkCopied: "Link kopiert",
    linkCopiedText: "Der Link ist in der Zwischenablage",
  },
};

// Hosts pick the type from a fixed English list (HostBasicTab); older listings may differ in case
const PROPERTY_TYPE_NAMES: Copy<Record<string, string>> = {
  en: {},
  sv: { cabin: "Stuga", cottage: "Torp", house: "Hus", villa: "Villa", apartment: "Lägenhet", studio: "Studio", chalet: "Fjällstuga", loft: "Loft" },
  de: { cabin: "Ferienhaus", cottage: "Landhaus", house: "Haus", villa: "Villa", apartment: "Ferienwohnung", studio: "Studio", chalet: "Chalet", loft: "Loft" },
};

/** A listing's property_type ("Cabin") in a language; types outside the list stay as the host wrote them */
export const propertyTypeName = (type: string, lang: Lang): string =>
  PROPERTY_TYPE_NAMES[lang][type.trim().toLowerCase()] ?? type;

export interface PropertyCardData {
  slug?: string | null;
  id: string;
  title: string;
  description: string;
  location: string;
  price_per_night: number;
  currency: string;
  /** Guest service fee in percent (properties.service_fee_rate) */
  service_fee_rate?: number | null;
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
  created_at?: string;
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
  const t = useCopy(COPY);
  const lang = useLang();
  const locale = useLocale();
  const [selectedAmenity, setSelectedAmenity] = useState<any>(null);
  const [isAmenityDialogOpen, setIsAmenityDialogOpen] = useState(false);

  const nickname = property.slug ? PROPERTY_CONTENT[property.slug]?.nickname : undefined;

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
  const getPropertyRoute = (p: PropertyCardData) => propertyPath(p);

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
      title: isFavorite ? t.favoriteRemoved : t.favoriteAdded,
      description: isFavorite ? t.favoriteRemovedText(safeProperty.title) : t.favoriteAddedText(safeProperty.title),
    });
  };

  const handleShare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // The page in the language the guest is reading
    const url = window.location.origin + localizedPath(getPropertyRoute(safeProperty), lang);
    if (navigator.share) {
      navigator.share({
        title: safeProperty.title,
        text: safeProperty.description,
        url,
      });
    } else {
      navigator.clipboard.writeText(url);
      toast({
        title: t.linkCopied,
        description: t.linkCopiedText,
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
            sizes="(max-width: 768px) 100vw, 420px"
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

          {/* Property Type Badge, and "New" so a listing without reviews yet doesn't look neglected */}
          <div className="absolute bottom-4 left-4 flex gap-2">
            <Badge variant="outline" className="bg-white/90 backdrop-blur-sm">
              {safeProperty.property_type ? propertyTypeName(safeProperty.property_type, lang) : t.property}
            </Badge>
            {isNewListing(safeProperty) && <Badge>{t.isNew}</Badge>}
          </div>
        </div>

        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              {/* The name guests and hosts use (Villa Häcken), then the listing title */}
              <h3 className="font-semibold text-lg leading-tight group-hover:text-primary transition-colors">
                {nickname ?? safeProperty.title}
              </h3>
              {nickname && (
                <p className="text-sm text-muted-foreground leading-snug mt-0.5">{safeProperty.title}</p>
              )}
              {safeProperty.review_rating && safeProperty.review_count ? (
                <div className="flex items-center gap-1 text-sm mt-1">
                  <Star className="w-4 h-4 fill-current text-amber-500" />
                  <span className="font-medium">
                    {Number(safeProperty.review_rating).toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  {/* Only the owners' cabins carry their Airbnb ratings over */}
                  <span className="text-muted-foreground">
                    · {t.reviews(safeProperty.review_count, !!nickname)}
                  </span>
                </div>
              ) : null}
              <div className="flex items-center text-muted-foreground text-sm mt-1">
                <MapPin className="w-4 h-4 mr-1" />
                {safeProperty.city 
                  ? t.inSweden(safeProperty.city.charAt(0).toUpperCase() + safeProperty.city.slice(1))
                  : (safeProperty.location || t.sweden)}
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
              {t.guests(safeProperty.max_guests)}
            </div>
            <div className="flex items-center">
              <Bed className="w-4 h-4 mr-1" />
              {t.bedrooms(safeProperty.bedrooms)}
            </div>
            {/* Lakehouse has 0: a dry toilet and an outdoor shower, no bathroom */}
            {safeProperty.bathrooms > 0 && (
              <div className="flex items-center">
                <Bath className="w-4 h-4 mr-1" />
                {t.bathrooms(safeProperty.bathrooms)}
              </div>
            )}
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
              {safeProperty.amenities.length > 0 && (
                <div className="text-xs text-muted-foreground font-medium px-2 py-1">
                  {t.moreAmenities(safeProperty.amenities.length)}
                </div>
              )}
            </div>
          )}

          {/* Price and CTA */}
          <div className="flex items-center justify-between gap-3">
            <div>
              {/* Label under the amount: beside it, the price broke mid-number next to the button on phones */}
              <span className="text-2xl font-bold text-foreground whitespace-nowrap">
                {Math.round(withServiceFee(safeProperty.price_per_night || 0, safeProperty.service_fee_rate)).toLocaleString(locale)} {safeProperty.currency}
              </span>
              <span className="block text-muted-foreground text-sm">{t.perNight}</span>
            </div>
            <Button className="group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
              {t.checkAvailability}
            </Button>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
});

PropertyCard.displayName = "PropertyCard";

export default PropertyCard;
