import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CalendarDays, MessageSquare, Mail, Phone, Euro, Wifi, TreePine, Flame, Waves } from "lucide-react";
const VillaBooking = () => {
  return <section className="villa-section bg-card">
      <div className="villa-container">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          {/* Booking Form */}
          <div>
            <h2 className="text-4xl md:text-5xl font-display font-bold mb-6">
              Book Your Stay
            </h2>
            <p className="text-xl text-muted-foreground mb-8">
              Ready to experience the magic of Villa Hacken? 
              Get in touch to check availability and rates.
            </p>

            <Card className="shadow-soft-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarDays className="h-5 w-5" />
                  Reservation Inquiry
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="checkin">Check-in Date</Label>
                    <Input id="checkin" type="date" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="checkout">Check-out Date</Label>
                    <Input id="checkout" type="date" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="guests">Number of Guests</Label>
                  <Input id="guests" type="number" min="1" max="8" placeholder="2" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name">Your Name</Label>
                  <Input id="name" placeholder="Full Name" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input id="email" type="email" placeholder="your@email.com" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">Special Requests</Label>
                  <Input id="message" placeholder="Any special requirements or questions?" />
                </div>

                <Button className="w-full bg-primary hover:bg-primary-hover text-primary-foreground">
                  Request Availability
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Property Information & Contact */}
          <div className="space-y-8">
            {/* Property Features */}
            <Card className="shadow-soft-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TreePine className="h-5 w-5" />
                  Your Nature Retreat
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Experience comfort, simplicity, and a touch of off-grid living. This place is designed for relaxation, nature exploration, and outdoor cooking.
                </p>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <TreePine className="h-4 w-4 text-primary" />
                    <span className="text-sm">Solar powered & eco-friendly</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Waves className="h-4 w-4 text-primary" />
                    <span className="text-sm">Fresh well water</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Flame className="h-4 w-4 text-primary" />
                    <span className="text-sm">Pizza oven & hot tub</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Wifi className="h-4 w-4 text-primary" />
                    <span className="text-sm">Wi-Fi included</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Wi-Fi Information */}
            <Card className="shadow-soft-shadow">
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
            <Card className="shadow-soft-shadow">
              <CardHeader>
                <CardTitle>Your Complete Guide Includes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>🌲 House & nature orientation guide</p>
                  <p>🚶‍♀️ Local hiking tips & outdoor adventures</p>
                  <p>🔥 Fireplace, pizza oven & hot tub instructions</p>
                  <p>🧼 Check-in arrival & departure guidelines</p>
                  <p>💧 Eco-friendly systems information</p>
                  <p>🗺️ Local favorites - restaurants & attractions</p>
                  <p>🇸🇪 First time in Sweden? Cultural tips included</p>
                </div>
              </CardContent>
            </Card>

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
                    <p className="text-muted-foreground">villa@hacken.se</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
                    <Phone className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <div>
                    <p className="font-semibold">Phone</p>
                    <p className="text-muted-foreground">+46 70 123 4567</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
                    <MessageSquare className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <div>
                    <p className="font-semibold">WhatsApp</p>
                    <p className="text-muted-foreground">Quick responses</p>
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