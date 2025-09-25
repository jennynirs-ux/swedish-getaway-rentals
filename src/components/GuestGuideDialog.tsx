import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Property } from "@/hooks/useProperties";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Share2, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  MapPin,
  Wifi,
  Clock,
  Phone,
  Mail,
  LogOut,
  Shield,
  Heart,
  Home,
  Utensils,
  Settings,
  Mountain,
  Flag,
} from "lucide-react";

interface GuestGuideDialogProps {
  isOpen: boolean;
  onClose: () => void;
  property: Property;
}

interface GuideSection {
  id: string;
  title: string;
  content?: string;
  image_url?: string;
  icon?: string;
  data?: any;
}

const fixedSections: GuideSection[] = [
  { id: "home", title: "Home", icon: "home" },
  { id: "directions", title: "Directions", icon: "map" },
  { id: "stop", title: "Stop on the way", icon: "map" },
  { id: "checkin", title: "Check-in", icon: "clock" },
  { id: "wifi", title: "Wi-Fi", icon: "wifi" },
  { id: "kitchen", title: "Kitchen", icon: "utensils" },
  { id: "howthingswork", title: "How things work", icon: "settings" },
  { id: "places", title: "Places to visit", icon: "mountain" },
  { id: "customs", title: "Swedish customs", icon: "flag" },
  { id: "rules", title: "House rules", icon: "shield" },
  { id: "checkout", title: "Check-out", icon: "log-out" },
  { id: "story", title: "Host Story", icon: "heart" },
];

// Map icon string → actual Lucide icon
const getSectionIcon = (iconName?: string) => {
  switch (iconName) {
    case "map":
      return MapPin;
    case "wifi":
      return Wifi;
    case "clock":
      return Clock;
    case "phone":
      return Phone;
    case "mail":
      return Mail;
    case "log-out":
      return LogOut;
    case "shield":
      return Shield;
    case "heart":
      return Heart;
    case "utensils":
      return Utensils;
    case "settings":
      return Settings;
    case "mountain":
      return Mountain;
    case "flag":
      return Flag;
    case "home":
    default:
      return Home;
  }
};

const GuestGuideDialog = ({ isOpen, onClose, property }: GuestGuideDialogProps) => {
  const { toast } = useToast();
  const [activeIndex, setActiveIndex] = useState(0);

  // Merge fixed sections with host’s saved content
  const customSections = (property.guidebook_sections as GuideSection[]) || [];
  const allSections = fixedSections.map((section) => {
    const custom = customSections.find((s) => s.id === section.id);
    return {
      ...section,
      content: custom?.content || "Coming soon...",
      image_url: custom?.image_url,
      data: custom?.data,
    };
  });

  const shareGuide = async () => {
    const guideUrl = `${window.location.origin}/property/${property.id}/guide`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${property.title} - Guest Guide`,
          text: `Complete guest guide for ${property.title}`,
          url: guideUrl,
        });
      } catch {
        await navigator.clipboard.writeText(guideUrl);
        toast({ title: "Link copied!", description: "Guest guide link copied to clipboard." });
      }
    } else {
      await navigator.clipboard.writeText(guideUrl);
      toast({ title: "Link copied!", description: "Guest guide link copied to clipboard." });
    }
  };

  const exportToPDF = () => {
    toast({ title: "PDF Export", description: "PDF export feature coming soon!" });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl h-[90vh] flex p-0">
        {/* Sidebar menu */}
        <div className="w-28 border-r border-muted/20 bg-card/50 flex flex-col items-center py-6 gap-6 overflow-y-auto">
          {allSections.map((section, index) => {
            const IconComponent = getSectionIcon(section.icon);
            const isActive = activeIndex === index;

            return (
              <button
                key={section.id}
                onClick={() => setActiveIndex(index)}
                className={`p-4 rounded-xl transition-all duration-300 ${
                  isActive
                    ? "bg-primary text-white shadow-md scale-110"
                    : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
                }`}
              >
                <IconComponent className="h-7 w-7" />
              </button>
            );
          })}
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          <DialogHeader className="mb-6 flex justify-between items-center">
            <div>
              <DialogTitle className="text-3xl font-bold">
                {allSections[activeIndex].title}
              </DialogTitle>
              <p className="text-muted-foreground">{property.title}</p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" size="sm" onClick={shareGuide} className="gap-2">
                <Share2 className="h-4 w-4" />
                Share
              </Button>
              <Button variant="outline" size="sm" onClick={exportToPDF} className="gap-2">
                <Download className="h-4 w-4" />
                PDF
              </Button>
            </div>
          </DialogHeader>

          <div className="space-y-4">
            {allSections[activeIndex].image_url && (
              <img
                src={allSections[activeIndex].image_url}
                alt={allSections[activeIndex].title}
                className="w-full h-56 object-cover rounded-lg"
              />
            )}
            <div className="prose prose-sm max-w-none text-muted-foreground whitespace-pre-wrap">
              {allSections[activeIndex].content}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GuestGuideDialog;
