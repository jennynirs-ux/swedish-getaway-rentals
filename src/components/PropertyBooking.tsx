import { Property } from "@/hooks/useProperties";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import BookingForm from "./BookingForm";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { MessageCircle } from "lucide-react";
import { useState, lazy, Suspense } from "react";

// Lazy load chat component to improve initial page load
const BookingChat = lazy(() => import("./BookingChat").then(module => ({ default: module.BookingChat })));

interface PropertyBookingProps {
  property: Property;
  onOpenGuidebook?: (sectionId?: string) => void;
}

const PropertyBooking = ({ property, onOpenGuidebook }: PropertyBookingProps) => {
  const [showChat, setShowChat] = useState(false);
  
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

          {/* Cancellation Policy */}
          <div className="mb-6">
            <CancellationPolicyDisplay />
          </div>

          {/* Booking Form (includes calendar inside) */}
            <BookingForm
              propertyId={property.id}
              propertyTitle={property.title}
              pricePerNight={property.price_per_night}
              currency={property.currency}
              maxGuests={property.max_guests}
              onOpenGuidebook={onOpenGuidebook ? () => onOpenGuidebook("rules") : undefined}
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
                  
                  <div className="pt-4 border-t">
                    <Dialog open={showChat} onOpenChange={setShowChat}>
                      <DialogTrigger asChild>
                        <Button variant="outline" className="w-full">
                          <MessageCircle className="h-4 w-4 mr-2" />
                          Message Host
                        </Button>
                      </DialogTrigger>
                        <DialogContent className="max-w-4xl max-h-[90vh]">
                        <DialogHeader>
                          <DialogTitle>Contact Host</DialogTitle>
                        </DialogHeader>
                        <Suspense fallback={
                          <div className="flex justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                          </div>
                        }>
                          <div className="text-center py-8 text-muted-foreground">
                            <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>Chat is available after booking confirmation</p>
                            <p className="text-sm">You'll receive chat access details in your booking confirmation</p>
                          </div>
                        </Suspense>
                      </DialogContent>
                    </Dialog>
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
