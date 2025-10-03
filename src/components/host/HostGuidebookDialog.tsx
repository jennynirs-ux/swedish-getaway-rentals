import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DollarSign,
  Camera,
  FileText,
  Home,
  MessageCircle,
  HelpCircle,
  CheckSquare,
  Info,
} from "lucide-react";

interface HostGuidebookDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const HostGuidebookDialog = ({ isOpen, onClose }: HostGuidebookDialogProps) => {
  const [activeIndex, setActiveIndex] = useState(0);

  const sections = [
{
  id: "price-guide",
  title: "Price Guide",
  icon: DollarSign,
  content: {
    title: "Setting Competitive Prices",
    description: "Master the art of pricing your property for maximum bookings and revenue.",
    sections: [
      {
        type: "intro",
        title: "Understanding Pricing Strategy",
        icon: "DollarSign",
        body: "Setting the right price for your property is both an art and a science...",
        commissionExample: {
          base: "2000 SEK",
          fee: "200 SEK",
          guest: "2200 SEK/night"
        }
      },
      {
        type: "tiers",
        title: "Market Pricing Tiers in Sweden",
        items: [
          {
            tier: "Budget",
            range: "800–1500 SEK/night",
            icon: "Users",
            color: "text-blue-600",
            points: ["Basic amenities", "Shared facilities", "Rural location"]
          },
          {
            tier: "Mid-Range",
            range: "1500–3500 SEK/night",
            icon: "Star",
            color: "text-amber-600",
            points: ["Private facilities", "Good location", "Ideal for families"]
          },
          {
            tier: "Premium",
            range: "3500+ SEK/night",
            icon: "Lightbulb",
            color: "text-purple-600",
            points: ["Luxury amenities", "Unique location", "Exceptional experience"]
          }
        ]
      }
    ],
    formula: "Guest pays: Your price + 10% platform fee",
    example: "If you set 1000 SEK/night, guest sees 1100 SEK/night, you receive 1000 SEK"
  }
}

    {
      id: "gallery",
      title: "Gallery Guide",
      icon: Camera,
      content: {
        title: "Taking Great Property Photos",
        description: "High-quality photos are crucial for attracting guests.",
        tips: [
          "Shoot during golden hour (morning/evening light)",
          "Clean and declutter all spaces before shooting",
          "Use a wide-angle lens for interior shots",
          "Capture your Hero Image - the most stunning view",
          "Mark your best photo as 'Hero' in the gallery",
          "Show amenities in action (fire in fireplace, set table)",
          "Include exterior and surrounding nature",
          "Take photos from multiple angles",
        ],
        photoOrder: [
          "1. Hero Image (marked in gallery)",
          "2. Exterior/Entrance",
          "3. Living Room",
          "4. Kitchen",
          "5. Bedrooms",
          "6. Bathrooms",
          "7. Outdoor spaces",
          "8. Special amenities (sauna, hot tub, etc.)",
        ],
      },
    },
    {
      id: "basic-info",
      title: "Basic Information",
      icon: FileText,
      content: {
        title: "Writing Strong Listings",
        description: "Your title and description are the first things guests see.",
        tips: [
          "Title: Keep it under 60 characters",
          "Title: Include location and property type",
          "Title: Highlight your unique feature",
          "Description: Start with your best selling point",
          "Description: Use specific details (not just 'cozy')",
          "Description: Mention nearby attractions",
          "Description: Be honest about the space",
          "Description: Include what makes you special",
        ],
        examples: {
          good: "Lakefront Cabin with Private Sauna - Åsunden",
          bad: "Nice House",
        },
      },
    },
    {
      id: "house-prep",
      title: "House Preparation",
      icon: Home,
      content: {
        title: "Preparing Your Home",
        description: "Best practices for getting your property guest-ready.",
        checklist: [
          "Deep clean all areas (see Cleaning Checklist)",
          "Fresh linens and towels provided",
          "Check all appliances work properly",
          "Stock basic amenities (toilet paper, soap, etc.)",
          "Clear instructions for heating, hot water, wifi",
          "Emergency contacts displayed clearly",
          "Remove personal valuables",
          "Ensure adequate lighting in all areas",
          "Test smoke detectors and fire extinguishers",
          "Provide local maps and restaurant recommendations",
        ],
      },
    },
    {
      id: "guest-communication",
      title: "Guest Communication",
      icon: MessageCircle,
      content: {
        title: "Communicating with Guests",
        description: "Tips for excellent guest service.",
        tips: [
          "Respond to inquiries within 2 hours",
          "Send check-in details 24 hours before arrival",
          "Be available during check-in for questions",
          "Check in after first night to ensure everything is okay",
          "Provide clear instructions for everything",
          "Be proactive about potential issues",
          "Ask for feedback during and after stay",
          "Handle complaints professionally and quickly",
        ],
        templates: {
          welcome: "Welcome! Here are your check-in details...",
          checkin: "We hope you arrived safely. Is everything okay?",
          checkout: "Thank you for staying with us! Safe travels!",
        },
      },
    },
    {
      id: "common-problems",
      title: "Common Problems",
      icon: HelpCircle,
      content: {
        title: "FAQ & Solutions",
        description: "Quick solutions to common hosting challenges.",
        faqs: [
          {
            q: "Guest can't find the key lockbox",
            a: "Provide clear photos and detailed directions. Include landmarks. Consider a welcome call.",
          },
          {
            q: "Wifi isn't working",
            a: "Have router location and reset instructions in guidebook. Keep backup hotspot.",
          },
          {
            q: "Heating/hot water issues",
            a: "Provide detailed instructions with photos. Have local handyman on standby.",
          },
          {
            q: "Noise complaints from neighbors",
            a: "Set clear house rules. Remind guests before arrival. Act immediately if issues arise.",
          },
          {
            q: "Guest wants to cancel",
            a: "Review your cancellation policy. Be flexible when possible. Document everything.",
          },
        ],
      },
    },
    {
      id: "cleaning-checklist",
      title: "Cleaning Checklist",
      icon: CheckSquare,
      content: {
        title: "Turnover Cleaning Guide",
        description: "Step-by-step checklist for property turnovers.",
        rooms: {
          Kitchen: [
            "Clean all surfaces and countertops",
            "Clean inside/outside all appliances",
            "Empty and clean refrigerator",
            "Check all dishes are clean and put away",
            "Restock coffee, tea, basic supplies",
            "Take out trash and recycling",
            "Sweep and mop floor",
          ],
          Bathroom: [
            "Scrub toilet, sink, shower/tub",
            "Clean mirrors and fixtures",
            "Restock toilet paper, soap, shampoo",
            "Wash bath mats and replace towels",
            "Empty trash",
            "Check for hair and clean drains",
          ],
          Bedrooms: [
            "Change all linens and pillowcases",
            "Check mattress condition",
            "Dust all surfaces",
            "Vacuum under bed",
            "Clean windows if needed",
            "Check closets are empty",
          ],
          Living: [
            "Vacuum all floors and rugs",
            "Dust all surfaces and decorations",
            "Fluff pillows and arrange furniture",
            "Clean windows and mirrors",
            "Check remote controls work",
            "Arrange magazines and books neatly",
          ],
          Outdoor: [
            "Sweep porch/deck",
            "Clean outdoor furniture",
            "Empty outdoor trash",
            "Check grill is clean (if applicable)",
            "Ensure pathways are clear",
          ],
        },
        final: [
          "Check all lights work",
          "Adjust thermostat",
          "Lock all windows and doors",
          "Take photos for your records",
          "Restock lockbox key",
        ],
      },
    },
  ];

  const renderSectionContent = (section: typeof sections[0]) => {
    const content = section.content;

    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-xl font-semibold mb-2">{content.title}</h3>
          <p className="text-muted-foreground">{content.description}</p>
        </div>

        {content.tips && (
          <div>
            <h4 className="font-semibold mb-3">Tips:</h4>
            <ul className="space-y-2">
              {content.tips.map((tip, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <CheckSquare className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                  <span className="text-sm">{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {content.photoOrder && (
          <div>
            <h4 className="font-semibold mb-3">Recommended Photo Order:</h4>
            <ol className="space-y-2 list-decimal list-inside text-sm">
              {content.photoOrder.map((item, idx) => (
                <li key={idx} className="text-muted-foreground">{item}</li>
              ))}
            </ol>
          </div>
        )}

        {content.checklist && (
          <div>
            <h4 className="font-semibold mb-3">Checklist:</h4>
            <ul className="space-y-2">
              {content.checklist.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <CheckSquare className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                  <span className="text-sm">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {content.formula && (
          <div className="bg-primary/10 p-4 rounded-lg">
            <h4 className="font-semibold mb-2">Pricing Formula:</h4>
            <p className="text-sm font-mono">{content.formula}</p>
            {content.example && (
              <p className="text-sm text-muted-foreground mt-2">
                <strong>Example:</strong> {content.example}
              </p>
            )}
          </div>
        )}

        {content.examples && (
          <div>
            <h4 className="font-semibold mb-3">Examples:</h4>
            <div className="space-y-2">
              <div className="bg-green-50 dark:bg-green-950/20 p-3 rounded">
                <span className="text-xs font-semibold text-green-700 dark:text-green-400">GOOD:</span>
                <p className="text-sm mt-1">{content.examples.good}</p>
              </div>
              <div className="bg-red-50 dark:bg-red-950/20 p-3 rounded">
                <span className="text-xs font-semibold text-red-700 dark:text-red-400">BAD:</span>
                <p className="text-sm mt-1">{content.examples.bad}</p>
              </div>
            </div>
          </div>
        )}

        {content.templates && (
          <div>
            <h4 className="font-semibold mb-3">Message Templates:</h4>
            <div className="space-y-3">
              {Object.entries(content.templates).map(([key, value]) => (
                <div key={key} className="bg-muted/50 p-3 rounded">
                  <span className="text-xs font-semibold uppercase">{key}:</span>
                  <p className="text-sm mt-1">{value}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {content.faqs && (
          <div>
            <h4 className="font-semibold mb-3">Frequently Asked Questions:</h4>
            <div className="space-y-4">
              {content.faqs.map((faq, idx) => (
                <div key={idx} className="border-l-2 border-primary pl-4">
                  <p className="font-medium text-sm mb-1">{faq.q}</p>
                  <p className="text-sm text-muted-foreground">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {content.rooms && (
          <div>
            <h4 className="font-semibold mb-3">Room-by-Room Checklist:</h4>
            <div className="space-y-4">
              {Object.entries(content.rooms).map(([room, tasks]) => (
                <div key={room} className="border rounded-lg p-4">
                  <h5 className="font-semibold mb-2">{room}</h5>
                  <ul className="space-y-1">
                    {(tasks as string[]).map((task, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <CheckSquare className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{task}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

        {content.final && (
          <div>
            <h4 className="font-semibold mb-3">Final Steps:</h4>
            <ul className="space-y-2">
              {content.final.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <CheckSquare className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                  <span className="text-sm font-medium">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl h-[90vh] flex flex-col p-0">
        <div className="flex-1 flex m-0 h-full">
          <TooltipProvider>
            <nav className="w-28 border-r border-muted/20 bg-card/50 flex flex-col items-center py-6 gap-6 overflow-y-auto h-full">
              {sections.map((section, index) => {
                const isActive = activeIndex === index;
                const Icon = section.icon;
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
            </nav>
          </TooltipProvider>

          <div className="flex-1 overflow-y-auto px-8 py-6 relative h-full">
            <DialogHeader className="mb-6">
              <div className="flex items-start justify-between">
                <DialogTitle className="text-3xl font-bold">{sections[activeIndex].title}</DialogTitle>
              </div>
            </DialogHeader>

            <div className="prose prose-sm max-w-none">
              {renderSectionContent(sections[activeIndex])}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default HostGuidebookDialog;
