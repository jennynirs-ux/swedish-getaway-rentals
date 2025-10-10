import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  Wifi, TreePine, Waves, Anchor, Bed, Bath, Sparkles, Coffee, Utensils, 
  Mountain, Home, Flame, UtensilsCrossed, Car, Thermometer, Tv, 
  Dumbbell, PawPrint, Snowflake, Droplets, HeartHandshake, Cigarette, Sun, Wind 
} from "lucide-react";
import LazyImage from "./LazyImage";

interface AmenityDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  amenity: {
    icon: string;
    title: string;
    tagline?: string;
    description?: string;
    image_url?: string;
    features?: string[];
  } | null;
}

const getAmenityIcon = (iconName: string) => {
  const lower = iconName?.toLowerCase() || "";
  
  if (lower.includes("wifi") || lower.includes("internet")) return Wifi;
  if (lower.includes("lake") || lower.includes("ocean") || lower.includes("beach")) return Waves;
  if (lower.includes("parking") || lower.includes("garage")) return Car;
  if (lower.includes("coffee")) return Coffee;
  if (lower.includes("kitchen")) return UtensilsCrossed;
  if (lower.includes("boat") || lower.includes("canoe") || lower.includes("kayak")) return Anchor;
  if (lower.includes("dining") || lower.includes("restaurant")) return Utensils;
  if (lower.includes("jacuzzi") || lower.includes("spa") || lower.includes("hot tub")) return Sparkles;
  if (lower.includes("pool") || lower.includes("swimming")) return Droplets;
  if (lower.includes("forest") || lower.includes("nature")) return TreePine;
  if (lower.includes("mountain") || lower.includes("view")) return Mountain;
  if (lower.includes("bedroom") || lower.includes("bed")) return Bed;
  if (lower.includes("bathroom") || lower.includes("bath")) return Bath;
  if (lower.includes("fireplace") || lower.includes("fire") || lower.includes("sauna")) return Flame;
  if (lower.includes("heating") || lower.includes("warm")) return Thermometer;
  if (lower.includes("ac") || lower.includes("air") || lower.includes("cooling")) return Snowflake;
  if (lower.includes("tv") || lower.includes("television")) return Tv;
  if (lower.includes("gym") || lower.includes("fitness")) return Dumbbell;
  if (lower.includes("pet") || lower.includes("dog")) return PawPrint;
  if (lower.includes("smoking")) return Cigarette;
  if (lower.includes("outdoor") || lower.includes("sun")) return Sun;
  if (lower.includes("wind") || lower.includes("fan")) return Wind;
  if (lower.includes("romantic")) return HeartHandshake;
  
  return Home;
};

export const AmenityDetailDialog = ({ open, onOpenChange, amenity }: AmenityDetailDialogProps) => {
  if (!amenity) return null;

  const IconComponent = getAmenityIcon(amenity.icon || amenity.title);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-2xl">
            <div className="text-primary">
              <IconComponent className="w-8 h-8" />
            </div>
            {amenity.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Tagline */}
          {amenity.tagline && (
            <p className="text-lg text-muted-foreground italic">
              {amenity.tagline}
            </p>
          )}

          {/* Image */}
          {amenity.image_url && (
            <div className="rounded-lg overflow-hidden">
              <LazyImage
                src={amenity.image_url}
                alt={amenity.title}
                className="w-full h-64 object-cover"
                fallbackSrc="/placeholder.jpg"
              />
            </div>
          )}

          {/* Description */}
          {amenity.description && (
            <div className="prose prose-sm max-w-none">
              <p className="text-foreground">{amenity.description}</p>
            </div>
          )}

          {/* Features */}
          {amenity.features && amenity.features.length > 0 && (
            <div>
              <h4 className="font-semibold text-lg mb-3">Features</h4>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {amenity.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">✓</span>
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
