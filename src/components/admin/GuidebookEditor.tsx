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
  Package,
  FileText,
  Circle,
  Square,
  SquareStack,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface GuidebookBlock {
  id: string;
  type: "text" | "list" | "checkbox";
  content?: string;
  items: string[]; // alltid array
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

// alltid skapar items = [] för list/checkbox-blocks
const makeBlock = (
  type: "text" | "list" | "checkbox",
  content: string = "",
  items: string[] = []
): GuidebookBlock => ({
  id: crypto.randomUUID(),
  type,
  content,
  items: type === "text" ? [] : items,
});

// förifyllda sektioner
const FIXED_SECTIONS: GuidebookSection[] = [
  {
    id: "home",
    icon: Home,
    title: "Welcome Home",
    blocks: [makeBlock("text", "Welcome to our property! We’re excited to host you.")],
  },
  {
    id: "directions",
    icon: MapPin,
    title: "Directions",
    blocks: [
      makeBlock("text", "Get here by car: Follow E20, exit Lerum. Parking at the house.\n\nGet here by public transport: Train to Lerum, then local bus."),
      makeBlock("list", "", ["Stop on the way: ICA Kvantum – groceries", "Stop on the way: Gas station – firewood"]),
    ],
  },
  {
    id: "checkin",
    icon: Key,
    title: "Check-in",
    blocks: [
      makeBlock("text", "Check-in time is 15:00.\nKeys via Yale Doorman code (sent before arrival).\nParking next to the house."),
    ],
  },
  {
    id: "wifi",
    icon: Wifi,
    title: "Wi-Fi",
    blocks: [makeBlock("text", "Network: Guest_Wifi\nPassword: Welcome2024")],
  },
  {
    id: "kitchen",
    icon: Utensils,
    title: "Kitchen",
    blocks: [makeBlock("text", "Fully equipped kitchen with oven, stove, fridge, freezer, dishwasher, and coffee maker.")],
  },
  {
    id: "howthingswork",
    icon: Cog,
    title: "How Things Work",
    blocks: [makeBlock("list", "", ["Oven – press ON and select program", "Coffee maker – add filter and coffee", "Heating – Google Nest controlled"])],
  },
  {
    id: "waste",
    icon: Trash2,
    title: "Waste & Recycling",
    blocks: [
      makeBlock("text", "We can be fined if trash is not sorted correctly. Please recycle carefully."),
      makeBlock("list", "", [
        "Plastic – yellow bags",
        "Paper & cardboard – blue bin",
        "Food waste – brown bag",
        "Glass (clear) – white bin",
        "Glass (colored) – green bin",
        "Metal – grey bin",
        "Other waste – black bin",
      ]),
    ],
  },
  {
    id: "places",
    icon: Landmark,
    title: "Places to Visit",
    blocks: [makeBlock("list", "", ["Restaurants – Villa Belparc", "Nature – Delsjön Reserve", "Museums – Universeum"])],
  },
  {
    id: "customs",
    icon: BookOpen,
    title: "Swedish Customs",
    blocks: [
      makeBlock("list", "", [
        "Fika – coffee and a cinnamon bun",
        "No shoes indoors – bring socks or slippers",
        "Card is king – cash is rare",
        "Quiet culture – respect personal space",
        "Alcohol – only sold at Systembolaget",
      ]),
    ],
  },
  {
    id: "rules",
    icon: Shield,
    title: "House Rules",
    blocks: [makeBlock("list", "", ["Respect quiet hours", "No smoking indoors", "No parties"])],
  },
  {
    id: "checkout",
    icon: LogOut,
    title: "Check-out",
    blocks: [
      makeBlock("text", "Check-out time is 11:00. Please follow the checklist."),
      makeBlock("checkbox", "", [
        "Put furniture back in place",
        "Empty trash bins and bring to recycling",
        "Remove bed linens and place in laundry",
        "Load and start dishwasher",
        "Empty fridge and freezer",
        "Close windows and lock doors",
      ]),
    ],
  },
  {
    id: "hoststory",
    icon: Heart,
    title: "Host Story",
    blocks: [makeBlock("text", "We started hosting in 2020 with the goal of sharing our love for the Swedish countryside.")],
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
    sections.length > 0 ? sections : FIXED_SECTIONS
  );

  const updateSection = (id: string, updated: Partial<GuidebookSection>) => {
    const newSections = localSections.map((s) => (s.id === id ? { ...s, ...updated } : s));
    setLocalSections(newSections);
    onChange(newSections);
  };

  const addBlock = (sectionId: string, type: "text" | "list" | "checkbox") => {
    const block = makeBlock(type);
    const section = localSections.find((s) => s.id === sectionId);
    if (!section) return;
    updateSection(sectionId, { blocks: [...section.blocks, block] });
  };

  const updateBlockItem = (sectionId: string, blockId: string, index: number, value: string) => {
    const section = localSections.find((s) => s.id === sectionId);
    if (!section) return;
    updateSection(sectionId, {
      blocks: section.blocks.map((b) =>
        b.id === blockId ? { ...b, items: b.items.map((it, i) => (i === index ? value : it)) } : b
      ),
    });
  };

  return (
    <div className="space-y-6">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-base font-medium">Guest Guide for {propertyTitle}</Label>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Share className="h-4 w-4 mr-2" />
            Share Link
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
          {onSave && (
            <Button variant="default" size="sm" onClick={onSave} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          )}
        </div>
      </div>

      {/* Sections */}
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
            <CardContent>
              {section.blocks.map((block) => (
                <div key={block.id} className="mb-4">
                  {block.type === "text" && <Textarea defaultValue={block.content} rows={3} />}
                  {block.type === "list" &&
                    (block.items || []).map((item, i) => (
                      <Input
                        key={i}
                        defaultValue={item}
                        onChange={(e) => updateBlockItem(section.id, block.id, i, e.target.value)}
                      />
                    ))}
                  {block.type === "checkbox" &&
                    (block.items || []).map((item, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <input type="checkbox" className="w-4 h-4" />
                        <Input
                          defaultValue={item}
                          onChange={(e) => updateBlockItem(section.id, block.id, i, e.target.value)}
                        />
                      </div>
                    ))}

                  <div className="flex gap-2 mt-2">
                    <Button size="sm" onClick={() => addBlock(section.id, "text")}>
                      Add Text Block
                    </Button>
                    <Button size="sm" onClick={() => addBlock(section.id, "list")}>
                      Add List
                    </Button>
                    <Button size="sm" onClick={() => addBlock(section.id, "checkbox")}>
                      Add Checklist
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
