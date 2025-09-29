import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Property } from "@/hooks/useProperties";
import { useState } from "react";
import {
  Share2,
  Download,
  Home,
  MapPin,
  ParkingSquare,
  Key,
  Wifi,
  Shield,
  Cog,
  Utensils,
  Recycle,
  Landmark,
  ShoppingCart,
  LogOut,
  BookOpen,
  Star,
  Heart,
  Camera,
  CheckSquare,
  Phone,
  AlertTriangle
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

  const defaultSections: GuideSection[] = [
    {
      id: "home",
      title: "Welcome",
      icon: Home,
      type: "text",
      content: `Welcome to ${property.title || "our property"}! We’re excited to host you. 

Please take a moment to read through this guidebook – it will make your stay easier and more enjoyable.`
    },
    { id: "directions", title: "Directions", icon: MapPin, type: "text", content: "Address: Häckenvägen 78, Lerum\n\n🚗 Car: Exit E20 → Lerum.\n🚉 Public transport: Train to Lerum, bus 533.\n💡 Tip: Stop at Local Shopping to get groceries." },
    { id: "parking", title: "Parking", icon: ParkingSquare, type: "text", content: "Park in front of the garage (yellow door). Space for 2 cars. Parking included. Do not park on the street." },
    { id: "checkin", title: "Check-in", icon: Key, type: "text", content: "Check-in: 15:00\nKeys in lockbox by entrance. Code will be sent via email." },
    { id: "wifi", title: "Wi-Fi", icon: Wifi, type: "list", items: ["Network: Guest_Wifi", "Password: Welcome2024"] },
    { id: "rules", title: "House Rules", icon: Shield, type: "list", items: ["No smoking indoors", "Respect quiet hours 22–07", "No parties"] },
    { id: "howthingswork", title: "How Things Work", icon: Cog, type: "list", items: ["Kitchen appliances (oven, dishwasher, coffee machine)", "Heating via thermostat", "Outdoor kitchen with gas grill", "Outdoor amenities: hot tub, sauna, boat"] },
    { id: "waste", title: "Waste & Recycling", icon: Recycle, type: "list", items: ["Food waste → brown bin", "Plastic → plastic container", "Paper → paper container", "Glass → glass container", "Metal → metal container", "Residual → grey bin"] },
    { id: "places", title: "Local Recommendations", icon: Landmark, type: "list", items: ["Lake Aspen – swimming", "Göteborg city – 20 min by train"] },
    { id: "shopping", title: "Local Shopping", icon: ShoppingCart, type: "list", items: ["ICA Kvantum – groceries", "Shell – gas & snacks"] },
    { id: "checkout", title: "Check-out", icon: LogOut, type: "checkbox", items: ["Empty trash", "Return keys", "Close all windows", "Load dishwasher"] },
    { id: "customs", title: "Swedish Customs", icon: BookOpen, type: "list", items: ["Remove shoes indoors", "Enjoy fika (coffee + pastry)", "Alcohol only at Systembolaget (20+)"] },
    { id: "review", title: "Review & Rating", icon: Star, type: "text", content: "Please leave us a ⭐⭐⭐⭐⭐ rating before you leave!" },
    { id: "social", title: "Let’s Get Social", icon: Camera, type: "text", content: "Share your stay on Instagram with #NordicGetaways" },
    { id: "hoststory", title: "Host Story", icon: Heart, type: "text", content: "We bought Villa Häcken in 2020 and love sharing it with guests." },
  ];

  const customSections = (property.guidebook_sections as GuideSection[]) || [];
  const allSections = defaultSections.map((section) => {
    const custom = customSections.find((s) => s.id === section.id);
    return { ...section, ...custom, icon: section.icon };
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

  const renderSectionContent = (section: GuideSection) => {
    if (section.id === "home") {
      return (
        <div className="grid md:grid-cols-3 gap-6">
          {/* Left: Welcome text */}
          <div className="md:col-span-2 space-y-4 whitespace-pre-line">
            {section.content}
          </div>

          {/* Right: Emergency info */}
          <div className="border rounded-lg p-4 bg-red-50 text-red-800">
            <h4 className="font-bold flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" /> Emergency Information
            </h4>
            <ul className="mt-2 space-y-1 text-sm">
              <li>📞 Emergency number: <strong>112</strong></li>
              <li>🚑 Ambulance / Police / Fire</li>
              <li>👤 Host: +46 70 123 45 67</li>
            </ul>
          </div>

          {/* Bottom: Host Story */}
          <div className="md:col-span-3 mt-6 border-t pt-4">
            <h4 className="font-bold flex items-center gap-2">
              <Heart className="h-5 w-5 text-primary" /> Host Story
            </h4>
            {property.host_image_url && (
              <img
                src={property.host_image_url}
                alt="Host family"
                className="w-32 h-32 object-cover rounded-full mt-3"
              />
            )}
            <p className="mt-2 text-muted-foreground">
              We bought Villa Häcken in 2020 and love sharing it with guests.
            </p>
          </div>
        </div>
      );
    }

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

    return (
      <div className="space-y-2 whitespace-pre-line">
        {section.content}
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl h-[90vh] flex p-0">
        {/* Sidebar */}
        <div className="w-28 border-r border-muted/20 bg-card/50 flex flex-col items-center py-6 gap-6 overflow-y-auto">
          {allSections.map((section, index) => {
            const isActive = activeIndex === index;
            const Icon = section.icon || Home;
            return (
              <button
                key={section.id}
                onClick={() => setActiveIndex(index)}
                className={`p-3 rounded-xl transition-all duration-300 ${
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
