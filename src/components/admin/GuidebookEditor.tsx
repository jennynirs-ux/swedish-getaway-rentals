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
  CreditCard,
  Wine,
  Footprints,
  PawPrint,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface GuidebookBlock {
  id: string;
  type: "text" | "list" | "checkbox";
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
  sections: GuidebookSection[];
  onChange: (sections: GuidebookSection[]) => void;
  onSave?: () => Promise<void>;
  saving?: boolean;
  propertyTitle?: string;
}

// 🔹 Fördefinierade sektioner med lucide-ikoner och startinnehåll
const DEFAULT_SECTIONS: GuidebookSection[] = [
  {
    id: "home",
    icon: Home,
    title: "Welcome Home",
    blocks: [
      {
        id: crypto.randomUUID(),
        type: "text",
        content:
          "Welcome to our property! We’re excited to host you. We hope you enjoy the house, the surroundings, and the Swedish nature.",
      },
    ],
  },
  {
    id: "directions",
    icon: MapPin,
    title: "Directions",
    blocks: [
      {
        id: crypto.randomUUID(),
        type: "text",
        content: "By car: Take E6 exit 89 and follow signs towards Lerum. Parking is available in front of the house.",
      },
      {
        id: crypto.randomUUID(),
        type: "text",
        content: "By public transportation: Train to Lerum station, then bus 290 towards Skövde. Get off at Häcken stop.",
      },
    ],
  },
  {
    id: "stop",
    icon: Coffee,
    title: "Stop on the way",
    blocks: [
      {
        id: crypto.randomUUID(),
        type: "list",
        items: [
          "ICA Kvantum – nearest grocery store",
          "Mackens Ved – firewood",
          "Systembolaget – wine & spirits (20+)",
          "Circle K – fuel station",
        ],
      },
    ],
  },
  {
    id: "checkin",
    icon: Key,
    title: "Check-in",
    blocks: [
      { id: crypto.randomUUID(), type: "text", content: "Check-in time: 15:00" },
      { id: crypto.randomUUID(), type: "text", content: "Keys are in the lockbox by the entrance (code sent before arrival)." },
      { id: crypto.randomUUID(), type: "text", content: "Parking: Use designated spots. Do not block neighbors." },
    ],
  },
  {
    id: "wifi",
    icon: Wifi,
    title: "Wi-Fi",
    blocks: [
      { id: crypto.randomUUID(), type: "text", content: "Network: Guest_Wifi" },
      { id: crypto.randomUUID(), type: "text", content: "Password: Welcome2024" },
    ],
  },
  {
    id: "kitchen",
    icon: Utensils,
    title: "Kitchen",
    blocks: [
      {
        id: crypto.randomUUID(),
        type: "text",
        content:
          "The kitchen is fully equipped with oven, stove, fridge, freezer, dishwasher, coffee machine, and toaster.",
      },
    ],
  },
  {
    id: "howthingswork",
    icon: Cog,
    title: "How things work",
    blocks: [
      { id: crypto.randomUUID(), type: "text", content: "Oven: Turn knob to 200°C and press power." },
      { id: crypto.randomUUID(), type: "text", content: "Coffee machine: Fill water, add filter & coffee, press start." },
      { id: crypto.randomUUID(), type: "text", content: "Dishwasher: Use eco program. Do not put pans or wooden tools inside." },
      { id: crypto.randomUUID(), type: "text", content: "Heating: Use thermostat. Keep windows closed." },
    ],
  },
  {
    id: "places",
    icon: Landmark,
    title: "Places to visit",
    blocks: [
      {
        id: crypto.randomUUID(),
        type: "list",
        items: [
          "Restaurants: Sjömagasinet (seafood), Lerum Brasserie (local dishes)",
          "Nature: Lerum Nature Reserve, nearby lakes",
          "City: Gothenburg – 20 min by train",
        ],
      },
    ],
  },
  {
    id: "customs",
    icon: BookOpen,
    title: "Swedish customs",
    blocks: [
      { id: crypto.randomUUID(), type: "text", content: "Fika: A Swedish ritual. Coffee (or tea) with a cinnamon bun or pastry." },
      { id: crypto.randomUUID(), type: "text", content: "No shoes indoors: Always remove shoes in Swedish homes." },
      { id: crypto.randomUUID(), type: "text", content: "Card is king: Cash is rare. Cards and Swish are accepted everywhere." },
      { id: crypto.randomUUID(), type: "text", content: "Alcohol: Strong drinks sold only at Systembolaget (20+)." },
      { id: crypto.randomUUID(), type: "text", content: "Right to roam (Allemansrätten): Hike, swim, and pick berries freely." },
      { id: crypto.randomUUID(), type: "text", content: "Wildlife: Drive carefully, especially at dawn/dusk. Moose and deer are common." },
    ],
  },
  {
    id: "rules",
    icon: Shield,
    title: "House Rules",
    blocks: [
      {
        id: crypto.randomUUID(),
        type: "checkbox",
        items: ["No smoking indoors", "No parties or loud music", "Respect quiet hours after 22:00", "Pets only by request"],
      },
    ],
  },
  {
    id: "checkout",
    icon: LogOut,
    title: "Check-out",
    blocks: [
      { id: crypto.randomUUID(), type: "text", content: "Check-out time: 11:00" },
      {
        id: crypto.randomUUID(),
        type: "checkbox",
        items: [
          "Put furniture back in place",
          "Empty trash & recycling",
          "Remove bed linens and place in laundry room",
          "Start dishwasher",
          "Empty fridge & freezer",
          "Close all windows & doors",
          "Turn off all lights",
          "Lock all doors",
        ],
      },
    ],
  },
  {
    id: "hoststory",
    icon: Heart,
    title: "Host Story",
    blocks: [
      {
        id: crypto.randomUUID(),
        type: "text",
        content:
          "We bought this house in 2020 and renovated it with love. Our goal is to share the beauty of Swedish nature and hospitality with you.",
      },
    ],
  },
];

export const GuidebookEditor = ({
  sections,
  onChange,
  onSave,
  saving = false,
  propertyTitle = "Property",
}: GuidebookEditorProps) => {
  const { toast } = useToast();
  const [localSections, setLocalSections] = useState<GuidebookSection[]>(sections.length ? sections : DEFAULT_SECTIONS);

  // 🔹 Section & Block Helpers
  const updateSection = (id: string, updated: Partial<GuidebookSection>) => {
    const newSections = localSections.map((s) => (s.id === id ? { ...s, ...updated } : s));
    setLocalSections(newSections);
    onChange(newSections);
  };

  const addBlock = (sectionId: string, type: "text" | "list" | "checkbox") => {
    const block: GuidebookBlock = { id: crypto.randomUUID(), type, content: "", items: type !== "text" ? [] : undefined };
    const section = localSections.find((s) => s.id === sectionId);
    if (!section) return;
    updateSection(sectionId, { blocks: [...section.blocks, block] });
  };

  const updateBlock = (sectionId: string, blockId: string, changes: Partial<GuidebookBlock>) => {
    const section = localSections.find((s) => s.id === sectionId);
    if (!section) return;
    updateSection(sectionId, { blocks: section.blocks.map((b) => (b.id === blockId ? { ...b, ...changes } : b)) });
  };

  const addBlockItem = (sectionId: string, blockId: string) => {
    const section = localSections.find((s) => s.id === sectionId);
    if (!section) return;
    updateSection(sectionId, {
      blocks: section.blocks.map((b) => (b.id === blockId ? { ...b, items: [...(b.items || []), ""] } : b)),
    });
  };

  const updateBlockItem = (sectionId: string, blockId: string, index: number, value: string) => {
    const section = localSections.find((s) => s.id === sectionId);
    if (!section) return;
    updateSection(sectionId, {
      blocks: section.blocks.map((b) =>
        b.id === blockId ? { ...b, items: b.items?.map((it, i) => (i === index ? value : it)) } : b
      ),
    });
  };

  const removeBlock = (sectionId: string, blockId: string) => {
    const section = localSections.find((s) => s.id === sectionId);
    if (!section) return;
    updateSection(sectionId, { blocks: section.blocks.filter((b) => b.id !== blockId) });
  };

  // 🔹 Actions
  const handleSave = async () => {
    if (onSave) {
      try {
        await onSave();
        toast({ title: "Success", description: "Guest guide saved successfully" });
      } catch {
        toast({ title: "Error", description: "Failed to save guest guide", variant: "destructive" });
      }
    }
  };

  const generateShareableLink = () => {
    const shareUrl = `${window.location.origin}/property-guide/${propertyTitle}`;
    navigator.clipboard.writeText(shareUrl).then(() =>
      toast({ title: "Link copied!", description: "Shareable guest guide link copied to clipboard" })
    );
  };

  const exportToPDF = () => toast({ title: "PDF Export", description: "PDF export functionality will be implemented" });

  return (
    <div className="space-y-6">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-base font-medium">Guest Guide for {propertyTitle}</Label>
          <p className="text-sm text-muted-foreground">Fill in the guidebook information for your guests</p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={generateShareableLink}>
            <Share className="h-4 w-4 mr-2" /> Share Link
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={exportToPDF}>
            <Download className="h-4 w-4 mr-2" /> Export PDF
          </Button>
          {onSave && (
            <Button type="button" variant="default" size="sm" onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4 mr-2" /> {saving ? "Saving..." : "Save Changes"}
            </Button>
          )}
        </div>
      </div>

      {/* Section editors */}
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
                <div key={block.id} className="border rounded p-3 space-y-2 bg-muted/10">
                  {block.type === "text" && (
                    <Textarea
                      value={block.content}
                      onChange={(e) => updateBlock(section.id, block.id, { content: e.target.value })}
                      placeholder="Write text..."
                      rows={3}
                    />
                  )}

                  {(block.type === "list" || block.type === "checkbox") && (
                    <div className="space-y-2">
                      {block.items?.map((item, i) => (
                        <Input
                          key={i}
                          value={item}
                          onChange={(e) => updateBlockItem(section.id, block.id, i, e.target.value)}
                          placeholder={`Item ${i + 1}`}
                        />
                      ))}
                      <Button size="sm" onClick={() => addBlockItem(section.id, block.id)}>
                        Add Item
                      </Button>
                    </div>
                  )}

                  <Button size="sm" variant="destructive" onClick={() => removeBlock(section.id, block.id)}>
                    Remove Block
                  </Button>
                </div>
              ))}

              <div className="flex gap-2">
                <Button size="sm" onClick={() => addBlock(section.id, "text")}>
                  Add Text Block
                </Button>
                <Button size="sm" onClick={() => addBlock(section.id, "list")}>
                  Add Bullet List
                </Button>
                <Button size="sm" onClick={() => addBlock(section.id, "checkbox")}>
                  Add Checkbox List
                </Button>
              </div>

              <div className="space-y-2">
                <Label>Image (optional)</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById(`section-image-${section.id}`)?.click()}
                  >
                    <ImageIcon className="h-4 w-4 mr-2" /> Upload
                  </Button>
                  <input
                    id={`section-image-${section.id}`}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = () => updateSection(section.id, { image_url: reader.result as string });
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </div>
                {section.image_url && (
                  <img src={section.image_url} alt={section.title} className="w-32 h-32 object-cover rounded-md" />
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
