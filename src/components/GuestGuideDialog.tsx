import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Property } from "@/hooks/useProperties";
import { useState } from "react";
import { Share2, Download, Home, MapPin, Wifi, BookOpen, Key, Info, LogOut, Heart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface GuideSection {
  id: string;
  title: string;
  type?: "text" | "list" | "checkbox";
  content?: string;
  items?: string[];
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

  // Fasta sektioner – nu med olika typer
  const fixedSections: GuideSection[] = [
    { id: "home", title: "Welcome Home", icon: Home, type: "text", content: "Welcome to our property! We’re excited to host you." },
    { id: "directions", title: "Directions", icon: MapPin, type: "text", content: "How to reach us and parking instructions." },
    { id: "wifi", title: "Wi-Fi", icon: Wifi, type: "text", content: "Network: Guest_Wifi\nPassword: Welcome2024" },
    { id: "checkin", title: "Check-in", icon: Key, type: "text", content: "Check-in time: 15:00. Contact us if you need early check-in." },
    { 
      id: "howthingswork", 
      title: "How things work", 
      icon: Info, 
      type: "checkbox", 
      items: [
        "Oven: Press power + start",
        "Coffee maker: Fill with water + press brew",
        "Heating: Adjust thermostat in hallway"
      ] 
    },
    { 
      id: "places", 
      title: "Places to visit", 
      icon: BookOpen, 
      type: "list", 
      items: ["Local beach – 5 min walk", "Hiking trail – 10 min drive", "Museum – 15 min drive"] 
    },
    { 
      id: "rules", 
      title: "House Rules", 
      icon: Heart, 
      type: "list", 
      items: ["Respect quiet hours", "No smoking inside", "No parties allowed"] 
    },
    { id: "checkout", title: "Check-out", icon: LogOut, type: "text", content: "Check-out time: 11:00. Please follow the checklist." },
  ];

  const customSections = (property.guidebook_sections as GuideSection[]) || [];
  const allSections = fixedSections.map(section => {
    const custom = customSections.find(s => s.id === section.id);
    return { ...section, ...custom };
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
    if (section.type === "list" && section.items) {
      return (
        <ul className="list-disc pl-6 space-y-1">
          {section.items.map((item, i) => <li key={i}>{item}</li>)}
        </ul>
      );
    }
    if (section.type === "checkbox" && section.items) {
      return (
        <ul className="space-y-2">
          {section.items.map((item, i) => (
            <li key={i} className="flex items-center gap-2">
              <input type="checkbox" className="w-4 h-4" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      );
    }
    return (
      <div className="whitespace-pre-wrap leading-relaxed">
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

          <div className="prose prose-sm max-w-none text-muted-foreground">
            {renderSectionContent(allSections[activeIndex])}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GuestGuideDialog;
