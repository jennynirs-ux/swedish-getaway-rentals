import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Property } from "@/hooks/useProperties";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Share2, Download, MapPin, Wifi, Clock, Phone, Mail, LogOut, Shield, Heart, Home } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface GuestGuideDialogProps {
  isOpen: boolean;
  onClose: () => void;
  property: Property;
}

interface GuideSection {
  id?: string;
  title: string;
  content: string;
  image_url?: string;
  icon?: string;
  is_prefilled?: boolean;
  data?: any;
}

const GuestGuideDialog = ({ isOpen, onClose, property }: GuestGuideDialogProps) => {
  const [activeSection, setActiveSection] = useState<string>("wifi");
  const { toast } = useToast();

  // Icon mapping
  const getSectionIcon = (iconName?: string) => {
    switch (iconName?.toLowerCase()) {
      case "map":
      case "location":
        return MapPin;
      case "wifi":
        return Wifi;
      case "clock":
      case "time":
        return Clock;
      case "phone":
        return Phone;
      case "mail":
        return Mail;
      case "checkout":
      case "logout":
        return LogOut;
      case "rules":
        return Shield;
      case "thank":
      case "heart":
        return Heart;
      case "home":
      default:
        return Home;
    }
  };

  // Prefilled standard sections
  const defaultSections: GuideSection[] = [
    {
      id: "wifi",
      title: "WiFi Information",
      content: "Network: NordicGetaway_Guest\nPassword: Welcome2024",
      icon: "wifi",
      is_prefilled: true,
      data: { ssid: "NordicGetaway_Guest", password: "Welcome2024" },
    },
    {
      id: "location",
      title: "Location & Directions",
      content: `Address: ${property.location || "Address provided on booking"}`,
      icon: "location",
      is_prefilled: true,
    },
    {
      id: "contact",
      title: "Contact",
      content: "Email: hello@nordic-getaways.com\nPhone: +46 xxx xxx xxx",
      icon: "contact",
      is_prefilled: true,
    },
    {
      id: "checkout",
      title: "Check-out",
      content: "Check-out 11:00\n• Strip beds\n• Start dishwasher\n• Take trash\n• Lock doors",
      icon: "checkout",
      is_prefilled: true,
    },
    {
      id: "rules",
      title: "House Rules",
      content: "• No smoking\n• Quiet hours 22–08\n• No parties",
      icon: "rules",
      is_prefilled: true,
    },
    {
      id: "thank",
      title: "Thank You!",
      content: "Thanks for staying with us ♥ Please leave a review!",
      icon: "heart",
      is_prefilled: true,
    },
  ];

  const customSections = (property.guidebook_sections as GuideSection[]) || [];
  const allSections = [...defaultSections, ...customSections.filter((s) => !s.is_prefilled)];

  const active = allSections.find((s) => s.id === activeSection) || allSections[0];

  const shareGuide = async () => {
    const url = `${window.location.origin}/property/${property.id}/guide`;
    if (navigator.share) {
      await navigator.share({ title: property.title, text: "Guest Guide", url });
    } else {
      await navigator.clipboard.writeText(url);
      toast({ title: "Link copied", description: "Guide link copied to clipboard." });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl bg-[#fdf7f2] p-0 flex flex-col md:flex-row h-[90vh]">
        {/* Sidebar */}
        <div className="md:w-28 w-full bg-white/70 border-r border-muted/20 flex md:flex-col items-center md:items-stretch overflow-x-auto md:overflow-y-auto p-4 gap-4">
          {allSections.map((section) => {
            const Icon = getSectionIcon(section.icon);
            return (
              <Tooltip key={section.id}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setActiveSection(section.id!)}
                    className={`flex items-center justify-center w-16 h-16 rounded-full transition ${
                      activeSection === section.id
                        ? "bg-primary text-white shadow-lg"
                        : "bg-muted text-muted-foreground hover:bg-primary/10"
                    }`}
                  >
                    <Icon className="h-7 w-7" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="text-sm">
                  {section.title}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-6 md:p-10">
          <DialogHeader>
            <DialogTitle className="text-3xl font-bold text-primary">{active.title}</DialogTitle>
          </DialogHeader>

          {active.image_url && (
            <div className="mt-4 mb-6">
              <img
                src={active.image_url}
                alt={active.title}
                className="w-full h-64 object-cover rounded-lg"
              />
            </div>
          )}

          <div className="prose max-w-none text-muted-foreground whitespace-pre-wrap">
            {active.content}
          </div>

          {active.id === "wifi" && active.data && (
            <div className="mt-6 bg-white rounded-lg shadow p-4">
              <p>
                <strong>Network:</strong> {active.data.ssid}
              </p>
              <p>
                <strong>Password:</strong> {active.data.password}
              </p>
            </div>
          )}

          {/* Footer buttons */}
          <div className="mt-10 flex gap-3">
            <Button variant="outline" onClick={shareGuide}>
              <Share2 className="h-4 w-4 mr-2" /> Share
            </Button>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" /> PDF
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GuestGuideDialog;
