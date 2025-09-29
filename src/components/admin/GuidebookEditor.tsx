import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Save,
  Download,
  Share,
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

export const GuidebookEditor = ({
  sections = [],
  onChange,
  onSave,
  saving = false,
  propertyTitle = "Property",
}: GuidebookEditorProps) => {
  const { toast } = useToast();
  const [activeIndex, setActiveIndex] = useState(0);

  // Merge sections (default + saved)
  const [localSections, setLocalSections] = useState<GuidebookSection[]>(
    FIXED_SECTIONS.map((s) => {
      const existing = sections.find((sec) => sec.id === s.id);
      return {
        ...s,
        blocks: existing?.blocks || [],
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

  const updateBlock = useCallback(
    (sectionId: string, blockId: string, changes: Partial<GuidebookBlock>) => {
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
    },
    [localSections, onChange]
  );

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
        toast({
          title: "Error",
          description: "Failed to save guide",
          variant: "destructive",
        });
      }
    }
  };

  const activeSection = localSections[activeIndex];
  const ActiveIcon = activeSection.icon;

  return (
    <div className="flex h-[85vh] border rounded-lg overflow-hidden">
      {/* Sidebar */}
      <div className="w-24 border-r bg-card/50 flex flex-col items-center py-6 gap-6 overflow-y-auto">
        {localSections.map((section, index) => {
          const Icon = section.icon;
          const isActive = activeIndex === index;
          return (
            <button
              key={section.id}
              onClick={() => setActiveIndex(index)}
              className={`p-3 rounded-xl transition-all duration-300 flex items-center justify-center ${
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

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <ActiveIcon className="h-6 w-6 text-primary" /> {activeSection.title}
            </h2>
            <p className="text-sm text-muted-foreground">
              Editing section for {propertyTitle}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Share className="h-4 w-4 mr-2" /> Share
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
                <Save className="h-4 w-4 mr-2" /> {saving ? "Saving..." : "Save"}
              </Button>
            )}
          </div>
        </div>

        {/* Blocks */}
        {activeSection.blocks.map((block) => (
          <Card key={block.id} className="mb-4">
            <CardHeader>
              <CardTitle>{block.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {block.type === "text" && (
                <Textarea
                  value={block.content}
                  onChange={(e) =>
                    updateBlock(activeSection.id, block.id, { content: e.target.value })
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
                        updateBlockItem(activeSection.id, block.id, i, e.target.value)
                      }
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
                        onChange={(e) =>
                          updateBlockItem(activeSection.id, block.id, i, e.target.value)
                        }
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
