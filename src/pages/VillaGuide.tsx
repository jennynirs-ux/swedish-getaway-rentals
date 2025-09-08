import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, MapPin, Home, Users, Utensils, Waves, TreePine, CheckCircle, Settings, Sparkles, Mountain, Car } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GuideSectionDialog } from "@/components/GuideSectionDialog";

const VillaGuide = () => {
  const [selectedSection, setSelectedSection] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleSectionClick = (section) => {
    setSelectedSection(section);
    setIsDialogOpen(true);
  };

  const guideSections = [
    {
      icon: MapPin,
      title: "Arriving",
      description: "Your journey to Villa Häcken and getting settled in your forest retreat.",
      content: [
        "Address: Villa Häcken, private forest location (exact coordinates sent 24h before arrival)",
        "Follow signs for 'Villa Häcken' from the main forest road",
        "Private driveway with parking for multiple vehicles",
        "Check-in time: 4:00 PM (early arrival available upon request)",
        "Key collection from secure lockbox (code provided before arrival)",
        "Emergency contact numbers posted inside main entrance",
        "Welcome basket with local specialties awaits you",
        "Property map and house manual in the main living area"
      ],
      tips: [
        "Download offline maps - forest location has limited cellular coverage",
        "Bring a flashlight for evening arrivals",
        "Stock up on groceries beforehand - nearest village is 12km away",
        "Weather can change quickly in the forest - pack accordingly"
      ],
      important: [
        "Respect quiet forest environment - wildlife is abundant",
        "No smoking anywhere on the property",
        "Maximum 8 guests as per local regulations",
        "Report any issues immediately to emergency contact"
      ]
    },
    {
      icon: Waves,
      title: "Sauna & Wellness",
      description: "Authentic Swedish sauna experience and outdoor wellness facilities.",
      content: [
        "Traditional wood-fired sauna ready to use (heating instructions provided)",
        "Outdoor hot tub with forest views - available year-round",
        "Changing facilities and outdoor shower area",
        "Sauna accessories: towels, robes, and traditional birch whisks",
        "Hot tub maintenance kit and usage guidelines",
        "Wellness area lighting for evening relaxation",
        "Safety equipment and first aid kit nearby",
        "Traditional cooling pool for authentic sauna experience"
      ],
      tips: [
        "Allow 45 minutes for sauna to reach optimal temperature",
        "Best sauna experience is in the evening under the Nordic sky",
        "Hydrate well before and after sauna sessions",
        "Try the traditional Swedish sauna ritual with birch whisks"
      ],
      important: [
        "Never leave sauna fire unattended",
        "Children must be supervised in all wellness areas",
        "Check hot tub temperature before use",
        "Report any equipment malfunctions immediately"
      ]
    },
    {
      icon: TreePine,
      title: "Forest & Outdoor",
      description: "Exploring the pristine Swedish forest surrounding Villa Häcken.",
      content: [
        "Private forest trails marked with wooden posts",
        "Trail difficulty levels clearly marked (easy, moderate, challenging)",
        "Detailed trail maps available - always carry one",
        "Designated areas for berry picking and mushroom foraging",
        "Wildlife observation points with benches",
        "Outdoor dining area with fire pit and BBQ facilities",
        "Forest photography spots marked on property map",
        "Emergency whistle and first aid supplies at trail heads"
      ],
      tips: [
        "Early morning is best for wildlife spotting",
        "Wear appropriate hiking boots - trails can be uneven",
        "Bring insect repellent during summer months",
        "Forage responsibly - take only what you need"
      ],
      important: [
        "Always inform someone of your hiking plans",
        "Stay on marked trails - respect private property boundaries",
        "No camping or fires outside designated areas",
        "Protect the forest - follow Leave No Trace principles"
      ]
    },
    {
      icon: Home,
      title: "House Systems",
      description: "Understanding Villa Häcken's modern systems and traditional elements.",
      content: [
        "Central heating with individual room controls",
        "Hot water system with efficient recovery time",
        "Modern septic system - guidelines posted in bathrooms",
        "Private well water - tested regularly, safe to drink",
        "Backup generator for power outages (automatic activation)",
        "High-speed fiber internet throughout the villa",
        "Waste management and recycling guidelines",
        "Traditional wood-burning fireplace with safety equipment"
      ],
      tips: [
        "Adjust heating room by room for optimal comfort",
        "Wood for fireplace provided - instructions in living room",
        "WiFi details posted in main entrance area",
        "Use energy efficiently - villa is eco-friendly designed"
      ],
      important: [
        "Report any plumbing or electrical issues immediately",
        "Never attempt repairs yourself",
        "Keep fireplace area clear of combustibles",
        "Follow all safety procedures posted throughout villa"
      ]
    },
    {
      icon: Utensils,
      title: "Kitchen & Dining",
      description: "Gourmet kitchen facilities and dining experiences at Villa Häcken.",
      content: [
        "Professional-grade kitchen with premium appliances",
        "Induction cooking surface with specialized cookware provided",
        "Large refrigerator/freezer with ice maker and wine cooler",
        "Dishwasher with eco-friendly detergents supplied",
        "Coffee station: espresso machine, grinder, and premium Swedish coffee",
        "Dining for 8 people indoors and additional outdoor seating",
        "Outdoor BBQ area with gas grill and charcoal options",
        "Herb garden with fresh ingredients for cooking"
      ],
      tips: [
        "Try local Swedish specialties from the welcome basket",
        "Fresh herbs available from the villa garden",
        "Outdoor dining is magical during Nordic summer evenings",
        "Local farm shop 12km away for fresh, organic ingredients"
      ],
      important: [
        "Store food properly - forest wildlife is abundant",
        "Clean up thoroughly after cooking",
        "Turn off all appliances when not in use",
        "Follow fire safety when using outdoor BBQ"
      ]
    },
    {
      icon: CheckCircle,
      title: "Check-out",
      description: "Departure procedures to ensure Villa Häcken is ready for future guests.",
      content: [
        "Check-out time: 11:00 AM (late departure available with prior arrangement)",
        "Complete checkout checklist provided in guest folder",
        "Final walkthrough to check for personal belongings",
        "Return all keys to lockbox and reset combination",
        "Final meter readings and damage assessment",
        "Feedback form completion (helps us improve your experience)",
        "Property security check before departure",
        "Emergency contact available until you're safely on your way"
      ],
      tips: [
        "Start packing the evening before departure",
        "Take final photos of your memorable forest retreat",
        "Check weather and road conditions for departure",
        "Download navigation route for safe journey home"
      ],
      important: [
        "Ensure all fires are completely extinguished",
        "Secure all windows and exterior doors",
        "Turn off main water supply if staying in winter",
        "Report any maintenance needs or damage before leaving"
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="relative bg-warm-gradient text-white py-16 overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/src/assets/villa-hero.jpg')" }}
        />
        <div className="absolute inset-0 bg-black/40" />
        <div className="villa-container relative z-10">
          <Link to="/villa-hacken">
            <Button variant="ghost" className="text-white hover:bg-white/20 mb-8">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Villa Häcken
            </Button>
          </Link>
          
          <div className="max-w-4xl">
            <h1 className="text-4xl md:text-6xl font-display font-bold mb-6">
              Villa Häcken Guest Guide
            </h1>
            <p className="text-xl md:text-2xl text-white/90 leading-relaxed">
              Your complete guide to experiencing luxury in the heart of Swedish nature.
            </p>
          </div>
        </div>
      </div>

      {/* Guide Sections */}
      <div className="villa-section">
        <div className="villa-container">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {guideSections.map((section, index) => (
              <div
                key={index}
                className="guide-section-card"
                onClick={() => handleSectionClick(section)}
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <section.icon className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-display font-semibold text-foreground mb-2">
                      {section.title}
                    </h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      {section.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <GuideSectionDialog
          section={selectedSection}
          isOpen={isDialogOpen}
          onClose={() => setIsDialogOpen(false)}
        />
      </div>
    </div>
  );
};

export default VillaGuide;