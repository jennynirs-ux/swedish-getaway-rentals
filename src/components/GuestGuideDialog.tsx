import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Property } from "@/hooks/useProperties";
import { useState } from "react";
import {
  Share2,
  Download,
  Home,
  MapPin,
  Wifi,
  BookOpen,
  Key,
  Info,
  LogOut,
  Heart,
  CheckSquare,
  Car,
  Train,
  ShoppingCart,
  Recycle,
  Apple,
  Package,
  Package2,
  Newspaper,
  Wine,
  Trash2,
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

interface GuideSection {
  id: string;
  title: string;
  icon: React.ElementType;
  blocks: GuidebookBlock[];
  image_url?: string;
}

interface GuestGuideDialogProps {
  isOpen: boolean;
  onClose: () => void;
  property: Property;
}

const GuestGuideDialog = ({ isOpen, onClose, property }: GuestGuideDialogProps) => {
  const { toast } = useToast();
  const [activeIndex, setActiveIndex] = useState(0);

  // 🔹 Förifyllda sektioner med block
  const fixedSections: GuideSection[] = [
    {
      id: "home",
      title: "Welcome Home",
      icon: Home,
      blocks: [{ id: "b1", type: "text", content: "Welcome to our property! We’re excited to host you." }],
    },
    {
      id: "directions",
      title: "Directions",
      icon: MapPin,
      blocks: [
        { id: "b1", type: "text", title: "By Car", content: "Take E20 north, exit at Lerum. Free parking by the house." },
        { id: "b2", type: "text", title: "By Public Transport", content: "Take the train to Lerum station. From there, bus 533 stops near the house." },
        { id: "b3", type: "list", title: "Stop on the way", items: ["ICA Kvantum – groceries", "Qstar – fuel & firewood", "Apoteket – pharmacy"] },
      ],
    },
    {
      id: "wifi",
      title: "Wi-Fi",
      icon: Wifi,
      blocks: [{ id: "b1", type: "list", items: ["Network: Guest_Wifi", "Password: Welcome2024"] }],
    },
    {
      id: "checkin",
      title: "Check-in",
      icon: Key,
      blocks: [
        { id: "b1", type: "text", content: "Check-in from 15:00. Contact us for early check-in requests." },
        { id: "b2", type: "list", items: ["Pick up keys from lockbox by the door", "Code will be sent on the day of arrival", "Parking available next to the house"] },
      ],
    },
    {
      id: "howthingswork",
      title: "How things work",
      icon: Info,
      blocks: [
        { id: "b1", type: "checkbox", title: "Oven", items: ["Press power + start", "Turn off after use"] },
        { id: "b2", type: "checkbox", title: "Coffee Maker", items: ["Fill with water", "Add coffee filter", "Press brew"] },
        { id: "b3", type: "checkbox", title: "Heating", items: ["Adjust thermostat in hallway", "Do not cover radiators"] },
      ],
    },
    {
      id: "waste",
      title: "Waste & Recycling",
      icon: Recycle,
      blocks: [
        { id: "b1", type: "text", content: "Did you know that we can be fined if not recycling correctly in Sweden? Please sort your trash carefully." },
        {
          id: "b2",
          type: "list",
          title: "Sorting Guide",
          items: [
            "Food waste → bin under sink",
            "Paper packaging → blue bin",
            "Plastic packaging → yellow bin",
            "Metal packaging → red bin",
            "Clear glass packaging → container at ICA",
            "Coloured glass packaging → container at ICA",
            "Newspapers → green bin",
            "Residual waste → black bin",
          ],
        },
      ],
    },
    {
      id: "places",
      title: "Places to visit",
      icon: BookOpen,
      blocks: [
        { id: "b1", type: "list", title: "Restaurants", items: ["Pizzeria Napoli", "Sjöbaren – seafood", "Café Lerum"] },
        { id: "b2", type: "list", title: "Nature & Sights", items: ["Hiking trails in Nääs", "Lake Aspen beach", "Göteborg city center (20 min by train)"] },
      ],
    },
    {
      id: "customs",
      title: "Swedish Customs",
      icon: BookOpen,
      blocks: [
        { id: "b1", type: "text", title: "Fika", content: "Fika is more than a coffee break – it’s a Swedish ritual of enjoying coffee and pastry together." },
        { id: "b2", type: "list", title: "Local Etiquette", items: ["Be on time – punctuality is important", "Take off your shoes indoors", "Respect personal space"] },
        { id: "b3", type: "list", title: "Other Tips", items: ["Card is king – cash is rarely used", "Systembolaget sells alcohol above 3.5%"] },
      ],
    },
    {
      id: "rules",
      title: "House Rules",
      icon: Heart,
      blocks: [{ id: "b1", type: "list", items: ["Respect quiet hours", "No smoking inside", "No parties allowed"] }],
    },
    {
      id: "checkout",
      title: "Check-out",
      icon: LogOut,
      blocks: [
        { id: "b1", type: "text", content: "Check-out by 11:00. Please leave the house in the same condition as when you arrived." },
        {
          id: "b2",
          type: "checkbox",
          title: "Check-out Checklist",
          items: [
            "Put furniture back in place",
            "Empty trash bins and bring to ICA recycling",
            "Remove bed linens and put in laundry room",
            "Load and start dishwasher",
            "Return borrowed items (SUP boards, life jackets, etc.)",
            "Close windows, turn off lights, lock all doors",
          ],
        },
      ],
    },
  ];

  // 🔹 Lägg ihop med ev. custom från property
  const customSections = (property.guidebook_sections as GuideSection[]) || [];
  const allSections = fixedSections.map((section) => {
    const custom = customSections.find((s) => s.id === section.id);
    return custom ? { ...section, ...custom } : section;
  });

  // 🔹 Renderare för blocks
  const renderBlock = (block: GuidebookBlock) => {
    if (block.type === "text") {
      return (
        <div className="space-y-1">
          {block.title && <h4 className="font-semibold text-foreground">{block.title}</h4>}
          <p className="text-muted-foreground whitespace-pre-wrap">{block.content}</p>
        </div>
      );
    }
    if (block.type === "list" && block.items) {
      return (
        <div className="space-y-1">
          {block.title && <h4 className="font-semibold text-foreground">{block.title}</h4>}
          <ul className="list-disc pl-5 space-y-1">
            {block.items.map((item, idx) => (
              <li key={idx}>{item}</li>
            ))}
          </ul>
        </div>
      );
    }
    if (block.type === "checkbox" && block.items) {
      return (
        <div className="space-y-1">
          {block.title && <h4 className="font-semibold text-foreground">{block.title}</h4>}
          <ul className="space-y-1">
            {block.items.map((item, idx) => (
              <li key={idx} className="flex items-center gap-2">
                <CheckSquare className="h-4 w-4 text-primary" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      );
    }
    return null;
  };

  const shareGuide = async () => {
    const guideUrl = `${window.location.origin}/property/${property.id}/guide`;
    try {
      if (navigator.share) {
        await navigator.share({ title: `${property.title} - Guest Guide`, url: guideUrl });
      } else {
        await navigator.clipboard.writeText(guideUrl);
        toast({ title: "Link copied!", description: "Guest guide link copied to clipboard." });
      }
    } catch {
      await navigator.clipboard.writeText(guideUrl);
      toast({ title: "Link copied!", description: "Guest guide link copied to clipboard." });
    }
  };

  const exportToPDF = () => toast({ title: "PDF Export", description: "Coming soon!" });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl h-[90vh] flex p-0">
        {/* Sidebar */}
        <div className="w-28 border-r border-muted/20 bg-card/50 flex flex-col items-center py-6 gap-6 overflow-y-auto">
          {allSections.map((section, index) => {
            const isActive = activeIndex === index;
            const Icon = section.icon || Info;
            return (
              <button
                key={section.id}
                onClick={() => setActiveIndex(index)}
                className={`p-3 rounded-xl transition-all flex items-center justify-center ${
                  isActive ? "bg-primary text-white shadow-md scale-110" : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
                }`}
              >
                <Icon className="h-6 w-6" />
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          <DialogHeader className="mb-6">
            <div className="flex items-start justify-between">
              <DialogTitle className="text-3xl font-bold">{allSections[activeIndex].title}</DialogTitle>
              <div className="flex gap-2 mt-1">
                <Button variant="outline" size="icon" onClick={shareGuide}>
                  <Share2 className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={exportToPDF}>
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </DialogHeader>

          {allSections[activeIndex].image_url && (
            <img
              src={allSections[activeIndex].image_url}
              alt={allSections[activeIndex].title}
              className="w-full h-48 object-cover rounded-lg mb-6"
            />
          )}

          <div className="prose prose-sm max-w-none text-muted-foreground leading-relaxed space-y-4">
            {allSections[activeIndex].blocks.map((block) => (
              <div key={block.id}>{renderBlock(block)}</div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GuestGuideDialog;
