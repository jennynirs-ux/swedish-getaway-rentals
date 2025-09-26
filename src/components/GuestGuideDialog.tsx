import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Property } from "@/hooks/useProperties";
import { useState } from "react";
import { Share2, Download, Home, MapPin, Car, LogIn, Wifi, Utensils, Settings, Landmark, Flag, Shield, LogOut, BookOpen } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface GuideSection {
  id: string;
  title: string;
  icon: React.ElementType;
  content?: string;
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

  // Fasta sektioner med default rubrik + text
  const fixedSections: GuideSection[] = [
    { id: "home", title: "Welcome Home", icon: Home, content: "Welcome to our property! We’re excited to host you." },
    { id: "directions", title: "Directions", icon: MapPin, content: "How to reach us and parking instructions." },
    { id: "stop", title: "Stop on the way", icon: Car, content: "Recommended places to stop on your journey here." },
    { id: "checkin", title: "Check-in", icon: LogIn, content: "Check-in time: 15:00. Contact us if you need early check-in." },
    { id: "wifi", title: "Wi-Fi", icon: Wifi, content: "Network: Guest_Wifi\nPassword: Welcome2024" },
    { id: "kitchen", title: "Kitchen", icon: Utensils, content: "Everything you need to know about using the kitchen." },
    { id: "howthingswork", title: "How things work", icon: Settings, content: "Instructions for appliances, heating, etc." },
    { id: "places", title: "Places to visit", icon: Landmark, content: "Discover local attractions and must-see spots." },
    { id: "customs", title: "Swedish customs", icon: Flag, content: "Get to know Swedish traditions and customs." },
    { id: "rules", title: "House Rules", icon: Shield, content: "Respect quiet hours. No smoking inside. No parties." },
    { id: "checkout", title: "Check-out", icon: LogOut, content: "Check-out time: 11:00. Please follow the checklist." },
    { id: "story", title: "Host Story", icon: BookOpen, content: "Learn more about your hosts and our story." },
  ];

  // Merge hostens custom content från DB
  const customSections = (property.guidebook_sections as GuideSection[]) || [];
  const allSections = fixedSections.map(section => {
    const custom = customSections.find(s => s.id === section.id);
    return {
      ...section,
      content: custom?.content || section.content,
      image_url: custom?.image_url || section.image_url,
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
    toast({ title: "PDF Export", description: "PDF export coming soon!" });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl h-[90vh] flex p-0 relative">
        {/* Sidebar med ikoner, scrollbar */}
        <div className="w-28 border-r border-muted/20 bg-card/50 flex flex-col items-center py-6 gap-6 overflow-y-auto">
          {allSections.map((section, index) => {
            const isActive = activeIndex === index;
            const Icon = section.icon;
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
          {/* Share & PDF knappar – flyttade undan från X */}
          <div className="flex gap-2 absolute top-4 right-14">
            <Button variant="outline" size="icon" onClick={shareGuide}>
              <Share2 className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={exportToPDF}>
              <Download className="h-4 w-4" />
            </Button>
          </div>

          <DialogHeader className="mb-6">
            <DialogTitle className="text-3xl font-bold">{allSections[activeIndex].title}</DialogTitle>
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
