import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Property } from "@/hooks/useProperties";
import { ChevronDown, Download, Share2, MapPin, Wifi, Clock, Home } from "lucide-react";
import { useState } from "react";

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
}

const GuestGuideDialog = ({ isOpen, onClose, property }: GuestGuideDialogProps) => {
  const [openSections, setOpenSections] = useState<{ [key: number]: boolean }>({});

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
      case 'home':
      case 'house':
      default:
        return Home;
    }
  };

  const guideSections = (property.guidebook_sections as GuideSection[]) || [];

  const shareGuide = () => {
    if (navigator.share) {
      navigator.share({
        title: `${property.title} - Guest Guide`,
        text: `Complete guest guide for ${property.title}`,
        url: window.location.href
      });
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
    }
  };

  const exportToPDF = () => {
    // This would typically integrate with a PDF generation service
    // For now, we'll show a placeholder
    alert('PDF export feature coming soon!');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b pb-6">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-3xl font-bold">
                Guest Guide
              </DialogTitle>
              <DialogDescription className="text-lg text-muted-foreground mt-2">
                {property.title} - Everything you need to know for your stay
              </DialogDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={shareGuide}>
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
              <Button variant="outline" size="sm" onClick={exportToPDF}>
                <Download className="h-4 w-4 mr-2" />
                PDF
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="py-6">
          {guideSections.length > 0 ? (
            <div className="space-y-4">
              {guideSections.map((section, index) => {
                const IconComponent = getSectionIcon(section.icon);
                const isOpen = openSections[index] || false;

                return (
                  <Collapsible 
                    key={index}
                    open={isOpen}
                    onOpenChange={() => toggleSection(index)}
                  >
                    <CollapsibleTrigger className="w-full">
                      <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-primary/10 rounded-lg">
                            <IconComponent className="h-5 w-5 text-primary" />
                          </div>
                          <h3 className="text-lg font-semibold text-left">
                            {section.title}
                          </h3>
                        </div>
                        <ChevronDown 
                          className={`h-5 w-5 text-muted-foreground transition-transform ${
                            isOpen ? 'rotate-180' : ''
                          }`} 
                        />
                      </div>
                    </CollapsibleTrigger>
                    
                    <CollapsibleContent>
                      <div className="p-6 border border-t-0 rounded-b-lg bg-background">
                        {section.image_url && (
                          <img 
                            src={section.image_url} 
                            alt={section.title}
                            className="w-full h-48 object-cover rounded-lg mb-4"
                          />
                        )}
                        <div className="prose prose-gray max-w-none">
                          <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                            {section.content}
                          </p>
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <Home className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Guest Guide Coming Soon</h3>
              <p className="text-muted-foreground">
                We're preparing a comprehensive guest guide for {property.title}. 
                Please check back soon or contact us for more information.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GuestGuideDialog;