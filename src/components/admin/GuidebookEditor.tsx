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
  Trash2,
  Plus,
  Recycle,
  Package,
  FileText,
  GlassWater,
  UtensilsCrossed,
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
  sections?: GuidebookSection[];
  onChange: (sections: GuidebookSection[]) => void;
  onSave?: () => Promise<void>;
  saving?: boolean;
  propertyTitle?: string;
}

// 🔹 Fördefinierade sektioner med startinnehåll
const DEFAULT_SECTIONS: GuidebookSection[] = [
  {
    id: "home",
    icon: Home,
    title: "Welcome Home",
    blocks: [
      {
        id: crypto.randomUUID(),
        type: "text",
        content: "Welcome to our property! We’re excited to host you.",
      },
    ],
  },
  {
    id: "directions",
    icon: MapPin,
    title: "Directions",
    blocks: [
      { id: crypto.randomUUID(), type: "text", content: "Get here by car – full instructions provided before arrival." },
      { id: crypto.randomUUID(), type: "text", content: "Get here by public transportation – nearest bus stop and train station info." },
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
          "🛒 Grocery store: ICA Kvantum",
          "🪵 Firewood: Available at Q8 station",
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
      { id: crypto.randomUUID(), type: "text", content: "Parking info and key instructions will be sent before arrival." },
    ],
  },
  {
    id: "wifi",
    icon: Wifi,
    title: "Wi-Fi",
    blocks: [
      { id: crypto.randomUUID(), type: "text", content: "Network: Guest_Wifi\nPassword: Welcome2024" },
    ],
  },
  {
    id: "kitchen",
    icon: Utensils,
    title: "Kitchen",
    blocks: [
      { id: crypto.randomUUID(), type: "text", content: "Fully equipped kitchen with dishwasher, oven, and coffee machine." },
    ],
  },
  {
    id: "howthingswork",
    icon: Cog,
    title: "How things work",
    blocks: [
      { id: crypto.randomUUID(), type: "text", content: "Oven – press power + select program." },
      { id: crypto.randomUUID(), type: "text", content: "Coffee machine – fill water and press start." },
    ],
  },
  {
    id: "waste",
    icon: Recycle,
    title: "Waste & Recycling",
    blocks: [
      {
        id: crypto.randomUUID(),
        type: "text",
        content:
          "Did you know that we can be fined if not recycling right in Sweden?\n\nPlease sort your trash into the following categories:",
      },
      {
        id: crypto.randomUUID(),
        type: "list",
        items: [
          "Plastic (🛍) – bottles, packaging",
          "Paper (📄) – newspapers, cartons",
          "Glass (🥂) – bottles, jars (separate by color if bins are marked)",
          "Metal (🥫) – cans, foil, metal lids",
          "Food waste (🍎) – use the green bags provided",
        ],
      },
      {
        id: crypto.randomUUID(),
        type: "text",
        content:
          "Bring full bags to the recycling station at ICA Kvantum.\nExtra bags are stored under the kitchen sink.\n🔗 Official recycling guide available at Avfall Sverige.",
      },
    ],
  },
  {
    id: "places",
    icon: Landmark,
    title: "Places to visit",
    blocks: [
      { id: crypto.randomUUID(), type: "list", items: ["Restaurants", "Nature & hiking", "Beaches", "Cultural spots"] },
    ],
  },
  {
    id: "customs",
    icon: BookOpen,
    title: "Swedish customs",
    blocks: [
      { id: crypto.randomUUID(), type: "text", content: "Take off your shoes indoors." },
      { id: crypto.randomUUID(), type: "text", content: "Fika – Swedish coffee break tradition." },
      { id: crypto.randomUUID(), type: "text", content: "Card is king – cash is rarely used." },
    ],
  },
  {
    id: "rules",
    icon: Shield,
    title: "House Rules",
    blocks: [
      { id: crypto.randomUUID(), type: "checkbox", items: ["No smoking indoors", "Respect quiet hours", "No parties or events"] },
    ],
  },
  {
    id: "checkout",
    icon: LogOut,
    title: "Check-out",
    blocks: [
      { id: crypto.randomUUID(), type: "text", content: "Check-out time: 11:00 AM" },
      {
        id: crypto.randomUUID(),
        type: "checkbox",
        items: [
          "Put furniture back in original place",
          "Remove all used bed linens",
          "Start the dishwasher",
          "Empty trash bins",
          "Close windows and lock all doors",
        ],
      },
    ],
  },
  {
    id: "hoststory",
    icon: Heart,
    title: "Host Story",
    blocks: [
      { id: crypto.randomUUID(), type: "text", content: "We’re a small family who loves hosting guests at our summerhouse." },
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

  const [localSections, setLocalSections] = useState<GuidebookSection[]>(
    sections?.length ? sections : DEFAULT_SECTIONS
  );

  // 🔹 Helpers
  const updateSection = (id: string, updated: Partial<GuidebookSection>) => {
    const newSections = localSections.map((s) =>
      s.id === id ? { ...s, ...updated } : s
    );
    setLocalSections(newSections);
    onChange(newSections);
  };

  const addBlock = (sectionId: string, type: "text" | "list" | "checkbox") => {
    const block: GuidebookBlock = {
      id: crypto.randomUUID(),
      type,
      content: "",
      items: type !== "text" ? [] : undefined,
    };
    const section = localSections.find((s) => s.id === sectionId);
    if (!section) return;
    updateSection(sectionId, { blocks: [...section.blocks, block] });
  };

  const removeBlock = (sectionId: string, blockId: string) => {
    const section = localSections.find((s) => s.id === sectionId);
    if (!section) return;
    updateSection(sectionId, {
      blocks: section.blocks.filter((b) => b.id !== blockId),
    });
  };

  const updateBlock = (
    sectionId: string,
    blockId: string,
    changes: Partial<GuidebookBlock>
  ) => {
    const section = localSections.find((s) => s.id === sectionId);
    if (!section) return;
    updateSection(sectionId, {
      blocks: section.blocks.map((b) =>
        b.id === blockId ? { ...b, ...changes } : b
      ),
    });
  };

  const addBlockItem = (sectionId: string, blockId: string) => {
    const section = localSections.find((s) => s.id === sectionId);
    if (!section) return;
    updateSection(sectionId, {
      blocks: section.blocks.map((b) =>
        b.id === blockId ? { ...b, items: [...(b.items || []), ""] } : b
      ),
    });
  };

  const updateBlockItem = (
    sectionId: string,
    blockId: string,
    index: number,
    value: string
  ) => {
    const section = localSections.find((s) => s.id === sectionId);
    if (!section) return;
    updateSection(sectionId, {
      blocks: section.blocks.map((b) =>
        b.id === blockId
          ? {
              ...b,
              items: b.items?.map((it, i) => (i === index ? value : it)),
            }
          : b
      ),
    });
  };

  // 🔹 Actions
  const handleSave = async () => {
    if (onSave) {
      try {
        await onSave();
        toast({
          title: "Success",
          description: "Guest guide saved successfully",
        });
      } catch {
        toast({
          title: "Error",
          description: "Failed to save guest guide",
          variant: "destructive",
        });
      }
    }
  };

  const generateShareableLink = () => {
    const baseUrl = window.location.origin;
    const shareUrl = `${baseUrl}/property-guide/${propertyTitle}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      toast({
        title: "Link copied!",
        description: "Shareable guest guide link copied to clipboard",
      });
    });
  };

  const exportToPDF = () => {
    toast({
      title: "PDF Export",
      description: "PDF export functionality will be implemented",
    });
  };

  return (
    <div className="space-y-6">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-base font-medium">
            Guest Guide for {propertyTitle}
          </Label>
          <p className="text-sm text-muted-foreground">
            Fill in the guidebook information for your guests
          </p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={generateShareableLink}>
            <Share className="h-4 w-4 mr-2" />
            Share Link
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={exportToPDF}>
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
          {onSave && (
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={handleSave}
              disabled={saving}
            >
              <Save className="h-4 w-4 mr-2" />
              {saving ? "Saving..." : "Save Changes"}
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
                <Icon className="h-5 w-5 text-primary" />
                {section.title}
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
                        <Plus className="h-4 w-4 mr-1" /> Add Item
                      </Button>
                    </div>
                  )}

                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => removeBlock(section.id, block.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-1" /> Remove Block
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
                    onClick={() =>
                      document.getElementById(`section-image-${section.id}`)?.click()
                    }
                  >
                    <ImageIcon className="h-4 w-4 mr-2" />
                    Upload
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
                        reader.onload = () =>
                          updateSection(section.id, {
                            image_url: reader.result as string,
                          });
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </div>
                {section.image_url && (
                  <img
                    src={section.image_url}
                    alt={section.title}
                    className="w-32 h-32 object-cover rounded-md"
                  />
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
