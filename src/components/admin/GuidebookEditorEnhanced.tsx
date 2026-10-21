import { useRef, useState } from "react";
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
import { geocodeAddress } from "@/lib/geocoding";

interface GuidebookBlock {
  id: string;
  type: "text" | "list" | "checkbox" | "map";
  title?: string;
  content?: string;
  items?: string[];
  /** Example text shown in the empty field; never shown to guests */
  placeholder?: string;
  mapPins?: GuidePin[];
}

interface GuidePin {
  lat: number;
  lng: number;
  label: string;
  address?: string;
  /** The coordinates come from the address. Until then the pin sits at a
   * starting point and is not shown to guests */
  geocoded?: boolean;
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
  /** The property's map pin, where new guide pins start */
  center?: { lat: number; lng: number } | null;
}

// Mid-Sweden, for a property without a map pin yet
const SWEDEN_CENTER = { lat: 62.4, lng: 16.5 };

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

// Every new host starts from these, so they hold no facts about any one cabin
// (they used to describe the original Lerum cabins): host-specific blocks start
// empty with an example, and only the welcome and general Swedish customs are
// filled in. Empty blocks are not shown to guests.
const DEFAULT_BLOCKS: Record<string, GuidebookBlock[]> = {
  home: [
    { id: "h1", type: "text", content: "Welcome to our property! We're excited to host you." },
  ],
  directions: [
    { id: "d1", type: "text", title: "Get here by car", content: "", placeholder: "Which road to take, the last turn-off and where to park." },
    { id: "d2", type: "text", title: "Get here by public transport", content: "", placeholder: "Nearest train station or bus stop and how to get from there to the cabin." },
    { id: "d3", type: "map", title: "Route Map", mapPins: [] },
  ],
  stop: [
    { id: "s1", type: "list", title: "Useful stops", items: [""], placeholder: "e.g. The nearest supermarket – groceries" },
    { id: "s2", type: "map", title: "Stops on the way", mapPins: [] },
  ],
  checkin: [
    { id: "c1", type: "text", content: "", placeholder: "When guests can arrive, e.g. from 15:00." },
    { id: "c2", type: "text", content: "", placeholder: "How guests get in, e.g. a key box by the door. Put codes in the Arrival tab – only booked guests get those." },
    { id: "c3", type: "text", content: "", placeholder: "Where guests can park." },
  ],
  wifi: [
    { id: "w1", type: "text", content: "", placeholder: "Where the router is and where the signal is weak. Put the network name and password in the Arrival tab – only booked guests get those." },
  ],
  kitchen: [
    { id: "k1", type: "list", title: "Appliances", items: [""], placeholder: "e.g. Dishwasher" },
  ],
  howthingswork: [
    { id: "h1", type: "text", content: "", placeholder: "e.g. Heating: the thermostat is in the hall. Turn it down when you leave." },
  ],
  waste: [
    { id: "wa1", type: "text", content: "", placeholder: "Where the bins are and how to sort. Leave it empty and guests see a general guide to Swedish recycling." },
  ],
  places: [
    { id: "p1", type: "list", title: "Restaurants", items: [""], placeholder: "e.g. The local pizzeria – 10 minutes by car" },
    { id: "p2", type: "list", title: "Attractions", items: [""], placeholder: "e.g. Best swimming spot, a nature reserve or the nearest town" },
    { id: "p3", type: "map", title: "Places to visit", mapPins: [] },
  ],
  customs: [
    { id: "cu1", type: "text", title: "No shoes indoors", content: "In Sweden, it is polite to remove shoes when entering a home." },
    { id: "cu2", type: "text", title: "Fika", content: "Take a coffee break with something sweet, like a cinnamon bun." },
  ],
  rules: [
    { id: "r1", type: "list", title: "House rules", items: [""], placeholder: "e.g. Quiet after 22:00" },
  ],
  checkout: [
    { id: "co1", type: "text", content: "", placeholder: "e.g. Check-out by 11:00." },
    { id: "co2", type: "checkbox", title: "Check-out checklist", items: [""], placeholder: "e.g. Take out the rubbish" },
  ],
  hoststory: [
    { id: "hs1", type: "text", content: "", placeholder: "A few sentences about you and the place." },
  ],
};

export const GuidebookEditor = ({
  sections = [],
  onChange,
  onSave,
  saving = false,
  propertyTitle = "Property",
  center,
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
  // A pin's address is geocoded after the field loses focus; the result must
  // land on the sections as they are then, not as they were at the blur
  const latestSections = useRef(localSections);
  latestSections.current = localSections;
  // Address lookups still running; Save waits for them so pins are saved
  // with their coordinates, not their starting point
  const [pendingGeocodes, setPendingGeocodes] = useState(0);

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
                ? {
                    ...b,
                    mapPins: [
                      ...(b.mapPins || []),
                      { lat: center?.lat ?? SWEDEN_CENTER.lat, lng: center?.lng ?? SWEDEN_CENTER.lng, label: "", geocoded: false },
                    ],
                  }
                : b
            ),
          }
        : s
    );
    setLocalSections(newSections);
    onChange(newSections);
  };

  const updateMapPin = (sectionId: string, blockId: string, pinIndex: number, updates: Partial<GuidePin>) => {
    const newSections = latestSections.current.map((s) =>
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
    latestSections.current = newSections;
    setLocalSections(newSections);
    onChange(newSections);
  };

  const findPin = (sectionId: string, blockId: string, pinIndex: number) =>
    latestSections.current
      .find((s) => s.id === sectionId)
      ?.blocks.find((b) => b.id === blockId)
      ?.mapPins?.[pinIndex];

  // Guests see the pin on a map, so its coordinates come from the address
  const geocodePin = async (sectionId: string, blockId: string, pinIndex: number, address: string) => {
    const query = address.trim();
    if (!query || findPin(sectionId, blockId, pinIndex)?.geocoded) return;
    setPendingGeocodes((n) => n + 1);
    try {
      const result = await geocodeAddress(/\b(sweden|sverige)\b/i.test(query) ? query : `${query}, Sweden`);
      // The pin may have been deleted (the next pin then has this index) or
      // given another address while the lookup ran
      if (findPin(sectionId, blockId, pinIndex)?.address !== address) return;
      if (!result) {
        toast({ title: "Address not found", description: "Check the spelling or add the town name.", variant: "destructive" });
        return;
      }
      updateMapPin(sectionId, blockId, pinIndex, { lat: result.latitude, lng: result.longitude, geocoded: true });
    } finally {
      setPendingGeocodes((n) => n - 1);
    }
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
            <Button variant="default" size="sm" onClick={handleSave} disabled={saving || pendingGeocodes > 0}>
              <Save className="h-4 w-4 mr-2" />{" "}
              {pendingGeocodes > 0 ? "Finding address..." : saving ? "Saving..." : "Save"}
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
                      placeholder={block.placeholder}
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
                            placeholder={block.placeholder}
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
                            placeholder={block.placeholder}
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
                              onChange={(e) => updateMapPin(section.id, block.id, i, { address: e.target.value, geocoded: false })}
                              onBlur={(e) => geocodePin(section.id, block.id, i, e.target.value)}
                              placeholder="Address (e.g. Storgatan 1, Åre)"
                            />
                            <p className="text-xs text-muted-foreground">
                              {pin.geocoded
                                ? "Found on the map."
                                : "Enter an address. Guests see the pin once the address is found on the map."}
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
