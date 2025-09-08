import { Property } from "@/hooks/useProperties";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, MapPin, Users, Calendar, ChevronDown } from "lucide-react";

interface PropertyHeroProps {
  property?: Property;
}

const PropertyHero = ({ property }: PropertyHeroProps) => {
  return (
    <section 
      className="relative h-screen flex items-center justify-center bg-cover bg-center bg-no-repeat"
      style={{ 
        backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.4)), url(${property?.hero_image_url || '/placeholder.svg'})` 
      }}
    >
      <div className="villa-container text-center text-white z-10">
        <Badge className="bg-white/20 text-white border-white/30 mb-6 backdrop-blur-sm">
          <Star className="w-4 h-4 mr-2 fill-current" />
          Premium Property
        </Badge>
        
        <h1 className="text-5xl md:text-7xl font-display font-bold mb-6 leading-tight">
          {property?.title || "Luxury Retreat"}
        </h1>
        
        <p className="text-xl md:text-2xl mb-8 max-w-3xl mx-auto font-light leading-relaxed">
          {property?.description || "Experience luxury in perfect harmony with nature"}
        </p>
        
        <div className="flex flex-wrap justify-center gap-6 mb-12 text-lg">
          <div className="flex items-center bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full">
            <MapPin className="w-5 h-5 mr-2" />
            {property?.location || "Sverige"}
          </div>
          <div className="flex items-center bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full">
            <Users className="w-5 h-5 mr-2" />
            Up to {property?.max_guests || 8} guests
          </div>
          <div className="flex items-center bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full">
            <Calendar className="w-5 h-5 mr-2" />
            Available year-round
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-4 text-lg">
            Book Your Stay
          </Button>
          <Button 
            variant="outline" 
            size="lg" 
            className="border-white text-white hover:bg-white hover:text-primary px-8 py-4 text-lg backdrop-blur-sm"
            onClick={() => document.getElementById('property-gallery')?.scrollIntoView({ behavior: 'smooth' })}
          >
            View Gallery
          </Button>
        </div>
      </div>
      
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 text-white animate-bounce">
        <ChevronDown className="w-8 h-8" />
      </div>
    </section>
  );
};

export default PropertyHero;