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
  Recycle,
  Apple,
  Package,
  Package2,
  Newspaper,
  Wine,
  Trash2,
  Coffee,
  Utensils,
  Cog,
  Landmark,
  Shield,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type SectionType = "text" | "list" | "checkbox";

interface GuideSection {
  id: string;
  title: string;
  content?: string;
  items?: string[];
  type?: SectionType;
  image_url?: string;
  icon?: React.ElementType;
}

interface GuestGuideDialogProps {
  isOpen: boolean;
  onClose: () => void;
  property: Property;
}

const GuestGuideDialog = ({ isOpen, onClose, property }: GuestGuideDialogProps) => {
  const { toast } = useToast();
  const [activeIndex, setActiveIndex] = useState(0);

  // Standardmallar (fallback om host inte fyllt i)
  const defaultSections: GuideSection[] = [
    {
      id: "home",
      title: "Welcome Home",
      icon: Home,
      type: "text",
      content: "Welcome to our property! We’re excited to host you.",
    },
    {
      id: "directions",
      title: "Directions",
      icon: MapPin,
      type: "list",
      items: [
        "Get here by car: Take the E20 and exit at Lerum. Parking is available on site.",
        "Get here by public transport: Take the commuter train to Lerum station, then bus 533 to Häckenvägen.",
      ],
    },
    {
      id: "stop",
      title: "Stop on the way",
      icon: Coffee,
      type: "list",
      items: ["ICA Kvantum – groceries", "Shell – gas & snacks", "Local shop – firewood"],
    },
    {
      id: "checkin",
      title: "Check-in",
      icon: Key,
      type: "list",
      items: ["Check-in time: 15:00", "Keys are in the lockbox by the entrance", "Parking in front of the house"],
    },
    {
      id: "wifi",
      title: "Wi-Fi",
      icon: Wifi,
      type: "list",
      items: ["Network: Guest_Wifi", "Password: Welcome2024"],
    },
    {
      id: "kitchen",
      title: "Kitchen",
      icon: Utensils,
      type: "list",
      items: ["Oven", "Coffee machine", "Dishwasher"],
    },
    {
      id: "howthingswork",
      title: "How things work",
      icon: Cog,
      type: "checkbox",
      items: ["Oven: press power + start", "Coffee maker: fill with water + press brew", "Heating: adjust thermostat"],
    },
    {
      id: "waste",
      title: "Waste & Recycling",
      icon: Recycle,
      type: "list",
      items: [
        "Food waste → brown bin",
        "Paper packaging → paper container",
        "Plastic packaging → plastic container",
        "Glass → correct container",
        "Metal → metal container",
        "Residual waste → grey bin",
      ],
    },
    {
      id: "places",
      title: "Places to visit",
      icon: Landmark,
      type: "list",
      items: ["Lake Aspen – swimming", "Skatås nature reserve", "Göteborg city – 20 min by train"],
    },
    {
      id: "customs",
      title: "Swedish customs",
      icon: BookOpen,
      type: "list",
      items: ["No shoes indoors", "Fika – coffee break with cinnamon bun", "Alcohol only at Systembolaget"],
    },
    {
      id: "rules",
      title: "House Rules",
      icon: Shield,
      type: "list",
      items: ["No smoking indoors", "Respect quiet hours 22–07", "No parties"],
    },
    {
      id: "checkout",
      title: "Check-out",
      icon: LogOut,
      type: "checkbox",
      items: ["Empty trash", "Remove bed linens", "Close windows & turn off lights", "Lock doors"],
    },
    {
      id: "hoststory",
      title: "Host Story",
      icon: Heart,
      type: "text",
      content: "We bought Villa Häcken in 2020 and love sharing it with guests.",
    },
  ];

  // Merge: hostens version prioriteras, annars default
  const customSections = (property.guidebook_sections as GuideSection[]) || [];
  const allSections = defaultSections.map((section) => {
    const custom = customSections.find((s) => s.id === section.id);
    return {
      ...section,
      ...custom,
      icon: section.icon, // behåll alltid ikonen
    };
  });

  const shareGuide = async () => {
    const guideUrl = `${window.location.origin}/property/${property.id}/guide`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${property.title} - Guest Guide`,
          text: `Complete guest guide for ${property.title}`,
          url: guideUrl,
        });
      } else {
        await navigator.clipboard.writeText(guideUrl);
        toast({ title: "Link copied!", description: "Guest guide link copied to clipboard." });
      }
    } catch {
      await navigator.clipboard.writeText(guideUrl);
      toast({ title: "Link copied!", description: "Guest guide link copied to clipboard." });
    }
  };

  const exportToPDF = () => {
    toast({ title: "PDF Export", description: "PDF export coming soon!" });
  };

  // Rendera sektioner
  const renderSectionContent = (section: GuideSection) => {
    if (section.type === "list" && section.items) {
      return (
        <ul className="list-disc pl-5 space-y-2">
          {section.items.map((item, idx) => (
            <li key={idx}>{item}</li>
          ))}
        </ul>
      );
    }

    if (section.type === "checkbox" && section.items) {
      return (
        <ul className="space-y-2">
          {section.items.map((item, idx) => (
            <li key={idx} className="flex items-center gap-2">
              <CheckSquare className="h-4 w-4 text-primary" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      );
    }

    return <p className="text-muted-foreground">{section.content}</p>;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl h-[90vh] flex p-0">
        {/* Sidebar med ikoner */}
        <div className="w-28 border-r border-muted/20 bg-card/50 flex flex-col items-center py-6 gap-6 overflow-y-auto">
          {allSections.map((section, index) => {
            const isActive = activeIndex === index;
            const Icon = section.icon || Info;
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
        <div className="flex-1 overflow-y-auto px-8 py-6 relative">
          <DialogHeader className="mb-6">
            <div className="flex items-start justify-between">
              <DialogTitle className="text-3xl font-bold">
                {allSections[activeIndex].title}
              </DialogTitle>
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

          <div className="prose prose-sm max-w-none text-muted-foreground leading-relaxed">
            {renderSectionContent(allSections[activeIndex])}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GuestGuideDialog;
