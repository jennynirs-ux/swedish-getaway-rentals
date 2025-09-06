import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, MapPin, Waves, Fish, TreePine, Home, CheckCircle, Utensils } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GuideSectionDialog } from "@/components/GuideSectionDialog";

const LakehouseGuide = () => {
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
      description: "Everything you need to know about getting to the lakehouse and your first steps upon arrival.",
      content: [
        "Address: Private lakehouse location will be shared 24 hours before arrival",
        "GPS coordinates will be provided for accurate navigation",
        "Look for the wooden sign with 'Lakehouse Retreat' at the entrance",
        "Parking is available directly next to the lakehouse",
        "Check-in time is 4:00 PM, early arrival can be arranged upon request",
        "Keys are located in the lockbox - code will be provided before arrival"
      ],
      tips: [
        "Download offline maps as cell service can be spotty in remote areas",
        "Bring a flashlight for evening arrivals as outdoor lighting is minimal",
        "Stock up on groceries before arrival - nearest store is 15km away"
      ],
      important: [
        "Respect quiet hours from 10 PM to 8 AM",
        "No smoking anywhere on the property",
        "Maximum 6 guests allowed"
      ]
    },
    {
      icon: Waves,
      title: "Lake Activities",
      description: "Make the most of your lakeside location with swimming, fishing, and water sports.",
      content: [
        "Swimming area marked with buoys - water depth gradually increases",
        "Life jackets available in all sizes in the boat house",
        "Kayaks stored in boat house - no experience necessary",
        "Fishing permitted with proper license (we can arrange)",
        "Best fishing spots: early morning near the reeds, evening by the dock",
        "Common fish: perch, pike, and bass",
        "Water temperature monitored daily - posted on dock",
        "Changing room and outdoor shower available by the lake"
      ],
      tips: [
        "Morning is the best time for fishing and calmest water",
        "Use the provided fish cleaning station",
        "Sun protection is essential - UV reflects off water",
        "Check weather conditions before water activities"
      ],
      important: [
        "Never swim alone - use buddy system",
        "Children must be supervised at all times near water",
        "Return all equipment clean and where you found it"
      ]
    },
    {
      icon: TreePine,
      title: "Forest Activities",
      description: "Explore the surrounding Swedish forest with hiking trails and nature experiences.",
      content: [
        "Marked trail system with varying difficulty levels",
        "Trail maps available at the lakehouse - take one with you",
        "Berry picking allowed (blueberries, lingonberries in season)",
        "Mushroom foraging permitted with proper identification guide",
        "Wildlife viewing opportunities: deer, birds, occasional moose",
        "Photography spots marked on trail maps",
        "Rest areas with benches every 2km",
        "Trail maintenance tools available if you encounter fallen trees"
      ],
      tips: [
        "Wear appropriate hiking boots - trails can be muddy",
        "Bring insect repellent during summer months",
        "Start early to avoid afternoon heat",
        "Pack snacks and water for longer hikes"
      ],
      important: [
        "Inform someone of your hiking plans and expected return",
        "Stick to marked trails only",
        "Do not feed or approach wildlife",
        "Follow Leave No Trace principles"
      ]
    },
    {
      icon: Home,
      title: "House Systems",
      description: "Understanding the lakehouse systems, utilities, and how everything works.",
      content: [
        "Electric heating controlled by thermostats in each room",
        "Hot water heated by electric boiler - allow 30 minutes for recovery",
        "Septic system - only toilet paper should be flushed",
        "Well water system - safe to drink, may have mineral taste",
        "Garbage collection on Thursdays - bins by the road before 7 AM",
        "Recycling guidelines posted in kitchen",
        "Backup generator for power outages - instructions in utility room",
        "WiFi password and network info on kitchen counter"
      ],
      tips: [
        "Be mindful of water usage as system relies on well",
        "Turn off lights and heat when leaving for extended periods",
        "Emergency contact numbers posted by phone",
        "Use wood stove for cozy atmosphere and backup heating"
      ],
      important: [
        "Report any plumbing issues immediately",
        "Do not attempt generator repairs yourself",
        "Keep septic system healthy - no chemicals down drains"
      ]
    },
    {
      icon: Utensils,
      title: "Kitchen & Dining",
      description: "Everything you need to know about the fully equipped kitchen and dining facilities.",
      content: [
        "Full kitchen with modern appliances and cookware",
        "Induction cooktop - compatible cookware provided",
        "Large refrigerator/freezer with ice maker",
        "Dishwasher - eco-friendly detergent provided",
        "Coffee machine, French press, and electric kettle",
        "Dining table seats 6 comfortably",
        "Outdoor grill available with propane tank",
        "Fish cleaning station by the lake with running water"
      ],
      tips: [
        "Local specialty ingredients available at nearby farm shop",
        "Fresh fish cleaning guide posted by cleaning station",
        "Use outdoor grill for authentic lakeside dining experience",
        "Compost bin for food scraps"
      ],
      important: [
        "Clean up after cooking to avoid attracting wildlife",
        "Store food properly - bears are present in the area",
        "Turn off all appliances when not in use"
      ]
    },
    {
      icon: CheckCircle,
      title: "Check-out",
      description: "Departure procedures and ensuring the lakehouse is ready for the next guests.",
      content: [
        "Check-out time is 11:00 AM - late departure fees may apply",
        "Complete cleaning checklist provided in welcome folder",
        "Remove all personal belongings and check all rooms/closets",
        "Return keys to lockbox and scramble the code",
        "Settle any incidental charges or damages",
        "Leave review and feedback for future improvements",
        "Emergency contact available until you safely leave the area"
      ],
      tips: [
        "Start packing the evening before departure",
        "Take final photos as memories of your stay",
        "Check weather conditions for safe travel",
        "Download route for return journey"
      ],
      important: [
        "Ensure all fires are completely extinguished",
        "Secure all windows and doors",
        "Report any damage or maintenance needs",
        "Do not leave without completing checkout procedure"
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-warm-gradient text-white py-16">
        <div className="lakehouse-container">
          <Link to="/lakehouse-getaway">
            <Button variant="ghost" className="text-white hover:bg-white/20 mb-8">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Lakehouse
            </Button>
          </Link>
          
          <div className="max-w-4xl">
            <h1 className="text-4xl md:text-6xl font-display font-bold mb-6">
              Lakehouse Guest Guide
            </h1>
            <p className="text-xl md:text-2xl text-white/90 leading-relaxed">
              Everything you need to know for an amazing lakeside retreat in the heart of Swedish nature.
            </p>
          </div>
        </div>
      </div>

      {/* Guide Sections */}
      <div className="lakehouse-section">
        <div className="lakehouse-container">
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

export default LakehouseGuide;