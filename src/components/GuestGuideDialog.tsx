import { useState, useMemo, useEffect, type ElementType, lazy, Suspense } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Share2,
  Download,
  Home,
  MapPin,
  Wifi,
  BookOpen,
  Key,
  Info,
  LogOut,
  Heart,
  CheckSquare,
  Coffee,
  Utensils,
  Cog,
  Landmark,
  Shield,
  Star,
  SmilePlus,
  Ban,
  Volume2,
  Clock,
  Apple,
  Newspaper,
  Package,
  Wine,
  Trash2,
  Skull,
  Recycle,
  CheckCircle,
} from "lucide-react";
import { Property } from "@/hooks/useProperties";

const LeafletPropertyMapBasic = lazy(() => import("@/components/maps/LeafletPropertyMapBasic"));

type SectionType = "text" | "list" | "checkbox" | "custom";
type BlockType = "text" | "list" | "checkbox" | "map";

interface GuidebookBlock {
  id: string;
  type: BlockType;
  title?: string;
  content?: string;
  items?: string[];
  mapPins?: Array<{ lat: number; lng: number; label: string; address?: string }>;
}

// GuidebookSection type is used internally via allSections

interface GuideSection {
  id: string;
  title: string;
  content?: string;
  items?: string[];
  type?: SectionType;
  image_url?: string;
  icon?: ElementType;
  blocks?: GuidebookBlock[];
}

interface GuestGuideDialogProps {
  isOpen: boolean;
  onClose: () => void;
  property: Property;
  initialSectionId?: string;
}

const GuestGuideDialog = ({ isOpen, onClose, property, initialSectionId }: GuestGuideDialogProps) => {
  const { toast } = useToast();
  const [activeIndex, setActiveIndex] = useState(0);

  const defaultSections: GuideSection[] = [
    { id: "home", title: "Welcome Home", icon: Home, type: "text", content: "Welcome to our property! We’re excited to host you." },
    { id: "directions", title: "Directions", icon: MapPin, type: "list", items: [
      "By car: Take E20 and exit at Lerum. Parking on site.",
      "By public transport: Train to Lerum station, then bus 533."
    ]},
    { id: "stop", title: "Stop on the way", icon: Coffee, type: "list", items: ["ICA Kvantum – groceries", "Shell – gas & snacks", "Local shop – firewood"] },
    { id: "checkin", title: "Check-in", icon: Key, type: "list", items: ["Check-in: 15:00", "Keys in lockbox", "Parking in front of house"] },
    { id: "wifi", title: "Wi-Fi", icon: Wifi, type: "list", items: ["Network: Guest_Wifi", "Password: Welcome2024"] },
    { id: "kitchen", title: "Kitchen", icon: Utensils, type: "list", items: ["Oven", "Coffee machine", "Dishwasher"] },
    { id: "howthingswork", title: "How things work", icon: Cog, type: "checkbox", items: ["Oven: press power + start", "Coffee maker: fill water + brew", "Heating: adjust thermostat"] },
    { id: "waste", title: "Waste & Recycling", icon: Recycle, type: "custom" },
    { id: "places", title: "Places to visit", icon: Landmark, type: "list", items: ["Lake Aspen – swimming", "Skatås reserve", "Gothenburg – 20 min by train"] },
    { id: "customs", title: "Swedish customs", icon: BookOpen, type: "list", items: ["No shoes indoors", "Fika tradition", "Alcohol only at Systembolaget"] },
    { id: "rules", title: "House Rules", icon: Shield, type: "custom" },
    { id: "checkout", title: "Check-out", icon: LogOut, type: "checkbox", items: ["Empty trash", "Remove linens", "Close windows & lights", "Lock doors"] },
    { id: "ratings", title: "Star Ratings", icon: Star, type: "custom" },
    { id: "hoststory", title: "Host Story", icon: Heart, type: "text", content: "We bought Villa Häcken in 2020 and love sharing it with guests." },
  ];

  const customSections = (property.guidebook_sections as any[]) || [];

  const allSections = useMemo(() => {
    return defaultSections.map((section) => {
      const custom = customSections.find((s: any) => s.id === section.id);
      if (custom) {
        return {
          ...section,
          ...custom,
          icon: section.icon,
          blocks: custom.blocks || undefined,
        };
      }
      return section;
    });
  }, [customSections]);

  // Set initial section when dialog opens
  useEffect(() => {
    if (isOpen && initialSectionId) {
      const index = allSections.findIndex((s) => s.id === initialSectionId);
      if (index !== -1) {
        setActiveIndex(index);
      }
    } else if (isOpen) {
      setActiveIndex(0);
    }
  }, [isOpen, initialSectionId, allSections]);

  const _getIndexById = (id: string) => allSections.findIndex((s) => s.id === id);

  const shareGuide = async () => {
    const guideUrl = `${window.location.origin}/property/${property.id}/guide`;
    try {
      if (navigator.share) {
        await navigator.share({ title: `${property.title} - Guest Guide`, url: guideUrl });
      } else {
        await navigator.clipboard.writeText(guideUrl);
        toast({ title: "Link copied!", description: "Guest guide link copied." });
      }
    } catch {
      await navigator.clipboard.writeText(guideUrl);
      toast({ title: "Link copied!", description: "Guest guide link copied." });
    }
  };

  const exportToPDF = async () => {
    const { generateGuidebookPdf } = await import("@/lib/generateGuidePdf");
    await generateGuidebookPdf(
      property.title,
      allSections.map((s) => ({
        title: s.title,
        content: s.content,
        items: s.items,
        blocks: s.blocks,
      }))
    );
    toast({ title: "PDF Downloaded", description: "Guidebook saved successfully!" });
  };

  const renderSectionContent = (section: GuideSection) => {
    // If the section has blocks (new format from GuidebookEditorEnhanced), render those
    if (section.blocks && section.blocks.length > 0) {
      return (
        <div className="space-y-6">
          {section.blocks.map((block) => (
            <div key={block.id}>
              {block.title && <h3 className="font-semibold text-lg mb-2">{block.title}</h3>}
              
              {block.type === "text" && block.content && (
                <p className="text-muted-foreground whitespace-pre-wrap">{block.content}</p>
              )}
              
              {block.type === "list" && block.items && block.items.length > 0 && (
                <ul className="list-disc pl-5 space-y-2">
                  {block.items.map((item, idx) => (
                    <li key={idx} className="text-muted-foreground">{item}</li>
                  ))}
                </ul>
              )}
              
              {block.type === "checkbox" && block.items && block.items.length > 0 && (
                <ul className="space-y-2">
                  {block.items.map((item, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      <CheckSquare className="h-4 w-4 text-primary flex-shrink-0" />
                      <span className="text-muted-foreground">{item}</span>
                    </li>
                  ))}
                </ul>
              )}
              
              {block.type === "map" && block.mapPins && block.mapPins.length > 0 && (
                <div className="mt-4">
                  <div className="h-[400px] rounded-lg overflow-hidden border">
                    <Suspense fallback={
                      <div className="h-full bg-muted flex items-center justify-center">
                        <p className="text-muted-foreground">Loading map...</p>
                      </div>
                    }>
                      <LeafletPropertyMapBasic
                        position={[block.mapPins[0].lat, block.mapPins[0].lng] as [number, number]}
                        propertyTitle={block.mapPins[0].label}
                        googleMapsUrl={`https://www.google.com/maps/search/?api=1&query=${block.mapPins[0].lat},${block.mapPins[0].lng}`}
                        routePositions={block.mapPins.slice(1).map(pin => [pin.lat, pin.lng] as [number, number])}
                      />
                    </Suspense>
                  </div>
                  {block.mapPins.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <h4 className="font-medium text-sm">Locations:</h4>
                      <ul className="space-y-1">
                        {block.mapPins.map((pin, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm">
                            <MapPin className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                            <div>
                              <span className="font-medium">{pin.label}</span>
                              {pin.address && <p className="text-muted-foreground text-xs">{pin.address}</p>}
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      );
    }

    // Fallback to old format for backwards compatibility
    if (section.id === "waste") {
      const wasteCategories = [
        {
          icon: Apple,
          title: "Food Waste",
          description: [
            "Fruit and vegetable scraps, tea bags, coffee grounds, eggshells, meat bones, small amounts of kitchen paper.",
            { not: "Plastic, snus, cigarettes, flowers or candles." }
          ],
          tip: "Food waste becomes biogas and biofertilizer."
        },
        {
          icon: Trash2,
          title: "Plastic Packaging",
          description: [
            "Plastic bags, bottles, refill packs, tubes, trays, crisp bags, styrofoam.",
            { not: "Plastic toys and furniture → bulky waste." }
          ],
          tip: "Recycled plastic becomes bags and recycling containers."
        },
        {
          icon: Cog,
          title: "Metal Packaging",
          description: [
            "Cans, empty spray cans, tubes, caps, lids, empty paint tins.",
            { not: "Tins with paint/glue → hazardous waste." },
            { not: "Scrap metal like pans → bulky waste." }
          ],
          tip: "Recycled metal can become wheel rims or sheet metal."
        },
        {
          icon: Newspaper,
          title: "Newspapers & Paper",
          description: [
            "Daily/weekly papers, magazines, flyers, brochures.",
            { not: "Envelopes & bound books → residual waste." }
          ],
          tip: "Old newspapers become kitchen rolls or new paper."
        },
        {
          icon: Package,
          title: "Paper Packaging",
          description: [
            "Milk/juice cartons, cardboard boxes, shoeboxes. Flatten/fold.",
            { not: "Envelopes & bound books → residual waste." }
          ],
          tip: "Paper packaging usually becomes new packaging."
        },
        {
          icon: Wine,
          title: "Glass Packaging",
          description: [
            "Clear/colored bottles & jars. Remove caps/corks.",
            { not: "Porcelain, ceramics & bulbs → bulky/hazardous waste." },
            { not: "Deposit bottles → return to store." }
          ],
          tip: "Glass becomes new bottles and jars."
        },
        {
          icon: Skull,
          title: "Residual Waste",
          description: [
            "Diapers, envelopes, dishcloths, snus, toothbrushes, hair.",
            { not: "No recyclable, hazardous or electrical waste." }
          ],
          tip: "Residual waste is used for electricity and heat."
        },
        {
          icon: Recycle,
          title: "Deposit Bottles & Cans (Pant)",
          description: [
            "Return bottles and cans with the Pant logo at stores for a refund instead of recycling."
          ],
          tip: "Pant saves resources and gives you money back."
        },
      ];

      return (
        <div className="grid gap-6">
          <p className="text-muted-foreground">
            Recycling saves raw materials and energy – every item you sort makes a difference!
          </p>

          {wasteCategories.map((cat, index) => {
            const Icon = cat.icon;
            return (
              <div
                key={index}
                className="flex flex-col sm:flex-row gap-4 p-6 bg-card border rounded-lg hover:shadow-md transition-shadow"
              >
                <div className="flex-shrink-0 p-3 bg-primary/10 rounded-lg self-start">
                  <Icon className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-1">{cat.title}</h3>
                  {cat.description.map((desc, i) =>
                    typeof desc === "string" ? (
                      <p key={i} className="flex items-center gap-2 text-sm mb-1">
                        <CheckCircle className="h-4 w-4 text-success" />
                        <span className="text-muted-foreground">{desc}</span>
                      </p>
                    ) : (
                      <p key={i} className="flex items-center gap-2 text-sm mb-1">
                        <Ban className="h-4 w-4 text-destructive" />
                        <span className="text-muted-foreground">{desc.not}</span>
                      </p>
                    )
                  )}
                  <p className="text-xs text-primary font-medium mt-1">{cat.tip}</p>
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    if (section.id === "rules") {
      const houseRules = [
        { icon: Ban, rule: "No smoking indoors", description: "Smoking is only allowed outside" },
        { icon: Volume2, rule: "No parties", description: "Respect the neighbors" },
        { icon: SmilePlus, rule: "No pets", description: "Pets are not allowed" },
        { icon: Clock, rule: "Quiet 22–07", description: "Respect quiet hours" },
        { icon: Recycle, rule: "Recycle", description: "Separate waste properly" },
        { icon: Heart, rule: "Enjoy!", description: "Relax and feel at home" },
      ];
      return (
        <div className="grid gap-6">
          {houseRules.map((rule, index) => {
            const Icon = rule.icon;
            return (
              <div key={index} className="flex items-start gap-4 p-6 bg-card border rounded-lg">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <Icon className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-1">{rule.rule}</h3>
                  <p className="text-muted-foreground text-sm">{rule.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    if (section.id === "ratings") {
      const ratingInfo = [
        { stars: 5, text: "Perfection doesn’t exist, but we were happy!" },
        { stars: 4, text: "A few issues, but we still enjoyed our stay." },
        { stars: 3, text: "Major issues, most likely won’t return." },
        { stars: 2, text: "Close the house down!" },
        { stars: 1, text: "Burn it!" },
      ];
      return (
        <div className="space-y-6">
          <p className="text-muted-foreground">
            Your review matters! Please let us know of any problem during your stay and we will do our best to fix it. We strive for a 5 star experience!
          </p>
          {ratingInfo.map((rating, index) => (
            <div key={index} className="flex items-start gap-3">
              <div className="flex gap-1 mt-1">
                {[...Array(rating.stars)].map((_, i) => (
                  <Star key={i} className="h-5 w-5 text-[#8B4513]" fill="#8B4513" />
                ))}
              </div>
              <p className="text-muted-foreground">{rating.text}</p>
            </div>
          ))}
        </div>
      );
    }

    if (section.type === "list" && section.items) {
      return (
        <div className="grid gap-3">
          {section.items.map((item, idx) => (
            <div key={idx} className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg border border-border/50">
              <div className="p-1.5 bg-primary/10 rounded-md mt-0.5">
                <Info className="h-3.5 w-3.5 text-primary" />
              </div>
              <span className="text-sm leading-relaxed">{item}</span>
            </div>
          ))}
        </div>
      );
    }
    if (section.type === "checkbox" && section.items) {
      return (
        <div className="grid gap-3">
          {section.items.map((item, idx) => (
            <div key={idx} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg border border-border/50">
              <CheckSquare className="h-4 w-4 text-primary flex-shrink-0" />
              <span className="text-sm">{item}</span>
            </div>
          ))}
        </div>
      );
    }
    return (
      <div className="p-4 bg-muted/20 rounded-lg border border-border/50">
        <p className="text-muted-foreground leading-relaxed">{section.content}</p>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl h-[90vh] flex flex-col p-0">
        <div className="flex-1 flex m-0 h-full">
          <TooltipProvider>
            <nav className="w-28 border-r border-muted/20 bg-card/50 flex flex-col items-center py-6 gap-6 overflow-y-auto h-full">
              {allSections.map((section, index) => {
                const isActive = activeIndex === index;
                const Icon = section.icon || Info;
                return (
                  <Tooltip key={section.id}>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => setActiveIndex(index)}
                        className={`p-3 rounded-xl flex items-center justify-center transition-all ${
                          isActive ? "bg-primary text-white scale-110" : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
                        }`}
                      >
                        <Icon className="h-6 w-6" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right">{section.title}</TooltipContent>
                  </Tooltip>
                );
              })}
            </nav>
          </TooltipProvider>

          <div className="flex-1 overflow-y-auto relative h-full">
            {/* Section hero image */}
            {allSections[activeIndex].image_url && (
              <div className="relative h-48 w-full overflow-hidden">
                <img
                  src={allSections[activeIndex].image_url}
                  alt={allSections[activeIndex].title}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  decoding="async"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background/80" />
              </div>
            )}

            {/* Welcome banner for home section */}
            {allSections[activeIndex].id === "home" && !allSections[activeIndex].image_url && property.hero_image_url && (
              <div className="relative h-48 w-full overflow-hidden">
                <img
                  src={property.hero_image_url}
                  alt={property.title}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  decoding="async"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-background/90 flex items-end p-6">
                  <div>
                    <p className="text-white/80 text-sm font-medium">Welcome to</p>
                    <h2 className="text-white text-2xl font-bold">{property.title}</h2>
                  </div>
                </div>
              </div>
            )}

            <div className="px-8 py-6">
              <DialogHeader className="mb-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {(() => {
                      const Icon = allSections[activeIndex].icon || Info;
                      return (
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <Icon className="h-5 w-5 text-primary" />
                        </div>
                      );
                    })()}
                    <DialogTitle className="text-3xl font-bold">{allSections[activeIndex].title}</DialogTitle>
                  </div>
                  <div className="flex gap-2 mt-1">
                    <Button variant="outline" size="icon" onClick={shareGuide}><Share2 className="h-4 w-4" /></Button>
                    <Button variant="outline" size="icon" onClick={() => exportToPDF()}><Download className="h-4 w-4" /></Button>
                  </div>
                </div>
              </DialogHeader>

              <div className="prose prose-sm max-w-none text-muted-foreground leading-relaxed">
                {renderSectionContent(allSections[activeIndex])}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GuestGuideDialog;
