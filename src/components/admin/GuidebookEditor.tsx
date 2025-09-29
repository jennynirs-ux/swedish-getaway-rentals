import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Home,
  MapPin,
  Car,
  Train,
  ParkingCircle,
  Key,
  Wifi,
  Shield,
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
  Users,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type BlockType = "text" | "list" | "checkbox";

interface GuidebookBlock {
  id: string;
  type: BlockType;
  title?: string;
  content?: string;
  items?: string[];
}

interface GuidebookSection {
  id: string;
  title: string;
  icon: React.ElementType;
  blocks: GuidebookBlock[];
}

interface GuidebookEditorProps {
  onChange: (sections: GuidebookSection[]) => void;
  onSave?: () => Promise<void>;
  saving?: boolean;
  propertyTitle?: string;
}

const INITIAL_SECTIONS: GuidebookSection[] = [
  {
    id: "welcome",
    title: "Welcome",
    icon: Home,
    blocks: [
      { id: "w1", type: "text", content: "Welcome to our property! We’re happy to host you." },
      { id: "w2", type: "text", title: "Emergency Information", content: "Emergency number: 112\nNearest hospital: Lerum Health Center" },
      { id: "w3", type: "text", title: "Host Story", content: "We are a family who loves sharing our home with guests." },
    ],
  },
  {
    id: "directions",
    title: "Directions",
    icon: MapPin,
    blocks: [
      { id: "d1", type: "text", title: "Address", content: "Häckenvägen 78, 443 92 Lerum" },
      { id: "d2", type: "text", title: "Get here by car", content: "Take the E20 and exit at Lerum. Follow signs to Häckenvägen." },
      { id: "d3", type: "text", title: "Get here by public transportation", content: "Train to Lerum station, then bus 533 to Häckenvägen." },
      { id: "d4", type: "text", content: "Tip: Stop at Local Shopping to get groceries on the way." },
    ],
  },
  {
    id: "parking",
    title: "Parking",
    icon: ParkingCircle,
    blocks: [
      { id: "p1", type: "text", content: "Park in front of the garage (yellow door). Room for 2 cars. No parking on the street." },
    ],
  },
  {
    id: "checkin",
    title: "Check-in",
    icon: Key,
    blocks: [
      { id: "c1", type: "text", content: "Check-in time: 15:00" },
      { id: "c2", type: "text", content: "Keys are in the lockbox by the entrance. Code will be sent before arrival." },
    ],
  },
  {
    id: "wifi",
    title: "Wi-Fi",
    icon: Wifi,
    blocks: [
      { id: "w1", type: "list", title: "Network & Password", items: ["Network: Guest_Wifi", "Password: Welcome2024"] },
    ],
  },
  {
    id: "rules",
    title: "House Rules",
    icon: Shield,
    blocks: [
      { id: "r1", type: "list", title: "Rules", items: ["No smoking indoors", "Respect quiet hours 22–07", "No parties"] },
    ],
  },
  {
    id: "howthingswork",
    title: "How things work",
    icon: Utensils,
    blocks: [
      { id: "h1", type: "checkbox", title: "Kitchen", items: ["Oven", "Dishwasher", "Coffee machine"] },
      { id: "h2", type: "checkbox", title: "Heating", items: ["Radiators", "Fireplace"] },
      { id: "h3", type: "checkbox", title: "Outdoor kitchen", items: ["Grill", "Pizza oven"] },
      { id: "h4", type: "checkbox", title: "Outdoor amenities", items: ["Hot tub", "Sauna"] },
    ],
  },
  {
    id: "waste",
    title: "Waste & Recycling",
    icon: Recycle,
    blocks: [
      { id: "wa1", type: "list", title: "Food waste", items: ["Brown bin outside"] },
      { id: "wa2", type: "list", title: "Plastic", items: ["Yellow bin"] },
      { id: "wa3", type: "list", title: "Paper", items: ["Blue bin"] },
    ],
  },
  {
    id: "local",
    title: "Local Recommendations",
    icon: Landmark,
    blocks: [
      { id: "l1", type: "list", title: "Restaurants", items: ["Pizzeria Napoli", "Hamnkrogen seafood"] },
      { id: "l2", type: "list", title: "Activities", items: ["Lake Aspen – swimming", "Hiking trails"] },
    ],
  },
  {
    id: "shopping",
    title: "Local Shopping",
    icon: ShoppingCart,
    blocks: [
      { id: "s1", type: "list", title: "Stops", items: ["ICA Kvantum – groceries", "Shell – gas & snacks"] },
    ],
  },
  {
    id: "checkout",
    title: "Check-out",
    icon: LogOut,
    blocks: [
      { id: "co1", type: "text", content: "Check-out time: 11:00" },
      { id: "co2", type: "checkbox", title: "Checklist", items: ["Empty trash", "Remove bed linen", "Load dishwasher", "Lock doors"] },
    ],
  },
  {
    id: "customs",
    title: "Swedish Customs",
    icon: BookOpen,
    blocks: [
      { id: "cu1", type: "list", title: "Customs", items: ["No shoes indoors", "Fika = coffee break", "Alcohol only at Systembolaget"] },
    ],
  },
  {
    id: "review",
    title: "Review",
    icon: Star,
    blocks: [
      { id: "rv1", type: "text", content: "Please leave us a 5-star review if you enjoyed your stay!" },
    ],
  },
  {
    id: "social",
    title: "Let’s get social",
    icon: Users,
    blocks: [
      { id: "so1", type: "text", content: "Follow us on Instagram @nordicgetaways and share your memories!" },
    ],
  },
];

export const GuidebookEditor = ({
  onChange,
  onSave,
  saving = false,
  propertyTitle = "Property",
}: GuidebookEditorProps) => {
  const { toast } = useToast();
  const [sections, setSections] = useState<GuidebookSection[]>(INITIAL_SECTIONS);
  const [activeIndex, setActiveIndex] = useState(0);

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
        toast({ title: "Saved", description: "Guidebook saved successfully" });
      } catch {
        toast({ title: "Error", description: "Could not save", variant: "destructive" });
      }
    }
  };

  const currentSection = sections[activeIndex];

  return (
    <div className="flex h-[90vh]">
      {/* Sidebar */}
      <div className="w-20 bg-muted/20 flex flex-col items-center py-4 gap-3 overflow-y-auto">
        {sections.map((s, i) => {
          const Icon = s.icon;
          return (
            <button
              key={s.id}
              onClick={() => setActiveIndex(i)}
              className={`p-2 rounded-lg ${i === activeIndex ? "bg-primary text-white" : "text-muted-foreground hover:bg-muted/30"}`}
            >
              <Icon className="h-6 w-6" />
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">{currentSection.title}</h2>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>

        {currentSection.blocks.map((block) => (
          <Card key={block.id} className="mb-4">
            <CardHeader>
              {block.title && <CardTitle className="text-sm">{block.title}</CardTitle>}
            </CardHeader>
            <CardContent>
              {block.type === "text" && (
                <Textarea
                  value={block.content}
                  onChange={(e) => updateBlock(currentSection.id, block.id, { content: e.target.value })}
                  rows={3}
                />
              )}
              {block.type === "list" && (
                <div className="space-y-2">
                  {block.items?.map((item, idx) => (
                    <Input
                      key={idx}
                      value={item}
                      onChange={(e) => updateBlockItem(currentSection.id, block.id, idx, e.target.value)}
                    />
                  ))}
                </div>
              )}
              {block.type === "checkbox" && (
                <div className="space-y-2">
                  {block.items?.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input type="checkbox" disabled className="h-4 w-4" />
                      <Input
                        value={item}
                        onChange={(e) => updateBlockItem(currentSection.id, block.id, idx, e.target.value)}
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
