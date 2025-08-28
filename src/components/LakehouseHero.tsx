import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Users, Calendar, ChevronDown } from "lucide-react";
import lakehouseHeroImage from "@/assets/lakehouse-hero.jpg";

const LakehouseHero = () => {
  return (
    <section className="relative h-screen bg-cover bg-center bg-no-repeat" style={{ backgroundImage: `url(${lakehouseHeroImage})` }}>
      <div className="absolute inset-0 bg-black/40"></div>
      
      <div className="relative z-10 flex items-center justify-center h-full">
        <div className="text-center text-white px-4 max-w-4xl mx-auto">
          {/* Rating Badge */}
          <Badge className="mb-6 bg-white/20 text-white border-white/30 hover:bg-white/30">
            ⭐ 4.9 • Highly Rated
          </Badge>

          {/* Main Title */}
          <h1 className="text-5xl md:text-7xl font-bold mb-6 animate-fade-in">
            Lakehouse Getaway
          </h1>

          {/* Description */}
          <p className="text-xl md:text-2xl mb-8 text-white/90 animate-fade-in max-w-2xl mx-auto">
            Experience the tranquility of Swedish lakeside living in this charming wooden cabin. Wake up to pristine waters and forest views.
          </p>

          {/* Key Information */}
          <div className="flex flex-wrap justify-center gap-6 mb-8 text-white/90">
            <div className="flex items-center">
              <MapPin className="w-5 h-5 mr-2" />
              <span>Värmland, Sweden</span>
            </div>
            <div className="flex items-center">
              <Users className="w-5 h-5 mr-2" />
              <span>Up to 6 guests</span>
            </div>
            <div className="flex items-center">
              <Calendar className="w-5 h-5 mr-2" />
              <span>Available year-round</span>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="text-lg px-8 py-3">
              Book Your Stay
            </Button>
            <Button variant="outline" size="lg" className="text-lg px-8 py-3 border-white text-white hover:bg-white hover:text-primary">
              View Gallery
            </Button>
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 text-white animate-bounce">
        <ChevronDown className="w-6 h-6" />
      </div>
    </section>
  );
};

export default LakehouseHero;