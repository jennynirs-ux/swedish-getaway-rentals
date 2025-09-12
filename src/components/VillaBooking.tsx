import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Phone, Euro, Wifi, TreePine, Flame, Waves, MessageSquare } from "lucide-react";
import BookingForm from "@/components/BookingForm";
import { useProperties } from "@/hooks/useProperties";
const VillaBooking = () => {
  const {
    properties
  } = useProperties();

  // Find Villa Hacken or use first property as fallback
  const villaProperty = properties.find(p => p.title.toLowerCase().includes('villa') || p.title.toLowerCase().includes('hacken')) || properties[0];
  if (!villaProperty) {
    return <div>Property not found</div>;
  }
  return <section className="villa-section bg-card">
      <div className="villa-container">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          {/* Booking Form */}
          <div>
            <h2 className="text-4xl md:text-5xl font-display font-bold mb-6">
              Book Your Stay
            </h2>
            <p className="text-xl text-muted-foreground mb-8">
              Ready to experience the magic of {villaProperty.title}? 
              Send an inquiry to check availability and pricing.
            </p>

            <BookingForm propertyId={villaProperty.id} propertyTitle={villaProperty.title} pricePerNight={villaProperty.price_per_night} currency={villaProperty.currency} maxGuests={villaProperty.max_guests} />
          </div>

          {/* Property Information & Contact */}
          <div className="space-y-8">
            {/* Property Features */}
            

            {/* Wi-Fi Information */}
            

            {/* What's Included */}
            

            {/* Pricing */}
            <Card className="shadow-soft-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Euro className="h-5 w-5" />
                  Pricing Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-3 border-b border-border">
                    <span className="font-medium">Off Season</span>
                    <span className="text-lg font-semibold">€450/night</span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-border">
                    <span className="font-medium">Peak Season</span>
                    <span className="text-lg font-semibold">€900/night</span>
                  </div>
                  <div className="flex justify-between items-center py-3">
                    <span className="font-medium">Holiday Periods</span>
                    <span className="text-lg font-semibold">€900/night</span>
                  </div>
                  <div className="mt-6 p-4 bg-accent rounded-lg">
                    <p className="text-sm text-accent-foreground">
                      <strong>Note:</strong> Minimum stay of 2 nights. 
                      Cleaning fee of €100 applies. Contact us for weekly discounts.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Contact Methods */}
            <Card className="shadow-soft-shadow">
              <CardHeader>
                <CardTitle>Get In Touch</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
                    <Mail className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <div>
                    <p className="font-semibold">Email</p>
                    <p className="text-muted-foreground">jolofsson87@gmail.se</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
                    <Phone className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <div>
                    <p className="font-semibold">Phone</p>
                    <p className="text-muted-foreground">+46 70 199 30 32</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
                    <MessageSquare className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <div>
                    <p className="font-semibold">WhatsApp</p>
                    <p className="text-muted-foreground">+46 70 199 30 32</p>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-success/10 border border-success/20 rounded-lg">
                  <p className="text-sm text-success">
                    <strong>Fast Response:</strong> We typically respond to inquiries within 2 hours during business hours.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>;
};
export default VillaBooking;