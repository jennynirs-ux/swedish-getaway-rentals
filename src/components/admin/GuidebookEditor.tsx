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
  Package,
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

const FIXED_SECTIONS: Omit<GuidebookSection, "blocks">[] = [
  { id: "home", icon: Home, title: "Home" },
  { id: "directions", icon: MapPin, title: "Directions" },
  { id: "stop", icon: Coffee, title: "Stop on the way" },
  { id: "checkin", icon: Key, title: "Check in" },
  { id: "wifi", icon: Wifi, title: "Wi-Fi" },
  { id: "kitchen", icon: Utensils, title: "Kitchen" },
  { id: "howthingswork", icon: Cog, title: "How things work" },
  { id: "places", icon: Landmark, title: "Places to visit" },
  { id: "customs", icon: BookOpen, title: "Swedish customs" },
  { id: "waste", icon: Recycle, title: "Waste & Recycling" },
  { id: "rules", icon: Shield, title: "House rules" },
  { id: "checkout", icon: LogOut, title: "Check out" },
  { id: "hoststory", icon: Heart, title: "Host Story" },
];

const DEFAULT_BLOCKS: Record<string, GuidebookBlock[]> = {
  directions: [
    {
      id: crypto.randomUUID(),
      type: "text",
      content: "Get here by car: Take E20 towards Lerum, exit 89, follow signs.",
    },
    {
      id: crypto.randomUUID(),
      type: "text",
      content: "Get here by public transportation: Take the pendeltåg to Lerum, then bus 534.",
    },
    {
      id: crypto.randomUUID(),
      type: "text",
      content: "Stop on the way: ICA Kvantum for groceries, gas station by the roundabout.",
    },
  ],
  checkin: [
    {
      id: crypto.randomUUID(),
      type: "text",
      content: "Check-in is from 15:00. Parking available by the red barn.",
    },
    {
      id: crypto.randomUUID(),
      type: "text",
      content: "Keys are in the lockbox. Code will be sent on arrival day.",
    },
  ],
  checkout: [
    {
      id: crypto.randomUUID(),
      type: "checkbox",
      content: "Check-out checklist (before 11:00):",
      items: [
        "Return furniture to original places",
        "Empty trash & recycling",
        "Remove bed linens and put in laundry room",
        "Load and start dishwasher",
        "Check under beds for forgotten items",
        "Close windows and doors, turn off lights",
      ],
    },
  ],
  waste: [
    {
      id: crypto.randomUUID(),
      type: "text",
      content: "Did you know we can be fined if not recycling correctly in Sweden?",
    },
    {
      id: crypto.randomUUID(),
      type: "checkbox",
      content: "Please sort your trash:",
      items: [
        "Plastic → yellow bin",
        "Paper → blue bin",
        "Glass (colored) → green bin",
        "Glass (clear) → white bin",
        "Metal → grey bin",
        "Food waste → brown bin",
      ],
    },
    {
      id: crypto.randomUUID(),
      type: "text",
      content: "Bring full bags to the recycling station at ICA Kvantum. Extra bags under the kitchen sink.",
    },
  ],
  customs: [
    {
      id: crypto.randomUUID(),
      type: "text",
      content: "No shoes indoors: Swedes always take off shoes when entering a home.",
    },
    {
      id: crypto.randomUUID(),
      type: "text",
      content: "Fika: Coffee break with something sweet, usually a cinnamon bun.",
    },
    {
      id: crypto.randomUUID(),
      type: "text",
      content: "Card is king: Cash is rare, use card or Swish (local mobile payment).",
    },
  ],
};

export const GuidebookEditor = ({
  sections,
  onChange,
  onSave,
  saving = false,
  propertyTitle = "Property",
}: GuidebookEditorProps) => {
  const { toast } = useToast();

  const [localSections, setLocalSections] = useState<GuidebookSection[]>(() =>
    FIXED_SECTIONS.map((s) => {
      const existing = sections.find((sec) => sec.id === s.id);
      return {
        ...s,
        blocks:
          existing?.blocks?.map((b) => ({ ...b, items: b.items || [] })) ??
          DEFAULT_BLOCKS[s.id] ??
          [],
        image_url: existing?.image_url,
      };
    })
  );

  // Block helpers
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

  // Save / Export
  const handleSave = async () => {
    if (onSave) {
      try {
        await onSave();
        toast({ title: "Success", description: "Guest guide saved successfully" });
      } catch {
        toast({
          title: "Error",
          description: "Failed to save guest guide",
          variant: "destructive",
        });
      }
    }
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
          <Button type="button" variant="outline" size="sm">
            <Share className="h-4 w-4 mr-2" /> Share Link
          </Button>
          <Button type="button" variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" /> Export PDF
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
                      onChange={(e) =>
                        updateBlock(section.id, block.id, { content: e.target.value })
                      }
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
                          onChange={(e) =>
                            updateBlockItem(section.id, block.id, i, e.target.value)
                          }
                          placeholder={`Item ${i + 1}`}
                        />
                      ))}
                      <Button size="sm" onClick={() => addBlockItem(section.id, block.id)}>
                        Add Item
                      </Button>
                    </div>
                  )}
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
                        reader.onload = () =>
                          updateSection(section.id, { image_url: reader.result as string });
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
