import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Clock
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
  const [activeTab, setActiveTab] = useState("guide");

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

  // House Rules data
  const houseRules = [
    { icon: Ban, rule: "No smoking indoors", description: "Smoking is only allowed outside" },
    { icon: Volume2, rule: "No parties", description: "Respect the neighbors and keep noise levels down" },
    { icon: SmilePlus, rule: "No pets", description: "Unfortunately, pets are not allowed" },
    { icon: Clock, rule: "Quiet time 22:00-07:00", description: "Please respect quiet hours" },
    { icon: Recycle, rule: "Please recycle", description: "Separate waste according to guidelines" },
    { icon: Heart, rule: "Enjoy yourself!", description: "Relax and make yourself at home" }
  ];

  // Star rating explanation
  const ratingInfo = [
    { stars: 5, title: "Outstanding", description: "Exceptional experience, exceeded all expectations" },
    { stars: 4, title: "Excellent", description: "Great experience with minor areas for improvement" },
    { stars: 3, title: "Good", description: "Met expectations with some room for improvement" },
    { stars: 2, title: "Fair", description: "Below expectations, several issues noted" },
    { stars: 1, title: "Poor", description: "Serious issues, did not meet basic standards" }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl h-[90vh] flex flex-col p-0">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <div className="border-b px-6 pt-4">
            <TabsList className="grid w-full max-w-md grid-cols-3">
              <TabsTrigger value="guide">Guest Guide</TabsTrigger>
              <TabsTrigger value="rules">House Rules</TabsTrigger>
              <TabsTrigger value="ratings">Star Ratings</TabsTrigger>
            </TabsList>
          </div>

          {/* Guest Guide Tab */}
          <TabsContent value="guide" className="flex-1 flex m-0">
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

              {property.hero_image_url && activeIndex === 0 && (
                <img
                  src={property.hero_image_url}
                  alt={property.title}
                  className="w-full h-64 object-cover rounded-lg mb-6"
                />
              )}

              {allSections[activeIndex].image_url && activeIndex !== 0 && (
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
          </TabsContent>

          {/* House Rules Tab */}
          <TabsContent value="rules" className="flex-1 overflow-y-auto px-8 py-6 m-0">
            <DialogHeader className="mb-8">
              <DialogTitle className="text-3xl font-bold flex items-center gap-3">
                <Shield className="h-8 w-8 text-primary" />
                House Rules
              </DialogTitle>
              <p className="text-muted-foreground mt-2">
                Please respect these rules to ensure a pleasant stay for everyone
              </p>
            </DialogHeader>

            <div className="grid gap-6">
              {houseRules.map((rule, index) => {
                const Icon = rule.icon;
                return (
                  <div key={index} className="flex items-start gap-4 p-6 bg-card border rounded-lg hover:shadow-md transition-shadow">
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
          </TabsContent>

          {/* Star Ratings Tab */}
          <TabsContent value="ratings" className="flex-1 overflow-y-auto px-8 py-6 m-0">
            <DialogHeader className="mb-8">
              <DialogTitle className="text-3xl font-bold flex items-center gap-3">
                <Star className="h-8 w-8 text-primary fill-primary" />
                Understanding Star Ratings
              </DialogTitle>
              <p className="text-muted-foreground mt-2">
                What each rating means when you review your stay
              </p>
            </DialogHeader>

            <div className="space-y-4">
              {ratingInfo.map((rating, index) => (
                <div key={index} className="p-6 bg-card border rounded-lg hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="flex gap-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`h-5 w-5 ${
                              i < rating.stars
                                ? "fill-yellow-400 text-yellow-400"
                                : "text-muted-foreground"
                            }`}
                          />
                        ))}
                      </div>
                      <span className="font-bold text-xl">{rating.stars} Stars</span>
                    </div>
                    <span className="font-semibold text-primary">{rating.title}</span>
                  </div>
                  <p className="text-muted-foreground">{rating.description}</p>
                </div>
              ))}
            </div>

            <div className="mt-8 p-6 bg-primary/10 border border-primary/20 rounded-lg">
              <h4 className="font-semibold mb-2">Helpful Tips for Reviews</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Be honest and constructive in your feedback</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Consider cleanliness, accuracy, communication, and value</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Your review helps future guests and supports great hosts</span>
                </li>
              </ul>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default GuestGuideDialog;
