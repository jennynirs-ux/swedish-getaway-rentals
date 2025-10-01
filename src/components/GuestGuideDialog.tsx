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
  Coffee,
  Utensils,
  Cog,
  Landmark,
  Shield,
  Star,
  SmilePlus,
  Ban,
  Volume2,
  Clock,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type SectionType = "text" | "list" | "checkbox" | "custom";

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

  // Standardsektioner
  const defaultSections: GuideSection[] = [
    { id: "home", title: "Welcome Home", icon: Home, type: "text", content: "Welcome to our property! We’re excited to host you." },
    { id: "directions", title: "Directions", icon: MapPin, type: "list", items: ["By car: Take E20 and exit at Lerum. Parking on site.", "By public transport: Train to Lerum station, then bus 533."] },
    { id: "stop", title: "Stop on the way", icon: Coffee, type: "list", items: ["ICA Kvantum – groceries", "Shell – gas & snacks", "Local shop – firewood"] },
    { id: "checkin", title: "Check-in", icon: Key, type: "list", items: ["Check-in: 15:00", "Keys in lockbox", "Parking in front of house"] },
    { id: "wifi", title: "Wi-Fi", icon: Wifi, type: "list", items: ["Network: Guest_Wifi", "Password: Welcome2024"] },
    { id: "kitchen", title: "Kitchen", icon: Utensils, type: "list", items: ["Oven", "Coffee machine", "Dishwasher"] },
    { id: "howthingswork", title: "How things work", icon: Cog, type: "checkbox", items: ["Oven: press power + start", "Coffee maker: fill with water + brew", "Heating: adjust thermostat"] },
    { id: "waste", title: "Waste & Recycling", icon: Recycle, type: "list", items: ["Food → brown bin", "Paper → paper container", "Plastic → plastic container", "Glass → glass container"] },
    { id: "places", title: "Places to visit", icon: Landmark, type: "list", items: ["Lake Aspen – swimming", "Skatås reserve", "Göteborg – 20 min by train"] },
    { id: "customs", title: "Swedish customs", icon: BookOpen, type: "list", items: ["No shoes indoors", "Fika tradition", "Alcohol only at Systembolaget"] },
    { id: "rules", title: "House Rules", icon: Shield, type: "custom" },
    { id: "checkout", title: "Check-out", icon: LogOut, type: "checkbox", items: ["Empty trash", "Remove linens", "Close windows & lights", "Lock doors"] },
    { id: "ratings", title: "Star Rating", icon: Star, type: "custom" },    
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
        await navigator.share({ title: `${property.title} - Guest Guide`, url: guideUrl });
      } else {
        await navigator.clipboard.writeText(guideUrl);
        toast({ title: "Link copied!", description: "Guest guide link copied." });
      }
    } catch {
      await navigator.clipboard.writeText(guideUrl);
      toast({ title: "Link copied!", description: "Guest guide link copied." });
    }
  };

  const exportToPDF = () => {
    toast({ title: "PDF Export", description: "Coming soon!" });
  };

  const renderSectionContent = (section: GuideSection) => {
    if (section.id === "rules") {
      const houseRules = [
        { icon: Ban, rule: "No smoking indoors", description: "Smoking is only allowed outside" },
        { icon: Volume2, rule: "No parties", description: "Respect the neighbors" },
        { icon: SmilePlus, rule: "No pets", description: "Pets are not allowed" },
        { icon: Clock, rule: "Quiet 22–07", description: "Respect quiet hours" },
        { icon: Recycle, rule: "Recycle", description: "Separate waste properly" },
        { icon: Heart, rule: "Enjoy!", description: "Relax and feel at home" },
      ];
      return (
        <div className="grid gap-6">
          {houseRules.map((rule, index) => {
            const Icon = rule.icon;
            return (
              <div key={index} className="flex items-start gap-4 p-6 bg-card border rounded-lg">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <Icon className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-1">{rule.rule}</h3>
                  <p className="text-muted-foreground text-sm">{rule.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    if (section.id === "ratings") {
      const ratingInfo = [
        { stars: 5, title: "Outstanding", description: "Exceptional experience" },
        { stars: 4, title: "Excellent", description: "Great with minor issues" },
        { stars: 3, title: "Good", description: "Met expectations" },
        { stars: 2, title: "Fair", description: "Below expectations" },
        { stars: 1, title: "Poor", description: "Did not meet standards" },
      ];
      return (
        <div className="space-y-4">
          {ratingInfo.map((rating, index) => (
            <div key={index} className="p-6 bg-card border rounded-lg">
              <div className="flex items-center gap-3 mb-2">
                <div className="flex gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`h-5 w-5 ${
                        i < rating.stars ? "fill-[#8B4513] text-[#8B4513]" : "text-muted-foreground"
                      }`}
                    />
                  ))}
                </div>
                <span className="font-bold text-lg">{rating.stars} Stars</span>
                <span className="text-primary ml-auto">{rating.title}</span>
              </div>
              <p className="text-muted-foreground">{rating.description}</p>
            </div>
          ))}
        </div>
      );
    }

    if (section.type === "list" && section.items) {
      return <ul className="list-disc pl-5 space-y-2">{section.items.map((item, idx) => <li key={idx}>{item}</li>)}</ul>;
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
      <DialogContent className="max-w-6xl h-[90vh] flex flex-col p-0">
        <div className="flex-1 flex m-0 h-full">
          {/* Left menu with tooltips */}
          <TooltipProvider>
            <div className="w-28 border-r border-muted/20 bg-card/50 flex flex-col items-center py-6 gap-6 overflow-y-auto h-full">
              {allSections.map((section, index) => {
                const isActive = activeIndex === index;
                const Icon = section.icon || Info;
                return (
                  <Tooltip key={section.id}>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => setActiveIndex(index)}
                        className={`p-3 rounded-xl flex items-center justify-center transition-all ${
                          isActive ? "bg-primary text-white scale-110" : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
                        }`}
                      >
                        <Icon className="h-6 w-6" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right">{section.title}</TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          </TooltipProvider>

          {/* Right content */}
          <div className="flex-1 overflow-y-auto px-8 py-6 relative h-full">
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

            {/* Hero image */}
            {property.hero_image_url && allSections[activeIndex].id === "home" && (
              <img src={property.hero_image_url} alt={property.title} className="w-full h-64 object-cover rounded-lg mb-6" />
            )}

            {/* Section image */}
            {allSections[activeIndex].image_url && allSections[activeIndex].id !== "home" && (
              <img src={allSections[activeIndex].image_url} alt={allSections[activeIndex].title} className="w-full h-48 object-cover rounded-lg mb-6" />
            )}

            {/* Section content */}
            <div className="prose prose-sm max-w-none text-muted-foreground leading-relaxed">
              {renderSectionContent(allSections[activeIndex])}
            </div>

            {/* Visual TOC on Welcome Home */}
            {allSections[activeIndex].id === "home" && (
              <div className="mt-6 p-4 border rounded-lg bg-muted/10">
                <h4 className="font-semibold mb-4">Contents</h4>
                <div className="grid grid-cols-2 gap-4">
                  {allSections.filter((s) => s.id !== "home").map((s, idx) => {
                    const Icon = s.icon || Info;
                    return (
                      <button
                        key={s.id}
                        onClick={() => setActiveIndex(idx + 1)}
                        className="flex items-center gap-3 p-3 rounded-lg bg-white/50 hover:bg-primary/10 transition"
                      >
                        <Icon className="h-5 w-5 text-primary" />
                        <span className="text-left">{s.title}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GuestGuideDialog;
