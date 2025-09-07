import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Phone, MessageCircle, Wifi, TreePine, Flame, Waves } from "lucide-react";
import BookingForm from "@/components/BookingForm";
import { useProperties } from "@/hooks/useProperties";

const LakehouseBooking = () => {
  const { properties } = useProperties();
  
  // Find Lakehouse or use property with lake in title/amenities
  const lakehouseProperty = properties.find(p => 
    p.title.toLowerCase().includes('lakehouse') || 
    p.title.toLowerCase().includes('lake') ||
    p.amenities?.some(a => a.toLowerCase().includes('lake'))
  ) || properties[1] || properties[0];

  if (!lakehouseProperty) {
    return <div>Property not found</div>;
  }

  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-foreground mb-4">
            Boka Din Retreat vid Sjön
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Redo att uppleva magin av svenskt liv vid sjön? Skicka din bokningsförfrågan så hör vi av oss inom 24 timmar.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {/* Booking Form */}
          <div className="lg:col-span-2">
            <BookingForm 
              propertyId={lakehouseProperty.id}
              propertyTitle={lakehouseProperty.title}
              pricePerNight={lakehouseProperty.price_per_night}
              currency={lakehouseProperty.currency}
              maxGuests={lakehouseProperty.max_guests}
            />
          </div>

          {/* Property Info & Pricing */}
          <div className="space-y-6">
            {/* Property Features */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TreePine className="h-5 w-5" />
                  Your Peaceful Escape
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Built on simplicity, sustainability and space to breathe. Experience tranquility and off-grid living.
                </p>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <TreePine className="h-4 w-4 text-primary" />
                    <span className="text-sm">Eco-friendly off-grid living</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Waves className="h-4 w-4 text-primary" />
                    <span className="text-sm">Direct lake access</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Flame className="h-4 w-4 text-primary" />
                    <span className="text-sm">Cozy fireplace</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Wi-Fi Information */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wifi className="h-5 w-5" />
                  Stay Connected
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-sm"><strong>Network:</strong> Villa Häcken_Guest</p>
                  <p className="text-sm"><strong>Password:</strong> Hacken78</p>
                </div>
              </CardContent>
            </Card>

            {/* What's Included */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>Your Complete Guide</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>🌲 House orientation & eco-systems guide</p>
                  <p>🚶‍♀️ Local hiking trails & adventures</p>
                  <p>🔥 Fireplace & heating instructions</p>
                  <p>🧼 Check-in & departure guidelines</p>
                  <p>💧 Sustainable living systems info</p>
                  <p>🗺️ Local recommendations & cultural tips</p>
                  <p>🇸🇪 First time in Sweden guide</p>
                </div>
                <div className="mt-4 p-3 bg-accent/10 rounded-lg">
                  <p className="text-xs italic text-muted-foreground">
                    "You're officially on slow time now. Treat this place with the same love and respect we do."
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Pricing Card */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>Pricing Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Spring/Fall (Apr-May, Sep-Oct)</span>
                    <span className="font-semibold">1,200 SEK/night</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Summer (Jun-Aug)</span>
                    <span className="font-semibold">1,500 SEK/night</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Winter (Nov-Mar)</span>
                    <span className="font-semibold">1,000 SEK/night</span>
                  </div>
                </div>
                
                <div className="pt-4 border-t border-border">
                  <p className="text-sm text-muted-foreground mb-2">
                    • Minimum stay: 2 nights
                  </p>
                  <p className="text-sm text-muted-foreground mb-2">
                    • Cleaning fee: 500 SEK
                  </p>
                  <p className="text-sm text-muted-foreground">
                    • Security deposit: 2,000 SEK (refundable)
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Contact Card */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-3">
                  <Mail className="w-5 h-5 text-primary" />
                  <div>
                    <p className="font-medium">Email</p>
                    <p className="text-sm text-muted-foreground">jolofsson87@gmail.com</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <Phone className="w-5 h-5 text-primary" />
                  <div>
                    <p className="font-medium">Phone</p>
                    <p className="text-sm text-muted-foreground">+46 XX XXX XX XX</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <MessageCircle className="w-5 h-5 text-primary" />
                  <div>
                    <p className="font-medium">WhatsApp</p>
                    <p className="text-sm text-muted-foreground">Available for quick questions</p>
                  </div>
                </div>
                
                <div className="pt-4 border-t border-border">
                  <p className="text-sm text-primary font-medium">
                    ⚡ Fast Response - Usually within 4 hours
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LakehouseBooking;