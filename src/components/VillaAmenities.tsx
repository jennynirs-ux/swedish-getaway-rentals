import { useState } from "react";
import { Wifi, Car, Waves, TreePine, UtensilsCrossed, Flame, Users, Bed, Mountain, Sparkles, BookOpen } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { AmenityDialog } from "@/components/AmenityDialog";
const VillaAmenities = () => {
  const [selectedAmenity, setSelectedAmenity] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const amenities = [{
    icon: Bed,
    title: "3 Bedrooms",
    description: "3 spacious bedrooms plus 4 additional beds in the living room with forest and lake views",
    detailedDescription: "Villa Häcken features three beautifully appointed bedrooms plus 4 additional beds in the living room, each offering stunning views of the surrounding forest and lake. All rooms are furnished with high-quality linens, comfortable mattresses, and thoughtful amenities for a restful night's sleep.",
    features: ["Premium cotton bed linens", "Memory foam mattresses", "Forest and lake view windows", "Individual climate control", "Blackout curtains", "Reading lights", "4 additional beds in living room"]
  }, {
    icon: Users,
    title: "8 Guests",
    description: "Comfortably accommodates up to 8 guests",
    detailedDescription: "The villa is designed to comfortably accommodate up to 8 guests across four bedrooms and multiple living spaces. Perfect for families, groups of friends, or corporate retreats seeking a peaceful getaway.",
    features: ["4 bedrooms with various bed configurations", "Multiple bathrooms", "Spacious living areas", "Dining for 8 people", "Outdoor seating areas"]
  }, {
    icon: Waves,
    title: "Sauna & Hot Tub",
    description: "Traditional Finnish sauna and outdoor hot tub",
    detailedDescription: "Experience the authentic Swedish wellness tradition with our traditional wood-fired sauna and outdoor hot tub. Perfect for relaxation after a day of forest exploration or simply to unwind under the Nordic sky.",
    features: ["Traditional wood-fired sauna", "Outdoor hot tub with forest views", "Sauna accessories provided", "Changing area", "Outdoor shower", "Towels and robes included"]
  }, {
    icon: Flame,
    title: "Fireplace",
    description: "Cozy fireplace for those chilly Swedish evenings",
    detailedDescription: "The centerpiece of the living room is a beautiful stone fireplace that creates the perfect atmosphere for cozy evenings. Gather around with family and friends while enjoying the warmth and ambiance.",
    features: ["Natural stone fireplace", "Firewood provided", "Comfortable seating area", "Fire safety equipment", "Fireplace tools included"]
  }, {
    icon: UtensilsCrossed,
    title: "Full Kitchen",
    description: "Modern kitchen with premium appliances",
    detailedDescription: "The fully equipped modern kitchen features high-end appliances and everything you need to prepare delicious meals during your stay. From coffee makers to full cooking equipment, we've got you covered.",
    features: ["Premium appliances", "Full cookware and utensils", "Dishwasher", "Coffee machine", "Large refrigerator/freezer", "Dining area for 8", "Kitchen island with bar seating"]
  }, {
    icon: TreePine,
    title: "Forest Access",
    description: "Direct access to hiking trails and nature walks",
    detailedDescription: "Step directly from the villa into pristine Swedish forest with well-marked hiking trails. Explore the natural beauty, spot local wildlife, and enjoy the peace and tranquility of the Nordic wilderness.",
    features: ["Private forest trails", "Marked hiking paths", "Wildlife viewing opportunities", "Berry picking areas", "Mushroom foraging spots", "Trail maps provided"]
  }, {
    icon: Wifi,
    title: "High-Speed WiFi",
    description: "Stay connected with fast and reliable internet",
    detailedDescription: "Enjoy high-speed fiber internet throughout the villa, perfect for remote work, streaming, or staying in touch with family and friends. The connection is reliable and fast enough for video calls and streaming.",
    features: ["Fiber internet connection", "WiFi throughout the property", "Work-from-villa friendly", "Streaming capabilities", "Multiple device support"]
  }, {
    icon: Car,
    title: "Private Parking",
    description: "Secure parking for multiple vehicles",
    detailedDescription: "The villa offers secure, private parking for multiple vehicles. Whether you're arriving by car or renting one locally, you'll have convenient and safe parking right at the property.",
    features: ["Space for multiple cars", "Secure private area", "Easy property access", "EV charging available", "Covered parking option"]
  }];

  const handleAmenityClick = (amenity) => {
    setSelectedAmenity(amenity);
    setIsDialogOpen(true);
  };
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
          {amenities.map((amenity, index) => (
            <div 
              key={index} 
              className="villa-card text-center group cursor-pointer hover:scale-105 transition-all duration-300"
              onClick={() => handleAmenityClick(amenity)}
            >
              <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-xl mb-6 group-hover:bg-primary-hover transition-colors duration-300">
                <amenity.icon className="h-8 w-8 text-primary-foreground" />
              </div>
              
              <h3 className="text-xl font-display font-semibold mb-3">
                {amenity.title}
              </h3>
              
              <p className="text-muted-foreground leading-relaxed">
                {amenity.description}
              </p>
            </div>
          ))}
        </div>

        {/* Special Features */}
        <div className="mt-20 bg-gradient-dark rounded-2xl p-8 md:p-12 text-white">
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

        <AmenityDialog 
          amenity={selectedAmenity}
          isOpen={isDialogOpen}
          onClose={() => setIsDialogOpen(false)}
        />
      </div>
    </section>;
};
export default VillaAmenities;