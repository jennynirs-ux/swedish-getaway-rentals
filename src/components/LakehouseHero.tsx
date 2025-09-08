import { Button } from "@/components/ui/button";
import { CalendarDays, MapPin, Users, Star, ChevronDown } from "lucide-react";
import lakehouseHeroImage from "@/assets/lakehouse-hero.jpg";
import { Property } from "@/hooks/useProperties";

interface LakehouseHeroProps {
  property?: Property;
}

const LakehouseHero = ({ property }: LakehouseHeroProps) => {
  const title = property?.title || "Lakehouse Getaway";
  const description = property?.description || "Experience the tranquility of Swedish lakeside living in this charming wooden cabin. Wake up to pristine waters and forest views.";
  const location = property?.location || "Lerum, Sweden";
  const maxGuests = property?.max_guests || 4;

  return <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0 bg-cover bg-center bg-no-repeat" style={{
      backgroundImage: `url(${property?.hero_image_url || lakehouseHeroImage})`
    }}>
        <div className="absolute inset-0 bg-black/40"></div>
      </div>

      {/* Hero Content */}
      <div className="relative z-10 villa-container text-center text-white">
        <div className="max-w-4xl mx-auto">
          {/* Rating */}
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />)}
            </div>
            <span className="text-lg font-medium">5.0 • Highly Rated</span>
          </div>

          {/* Main Heading */}
          <h1 className="text-5xl md:text-7xl font-display font-bold mb-6 leading-tight">{title}</h1>
          
          <p className="text-xl md:text-2xl mb-8 font-light leading-relaxed">
            {description}
          </p>

          {/* Quick Info */}
          <div className="flex flex-wrap items-center justify-center gap-6 mb-10 text-lg">
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              <span>{location}</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              <span>Up to {maxGuests} guests</span>
            </div>
            <div className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5" />
              <span>Available year-round</span>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" variant="default" className="text-lg px-8 py-6 bg-white text-primary hover:bg-white/90">
              Book Your Stay
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="text-lg px-8 py-6 border-white text-white hover:bg-white hover:text-primary"
              onClick={() => document.getElementById('lakehouse-gallery')?.scrollIntoView({ behavior: 'smooth' })}
            >
              View Gallery
            </Button>
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 text-white animate-bounce">
        <ChevronDown className="w-6 h-6" />
      </div>
    </section>;
};
export default LakehouseHero;