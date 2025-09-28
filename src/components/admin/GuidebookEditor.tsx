import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Save,
  Download,
  Share,
  Image as ImageIcon,
  Home,
  MapPin,
  Coffee,
  Key,
  Wifi,
  Utensils,
  Cog,
  Landmark,
  BookOpen,
  Shield,
  LogOut,
  Heart,
  Recycle,
  Trash2,
  GlassWater,
  Beer,
  Leaf,
  Package,
  ShoppingCart,
  Car,
  Train,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface GuidebookBlock {
  id: string;
  type: "text" | "list" | "checkbox";
  title?: string;
  content?: string;
  items?: string[];
}

interface GuidebookSection {
  id: string;
  icon: React.ElementType;
  title: string;
  blocks: GuidebookBlock[];
  image_url?: string;
}

interface GuidebookEditorProps {
  sections?: GuidebookSection[];
  onChange: (sections: GuidebookSection[]) => void;
  onSave?: () => Promise<void>;
  saving?: boolean;
  propertyTitle?: string;
}

const FIXED_SECTIONS: Omit<GuidebookSection, "blocks">[] = [
  { id: "home", icon: Home, title: "Welcome Home" },
  { id: "directions", icon: MapPin, title: "Directions" },
  { id: "stop", icon: Coffee, title: "Stop on the way" },
  { id: "checkin", icon: Key, title: "Check-in" },
  { id: "wifi", icon: Wifi, title: "Wi-Fi" },
  { id: "kitchen", icon: Utensils, title: "Kitchen" },
  { id: "howthingswork", icon: Cog, title: "How things work" },
  { id: "waste", icon: Recycle, title: "Waste & Recycling" },
  { id: "places", icon: Landmark, title: "Places to visit" },
  { id: "customs", icon: BookOpen, title: "Swedish customs" },
  { id: "rules", icon: Shield, title: "House rules" },
  { id: "checkout", icon: LogOut, title: "Check-out" },
  { id: "hoststory", icon: Heart, title: "Host Story" },
];

const DEFAULT_BLOCKS: Record<string, GuidebookBlock[]> = {
  home: [
    { id: "h1", type: "text", content: "Welcome to our property! We’re excited to host you." },
  ],
  directions: [
    { id: "d1", type: "text", title: "Get here by car", content: "Take the E20 and exit at Lerum. Parking is available on site." },
    { id: "d2", type: "text", title: "Get here by public transport", content: "Take the commuter train to Lerum station, then bus 533 to Häckenvägen." },
  ],
  stop: [
    { id: "s1", type: "list", title: "Useful stops", items: ["ICA Kvantum – groceries", "Shell – gas & snacks", "Local shop – firewood"] },
  ],
  checkin: [
    { id: "c1", type: "text", content: "Check-in time: 15:00" },
    { id: "c2", type: "text", content: "Keys are in the lockbox by the entrance. Code will be sent via email." },
    { id: "c3", type: "text", content: "Parking is available in front of the house." },
  ],
  wifi: [
    { id: "w1", type: "text", content: "Network: Guest_Wifi\nPassword: Welcome2024" },
  ],
  kitchen: [
    { id: "k1", type: "list", title: "Appliances", items: ["Oven", "Coffee machine", "Dishwasher"] },
  ],
  howthingswork: [
    { id: "h1", type: "text", title: "Oven", content: "Press the power button, select temperature, then press start." },
    { id: "h2", type: "text", title: "Coffee machine", content: "Fill with water, insert filter and coffee, press brew." },
  ],
  waste: [
    { 
      id: "wa1", 
      type: "text", 
      title: "Why recycling matters", 
      content: "WHEN WE ALL RECYCLE, WE ALL WIN. Materials can be reused to make new products. Food waste becomes biogas and biofertilizer, residual waste is turned into heat and electricity. Recycling saves energy and protects nature." 
    },
    { 
      id: "wa2", 
      type: "list", 
      title: "Food Waste", 
      items: [
        "Fruit & vegetable scraps, tea bags, coffee grounds, eggshells, meat bones",
        "A bit of kitchen paper is also fine",
        "❌ Not food waste: plastic, cigarettes, flowers, candles"
      ]
    },
    { 
      id: "wa3", 
      type: "list", 
      title: "Plastic Packaging", 
      items: [
        "Bottles, bags, refill packs, plastic tubes, crisp packets, styrofoam",
        "Empty and rinse packaging before recycling",
        "❌ Not plastic packaging: toys, furniture, bulky waste"
      ]
    },
    { 
      id: "wa4", 
      type: "list", 
      title: "Paper Packaging", 
      items: [
        "Milk & juice cartons, pasta packs, shoeboxes, cardboard boxes, paper bags",
        "Flatten cartons and fold boxes to save space",
        "❌ Envelopes should go in household waste"
      ]
    },
    { 
      id: "wa5", 
      type: "list", 
      title: "Newspapers", 
      items: [
        "Daily/weekly newspapers, brochures, catalogues, magazines",
        "Remove plastic wrap and stickers",
        "❌ Not included: envelopes, bound books (goes to household waste)"
      ]
    },
    { 
      id: "wa6", 
      type: "list", 
      title: "Glass Packaging", 
      items: [
        "Clear glass bottles and jars → clear container",
        "Coloured glass bottles and jars → coloured container",
        "❌ Do not recycle porcelain, ceramics, light bulbs here"
      ]
    },
    { 
      id: "wa7", 
      type: "list", 
      title: "Metal Packaging", 
      items: [
        "Tin cans, bottle caps, lids, spray cans, empty paint tins",
        "Fold in sharp lids for safety",
        "❌ Tins with paint/glue residue → hazardous waste"
      ]
    },
    { 
      id: "wa8", 
      type: "list", 
      title: "Residual Waste", 
      items: [
        "Nappies, envelopes, dishcloths, snus, toothbrushes, hair",
        "Nothing recyclable should go in residual waste",
        "Hazardous waste and electrical items must be taken to recycling centres"
      ]
    },
    { 
      id: "wa9", 
      type: "text", 
      title: "Deposit system (Pant)", 
      content: "Plastic bottles and aluminium cans with the Swedish deposit symbol must be returned at pant machines in grocery stores. Most become new bottles and cans; the rest is turned into packaging material. Find pant machines at: https://pantamera.nu"
    },
    { 
      id: "wa10", 
      type: "text", 
      title: "More information", 
      content: "Find your nearest recycling station and more guides at: www.sopor.nu"
    }
  ],

  places: [
    { id: "p1", type: "list", title: "Restaurants", items: ["Pizzeria Napoli", "Hamnkrogen seafood", "Sushi & Wok Lerum"] },
    { id: "p2", type: "list", title: "Attractions", items: ["Lake Aspen – swimming", "Skatås nature reserve", "Göteborg city – 20 min by train"] },
  ],
  customs: [
    { id: "cu1", type: "text", title: "No shoes indoors", content: "In Sweden, it is polite to remove shoes when entering a home." },
    { id: "cu2", type: "text", title: "Fika", content: "Take a coffee break with something sweet, like a cinnamon bun." },
    { id: "cu3", type: "text", title: "Alcohol", content: "Strong alcohol is only sold at Systembolaget. Age limit: 20." },
  ],
  rules: [
    { id: "r1", type: "list", title: "House rules", items: ["No smoking indoors", "Respect quiet hours 22–07", "No parties"] },
  ],
  checkout: [
    { id: "co1", type: "text", content: "Check-out time: 11:00" },
    { id: "co2", type: "checkbox", title: "Check-out checklist", items: ["Put furniture back", "Empty all trash bins", "Remove bed linens", "Load dishwasher", "Close windows & turn off lights", "Lock doors"] },
  ],
  hoststory: [
    { id: "hs1", type: "text", content: "We bought Villa Häcken in 2020 and love sharing it with guests." },
  ],
};

export const GuidebookEditor = ({
  sections = [],
  onChange,
  onSave,
  saving = false,
  propertyTitle = "Property",
}: GuidebookEditorProps) => {
  const { toast } = useToast();

  const [localSections, setLocalSections] = useState<GuidebookSection[]>(
    FIXED_SECTIONS.map((s) => {
      const existing = sections.find((sec) => sec.id === s.id);
      return {
        ...s,
        blocks: existing?.blocks?.length ? existing.blocks : DEFAULT_BLOCKS[s.id] || [],
        image_url: existing?.image_url,
      };
    })
  );

  const updateSection = (id: string, updated: Partial<GuidebookSection>) => {
    const newSections = localSections.map((s) =>
      s.id === id ? { ...s, ...updated } : s
    );
    setLocalSections(newSections);
    onChange(newSections);
  };

  const updateBlock = (sectionId: string, blockId: string, changes: Partial<GuidebookBlock>) => {
    const newSections = localSections.map((s) =>
      s.id === sectionId
        ? {
            ...s,
            blocks: s.blocks.map((b) => (b.id === blockId ? { ...b, ...changes } : b)),
          }
        : s
    );
    setLocalSections(newSections);
    onChange(newSections);
  };

  const updateBlockItem = (sectionId: string, blockId: string, index: number, value: string) => {
    const newSections = localSections.map((s) =>
      s.id === sectionId
        ? {
            ...s,
            blocks: s.blocks.map((b) =>
              b.id === blockId
                ? { ...b, items: b.items?.map((it, i) => (i === index ? value : it)) }
                : b
            ),
          }
        : s
    );
    setLocalSections(newSections);
    onChange(newSections);
  };

  const handleSave = async () => {
    if (onSave) {
      try {
        await onSave();
        toast({ title: "Success", description: "Guest guide saved successfully" });
      } catch {
        toast({ title: "Error", description: "Failed to save guide", variant: "destructive" });
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-base font-medium">Guest Guide for {propertyTitle}</Label>
          <p className="text-sm text-muted-foreground">Fill in the guidebook for your guests</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm"><Share className="h-4 w-4 mr-2" /> Share</Button>
          <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-2" /> PDF</Button>
          {onSave && (
            <Button variant="default" size="sm" onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4 mr-2" /> {saving ? "Saving..." : "Save"}
            </Button>
          )}
        </div>
      </div>

      {/* Sections */}
      {localSections.map((section) => {
        const Icon = section.icon;
        return (
          <Card key={section.id}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Icon className="h-5 w-5 text-primary" /> {section.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {section.blocks.map((block) => (
                <div key={block.id} className="border rounded p-3 bg-muted/10 space-y-2">
                  {block.title && <Label className="font-medium">{block.title}</Label>}

                  {block.type === "text" && (
                    <Textarea
                      value={block.content}
                      onChange={(e) => updateBlock(section.id, block.id, { content: e.target.value })}
                      rows={3}
                    />
                  )}

                  {block.type === "list" && (
                    <div className="space-y-2">
                      {block.items?.map((item, i) => (
                        <Input
                          key={i}
                          value={item}
                          onChange={(e) => updateBlockItem(section.id, block.id, i, e.target.value)}
                        />
                      ))}
                    </div>
                  )}

                  {block.type === "checkbox" && (
                    <div className="space-y-2">
                      {block.items?.map((item, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <input type="checkbox" disabled className="h-4 w-4" />
                          <Input
                            value={item}
                            onChange={(e) => updateBlockItem(section.id, block.id, i, e.target.value)}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
