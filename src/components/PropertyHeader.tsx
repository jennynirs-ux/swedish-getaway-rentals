import { Button } from "@/components/ui/button";
import { MapPin, Users, Calendar } from "lucide-react";

interface PropertyHeaderProps {
  title: string;
  taglineLine1: string;
  taglineLine2: string;
  location: string;
  maxGuests: number;
  availability: string;
  onBookStay: () => void;
  onViewGallery: () => void;
}

const PropertyHeader = ({
  title,
  taglineLine1,
  taglineLine2,
  location,
  maxGuests,
  availability,
  onBookStay,
  onViewGallery
}: PropertyHeaderProps) => {
  return (
    <div className="text-center py-16 bg-gradient-to-br from-primary/5 to-secondary/5">
      <div className="container mx-auto px-4">
        <h1 className="text-5xl lg:text-6xl font-bold mb-6">{title}</h1>
        
        <div className="max-w-2xl mx-auto mb-8">
          <p className="text-xl lg:text-2xl text-muted-foreground mb-2">{taglineLine1}</p>
          <p className="text-xl lg:text-2xl text-muted-foreground">{taglineLine2}</p>
        </div>

        <div className="flex flex-wrap justify-center gap-6 mb-8 text-lg">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" />
            <span>{location}</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            <span>Up to {maxGuests} guests</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            <span>{availability}</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button size="lg" onClick={onBookStay} className="text-lg px-8">
            Book Your Stay
          </Button>
          <Button variant="outline" size="lg" onClick={onViewGallery} className="text-lg px-8">
            View Gallery
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PropertyHeader;