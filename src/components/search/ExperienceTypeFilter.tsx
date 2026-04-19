// @ts-nocheck
import { Card } from "@/components/ui/card";
import { Mountain, Waves, Trees, Building, Snowflake, Flame, Sun, Tent } from "lucide-react";

export type ExperienceType =
  | "ski"
  | "lake"
  | "forest"
  | "city"
  | "northern_lights"
  | "sauna"
  | "summer"
  | "glamping";

export const EXPERIENCE_TYPES: {
  id: ExperienceType;
  label: string;
  Icon: typeof Mountain;
  description: string;
  /** Keywords to match against property description/title/amenities */
  keywords: string[];
}[] = [
  {
    id: "ski",
    label: "Ski & Mountain",
    Icon: Mountain,
    description: "Close to slopes and winter sports",
    keywords: ["ski", "slope", "mountain", "alpine", "piste", "snowboard", "backe", "skidor"],
  },
  {
    id: "lake",
    label: "Lakeside",
    Icon: Waves,
    description: "On or near a lake",
    keywords: ["lake", "waterfront", "sjö", "sjo", "strand", "vatten"],
  },
  {
    id: "forest",
    label: "Forest Retreat",
    Icon: Trees,
    description: "Surrounded by nature",
    keywords: ["forest", "woods", "skog", "nature", "wilderness", "secluded"],
  },
  {
    id: "city",
    label: "City Break",
    Icon: Building,
    description: "In or near a city center",
    keywords: ["city", "downtown", "centrum", "center", "stad", "urban"],
  },
  {
    id: "northern_lights",
    label: "Northern Lights",
    Icon: Snowflake,
    description: "Aurora viewing spots",
    keywords: ["aurora", "northern lights", "norrsken", "polar", "arctic", "lapland"],
  },
  {
    id: "sauna",
    label: "Sauna Included",
    Icon: Flame,
    description: "Property has a sauna",
    keywords: ["sauna", "bastu"],
  },
  {
    id: "summer",
    label: "Summer House",
    Icon: Sun,
    description: "Classic Swedish summer",
    keywords: ["summer", "sommar", "cottage", "stuga", "garden", "trädgård"],
  },
  {
    id: "glamping",
    label: "Glamping",
    Icon: Tent,
    description: "Unique outdoor stays",
    keywords: ["glamping", "tent", "dome", "yurt", "treehouse", "trädkoja", "unique"],
  },
];

interface Props {
  selected: ExperienceType | null;
  onSelect: (type: ExperienceType | null) => void;
}

/**
 * Horizontal scrollable bar of experience type filter chips.
 * Click a chip to filter properties by that experience; click again to clear.
 *
 * Matching is client-side (see matchesExperienceType below) based on
 * keywords in property title/description/amenities, so no schema change
 * is needed to enable this feature.
 */
const ExperienceTypeFilter = ({ selected, onSelect }: Props) => {
  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex gap-2 min-w-min">
        {EXPERIENCE_TYPES.map((t) => {
          const active = selected === t.id;
          const Icon = t.Icon;
          return (
            <Card
              key={t.id}
              onClick={() => onSelect(active ? null : t.id)}
              className={`cursor-pointer px-4 py-3 shrink-0 transition-all hover:shadow-md ${
                active
                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                  : "hover:border-foreground/20"
              }`}
              title={t.description}
            >
              <div className="flex items-center gap-2">
                <Icon className={`h-4 w-4 ${active ? "text-primary" : "text-muted-foreground"}`} />
                <span className={`text-sm font-medium whitespace-nowrap ${active ? "text-primary" : ""}`}>
                  {t.label}
                </span>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default ExperienceTypeFilter;

/**
 * Check if a property matches a given experience type based on its
 * title, description, location, and amenities array.
 */
export function matchesExperienceType(
  property: {
    title?: string | null;
    description?: string | null;
    location?: string | null;
    amenities?: string[] | null;
  },
  type: ExperienceType,
): boolean {
  const typeDef = EXPERIENCE_TYPES.find((t) => t.id === type);
  if (!typeDef) return false;

  const haystack = [
    property.title || "",
    property.description || "",
    property.location || "",
    ...(Array.isArray(property.amenities) ? property.amenities : []),
  ]
    .join(" ")
    .toLowerCase();

  return typeDef.keywords.some((kw) => haystack.includes(kw.toLowerCase()));
}
