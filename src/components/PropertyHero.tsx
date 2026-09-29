import { MapPin, Users, Calendar, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import LazyImage from "@/components/LazyImage";
import { Property } from "@/hooks/useProperties";
import { memo } from 'react';
import { PROPERTY_CONTENT } from "@/content/propertyContent";

interface PropertyHeroProps {
  property: Property;
}

const PropertyHero = memo(({ property }: PropertyHeroProps) => {
  const nickname = property.slug ? PROPERTY_CONTENT[property.slug]?.nickname : undefined;

  const scrollToBooking = () => {
    document.getElementById('booking-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Hero image: an <img> rather than a CSS background so phones get the 800 px copy */}
      <div className="absolute inset-0">
        <LazyImage
          src={property.hero_image_url || property.gallery_images?.[0] || undefined}
          alt={property.title}
          className="w-full h-full object-cover"
          priority={true}
        />
        <div className="absolute inset-0 bg-black/40"></div>
      </div>

      {/* Hero Content */}
      <div className="relative z-10 container mx-auto px-4 text-center text-white">
        <div className="max-w-4xl mx-auto">
          {/* Property Title */}
          {/* The cabin's name (Villa Häcken), with the listing title under it */}
          <h1 className="text-5xl md:text-7xl font-bold mb-3 leading-tight">
            {nickname ?? property.title}
          </h1>
          {nickname && (
            <p className="text-xl md:text-2xl text-white/90 mb-6">{property.title}</p>
          )}
          
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
            {/* No default: a made-up "year-round" was wrong for Lakehouse */}
            {property.availability_text && (
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                <span>{property.availability_text}</span>
              </div>
            )}
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
