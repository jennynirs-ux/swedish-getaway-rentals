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

  // ✅ Kalkylera antal nätter och totalpris live
  const nights =
    selectedCheckIn && selectedCheckOut
      ? Math.ceil(
          (selectedCheckOut.getTime() - selectedCheckIn.getTime()) /
            (1000 * 60 * 60 * 24)
        )
      : 0;

  const totalAmount = nights > 0 ? nights * (property.price_per_night || 0) : 0;

  return (
    <section id="booking-section" className="py-16 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">Book Your Stay</h2>
            <p className="text-xl text-muted-foreground">
              Ready to experience the magic of {property.title}? Select your
              dates and send a booking request.
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

              {/* ✅ Live summary */}
              {nights > 0 && (
                <div className="p-4 bg-accent rounded-lg shadow-sm">
                  <div className="flex justify-between mb-2">
                    <span>Check-in:</span>
                    <span className="font-medium">
                      {selectedCheckIn?.toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span>Check-out:</span>
                    <span className="font-medium">
                      {selectedCheckOut?.toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span>Number of nights:</span>
                    <span className="font-medium">{nights}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold border-t pt-2">
                    <span>Total:</span>
                    <span>
                      {totalAmount.toLocaleString()} {property.currency}
                    </span>
                  </div>
                </div>
              )}

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
