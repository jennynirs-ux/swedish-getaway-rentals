import { Waves, Fish, TreePine, Wifi, Car, Utensils, Flame, Bed, Mountain, Sailboat, BookOpen } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const amenities = [
  {
    icon: Waves,
    title: "Private Lake Access",
    description: "Direct access to crystal clear lake with private dock"
  },
  {
    icon: Fish,
    title: "Fishing Equipment",
    description: "Rods, tackle, and local fishing guides available"
  },
  {
    icon: TreePine,
    title: "Forest Surroundings",
    description: "Peaceful pine forest with hiking trails"
  },
  {
    icon: Wifi,
    title: "High-Speed WiFi",
    description: "Stay connected with reliable internet access"
  },
  {
    icon: Car,
    title: "Free Parking",
    description: "Secure parking space for your vehicle"
  },
  {
    icon: Utensils,
    title: "Full Kitchen",
    description: "Modern kitchen with all cooking essentials"
  },
  {
    icon: Flame,
    title: "Outdoor Fire Pit",
    description: "Cozy evenings around the campfire"
  },
  {
    icon: Bed,
    title: "Comfortable Bedding",
    description: "High-quality linens and comfortable mattresses"
  }
];

const LakehouseAmenities = () => {
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
              <div key={index} className="text-center p-6 rounded-lg bg-card shadow-sm hover:shadow-md transition-all duration-300 hover-scale">
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
      </div>
    </section>
  );
};

export default LakehouseAmenities;