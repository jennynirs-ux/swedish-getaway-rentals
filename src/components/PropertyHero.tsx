import { MapPin, Users, Calendar, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import LazyImage from "@/components/LazyImage";
import { Property } from "@/hooks/useProperties";
import { memo } from 'react';

interface PropertyHeroProps {
  property: Property;
}

const PropertyHero = memo(({ property }: PropertyHeroProps) => {
  const scrollToBooking = () => {
    document.getElementById('booking-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Hero Background Image - Use hero_image_url first */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url(${property.hero_image_url || property.gallery_images?.[0] || ''})`
        }}
      >
        <div className="absolute inset-0 bg-black/40"></div>
      </div>

      {/* Hero Content */}
      <div className="relative z-10 container mx-auto px-4 text-center text-white">
        <div className="max-w-4xl mx-auto">
          {/* Property Title */}
          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
            {property.title}
          </h1>
          
          {/* Tagline */}
          <div className="text-xl md:text-2xl mb-8 font-light leading-relaxed">
            <p>{property.tagline_line1 || 'Experience luxury in the heart of Swedish nature.'}</p>
            <p>{property.tagline_line2 || 'Your perfect escape awaits.'}</p>
          </div>

          {/* Quick Info */}
          <div className="flex flex-wrap items-center justify-center gap-6 mb-10 text-lg">
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              <span>{property.location}</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              <span>Up to {property.max_guests} guests</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              <span>{property.availability_text || 'Available year-round'}</span>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              className="text-lg px-8 py-6 bg-white text-primary hover:bg-white/90"
              onClick={scrollToBooking}
            >
              Book Your Stay
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
});

PropertyHero.displayName = 'PropertyHero';

export default PropertyHero;
