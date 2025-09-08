import { Property } from "@/hooks/useProperties";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Users, Star, MapPin } from "lucide-react";

interface PropertyBookingProps {
  property?: Property;
}

const PropertyBooking = ({ property }: PropertyBookingProps) => {
  return (
    <section className="villa-section bg-card">
      <div className="villa-container">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="text-4xl md:text-5xl font-display font-bold mb-6">
              Book Your Perfect Getaway
            </h2>
            <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
              Experience luxury and tranquility at {property?.title || "this stunning property"}. 
              Reserve your dates now for an unforgettable escape.
            </p>
            
            <div className="space-y-4 mb-8">
              <div className="flex items-center text-lg">
                <Calendar className="w-6 h-6 mr-4 text-primary" />
                <span>Flexible check-in and check-out</span>
              </div>
              <div className="flex items-center text-lg">
                <Users className="w-6 h-6 mr-4 text-primary" />
                <span>Perfect for up to {property?.max_guests || 8} guests</span>
              </div>
              <div className="flex items-center text-lg">
                <Star className="w-6 h-6 mr-4 text-primary" />
                <span>5-star rated property</span>
              </div>
              <div className="flex items-center text-lg">
                <MapPin className="w-6 h-6 mr-4 text-primary" />
                <span>{property?.location || "Prime location in Sweden"}</span>
              </div>
            </div>
          </div>
          
          <Card className="shadow-2xl">
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-2xl font-display">
                Reserve Now
              </CardTitle>
              <div className="text-3xl font-bold text-primary">
                {property?.price_per_night?.toLocaleString() || "2,500"} {property?.currency || "SEK"}
                <span className="text-lg font-normal text-muted-foreground ml-2">/night</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">Check-in</label>
                  <div className="p-3 border rounded-lg bg-muted/30 text-center">
                    <Calendar className="w-4 h-4 mx-auto mb-1" />
                    <span className="text-sm">Select date</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">Check-out</label>
                  <div className="p-3 border rounded-lg bg-muted/30 text-center">
                    <Calendar className="w-4 h-4 mx-auto mb-1" />
                    <span className="text-sm">Select date</span>
                  </div>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-semibold mb-2">Guests</label>
                <div className="p-3 border rounded-lg bg-muted/30 text-center">
                  <Users className="w-4 h-4 mx-auto mb-1" />
                  <span className="text-sm">Select guests</span>
                </div>
              </div>
              
              <Button size="lg" className="w-full text-lg py-6">
                Check Availability
              </Button>
              
              <p className="text-xs text-muted-foreground text-center">
                No charges until confirmation
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default PropertyBooking;