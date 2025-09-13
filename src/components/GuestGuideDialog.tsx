import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Property } from "@/hooks/useProperties";
import { ChevronDown, Download, Share2, MapPin, Wifi, Clock, Home, Phone, Mail, LogOut, FileText, Shield, Heart } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface GuestGuideDialogProps {
  isOpen: boolean;
  onClose: () => void;
  property: Property;
}

interface GuideSection {
  title: string;
  content: string;
  image_url?: string;
  icon?: string;
  id?: string;
  is_prefilled?: boolean;
  data?: any;
}

const GuestGuideDialog = ({ isOpen, onClose, property }: GuestGuideDialogProps) => {
  const [openSections, setOpenSections] = useState<{ [key: number]: boolean }>({});
  const { toast } = useToast();

  const toggleSection = (index: number) => {
    setOpenSections(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  // Icon mapping for guide sections
  const getSectionIcon = (iconName?: string) => {
    switch (iconName?.toLowerCase()) {
      case 'map':
      case 'location':
        return MapPin;
      case 'wifi':
      case 'internet':
        return Wifi;
      case 'clock':
      case 'time':
        return Clock;
      case 'phone':
      case 'contact':
        return Phone;
      case 'mail':
      case 'email':
        return Mail;
      case 'checkout':
      case 'logout':
        return LogOut;
      case 'rules':
      case 'security':
        return Shield;
      case 'thank':
      case 'heart':
        return Heart;
      case 'home':
      case 'house':
      default:
        return Home;
    }
  };

  // Pre-filled sections with default content
  const defaultSections: GuideSection[] = [
    {
      id: 'wifi',
      title: 'WiFi Information',
      content: 'Network: NordicGetaway_Guest\nPassword: Welcome2024\n\nEnjoy high-speed internet throughout your stay.',
      icon: 'wifi',
      is_prefilled: true,
      data: { ssid: 'NordicGetaway_Guest', password: 'Welcome2024' }
    },
    {
      id: 'location',
      title: 'Location & Directions',
      content: `Address: ${property.location || 'Address will be provided upon booking confirmation'}\n\nDetailed directions and parking information will be sent to you before your arrival.`,
      icon: 'location',
      is_prefilled: true
    },
    {
      id: 'contact',
      title: 'Contact Information',
      content: 'For any questions or assistance during your stay:\n\nEmail: hello@nordic-getaways.com\nPhone: +46 xxx xxx xxx\n\nWe typically respond within 2 hours.',
      icon: 'contact',
      is_prefilled: true
    },
    {
      id: 'checkout',
      title: 'Check-out Information',
      content: 'Check-out time: 11:00 AM\n\n• Please strip the beds and place linens in the laundry basket\n• Load and start the dishwasher\n• Take out the trash\n• Lock all doors and windows\n• Leave the key as instructed',
      icon: 'checkout',
      is_prefilled: true
    },
    {
      id: 'rules',
      title: 'House Rules',
      content: '• No smoking inside the property\n• Respect quiet hours (10 PM - 8 AM)\n• Maximum occupancy as per booking\n• No parties or events\n• Please treat our home with care',
      icon: 'rules',
      is_prefilled: true
    },
    {
      id: 'thank',
      title: 'Thank You!',
      content: 'Thank you for choosing Nordic Getaways and for taking care of our home! We hope you create wonderful memories during your stay.\n\nWe would love to hear about your experience. Please leave us a review!',
      icon: 'heart',
      is_prefilled: true
    }
  ];

  // Combine pre-filled sections with custom sections from property
  const customSections = (property.guidebook_sections as GuideSection[]) || [];
  const allSections = [...defaultSections, ...customSections.filter(section => !section.is_prefilled)];

  const shareGuide = async () => {
    const guideUrl = `${window.location.origin}/property/${property.id}/guide`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${property.title} - Guest Guide`,
          text: `Complete guest guide for ${property.title}`,
          url: guideUrl
        });
      } catch (error) {
        // User cancelled or error occurred, fallback to clipboard
        await navigator.clipboard.writeText(guideUrl);
        toast({
          title: "Link copied!",
          description: "Guest guide link has been copied to clipboard.",
        });
      }
    } else {
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(guideUrl);
      toast({
        title: "Link copied!",
        description: "Guest guide link has been copied to clipboard.",
      });
    }
  };

  const exportToPDF = () => {
    // This would typically integrate with a PDF generation service
    toast({
      title: "PDF Export",
      description: "PDF export feature coming soon!",
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-background via-background to-muted/20">
        {/* Header with Pinterest-inspired design */}
        <DialogHeader className="border-b border-muted/20 pb-8 mb-6">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <DialogTitle className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                Guest Guide
              </DialogTitle>
              <DialogDescription className="text-xl text-muted-foreground">
                {property.title}
              </DialogDescription>
              <p className="text-sm text-muted-foreground/80 max-w-2xl">
                Everything you need to know for an unforgettable stay. Click on any section to expand and learn more.
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" size="sm" onClick={shareGuide} className="gap-2">
                <Share2 className="h-4 w-4" />
                Share Guide
              </Button>
              <Button variant="outline" size="sm" onClick={exportToPDF} className="gap-2">
                <Download className="h-4 w-4" />
                Export PDF
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Pinterest-inspired card layout */}
        <div className="space-y-3">
          {allSections.map((section, index) => {
            const IconComponent = getSectionIcon(section.icon);
            const isOpen = openSections[index] || false;

            return (
              <Collapsible 
                key={section.id || index}
                open={isOpen}
                onOpenChange={() => toggleSection(index)}
                className="group"
              >
                <CollapsibleTrigger className="w-full">
                  <div className="flex items-center justify-between p-5 bg-card/50 backdrop-blur-sm rounded-xl border border-muted/20 hover:border-primary/30 hover:bg-card/70 transition-all duration-300 group-hover:shadow-lg group-hover:shadow-primary/5">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center group-hover:from-primary/20 group-hover:to-primary/10 transition-all duration-300">
                        <IconComponent className="h-6 w-6 text-primary" />
                      </div>
                      <div className="text-left">
                        <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                          {section.title}
                        </h3>
                        {section.is_prefilled && (
                          <span className="text-xs text-muted-foreground/60 font-medium">Essential Information</span>
                        )}
                      </div>
                    </div>
                    <ChevronDown 
                      className={`h-5 w-5 text-muted-foreground transition-all duration-300 group-hover:text-primary ${
                        isOpen ? 'rotate-180' : ''
                      }`} 
                    />
                  </div>
                </CollapsibleTrigger>
                
                <CollapsibleContent>
                  <div className="mt-2 p-6 bg-card/30 backdrop-blur-sm rounded-xl border border-muted/10">
                    {section.image_url && (
                      <div className="mb-6 rounded-lg overflow-hidden">
                        <img 
                          src={section.image_url} 
                          alt={section.title}
                          className="w-full h-48 object-cover hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    )}
                    
                    <div className="prose prose-sm max-w-none">
                      <div className="text-muted-foreground leading-relaxed space-y-3 whitespace-pre-wrap">
                        {section.content.split('\n\n').map((paragraph, idx) => (
                          <p key={idx} className="text-sm leading-relaxed">
                            {paragraph.split('\n').map((line, lineIdx) => (
                              <span key={lineIdx}>
                                {line}
                                {lineIdx < paragraph.split('\n').length - 1 && <br />}
                              </span>
                            ))}
                          </p>
                        ))}
                      </div>
                    </div>

                    {/* Special data formatting for WiFi section */}
                    {section.id === 'wifi' && section.data && (
                      <div className="mt-4 p-4 bg-primary/5 rounded-lg border border-primary/10">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                          <div>
                            <span className="font-medium text-foreground">Network:</span>
                            <span className="ml-2 font-mono text-primary">{section.data.ssid}</span>
                          </div>
                          <div>
                            <span className="font-medium text-foreground">Password:</span>
                            <span className="ml-2 font-mono text-primary">{section.data.password}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>

        {/* Footer with appreciation message */}
        <div className="mt-8 p-6 bg-gradient-to-r from-primary/5 to-primary/10 rounded-xl border border-primary/20">
          <div className="flex items-center gap-3">
            <Heart className="h-6 w-6 text-primary" />
            <div>
              <h4 className="font-semibold text-foreground">Welcome to Nordic Getaways</h4>
              <p className="text-sm text-muted-foreground mt-1">
                We're here to make your stay extraordinary. Don't hesitate to reach out if you need anything!
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GuestGuideDialog;