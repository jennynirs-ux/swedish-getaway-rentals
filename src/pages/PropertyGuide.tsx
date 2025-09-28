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
  Trash2
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

  // Standardmallar (visas bara om editorn inte fyllt något)
  const defaultSections: GuideSection[] = [
    { id: "home", title: "Welcome Home", icon: Home, type: "text", content: "Welcome to our property! We’re excited to host you." },
    { id: "directions", title: "Directions", icon: MapPin, type: "text", content: "How to reach us and parking instructions." },
    { id: "wifi", title: "Wi-Fi", icon: Wifi, type: "list", items: ["Network: Guest_Wifi", "Password: Welcome2024"] },
    { id: "checkin", title: "Check-in", icon: Key, type: "text", content: "Check-in time: 15:00. Contact us if you need early check-in." },
    { id: "howthingswork", title: "How things work", icon: Info, type: "checkbox", items: ["Oven: press power + start", "Coffee maker: fill with water + press brew", "Heating: adjust thermostat in hallway"] },
    { id: "places", title: "Places to visit", icon: BookOpen, type: "list", items: ["Local hiking trails", "Historic town center", "Beachfront promenade"] },
    { id: "rules", title: "House Rules", icon: Heart, type: "list", items: ["Respect quiet hours", "No smoking inside", "No parties allowed"] },
    { id: "checkout", title: "Check-out", icon: LogOut, type: "checkbox", items: ["Empty trash", "Return keys", "Close all windows"] },
    { id: "recycling", title: "Recycling & Environment", icon: Recycle, type: "list", items: [
      "Food waste → brown bin",
      "Paper packaging → paper container",
      "Plastic packaging → plastic container",
      "Clear glass packaging → glass (clear)",
      "Coloured glass packaging → glass (coloured)",
      "Metal packaging → metal container",
      "Residual waste → grey bin"
    ] },
  ];

  // Merge: editorn (property.guidebook_sections) prioriteras
  const customSections = (property.guidebook_sections as GuideSection[]) || [];
  const allSections = defaultSections.map(section => {
    const custom = customSections.find(s => s.id === section.id);
    return {
      ...section,
      ...custom, // redigerat innehåll vinner alltid
      icon: section.icon, // behåll standardikonen
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
    const items = section.items;
    const content = section.content;

    // Specialfall: recycling
    if (section.id === "recycling" && items) {
      const getIconForItem = (item: string) => {
        if (item.toLowerCase().includes("food")) return <Apple className="h-5 w-5 text-green-600" />;
        if (item.toLowerCase().includes("paper")) return <Newspaper className="h-5 w-5 text-blue-600" />;
        if (item.toLowerCase().includes("plastic")) return <Package className="h-5 w-5 text-pink-600" />;
        if (item.toLowerCase().includes("clear glass")) return <Wine className="h-5 w-5 text-cyan-600" />;
        if (item.toLowerCase().includes("coloured glass")) return <Wine className="h-5 w-5 text-purple-600" />;
        if (item.toLowerCase().includes("metal")) return <Package2 className="h-5 w-5 text-gray-600" />;
        if (item.toLowerCase().includes("residual")) return <Trash2 className="h-5 w-5 text-red-600" />;
        return <Recycle className="h-5 w-5 text-primary" />;
      };

      return (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            In Sweden, proper recycling is required – otherwise fines may apply. Please use the correct bins:
          </p>
          <ul className="space-y-3">
            {items.map((item, idx) => (
              <li key={idx} className="flex items-center gap-3">
                {getIconForItem(item)}
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      );
    }

    if (section.type === "list" && items) {
      return (
        <ul className="list-disc pl-5 space-y-2">
          {items.map((item, idx) => <li key={idx}>{item}</li>)}
        </ul>
      );
    }

    if (section.type === "checkbox" && items) {
      return (
        <ul className="space-y-2">
          {items.map((item, idx) => (
            <li key={idx} className="flex items-center gap-2">
              <CheckSquare className="h-4 w-4 text-primary" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      );
    }

    return <p className="whitespace-pre-wrap">{content}</p>;
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
