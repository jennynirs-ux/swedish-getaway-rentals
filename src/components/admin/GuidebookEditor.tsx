import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Home,
  MapPin,
  Car,
  Train,
  ParkingSquare,
  Key,
  Wifi,
  Shield,
  Cog,
  Utensils,
  Flame,
  Trees,
  Recycle,
  Landmark,
  ShoppingCart,
  LogOut,
  BookOpen,
  Star,
  Share2,
  Download,
  Heart,
  PhoneCall,
  Camera,
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
  onChange: (sections: GuidebookSection[]) => void;
  onSave?: () => Promise<void>;
  saving?: boolean;
  propertyTitle?: string;
}

const FIXED_SECTIONS: Omit<GuidebookSection, "blocks">[] = [
  { id: "home", icon: Home, title: "Welcome" },
  { id: "directions", icon: MapPin, title: "Directions" },
  { id: "parking", icon: ParkingSquare, title: "Parking" },
  { id: "checkin", icon: Key, title: "Check-in" },
  { id: "wifi", icon: Wifi, title: "Wi-Fi" },
  { id: "rules", icon: Shield, title: "House Rules" },
  { id: "howthingswork", icon: Cog, title: "How Things Work" },
  { id: "waste", icon: Recycle, title: "Waste & Recycling" },
  { id: "places", icon: Landmark, title: "Local Recommendations" },
  { id: "shopping", icon: ShoppingCart, title: "Local Shopping" },
  { id: "checkout", icon: LogOut, title: "Check-out" },
  { id: "customs", icon: BookOpen, title: "Swedish Customs" },
  { id: "review", icon: Star, title: "Review & Rating" },
  { id: "social", icon: Camera, title: "Let’s Get Social" },
  { id: "hoststory", icon: Heart, title: "Host Story" },
];

const DEFAULT_BLOCKS: Record<string, GuidebookBlock[]> = {
  home: [
    { id: "h1", type: "text", content: "Welcome to our property! We’re excited to host you." },
    { id: "h2", type: "text", title: "Emergency Information", content: "Police/Fire/Ambulance: 112\nHost: +46 70 123 45 67" },
  ],
  directions: [
    { id: "d1", type: "text", title: "Address", content: "Häckenvägen 78, 443 92 Lerum" },
    { id: "d2", type: "text", title: "Get here by car", content: "Take the E20 and exit at Lerum. Follow signs to Häckenvägen." },
    { id: "d3", type: "text", title: "Get here by public transport", content: "Train to Lerum, then bus 533 to Häckenvägen." },
    { id: "d4", type: "text", content: "💡 Tip: Stop at Local Shopping to get groceries on the way." },
  ],
  parking: [
    { id: "p1", type: "text", content: "Park in front of the garage (yellow door). Space for 2 cars. Parking included. Do not park on the street." },
  ],
  checkin: [
    { id: "c1", type: "text", content: "Check-in time: 15:00" },
    { id: "c2", type: "text", content: "Keys in lockbox by entrance. Code will be sent via email." },
  ],
  wifi: [
    { id: "w1", type: "text", content: "Network: Guest_Wifi\nPassword: Welcome2024" },
  ],
  rules: [
    { id: "r1", type: "list", title: "Rules", items: ["No smoking indoors", "Respect quiet hours 22–07", "No parties"] },
  ],
  howthingswork: [
    { id: "k1", type: "list", title: "Kitchen", items: ["Oven", "Coffee machine", "Dishwasher"] },
    { id: "k2", type: "list", title: "Heating", items: ["Thermostat in hallway", "Fireplace in living room"] },
    { id: "k3", type: "list", title: "Outdoor kitchen", items: ["Gas grill", "Sink", "Utensils"] },
    { id: "k4", type: "list", title: "Outdoor amenities", items: ["Hot tub", "Sauna", "Boat"] },
  ],
  waste: [
    { id: "wa1", type: "text", content: "Food → brown bin\nPlastic → plastic container\nPaper → paper container\nGlass → glass container\nMetal → metal container\nResidual → grey bin" },
  ],
  places: [
    { id: "pl1", type: "list", title: "Recommendations", items: ["Lake Aspen – swimming", "Göteborg city – 20 min by train"] },
  ],
  shopping: [
    { id: "s1", type: "list", title: "Shops", items: ["ICA Kvantum – groceries", "Shell – gas & snacks"] },
  ],
  checkout: [
    { id: "co1", type: "text", content: "Check-out time: 11:00" },
    { id: "co2", type: "checkbox", title: "Checklist", items: ["Empty trash", "Return keys", "Close windows", "Load dishwasher"] },
  ],
  customs: [
    { id: "cu1", type: "text", content: "No shoes indoors" },
    { id: "cu2", type: "text", content: "Fika = coffee + pastry break" },
    { id: "cu3", type: "text", content: "Alcohol only at Systembolaget (20+)" },
  ],
  review: [
    { id: "rv1", type: "text", content: "Please leave us a rating before you leave ⭐⭐⭐⭐⭐" },
  ],
  social: [
    { id: "so1", type: "text", content: "Share your stay on Instagram with #NordicGetaways" },
  ],
  hoststory: [
    { id: "hs1", type: "text", content: "We bought Villa Häcken in 2020 and love sharing it with guests." },
  ],
};

export const GuidebookEditor = ({
  onChange,
  onSave,
  saving = false,
  propertyTitle = "Property",
}: GuidebookEditorProps) => {
  const { toast } = useToast();
  const [activeIndex, setActiveIndex] = useState(0);

  const [sections, setSections] = useState<GuidebookSection[]>(
    FIXED_SECTIONS.map((s) => ({
      ...s,
      blocks: DEFAULT_BLOCKS[s.id] || [],
    }))
  );

  const updateBlock = (sectionId: string, blockId: string, changes: Partial<GuidebookBlock>) => {
    const newSections = sections.map((s) =>
      s.id === sectionId
        ? { ...s, blocks: s.blocks.map((b) => (b.id === blockId ? { ...b, ...changes } : b)) }
        : s
    );
    setSections(newSections);
    onChange(newSections);
  };

  const updateBlockItem = (sectionId: string, blockId: string, index: number, value: string) => {
    const newSections = sections.map((s) =>
      s.id === sectionId
        ? {
            ...s,
            blocks: s.blocks.map((b) =>
              b.id === blockId ? { ...b, items: b.items?.map((it, i) => (i === index ? value : it)) } : b
            ),
          }
        : s
    );
    setSections(newSections);
    onChange(newSections);
  };

  const handleSave = async () => {
    if (onSave) {
      try {
        await onSave();
        toast({ title: "Success", description: "Guest guide saved" });
      } catch {
        toast({ title: "Error", description: "Failed to save guide", variant: "destructive" });
      }
    }
  };

  const activeSection = sections[activeIndex];

  return (
    <div className="flex h-[90vh]">
      {/* Sidebar with icons */}
      <div className="w-24 border-r bg-muted/20 flex flex-col items-center py-6 gap-4 overflow-y-auto">
        {sections.map((s, i) => {
          const Icon = s.icon;
          return (
            <button
              key={s.id}
              onClick={() => setActiveIndex(i)}
              className={`p-3 rounded-lg transition-all ${
                i === activeIndex ? "bg-primary text-white" : "bg-muted text-muted-foreground"
              }`}
            >
              <Icon className="h-6 w-6" />
            </button>
          );
        })}
      </div>

      {/* Editor content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">{activeSection.title}</h2>
          <div className="flex gap-2">
            <Button variant="outline" size="sm"><Share2 className="w-4 h-4 mr-1" /> Share</Button>
            <Button variant="outline" size="sm"><Download className="w-4 h-4 mr-1" /> PDF</Button>
            {onSave && (
              <Button variant="default" size="sm" onClick={handleSave} disabled={saving}>
                Save
              </Button>
            )}
          </div>
        </div>

        {activeSection.blocks.map((block) => (
          <Card key={block.id}>
            <CardContent className="p-4 space-y-2">
              {block.title && <Label>{block.title}</Label>}

              {block.type === "text" && (
                <Textarea
                  value={block.content}
                  onChange={(e) => updateBlock(activeSection.id, block.id, { content: e.target.value })}
                  rows={3}
                />
              )}

              {block.type === "list" && (
                <div className="space-y-2">
                  {block.items?.map((item, i) => (
                    <Input
                      key={i}
                      value={item}
                      onChange={(e) => updateBlockItem(activeSection.id, block.id, i, e.target.value)}
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
                        onChange={(e) => updateBlockItem(activeSection.id, block.id, i, e.target.value)}
                      />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
