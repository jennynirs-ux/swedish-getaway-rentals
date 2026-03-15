import {
  Wifi,
  Car,
  Coffee,
  Utensils,
  Waves,
  TreePine,
  Mountain,
  Home,
  Bed,
  Bath,
  Users,
  Flame,
  UtensilsCrossed,
  Thermometer,
  Shield,
  Tv,
  Dumbbell,
  PawPrint,
  Snowflake,
  Anchor,
  Sparkles,
  Droplets,
  HeartHandshake,
  Cigarette,
  Sun,
  Wind,
  LucideIcon
} from "lucide-react";

/**
 * Unified amenity icon mapping for all amenities across the application.
 * Handles both exact matches and partial matches for flexibility.
 */
export const amenityIconMap: Record<string, LucideIcon> = {
  // Water & Beach Amenities
  "lake access": Waves,
  "ocean access": Waves,
  "beach access": Waves,
  "water access": Waves,
  "pool": Droplets,
  "swimming": Droplets,

  // Technology
  "wifi": Wifi,
  "internet": Wifi,

  // Parking & Transportation
  "parking": Car,
  "garage": Car,

  // Dining & Kitchen
  "kitchen": UtensilsCrossed,
  "coffee": Coffee,
  "dining": Utensils,
  "restaurant": Utensils,

  // Recreation & Entertainment
  "hot tub": Sparkles,
  "jacuzzi": Sparkles,
  "spa": Sparkles,
  "sauna": Flame,
  "fireplace": Flame,
  "tv": Tv,
  "television": Tv,
  "gym": Dumbbell,
  "fitness": Dumbbell,
  "game": Dumbbell,
  "book": Dumbbell,

  // Water Activities
  "boat": Anchor,
  "canoe": Anchor,
  "kayak": Anchor,

  // Nature & Views
  "forest": TreePine,
  "nature": TreePine,
  "mountain": Mountain,
  "view": Mountain,
  "outdoor": Sun,
  "garden": TreePine,
  "bbq": UtensilsCrossed,

  // Comfort
  "bed": Bed,
  "bedroom": Bed,
  "bathroom": Bath,
  "bath": Bath,
  "towel": Bath,
  "linen": Bath,

  // Climate Control
  "heating": Thermometer,
  "warm": Thermometer,
  "air conditioning": Snowflake,
  "ac": Snowflake,
  "air": Snowflake,
  "cooling": Snowflake,

  // Guests & Amenities
  "guest": Users,
  "people": Users,

  // Safety & Pets
  "security": Shield,
  "safe": Shield,
  "pet": PawPrint,
  "dog": PawPrint,
  "smoking": Cigarette,
  "romantic": HeartHandshake,
  "wind": Wind,
  "fan": Wind,
};

/**
 * Get the appropriate icon component for an amenity string.
 * Returns Home icon as fallback if no match is found.
 */
export function getAmenityIcon(amenity: unknown): LucideIcon {
  if (typeof amenity !== "string" || !amenity) {
    return Home;
  }

  const lower = amenity.toLowerCase().trim();

  // Exact matches first for consistency
  if (amenityIconMap[lower]) {
    return amenityIconMap[lower];
  }

  // Partial matches for flexibility
  for (const [key, icon] of Object.entries(amenityIconMap)) {
    if (lower.includes(key) || key.includes(lower)) {
      return icon;
    }
  }

  return Home;
}
