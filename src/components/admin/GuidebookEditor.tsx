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

// 🔹 Default-sektioner med förifyllt innehåll
const DEFAULT_SECTIONS: GuidebookSection[] = [
  {
    id: "home",
    icon: Home,
    title: "Home",
    blocks: [
      { id: crypto.randomUUID(), type: "text", content: "Welcome to our property! We’re excited to host you." },
    ],
  },
  {
    id: "directions",
    icon: MapPin,
    title: "Directions",
    blocks: [
      { id: crypto.randomUUID(), type: "text", content: "➡️ Get here by Car\n➡️ Get here by Public Transportation" },
    ],
  },
  {
    id: "stop",
    icon: Coffee,
    title: "Stop on the way",
    blocks: [
      { id: crypto.randomUUID(), type: "list", items: ["ICA Kvantum – groceries", "Gas station – fuel & snacks", "Local store – firewood"] },
    ],
  },
  {
    id: "checkin",
    icon: Key,
    title: "Check-in",
    blocks: [
      { id: crypto.randomUUID(), type: "text", content: "Check-in time is 15:00.\nYou will receive instructions for the key and parking before arrival." },
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
      { id: crypto.randomUUID(), type: "text", content: "How to use the oven, coffee machine, and dishwasher." },
    ],
  },
  {
    id: "howthingswork",
    icon: Cog,
    title: "How things work",
    blocks: [
      { id: crypto.randomUUID(), type: "list", items: ["Oven – press ON, then select program", "Coffee machine – add water & capsule", "Heating system – adjust thermostat"] },
    ],
  },
  {
    id: "waste",
    icon: Recycle,
    title: "Waste & Recycling",
    blocks: [
      { id: crypto.randomUUID(), type: "text", content: "Did you know that we can be fined if not recycling right in Sweden?\n\nPlease sort your trash carefully:" },
      { id: crypto.randomUUID(), type: "checkbox", items: ["Plastic", "Paper", "Glass", "Metal", "Food waste"] },
      { id: crypto.randomUUID(), type: "text", content: "Bring full bags to the recycling station at ICA Kvantum.\nExtra bags are under the kitchen sink.\n🔗 Recycling guide" },
    ],
  },
  {
    id: "places",
    icon: Landmark,
    title: "Places to visit",
    blocks: [
      { id: crypto.randomUUID(), type: "list", items: ["Restaurants", "Sights", "Outdoor activities"] },
    ],
  },
  {
    id: "customs",
    icon: BookOpen,
    title: "Swedish customs",
    blocks: [
      { id: crypto.randomUUID(), type: "text", content: "Take off shoes indoors.\nBe on time – punctuality is valued.\nCash is rare – card or Swish is king." },
    ],
  },
  {
    id: "rules",
    icon: Shield,
    title: "House rules",
    blocks: [
      { id: crypto.randomUUID(), type: "list", items: ["Respect quiet hours", "No smoking indoors", "No parties"] },
    ],
  },
  {
    id: "checkout",
    icon: LogOut,
    title: "Check out",
    blocks: [
      { id: crypto.randomUUID(), type: "text", content: "Check-out is by 11:00. Please follow the checklist:" },
      {
        id: crypto.randomUUID(),
        type: "checkbox",
        items: [
          "Put furniture back in place",
          "Remove linens & place in laundry",
          "Start dishwasher",
          "Empty fridge & freezer",
          "Take out trash & recycling",
          "Lock all doors & windows",
        ],
      },
    ],
  },
  {
    id: "hoststory",
    icon: Heart,
    title: "Host Story",
    blocks: [
      { id: crypto.randomUUID(), type: "text", content: "Our story as hosts and why we love this property." },
    ],
  },
];

export const GuidebookEditor = ({
  sections = [],
  onChange,
  onSave,
  saving = false,
  propertyTitle = "Property",
}: GuidebookEditorProps) => {
  const { toast } = useToast();

  const [localSections, setLocalSections] = useState<GuidebookSection[]>(
    (sections.length ? sections : DEFAULT_SECTIONS).map((s) => ({
      ...s,
      blocks: s.blocks || [], // ✅ säkerställ alltid array
    }))
  );

  // 🔹 Helpers
  const updateSection = (id: string, updated: Partial<GuidebookSection>) => {
    const newSections = localSections.map((s) =>
      s.id === id ? { ...s, ...updated, blocks: updated.blocks || s.blocks || [] } : s
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
    updateSection(sectionId, { blocks: [...(section.blocks || []), block] });
  };

  const removeBlock = (sectionId: string, blockId: string) => {
    const section = localSections.find((s) => s.id === sectionId);
    if (!section) return;
    updateSection(sectionId, {
      blocks: (section.blocks || []).filter((b) => b.id !== blockId),
    });
  };

  const updateBlock = (sectionId: string, blockId: string, changes: Partial<GuidebookBlock>) => {
    const section = localSections.find((s) => s.id === sectionId);
    if (!section) return;
    updateSection(sectionId, {
      blocks: (section.blocks || []).map((b) => (b.id === blockId ? { ...b, ...changes } : b)),
    });
  };

  const addBlockItem = (sectionId: string, blockId: string) => {
    const section = localSections.find((s) => s.id === sectionId);
    if (!section) return;
    updateSection(sectionId, {
      blocks: (section.blocks || []).map((b) =>
        b.id === blockId ? { ...b, items: [...(b.items || []), ""] } : b
      ),
    });
  };

  const updateBlockItem = (sectionId: string, blockId: string, index: number, value: string) => {
    const section = localSections.find((s) => s.id === sectionId);
    if (!section) return;
    updateSection(sectionId, {
      blocks: (section.blocks || []).map((b) =>
        b.id === blockId
          ? { ...b, items: b.items?.map((it, i) => (i === index ? value : it)) }
          : b
      ),
    });
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
          <Label className="text-base font-medium">Guest Guide for {propertyTitle}</Label>
          <p className="text-sm text-muted-foreground">Fill in the guidebook information for your guests</p>
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
            <Button type="button" variant="default" size="sm" onClick={handleSave} disabled={saving}>
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
              {section.blocks?.map((block) => (
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
                <Button size="sm" onClick={() => addBlock(section.id, "text")}>Add Text Block</Button>
                <Button size="sm" onClick={() => addBlock(section.id, "list")}>Add Bullet List</Button>
                <Button size="sm" onClick={() => addBlock(section.id, "checkbox")}>Add Checkbox List</Button>
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
