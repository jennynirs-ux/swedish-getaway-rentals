import { useState } from "react";
import BookingForm from "./BookingForm";
import PropertyCalendarOptimized from "./PropertyCalendarOptimized";
import { Property } from "@/hooks/useProperties";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface PropertyBookingProps {
  property: Property;
}

const PropertyBooking = ({ property }: PropertyBookingProps) => {
  const [selectedCheckIn, setSelectedCheckIn] = useState<Date | null>(null);
  const [selectedCheckOut, setSelectedCheckOut] = useState<Date | null>(null);

  return (
    <section id="booking-section" className="py-16 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">Book Your Stay</h2>
            <p className="text-xl text-muted-foreground">
              Ready to experience the magic of {property.title}? Select your dates and send a booking request.
            </p>
          </div>

          {/* One single card with calendar + booking form */}
          <Card>
            <CardHeader>
              <CardTitle>
                {(property.price_per_night || 0).toLocaleString()} {property.currency} / night
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-8">
              {/* Calendar */}
              <PropertyCalendarOptimized
                propertyId={property.id}
                basePrice={property.price_per_night || 0}
                currency={property.currency}
                mode="guest"
                onDateSelect={(dates) => {
                  setSelectedCheckIn(dates.checkIn);
                  setSelectedCheckOut(dates.checkOut);
                }}
              />

              {/* Booking Form */}
              <BookingForm
                propertyId={property.id}
                propertyTitle={property.title}
                pricePerNight={property.price_per_night}
                currency={property.currency}
                maxGuests={property.max_guests}
                checkIn={selectedCheckIn}
                checkOut={selectedCheckOut}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default PropertyBooking;
