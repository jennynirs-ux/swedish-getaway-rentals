import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useProperties } from "@/hooks/useProperties";
import { ArrowLeft, MapPin, Thermometer, Utensils, Shield, LogOut, Coffee } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GuideSectionDialog } from "@/components/GuideSectionDialog";

const PropertyGuide = () => {
  const { id } = useParams();
  const { properties, loading } = useProperties();
  const [selectedSection, setSelectedSection] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const property = properties.find(p => p.id === id);

  const handleSectionClick = (section: any) => {
    setSelectedSection(section);
    setIsDialogOpen(true);
  };

  const guideSections = [
    {
      icon: <MapPin className="w-8 h-8" />,
      title: "Arriving",
      description: "Everything you need to know about check-in and getting settled",
      content: [
        "Check-in time: 15:00 - 20:00",
        "Access instructions will be sent via SMS",
        "Parking available on-site",
        "Welcome basket with local treats included"
      ],
      tips: [
        "Contact us if arriving outside check-in hours",
        "GPS coordinates will be provided for easy navigation"
      ],
      important: "Please respect quiet hours after 22:00"
    },
    {
      icon: <Thermometer className="w-8 h-8" />,
      title: "Sauna & Wellness",
      description: "How to enjoy the authentic Swedish sauna experience",
      content: [
        "Traditional wood-fired sauna available",
        "Sauna stones and water bucket provided",
        "Fresh towels in the sauna room",
        "Cool down area with comfortable seating"
      ],
      tips: [
        "Allow 30-45 minutes for the sauna to heat up",
        "Drink plenty of water before and after",
        "Take breaks between sessions"
      ],
      important: "Never leave the sauna unattended when heated"
    },
    {
      icon: <Coffee className="w-8 h-8" />,
      title: "Kitchen & Dining",
      description: "Fully equipped kitchen with everything you need",
      content: [
        "Modern appliances including dishwasher",
        "Coffee machine and kettle",
        "Complete cookware and dinnerware",
        "Dining area with forest views"
      ],
      tips: [
        "Local grocery store 10 minutes away",
        "Restaurant recommendations in welcome guide",
        "Outdoor dining area available"
      ],
      important: "Please clean dishes before departure"
    },
    {
      icon: <Shield className="w-8 h-8" />,
      title: "House Systems",
      description: "Understanding heating, water, electricity and WiFi",
      content: [
        "Heating controlled via smart thermostat",
        "Water heater provides hot water 24/7",
        "High-speed WiFi throughout the property",
        "Emergency contact numbers on refrigerator"
      ],
      tips: [
        "Thermostat instructions in welcome folder",
        "WiFi password on the router",
        "Fuse box location marked clearly"
      ],
      important: "Report any technical issues immediately"
    },
    {
      icon: <LogOut className="w-8 h-8" />,
      title: "Check-out",
      description: "Departure instructions and what to expect",
      content: [
        "Check-out time: 11:00",
        "Leave keys in designated location",
        "Strip beds and start dishwasher",
        "Take any belongings and trash"
      ],
      tips: [
        "Late check-out available upon request",
        "Contact us if you've left anything behind"
      ],
      important: "Ensure all windows and doors are locked"
    }
  ];

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!property) {
    return <div className="min-h-screen flex items-center justify-center">Property not found</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link 
              to={`/property/${id}`} 
              className="flex items-center text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back to Property
            </Link>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-display font-bold mb-6">
            Guest Guide
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Everything you need to know for a perfect stay at {property.title}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {guideSections.map((section, index) => (
            <Card 
              key={index} 
              className="cursor-pointer group hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
              onClick={() => handleSectionClick(section)}
            >
              <CardHeader className="pb-4">
                <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  {section.icon}
                </div>
                <CardTitle className="text-center text-xl font-display group-hover:text-primary transition-colors">
                  {section.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-center">
                  {section.description}
                </p>
              </CardContent>
            </Card>
          ))}
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

export default PropertyGuide;