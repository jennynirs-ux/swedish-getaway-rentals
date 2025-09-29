import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Save,
  Download,
  Share2,
  Home,
  MapPin,
  Car,
  Train,
  ParkingCircle,
  Key,
  Wifi,
  Utensils,
  Cog,
  Recycle,
  Landmark,
  ShoppingCart,
  LogOut,
  BookOpen,
  Shield,
  Heart,
  Info,
  Star,
  Image as ImageIcon,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type BlockType = "text" | "list" | "checkbox" | "image";

interface GuidebookBlock {
  id: string;
  type: BlockType;
  title?: string;
  content?: string;
  items?: string[];
  image_url?: string;
}

interface GuidebookSection {
  id: string;
  icon: React.ElementType;
  title: string;
  blocks: GuidebookBlock[];
}

interface GuidebookEditorProps {
  sections?: GuidebookSection[];
  onChange: (sections: GuidebookSection[]) => void;
  onSave?: () => Promise<void>;
  saving?: boolean;
  propertyTitle?: string;
}

const FIXED_SECTIONS: Omit<GuidebookSection, "blocks">[] = [
  { id: "home", icon: Home, title: "Welcome" },
  { id: "directions", icon: MapPin, title: "Directions" },
  { id: "parking", icon: ParkingCircle, title: "Parking" },
  { id: "checkin", icon: Key, title: "Check-in" },
  { id: "wifi", icon: Wifi, title: "Wi-Fi" },
  { id: "howthingswork", icon: Cog, title: "How things work" },
  { id: "waste", icon: Recycle, title: "Waste & Recycling" },
  { id: "shopping", icon: ShoppingCart, title: "Local Shopping" },
  { id: "places", icon: Landmark, title: "Local Recommendations" },
  { id: "customs", icon: BookOpen, title: "Swedish Customs" },
  { id: "rules", icon: Shield, title: "House Rules" },
  { id: "checkout", icon: LogOut, title: "Check-out" },
  { id: "reviews", icon: Star, title: "Review Rating" },
  { id: "hoststory", icon: Heart, title: "Host Story" },
];

export const GuidebookEditor = ({
  sections = [],
  onChange,
  onSave,
  saving = false,
  propertyTitle = "Property",
}: GuidebookEditorProps) => {
  const { toast } = useToast();
  const [activeIndex, setActiveIndex] = useState(0);

  const [localSections, setLocalSections] = useState<GuidebookSection[]>(
    FIXED_SECTIONS.map((s) => {
      const existing = sections.find((sec) => sec.id === s.id);
      return {
        ...s,
        blocks: existing?.blocks?.length ? existing.blocks : [],
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

  const updateBlock = (
    sectionId: string,
    blockId: string,
    changes: Partial<GuidebookBlock>
  ) => {
    const newSections = localSections.map((s) =>
      s.id === sectionId
        ? {
            ...s,
            blocks: s.blocks.map((b) =>
              b.id === blockId ? { ...b, ...changes } : b
            ),
          }
        : s
    );
    setLocalSections(newSections);
    onChange(newSections);
  };

  const addBlockItem = (sectionId: string, blockId: string) => {
    const newSections = localSections.map((s) =>
      s.id === sectionId
        ? {
            ...s,
            blocks: s.blocks.map((b) =>
              b.id === blockId
                ? { ...b, items: [...(b.items || []), ""] }
                : b
            ),
          }
        : s
    );
    setLocalSections(newSections);
    onChange(newSections);
  };

  const updateBlockItem = (
    sectionId: string,
    blockId: string,
    index: number,
    value: string
  ) => {
    const newSections = localSections.map((s) =>
      s.id === sectionId
        ? {
            ...s,
            blocks: s.blocks.map((b) =>
              b.id === blockId
                ? {
                    ...b,
                    items: b.items?.map((it, i) =>
                      i === index ? value : it
                    ),
                  }
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
        toast({ title: "Success", description: "Guest guide saved" });
      } catch {
        toast({
          title: "Error",
          description: "Failed to save guide",
          variant: "destructive",
        });
      }
    }
  };

  const currentSection = localSections[activeIndex];

  return (
    <div className="flex h-[90vh]">
      {/* Sidebar with icons */}
      <div className="w-24 border-r border-muted/20 bg-card/50 flex flex-col items-center py-6 gap-6 overflow-y-auto">
        {localSections.map((section, index) => {
          const isActive = activeIndex === index;
          const Icon = section.icon || Info;
          return (
            <button
              key={section.id}
              onClick={() => setActiveIndex(index)}
              className={`p-3 rounded-xl transition-all ${
                isActive
                  ? "bg-primary text-white shadow-md scale-110"
                  : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
              }`}
            >
              <Icon className="h-6 w-6" />
            </button>
          );
        })}
      </div>

      {/* Main editor */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">{currentSection?.title}</h2>
            <p className="text-sm text-muted-foreground">
              Editing section of {propertyTitle}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Share2 className="h-4 w-4 mr-2" /> Share
            </Button>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" /> PDF
            </Button>
            {onSave && (
              <Button
                variant="default"
                size="sm"
                onClick={handleSave}
                disabled={saving}
              >
                <Save className="h-4 w-4 mr-2" />{" "}
                {saving ? "Saving..." : "Save"}
              </Button>
            )}
          </div>
        </div>

        {/* Blocks */}
        {currentSection?.blocks?.map((block) => (
          <Card key={block.id} className="p-4 space-y-2">
            {block.title && <Label>{block.title}</Label>}

            {block.type === "text" && (
              <Textarea
                value={block.content}
                onChange={(e) =>
                  updateBlock(currentSection.id, block.id, {
                    content: e.target.value,
                  })
                }
                rows={3}
              />
            )}

            {block.type === "list" && (
              <div className="space-y-2">
                {block.items?.map((item, i) => (
                  <Input
                    key={i}
                    value={item}
                    onChange={(e) =>
                      updateBlockItem(currentSection.id, block.id, i, e.target.value)
                    }
                  />
                ))}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => addBlockItem(currentSection.id, block.id)}
                >
                  + Add item
                </Button>
              </div>
            )}

            {block.type === "checkbox" && (
              <div className="space-y-2">
                {block.items?.map((item, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input type="checkbox" disabled className="h-4 w-4" />
                    <Input
                      value={item}
                      onChange={(e) =>
                        updateBlockItem(currentSection.id, block.id, i, e.target.value)
                      }
                    />
                  </div>
                ))}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => addBlockItem(currentSection.id, block.id)}
                >
                  + Add checkbox
                </Button>
              </div>
            )}

            {block.type === "image" && (
              <div className="space-y-2">
                <Input
                  type="text"
                  placeholder="Image URL"
                  value={block.image_url || ""}
                  onChange={(e) =>
                    updateBlock(currentSection.id, block.id, {
                      image_url: e.target.value,
                    })
                  }
                />
                {block.image_url && (
                  <img
                    src={block.image_url}
                    alt="Preview"
                    className="max-h-48 rounded"
                  />
                )}
                <Button size="sm" variant="outline">
                  <ImageIcon className="h-4 w-4 mr-2" /> Upload
                </Button>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
};
