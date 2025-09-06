import { useState } from "react";
import { Waves, Fish, TreePine, Wifi, Car, Utensils, Flame, Bed, Mountain, Sailboat, BookOpen } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { AmenityDialog } from "@/components/AmenityDialog";

const LakehouseAmenities = () => {
  const [selectedAmenity, setSelectedAmenity] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const amenities = [
    {
      icon: Waves,
      title: "Private Lake Access",
      description: "Direct access to crystal clear lake with private dock",
      detailedDescription: "Enjoy exclusive access to pristine lake waters with your own private dock. The lake is perfect for swimming, kayaking, and fishing. Crystal clear water with excellent visibility and a gradual sandy bottom makes it ideal for families.",
      features: ["Private wooden dock", "Swimming ladder", "Lake depth markers", "Life jackets provided", "Kayak storage area", "Lake temperature monitoring"]
    },
    {
      icon: Fish,
      title: "Fishing Equipment",
      description: "Rods, tackle, and local fishing guides available",
      detailedDescription: "The lake is home to perch, pike, and trout. We provide all necessary fishing equipment and can arrange local fishing guides who know the best spots and techniques for successful fishing in Swedish waters.",
      features: ["Fishing rods and reels", "Tackle box with lures", "Bait and supplies", "Fishing licenses arranged", "Local guide contacts", "Fish cleaning station", "Cooler for your catch"]
    },
    {
      icon: TreePine,
      title: "Forest Surroundings",
      description: "Peaceful pine forest with hiking trails",
      detailedDescription: "Surrounded by ancient Swedish pine forest with well-maintained hiking trails of varying difficulty. Experience the tranquility of Nordic nature with opportunities to spot local wildlife including deer, birds, and maybe even moose.",
      features: ["Marked hiking trails", "Trail difficulty maps", "Wildlife spotting guide", "Berry picking areas", "Mushroom foraging spots", "Nature photography points"]
    },
    {
      icon: Wifi,
      title: "High-Speed WiFi",
      description: "Stay connected with reliable internet access",
      detailedDescription: "High-speed fiber internet throughout the lakehouse ensures you can work remotely, stream content, or stay connected with loved ones. The connection is stable and fast enough for video calls and online activities.",
      features: ["Fiber internet connection", "WiFi throughout property", "Work-friendly setup", "Streaming capable", "Multiple device support", "Backup connection available"]
    },
    {
      icon: Car,
      title: "Free Parking",
      description: "Secure parking space for your vehicle",
      detailedDescription: "Convenient and secure parking right at the lakehouse. The parking area is well-maintained and provides easy access to the property. EV charging is available for electric vehicles.",
      features: ["Secure parking area", "Multiple vehicle spaces", "EV charging station", "Easy property access", "Covered parking option", "Boat trailer parking"]
    },
    {
      icon: Utensils,
      title: "Full Kitchen",
      description: "Modern kitchen with all cooking essentials",
      detailedDescription: "Fully equipped modern kitchen with everything needed to prepare meals during your stay. From coffee makers to full cooking equipment, including special items for preparing your fresh-caught fish.",
      features: ["Modern appliances", "Full cookware set", "Dishwasher", "Coffee machine", "Large refrigerator", "Fish preparation tools", "Outdoor grilling area"]
    },
    {
      icon: Flame,
      title: "Outdoor Fire Pit",
      description: "Cozy evenings around the campfire",
      detailedDescription: "Gather around the outdoor fire pit for memorable evenings under the Swedish sky. Perfect for roasting marshmallows, telling stories, or simply enjoying the peaceful sounds of nature.",
      features: ["Stone fire pit", "Firewood provided", "Seating around fire", "Cooking grate available", "Fire safety equipment", "S'mores supplies", "Blankets for cool evenings"]
    },
    {
      icon: Bed,
      title: "Comfortable Bedding",
      description: "High-quality linens and comfortable mattresses",
      detailedDescription: "Rest peacefully in comfortable beds with premium linens and mattresses. Each bedroom offers lake or forest views and is designed for maximum comfort and tranquility.",
      features: ["Premium mattresses", "High-quality linens", "Lake view bedrooms", "Blackout curtains", "Individual heating", "Extra pillows and blankets", "Reading lights"]
    }
  ];

  const handleAmenityClick = (amenity) => {
    setSelectedAmenity(amenity);
    setIsDialogOpen(true);
  };
  return (
    <section className="py-20 bg-muted/50">
      <div className="container mx-auto px-4">
        {/* Main Amenities */}
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-foreground mb-4">
            Lakeside Amenities
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Everything you need for a perfect lakeside getaway, from water activities to cozy indoor comforts.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-20">
          {amenities.map((amenity, index) => {
            const IconComponent = amenity.icon;
            return (
              <div 
                key={index} 
                className="text-center p-6 rounded-lg bg-card shadow-sm hover:shadow-md transition-all duration-300 hover-scale cursor-pointer hover:scale-105"
                onClick={() => handleAmenityClick(amenity)}
              >
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                  <IconComponent className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {amenity.title}
                </h3>
                <p className="text-muted-foreground text-sm">
                  {amenity.description}
                </p>
              </div>
            );
          })}
        </div>

        {/* Special Features */}
        <div className="bg-card rounded-2xl p-12 shadow-lg">
          <h3 className="text-3xl font-bold text-center text-foreground mb-12">
            What Makes Our Lakehouse Special
          </h3>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-xl mb-4 hover:bg-primary/20 transition-all duration-300 hover:scale-105">
                <Waves className="h-8 w-8 text-primary" />
              </div>
              <h4 className="text-xl font-semibold text-foreground mb-3">Pristine Waters</h4>
              <p className="text-muted-foreground">
                Crystal clear lake perfect for swimming, fishing, and water sports. The water quality is exceptional.
              </p>
            </div>
            
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-xl mb-4 hover:bg-primary/20 transition-all duration-300 hover:scale-105">
                <Mountain className="h-8 w-8 text-primary" />
              </div>
              <h4 className="text-xl font-semibold text-foreground mb-3">Natural Paradise</h4>
              <p className="text-muted-foreground">
                Surrounded by untouched Swedish forest with abundant wildlife and peaceful hiking trails.
              </p>
            </div>
            
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-xl mb-4 hover:bg-primary/20 transition-all duration-300 hover:scale-105">
                <Sailboat className="h-8 w-8 text-primary" />
              </div>
              <h4 className="text-xl font-semibold text-foreground mb-3">Water Adventures</h4>
              <p className="text-muted-foreground">
                Kayaks, fishing gear, and swimming area included. Perfect for families and adventure seekers.
              </p>
            </div>
          </div>
          
          <div className="text-center mt-12">
            <Link to="/lakehouse-getaway/guide">
              <Button variant="outline" size="lg" className="gap-2">
                <BookOpen className="h-4 w-4" />
                View Complete Guest Guide
              </Button>
            </Link>
          </div>
        </div>

        <AmenityDialog 
          amenity={selectedAmenity}
          isOpen={isDialogOpen}
          onClose={() => setIsDialogOpen(false)}
        />
      </div>
    </section>
  );
};

export default LakehouseAmenities;