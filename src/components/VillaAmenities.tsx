import { Wifi, Car, Waves, TreePine, UtensilsCrossed, Flame, Users, Bed, Mountain, Sparkles, BookOpen } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
const VillaAmenities = () => {
  const amenities = [{
    icon: Bed,
    title: "4 Bedrooms",
    description: "Spacious bedrooms with premium linens and forest views"
  }, {
    icon: Users,
    title: "8 Guests",
    description: "Comfortably accommodates up to 8 guests"
  }, {
    icon: Waves,
    title: "Sauna & Hot Tub",
    description: "Traditional Finnish sauna and outdoor hot tub"
  }, {
    icon: Flame,
    title: "Fireplace",
    description: "Cozy fireplace for those chilly Swedish evenings"
  }, {
    icon: UtensilsCrossed,
    title: "Full Kitchen",
    description: "Modern kitchen with premium appliances"
  }, {
    icon: TreePine,
    title: "Forest Access",
    description: "Direct access to hiking trails and nature walks"
  }, {
    icon: Wifi,
    title: "High-Speed WiFi",
    description: "Stay connected with fast and reliable internet"
  }, {
    icon: Car,
    title: "Private Parking",
    description: "Secure parking for multiple vehicles"
  }];
  return <section className="villa-section">
      <div className="villa-container">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-display font-bold mb-6">
            Premium Amenities
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Everything you need for an unforgettable stay, from modern conveniences 
            to unique experiences that celebrate Swedish culture.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {amenities.map((amenity, index) => <div key={index} className="villa-card text-center group">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-xl mb-6 group-hover:bg-primary-hover transition-colors duration-300">
                <amenity.icon className="h-8 w-8 text-primary-foreground" />
              </div>
              
              <h3 className="text-xl font-display font-semibold mb-3">
                {amenity.title}
              </h3>
              
              <p className="text-muted-foreground leading-relaxed">
                {amenity.description}
              </p>
            </div>)}
        </div>

        {/* Special Features */}
        <div className="mt-20 bg-warm-gradient rounded-2xl p-8 md:p-12 text-white">
          <div className="text-center">
            <h3 className="text-3xl font-display font-bold mb-6">What Makes Villa Häcken Special</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-8">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-xl mb-4 hover:bg-white/30 transition-all duration-300 hover:scale-105">
                  <Mountain className="h-8 w-8 text-white" />
                </div>
                <h4 className="text-xl font-semibold mb-2">Nature Immersion</h4>
                <p className="text-white/90">
                  Surrounded by pristine forest with private hiking trails
                </p>
              </div>
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-xl mb-4 hover:bg-white/30 transition-all duration-300 hover:scale-105">
                  <Flame className="h-8 w-8 text-white" />
                </div>
                <h4 className="text-xl font-semibold mb-2">Authentic Swedish</h4>
                <p className="text-white/90">Traditional hot tub experience with lake access</p>
              </div>
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-xl mb-4 hover:bg-white/30 transition-all duration-300 hover:scale-105">
                  <Sparkles className="h-8 w-8 text-white" />
                </div>
                <h4 className="text-xl font-semibold mb-2">Luxury Comfort</h4>
                <p className="text-white/90">
                  Modern amenities in a stunning natural setting
                </p>
              </div>
            </div>
            
            <div className="text-center mt-8">
              <Link to="/villa-hacken/guide">
                <Button className="bg-white/20 hover:bg-white/30 text-white border border-white/30 hover:border-white/40 transition-all duration-300">
                  <BookOpen className="h-4 w-4 mr-2" />
                  View Complete Guest Guide
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>;
};
export default VillaAmenities;