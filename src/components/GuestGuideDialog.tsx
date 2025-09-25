import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Property } from "@/hooks/useProperties";
import { useState } from "react";
import { Share2, Download, Heart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Guide section interface
interface GuideSection {
  id: string;
  title: string;
  icon?: string;
  logo?: string;
  content?: string;
  image_url?: string;
}

// Props
interface GuestGuideDialogProps {
  isOpen: boolean;
  onClose: () => void;
  property: Property;
}

const GuestGuideDialog = ({ isOpen, onClose, property }: GuestGuideDialogProps) => {
  const { toast } = useToast();
  const [activeIndex, setActiveIndex] = useState(0);

  // Fasta sektioner med default rubrik + text + logga
  const fixedSections: GuideSection[] = [
    { id: "home", title: "Welcome Home", logo: "/icons/home.svg", content: "Welcome to our property! We’re excited to host you." },
    { id: "directions", title: "Directions", logo: "/icons/map.svg", content: "How to reach us and parking instructions." },
    { id: "stop", title: "Stop on the way", logo: "/icons/stop.svg", content: "Recommended places to stop on your journey here." },
    { id: "checkin", title: "Check-in", logo: "/icons/checkin.svg", content: "Check-in time: 15:00. Contact us if you need early check-in." },
    { id: "wifi", title: "Wi-Fi", logo: "/icons/wifi.svg", content: "Network: Guest_Wifi\nPassword: Welcome2024" },
    { id: "kitchen", title: "Kitchen", logo: "/icons/kitchen.svg", content: "Everything you need to know about using the kitchen." },
    { id: "howthingswork", title: "How things work", logo: "/icons/settings.svg", content: "Instructions for appliances, heating, etc." },
    { id: "places", title: "Places to visit", logo: "/icons/places.svg", content: "Discover local attractions and must-see spots." },
    { id: "customs", title: "Swedish customs", logo: "/icons/customs.svg", content: "Get to know Swedish traditions and customs." },
    { id: "rules", title: "House Rules", logo: "/icons/rules.svg", content: "Respect quiet hours. No smoking inside. No parties." },
    { id: "checkout", title: "Check-out", logo: "/icons/checkout.svg", content: "Check-out time: 11:00. Please follow the checklist." },
    { id: "story", title: "Host Story", logo: "/icons/story.svg", content: "Learn more about your hosts and our story." },
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
      <DialogContent className="max-w-6xl h-[90vh] flex p-0">
        {/* Sidebar med loggor */}
        <div className="w-28 border-r border-muted/20 bg-card/50 flex flex-col items-center py-6 gap-6">
          {allSections.map((section, index) => {
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
                {section.logo ? (
                  <img src={section.logo} alt={section.title} className="h-8 w-8 object-contain" />
                ) : (
                  <span className="text-lg">{section.title[0]}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          <DialogHeader className="mb-6 flex items-center justify-between">
            <DialogTitle className="text-3xl font-bold">{allSections[activeIndex].title}</DialogTitle>
            <div className="flex gap-3">
              <Button variant="outline" size="sm" onClick={shareGuide} className="gap-2">
                <Share2 className="h-4 w-4" /> Share
              </Button>
              <Button variant="outline" size="sm" onClick={exportToPDF} className="gap-2">
                <Download className="h-4 w-4" /> PDF
              </Button>
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
