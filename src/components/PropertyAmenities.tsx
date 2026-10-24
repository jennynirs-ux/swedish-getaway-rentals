import { useState, useMemo } from "react";
import { Property } from "@/hooks/useProperties";
import { AmenityDialog } from "@/components/AmenityDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { 
  Wifi, Car, Coffee, Utensils, Waves, TreePine, Mountain, Home, 
  Bed, Bath, Users, Flame, UtensilsCrossed, Car as Parking,
  Thermometer, Shield, Tv, Dumbbell, PawPrint, Snowflake
} from "lucide-react";
import { type Copy, useCopy, useLang } from "@/i18n";
import { type ListingTranslation, translatedName } from "@/i18n/listingTexts";
import { amenityLabel } from "@/content/amenities";

type Category = "Essentials" | "Kitchen & Dining" | "Comfort" | "Entertainment" | "Outdoor" | "Other";

const en = {
  heading: "Premium Amenities",
  intro: "Everything you need for an unforgettable stay, from modern conveniences to unique experiences that celebrate Nordic culture.",
  showStandard: (n: number) => `+${n} Standard Amenities`,
  noPremium: "No premium amenities listed for this property yet.",
  standardTitle: "Standard Amenities",
  categories: {
    Essentials: "Essentials",
    "Kitchen & Dining": "Kitchen & Dining",
    Comfort: "Comfort",
    Entertainment: "Entertainment",
    Outdoor: "Outdoor",
    Other: "Other",
  } as Record<Category, string>,
};
const COPY: Copy<typeof en> = {
  en,
  sv: {
    heading: "Utvalda bekvämligheter",
    intro: "Allt du behöver för en oförglömlig vistelse – från moderna bekvämligheter till unika upplevelser i nordisk anda.",
    showStandard: (n) => `+${n} fler bekvämligheter`,
    noPremium: "Inga utvalda bekvämligheter har lagts till för det här boendet än.",
    standardTitle: "Fler bekvämligheter",
    categories: {
      Essentials: "Grundläggande",
      "Kitchen & Dining": "Kök och matplats",
      Comfort: "Komfort",
      Entertainment: "Underhållning",
      Outdoor: "Utomhus",
      Other: "Övrigt",
    },
  },
  de: {
    heading: "Besondere Ausstattung",
    intro: "Alles für einen unvergesslichen Aufenthalt – von modernem Komfort bis zu besonderen Erlebnissen ganz im Zeichen nordischer Kultur.",
    showStandard: (n) => `+${n} weitere Ausstattungsmerkmale`,
    noPremium: "Für diese Unterkunft ist noch keine besondere Ausstattung angegeben.",
    standardTitle: "Weitere Ausstattung",
    categories: {
      Essentials: "Grundausstattung",
      "Kitchen & Dining": "Küche & Essen",
      Comfort: "Komfort",
      Entertainment: "Unterhaltung",
      Outdoor: "Außenbereich",
      Other: "Sonstiges",
    },
  },
};

interface PropertyAmenitiesProps {
  /** The listing as guests read it (translated) */
  property: Property;
  /** The host's own listing, for matching names to icons; defaults to property */
  original?: Property;
  /** The listing's translations, for amenity names we have no label for */
  translation?: ListingTranslation;
}

interface AmenityData {
  icon: any;
  title: string;
  tagline: string;
  description: string;
  image_url?: string;
  features?: string[];
}

export const PropertyAmenities = ({ property, original = property, translation }: PropertyAmenitiesProps) => {
  const t = useCopy(COPY);
  const lang = useLang();
  const [selectedAmenity, setSelectedAmenity] = useState<AmenityData | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [showAllAmenities, setShowAllAmenities] = useState(false);

  // Icon mapping for amenities
  const getAmenityIcon = (amenity: string) => {
    const amenityLower = amenity.toLowerCase();
    if (amenityLower.includes('wifi') || amenityLower.includes('internet')) return Wifi;
    if (amenityLower.includes('parking') || amenityLower.includes('garage')) return Parking;
    if (amenityLower.includes('coffee') || amenityLower.includes('kitchen')) return Coffee;
    if (amenityLower.includes('dining') || amenityLower.includes('restaurant')) return Utensils;
    if (amenityLower.includes('sauna') || amenityLower.includes('spa') || amenityLower.includes('hot tub')) return Waves;
    if (amenityLower.includes('forest') || amenityLower.includes('nature')) return TreePine;
    if (amenityLower.includes('view') || amenityLower.includes('mountain')) return Mountain;
    if (amenityLower.includes('bedroom') || amenityLower.includes('bed')) return Bed;
    if (amenityLower.includes('bathroom') || amenityLower.includes('bath')) return Bath;
    if (amenityLower.includes('guest') || amenityLower.includes('people')) return Users;
    if (amenityLower.includes('fireplace') || amenityLower.includes('fire')) return Flame;
    if (amenityLower.includes('heating') || amenityLower.includes('warm')) return Thermometer;
    if (amenityLower.includes('security') || amenityLower.includes('safe')) return Shield;
    if (amenityLower.includes('tv') || amenityLower.includes('television')) return Tv;
    if (amenityLower.includes('gym') || amenityLower.includes('fitness')) return Dumbbell;
    if (amenityLower.includes('pet') || amenityLower.includes('dog')) return PawPrint;
    if (amenityLower.includes('air') || amenityLower.includes('cooling')) return Snowflake;
    return Home;
  };

  // Helper function to categorize amenities
  const categorizeAmenity = (title: string): Category => {
    const lower = title.toLowerCase();
    if (lower.includes('wifi') || lower.includes('parking') || lower.includes('heating')) return "Essentials";
    if (lower.includes('kitchen') || lower.includes('coffee') || lower.includes('dining')) return "Kitchen & Dining";
    if (lower.includes('bed') || lower.includes('bath') || lower.includes('towel') || lower.includes('linen')) return "Comfort";
    if (lower.includes('tv') || lower.includes('game') || lower.includes('book')) return "Entertainment";
    if (lower.includes('outdoor') || lower.includes('garden') || lower.includes('bbq') || lower.includes('pool') || lower.includes('sauna')) return "Outdoor";
    return "Other";
  };

  // Premium amenities are from amenities_data, excluding featured ones. Which
  // ones and their icons follow the host's own words; the text shown is the
  // translated entry in the same place
  const premiumAmenities: AmenityData[] = useMemo(() => {
    const amenitiesData = (original.amenities_data || []) as any[];
    const shownData = (property.amenities_data || []) as any[];
    const featuredAmenities = (original.featured_amenities || []) as any[];
    const featuredTitles = featuredAmenities.map((fa: any) => fa.title?.toLowerCase());
    
    return amenitiesData
      .map((amenity: any, index: number) => ({ amenity, shown: shownData[index] ?? amenity }))
      .filter(({ amenity }) => {
        const title = (amenity.title || amenity.name || '').toLowerCase();
        return !featuredTitles.includes(title);
      })
      .map(({ amenity, shown }) => ({
        icon: getAmenityIcon(amenity.icon || amenity.title || amenity.name),
        title: shown.title || shown.name || '',
        tagline: shown.tagline || shown.description || '',
        description: shown.description || '',
        image_url: shown.image_url,
        features: shown.features || []
      }));
  }, [original.amenities_data, original.featured_amenities, property.amenities_data]);

  // Standard amenities - from basic amenities array only
  const standardAmenitiesByCategory = useMemo(() => {
    const categories: Record<Category, AmenityData[]> = {
      "Essentials": [],
      "Kitchen & Dining": [],
      "Comfort": [],
      "Entertainment": [],
      "Outdoor": [],
      "Other": []
    };

    // Process basic amenities array only
    if (property.amenities && Array.isArray(property.amenities)) {
      property.amenities.forEach((amenity: string) => {
        const amenityData: AmenityData = {
          // Icons and categories match the English name; guests see the label
          icon: getAmenityIcon(amenity),
          title: amenityLabel(amenity, lang) ?? translatedName(translation, `amenity:${amenity}`, amenity),
          tagline: `Enjoy ${amenity.toLowerCase()} during your stay`,
          description: property.amenities_descriptions?.[amenity] || `Experience ${amenity.toLowerCase()} during your stay.`,
          image_url: undefined,
          features: []
        };
        
        const category = categorizeAmenity(amenity);
        categories[category].push(amenityData);
      });
    }

    return categories;
  }, [property.amenities, property.amenities_descriptions, lang, translation]);

  const totalStandardAmenities = Object.values(standardAmenitiesByCategory).flat().length;

  const handleAmenityClick = (amenity: AmenityData) => {
    setSelectedAmenity(amenity);
    setIsDialogOpen(true);
  };

  if (!premiumAmenities.length && totalStandardAmenities === 0) {
    return null;
  }

  return (
    <section id="amenities" className="py-16 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              {t.heading}
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              {t.intro}
            </p>
          </div>

          {/* Premium Amenities Grid */}
          {premiumAmenities.length > 0 ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {premiumAmenities.map((amenity, index) => (
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

              {/* Show Standard Amenities Button */}
              {totalStandardAmenities > 0 && (
                <div className="text-center mt-6">
                  <Button
                    variant="outline"
                    onClick={() => setShowAllAmenities(true)}
                    className="text-primary"
                  >
                    {t.showStandard(totalStandardAmenities)}
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground text-lg">
                {t.noPremium}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Amenity Detail Dialog */}
      <AmenityDialog 
        amenity={selectedAmenity}
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
      />

      {/* All Standard Amenities Dialog */}
      <Dialog open={showAllAmenities} onOpenChange={setShowAllAmenities}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t.standardTitle}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 mt-4">
            {Object.entries(standardAmenitiesByCategory).map(([category, amenities]) => {
              if (amenities.length === 0) return null;
              return (
                <div key={category}>
                  <h3 className="text-lg font-semibold mb-3">{t.categories[category as Category]}</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {amenities.map((amenity, index) => (
                      <div 
                        key={index}
                        className="flex items-center gap-3 p-3 rounded-lg bg-muted/30"
                      >
                        <div className="flex-shrink-0">
                          <amenity.icon className="h-5 w-5 text-primary" />
                        </div>
                        <span className="text-sm font-medium">{amenity.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default PropertyAmenities;