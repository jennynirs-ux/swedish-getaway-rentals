// @ts-nocheck
import { MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export type NordicRegion =
  | "stockholm"
  | "goteborg"
  | "malmo"
  | "dalarna"
  | "are"
  | "lapland"
  | "skane"
  | "bohuslan"
  | "gotland"
  | "oslo"
  | "bergen"
  | "lofoten"
  | "copenhagen"
  | "helsinki"
  | "rovaniemi";

export const NORDIC_REGIONS: {
  id: NordicRegion;
  label: string;
  country: "SE" | "NO" | "DK" | "FI";
  /** Matching keywords for the property's location field */
  keywords: string[];
}[] = [
  // Sweden
  { id: "stockholm", label: "Stockholm", country: "SE", keywords: ["stockholm"] },
  { id: "goteborg", label: "Göteborg", country: "SE", keywords: ["göteborg", "goteborg", "gothenburg"] },
  { id: "malmo", label: "Malmö", country: "SE", keywords: ["malmö", "malmo"] },
  { id: "dalarna", label: "Dalarna", country: "SE", keywords: ["dalarna", "mora", "leksand", "sälen", "salen"] },
  { id: "are", label: "Åre", country: "SE", keywords: ["åre", "are", "jämtland", "jamtland"] },
  { id: "lapland", label: "Swedish Lapland", country: "SE", keywords: ["lapland", "kiruna", "abisko", "jukkasjärvi", "norrland"] },
  { id: "skane", label: "Skåne", country: "SE", keywords: ["skåne", "skane", "lund", "ystad"] },
  { id: "bohuslan", label: "Bohuslän", country: "SE", keywords: ["bohuslän", "bohuslan", "marstrand", "smögen", "smogen"] },
  { id: "gotland", label: "Gotland", country: "SE", keywords: ["gotland", "visby"] },
  // Norway
  { id: "oslo", label: "Oslo", country: "NO", keywords: ["oslo"] },
  { id: "bergen", label: "Bergen", country: "NO", keywords: ["bergen"] },
  { id: "lofoten", label: "Lofoten", country: "NO", keywords: ["lofoten"] },
  // Denmark
  { id: "copenhagen", label: "Copenhagen", country: "DK", keywords: ["copenhagen", "köpenhamn", "kobenhavn"] },
  // Finland
  { id: "helsinki", label: "Helsinki", country: "FI", keywords: ["helsinki", "helsingfors"] },
  { id: "rovaniemi", label: "Rovaniemi", country: "FI", keywords: ["rovaniemi", "lapland finland", "finnish lapland"] },
];

const COUNTRY_FLAGS: Record<string, string> = {
  SE: "🇸🇪",
  NO: "🇳🇴",
  DK: "🇩🇰",
  FI: "🇫🇮",
};

interface Props {
  selected: NordicRegion | null;
  onSelect: (region: NordicRegion | null) => void;
}

const RegionFilter = ({ selected, onSelect }: Props) => {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium">
        <MapPin className="h-4 w-4" />
        Region
      </div>
      <div className="flex flex-wrap gap-2">
        {NORDIC_REGIONS.map((r) => {
          const active = selected === r.id;
          return (
            <Badge
              key={r.id}
              variant={active ? "default" : "outline"}
              className="cursor-pointer text-sm px-3 py-1"
              onClick={() => onSelect(active ? null : r.id)}
            >
              <span className="mr-1">{COUNTRY_FLAGS[r.country]}</span>
              {r.label}
            </Badge>
          );
        })}
      </div>
    </div>
  );
};

export default RegionFilter;

/**
 * Check if a property's location matches a given region.
 */
export function matchesRegion(
  property: { location?: string | null },
  region: NordicRegion,
): boolean {
  const regionDef = NORDIC_REGIONS.find((r) => r.id === region);
  if (!regionDef) return false;

  const loc = (property.location || "").toLowerCase();
  return regionDef.keywords.some((kw) => loc.includes(kw.toLowerCase()));
}
