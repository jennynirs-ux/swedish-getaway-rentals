// @ts-nocheck
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
  Plus,
  Trash2,
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
import { ImageUpload } from "@/components/admin/ImageUpload";

interface GuidebookBlock {
  id: string;
  type: "text" | "list" | "checkbox" | "map";
  title?: string;
  content?: string;
  items?: string[];
  mapPins?: Array<{ lat: number; lng: number; label: string; address?: string }>;
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

const SECTION_ICONS: Record<string, React.ElementType> = {
  home: Home,
  directions: MapPin,
  stop: Coffee,
  checkin: Key,
  wifi: Wifi,
  kitchen: Utensils,
  howthingswork: Cog,
  waste: Recycle,
  places: Landmark,
  customs: BookOpen,
  rules: Shield,
  checkout: LogOut,
  hoststory: Heart,
};

const DEFAULT_SECTION_TITLES: Record<string, string> = {
  home: "Welcome Home",
  directions: "Directions",
  stop: "Stop on the way",
  checkin: "Check-in",
  wifi: "Wi-Fi",
  kitchen: "Kitchen",
  howthingswork: "How things work",
  waste: "Waste & Recycling",
  places: "Places to visit",
  customs: "Swedish customs",
  rules: "House rules",
  checkout: "Check-out",
  hoststory: "Host Story",
};

const DEFAULT_BLOCKS: Record<string, GuidebookBlock[]> = {
  home: [
    { id: "h1", type: "text", content: "Welcome to our property! We're excited to host you." },
  ],
  directions: [
    { id: "d1", type: "text", title: "Get here by car", content: "Take the E20 and exit at Lerum. Parking is available on site." },
    { id: "d2", type: "text", title: "Get here by public transport", content: "Take the commuter train to Lerum station, then bus 533 to Häckenvägen." },
    { id: "d3", type: "map", title: "Route Map", mapPins: [] },
  ],
  stop: [
    { id: "s1", type: "list", title: "Useful stops", items: ["ICA Kvantum – groceries", "Shell – gas & snacks", "Local shop – firewood"] },
    { id: "s2", type: "map", title: "Stops on the way", mapPins: [] },
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
    { id: "wa1", type: "text", content: "Follow local recycling rules. Use the correct bins for food, paper, plastic, glass, metal, and residual waste." },
  ],
  places: [
    { id: "p1", type: "list", title: "Restaurants", items: ["Pizzeria Napoli", "Hamnkrogen seafood", "Sushi & Wok Lerum"] },
    { id: "p2", type: "list", title: "Attractions", items: ["Lake Aspen – swimming", "Skatås nature reserve", "Göteborg city – 20 min by train"] },
    { id: "p3", type: "map", title: "Places to visit", mapPins: [] },
  ],
  customs: [
    { id: "cu1", type: "text", title: "No shoes indoors", content: "In Sweden, it is polite to remove shoes when entering a home." },
    { id: "cu2", type: "text", title: "Fika", content: "Take a coffee break with something sweet, like a cinnamon bun." },
  ],
  rules: [
    { id: "r1", type: "list", title: "House rules", items: ["No smoking indoors", "Respect quiet hours 22–07", "No parties", "If you break it you buy it"] },
  ],
  checkout: [
    { id: "co1", type: "text", content: "Check-out time: 11:00" },
    { id: "co2", type: "checkbox", title: "Check-out checklist", items: ["Empty trash", "Remove bed linens", "Close windows & turn off lights"] },
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
    Object.keys(DEFAULT_SECTION_TITLES).map((id) => {
      const existing = sections.find((sec) => sec.id === id);
      return {
        id,
        icon: SECTION_ICONS[id],
        title: existing?.title || DEFAULT_SECTION_TITLES[id],
        blocks: existing?.blocks?.length ? existing.blocks : DEFAULT_BLOCKS[id] || [],
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

  const addBlockItem = (sectionId: string, blockId: string) => {
    const newSections = localSections.map((s) =>
      s.id === sectionId
        ? {
            ...s,
            blocks: s.blocks.map((b) =>
              b.id === blockId ? { ...b, items: [...(b.items || []), ""] } : b
            ),
          }
        : s
    );
    setLocalSections(newSections);
    onChange(newSections);
  };

  const removeBlockItem = (sectionId: string, blockId: string, index: number) => {
    const newSections = localSections.map((s) =>
      s.id === sectionId
        ? {
            ...s,
            blocks: s.blocks.map((b) =>
              b.id === blockId
                ? { ...b, items: b.items?.filter((_, i) => i !== index) }
                : b
            ),
          }
        : s
    );
    setLocalSections(newSections);
    onChange(newSections);
  };

  const addMapPin = (sectionId: string, blockId: string) => {
    const newSections = localSections.map((s) =>
      s.id === sectionId
        ? {
            ...s,
            blocks: s.blocks.map((b) =>
              b.id === blockId
                ? { ...b, mapPins: [...(b.mapPins || []), { lat: 57.7, lng: 12.0, label: "New Pin" }] }
                : b
            ),
          }
        : s
    );
    setLocalSections(newSections);
    onChange(newSections);
  };

  const updateMapPin = (sectionId: string, blockId: string, pinIndex: number, updates: Partial<{ lat: number; lng: number; label: string; address: string }>) => {
    const newSections = localSections.map((s) =>
      s.id === sectionId
        ? {
            ...s,
            blocks: s.blocks.map((b) =>
              b.id === blockId
                ? {
                    ...b,
                    mapPins: b.mapPins?.map((pin, i) =>
                      i === pinIndex ? { ...pin, ...updates } : pin
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

  const removeMapPin = (sectionId: string, blockId: string, pinIndex: number) => {
    const newSections = localSections.map((s) =>
      s.id === sectionId
        ? {
            ...s,
            blocks: s.blocks.map((b) =>
              b.id === blockId
                ? { ...b, mapPins: b.mapPins?.filter((_, i) => i !== pinIndex) }
                : b
            ),
          }
        : s
    );
    setLocalSections(newSections);
    onChange(newSections);
  };

  const addBlock = (sectionId: string, type: "text" | "list" | "checkbox" | "map") => {
    const newBlock: GuidebookBlock = {
      id: `${sectionId}_${Date.now()}`,
      type,
      title: "",
      content: type === "text" ? "" : undefined,
      items: type === "list" || type === "checkbox" ? [] : undefined,
      mapPins: type === "map" ? [] : undefined,
    };
    const newSections = localSections.map((s) =>
      s.id === sectionId
        ? { ...s, blocks: [...s.blocks, newBlock] }
        : s
    );
    setLocalSections(newSections);
    onChange(newSections);
  };

  const removeBlock = (sectionId: string, blockId: string) => {
    const newSections = localSections.map((s) =>
      s.id === sectionId
        ? { ...s, blocks: s.blocks.filter((b) => b.id !== blockId) }
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
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-base font-medium">Guest Guide for {propertyTitle}</Label>
          <p className="text-sm text-muted-foreground">Fill in the guidebook for your guests</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm"><Share className="h-4 w-4 mr-2" /> Share</Button>
          <Button 
            variant="default" 
            size="lg"
            className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg"
          >
            <Download className="h-5 w-5 mr-2" /> Download PDF
          </Button>
          {onSave && (
            <Button variant="default" size="sm" onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4 mr-2" /> {saving ? "Saving..." : "Save"}
            </Button>
          )}
        </div>
      </div>

      {localSections.map((section) => {
        const Icon = section.icon;
        return (
          <Card key={section.id}>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Icon className="h-5 w-5 text-primary flex-shrink-0" />
                <Input
                  value={section.title}
                  onChange={(e) => updateSection(section.id, { title: e.target.value })}
                  className="text-lg font-semibold border-none shadow-none p-0 h-auto focus-visible:ring-0"
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <ImageUpload
                label="Section Image (optional)"
                value={section.image_url || ""}
                onChange={(url) => updateSection(section.id, { image_url: url })}
                onRemove={() => updateSection(section.id, { image_url: '' })}
              />
              {section.blocks.map((block) => (
                <div key={block.id} className="border rounded p-3 bg-muted/10 space-y-2 relative group">
                  <div className="flex items-center justify-between gap-2">
                    <Input
                      value={block.title || ""}
                      onChange={(e) => updateBlock(section.id, block.id, { title: e.target.value })}
                      placeholder="Block title (optional)"
                      className="font-medium bg-transparent border-none shadow-none p-0 h-auto focus-visible:ring-1"
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removeBlock(section.id, block.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>

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
                        <div key={i} className="flex items-center gap-2">
                          <Input
                            value={item}
                            onChange={(e) =>
                              updateBlock(section.id, block.id, {
                                items: block.items?.map((it, idx) =>
                                  idx === i ? e.target.value : it
                                ),
                              })
                            }
                          />
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => removeBlockItem(section.id, block.id, i)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => addBlockItem(section.id, block.id)}
                      >
                        <Plus className="h-4 w-4 mr-2" /> Add item
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
                              updateBlock(section.id, block.id, {
                                items: block.items?.map((it, idx) =>
                                  idx === i ? e.target.value : it
                                ),
                              })
                            }
                          />
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => removeBlockItem(section.id, block.id, i)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => addBlockItem(section.id, block.id)}
                      >
                        <Plus className="h-4 w-4 mr-2" /> Add checklist item
                      </Button>
                    </div>
                  )}

                  {block.type === "map" && (
                    <div className="space-y-3">
                      <div className="h-48 rounded-md bg-muted/30 border-2 border-dashed flex items-center justify-center">
                        <div className="text-center text-muted-foreground">
                          <MapPin className="h-12 w-12 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">Map will be shown to guests</p>
                          <p className="text-xs">Add pins by address below</p>
                        </div>
                      </div>
                      {block.mapPins?.map((pin, i) => (
                        <div key={i} className="flex items-start gap-2 p-3 border rounded bg-background">
                          <MapPin className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                          <div className="flex-1 space-y-2">
                            <Input
                              value={pin.label}
                              onChange={(e) => updateMapPin(section.id, block.id, i, { label: e.target.value })}
                              placeholder="Location name"
                            />
                            <Input
                              value={pin.address || ""}
                              onChange={(e) => updateMapPin(section.id, block.id, i, { address: e.target.value })}
                              placeholder="Address (e.g., Storgatan 1, Gothenburg)"
                            />
                            <p className="text-xs text-muted-foreground">
                              Enter an address. Coordinates will be calculated automatically.
                            </p>
                          </div>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="flex-shrink-0"
                            onClick={() => removeMapPin(section.id, block.id, i)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => addMapPin(section.id, block.id)}
                      >
                        <Plus className="h-4 w-4 mr-2" /> Add map pin
                      </Button>
                    </div>
                  )}
                </div>
              ))}
              
              <div className="flex gap-2 pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => addBlock(section.id, "text")}
                >
                  <Plus className="h-4 w-4 mr-2" /> Add Text
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => addBlock(section.id, "list")}
                >
                  <Plus className="h-4 w-4 mr-2" /> Add List
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => addBlock(section.id, "checkbox")}
                >
                  <Plus className="h-4 w-4 mr-2" /> Add Checklist
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => addBlock(section.id, "map")}
                >
                  <Plus className="h-4 w-4 mr-2" /> Add Map
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
