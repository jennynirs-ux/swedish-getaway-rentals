import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Mail, Phone, MessageCircle } from "lucide-react";

const LakehouseBooking = () => {
  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-foreground mb-4">
            Book Your Lakeside Retreat
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Ready to experience the magic of Swedish lakeside living? Send us your booking inquiry and we'll get back to you within 24 hours.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {/* Booking Form */}
          <div className="lg:col-span-2">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Calendar className="w-5 h-5 mr-2" />
                  Booking Inquiry
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="checkin">Check-in Date</Label>
                    <Input type="date" id="checkin" />
                  </div>
                  <div>
                    <Label htmlFor="checkout">Check-out Date</Label>
                    <Input type="date" id="checkout" />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="guests">Number of Guests (max 6)</Label>
                  <Input type="number" id="guests" min="1" max="6" placeholder="2" />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Full Name</Label>
                    <Input type="text" id="name" placeholder="Your name" />
                  </div>
                  <div>
                    <Label htmlFor="email">Email Address</Label>
                    <Input type="email" id="email" placeholder="your.email@example.com" />
                  </div>
                </div>

                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input type="tel" id="phone" placeholder="+46 XX XXX XX XX" />
                </div>

                <div>
                  <Label htmlFor="message">Special Requests or Questions</Label>
                  <Textarea 
                    id="message" 
                    rows={4} 
                    placeholder="Let us know about any special requirements, dietary restrictions, or questions you might have..."
                  />
                </div>

                <Button className="w-full" size="lg">
                  Request Availability
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Pricing & Contact Info */}
          <div className="space-y-6">
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