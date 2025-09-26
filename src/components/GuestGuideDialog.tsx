import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Property } from "@/hooks/useProperties";
import { useState } from "react";
import { Share2, Download, Home, MapPin, Coffee, Wifi, Settings, BookOpen, Heart, LogOut, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Guide section interface
interface GuideSection {
  id: string;
  title: string;
  icon?: string;
  content?: string;
  image_url?: string;
}

// Props
interface GuestGuideDialogProps {
  isOpen: boolean;
  onClose: () => void;
  property: Property;
}

// Ikon-map
const iconMap: Record<string, any> = {
  home: Home,
  directions: MapPin,
  stop: Coffee,
  checkin: BookOpen,
  wifi: Wifi,
  kitchen: Coffee,
  howthingswork: Settings,
  places: MapPin,
  customs: BookOpen,
  rules: Info,
  checkout: LogOut,
  story: Heart,
};

const GuestGuideDialog = ({ isOpen, onClose, property }: GuestGuideDialogProps) => {
  const { toast } = useToast();
  const [activeIndex, setActiveIndex] = useState(0);

  // Fasta sektioner med fallback
  const fixedSections: GuideSection[] = [
    { id: "home", title: "Welcome Home", icon: "home", content: "Welcome to our property! We’re excited to host you." },
    { id: "directions", title: "Directions", icon: "directions", content: "How to reach us and parking instructions." },
    { id: "stop", title: "Stop on the way", icon: "stop", content: "Recommended places to stop on your journey here." },
    { id: "checkin", title: "Check-in", icon: "checkin", content: "Check-in time: 15:00. Contact us if you need early check-in." },
    { id: "wifi", title: "Wi-Fi", icon: "wifi", content: "Network: Guest_Wifi\nPassword: Welcome2024" },
    { id: "kitchen", title: "Kitchen", icon: "kitchen", content: "Everything you need to know about using the kitchen." },
    { id: "howthingswork", title: "How things work", icon: "howthingswork", content: "Instructions for appliances, heating, etc." },
    { id: "places", title: "Places to visit", icon: "places", content: "Discover local attractions and must-see spots." },
    { id: "customs", title: "Swedish customs", icon: "customs", content: "Get to know Swedish traditions and customs." },
    { id: "rules", title: "House Rules", icon: "rules", content: "Respect quiet hours. No smoking inside. No parties." },
    { id: "checkout", title: "Check-out", icon: "checkout", content: "Check-out time: 11:00. Please follow the checklist." },
    { id: "story", title: "Host Story", icon: "story", content: "Learn more about your hosts and our story." },
  ];

  // Säkerställ att vi alltid har en array
  const customSections = Array.isArray(property?.guidebook_sections) ? property.guidebook_sections : [];

  // Merge fixed + custom
  const allSections = fixedSections.map(section => {
    const custom = customSections.find((s: GuideSection) => s.id === section.id);
    return {
      ...section,
      content: custom?.content || section.content,
      image_url: custom?.image_url || section.image_url,
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl h-[90vh] flex p-0">
        {/* Sidebar med ikoner (scrollbar om många) */}
        <div className="w-28 border-r border-muted/20 bg-card/50 flex flex-col items-center py-6 gap-6 overflow-y-auto">
          {allSections.map((section, index) => {
            const isActive = activeIndex === index;
            const Icon = section.icon && iconMap[section.icon] ? iconMap[section.icon] : Info;

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
                <Icon className="h-6 w-6" />
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-8 py-6 relative">
          {/* Header med actions */}
          <DialogHeader className="mb-6">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-3xl font-bold">{allSections[activeIndex].title}</DialogTitle>
              <div className="flex gap-2 absolute top-4 right-4">
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

          <div className="prose prose-sm max-w-none text-muted-foreground whitespace-pre-wrap leading-relaxed">
            {allSections[activeIndex].content}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GuestGuideDialog;
