import { Property } from "@/hooks/useProperties";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import BookingForm from "./BookingForm";

interface PropertyBookingProps {
  property: Property;
}

const PropertyBooking = ({ property }: PropertyBookingProps) => {
  return (
    <section id="booking-section" className="py-16 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">Book Your Stay</h2>
            <p className="text-xl text-muted-foreground">
              Ready to experience the magic of {property.title}? Choose your
              dates and complete your booking below.
            </p>
          </div>

          {/* Booking Form (includes calendar inside) */}
            <BookingForm
              propertyId={property.id}
              propertyTitle={property.title}
              pricePerNight={property.price_per_night}
              currency={property.currency}
              maxGuests={property.max_guests}
            />

          {/* Contact Information */}
          {property.get_in_touch_info && (
            <div className="mt-8 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Get In Touch</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {property.get_in_touch_info.contact_email && (
                    <div>
                      <span className="font-medium">Email:</span>
                      <p className="text-muted-foreground">
                        {property.get_in_touch_info.contact_email}
                      </p>
                    </div>
                  )}
                  {property.get_in_touch_info.contact_phone && (
                    <div>
                      <span className="font-medium">Phone:</span>
                      <p className="text-muted-foreground">
                        {property.get_in_touch_info.contact_phone}
                      </p>
                    </div>
                  )}
                  <div className="pt-2 border-t">
                    <p className="text-sm text-brown-600 font-medium">
                      Fast Response:{" "}
                      {property.contact_response_time ||
                        "We typically respond to inquiries within 2 hours."}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default PropertyBooking;
