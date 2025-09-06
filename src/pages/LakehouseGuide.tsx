import { ArrowLeft, Wifi, MapPin, Home, Phone, AlertCircle, Flame, TreePine, Car, Utensils } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const LakehouseGuide = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link to="/lakehouse-getaway">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Lakehouse Getaway
              </Button>
            </Link>
            <h1 className="text-2xl font-bold">Lakehouse Getaway - Guest Guide</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Welcome Section */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="text-2xl">Welcome to Your Stay – House & Nature Combined</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                We're so happy to have you here! Whether you're here to relax, explore nature, enjoy outdoor cooking 
                or simply recharge, this place is designed for just that – comfort, simplicity, and a touch of off-grid living.
              </p>
              <div className="space-y-2 mb-4 text-sm">
                <p>This guide will help you:</p>
                <ul className="list-disc list-inside text-muted-foreground space-y-1">
                  <li>Get familiar with the house and how things work</li>
                  <li>Find local tips and outdoor adventures</li>
                  <li>Use the fireplace and more</li>
                  <li>Know what to bring and how to leave the house</li>
                  <li>Understand our eco-friendly systems</li>
                </ul>
              </div>
              <p className="text-sm italic">
                Take a few minutes to browse through the sections – it'll make your stay smoother and even more enjoyable.
              </p>
            </CardContent>
          </Card>

          {/* Quick Access */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wifi className="h-5 w-5" />
                Quick Access Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-2">Wi-Fi Access</h4>
                  <p className="text-sm"><strong>Network:</strong> Villa Häcken_Guest</p>
                  <p className="text-sm"><strong>Password:</strong> Hacken78</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Emergency Contact</h4>
                  <p className="text-sm"><strong>Email:</strong> jolofsson87@gmail.com</p>
                  <p className="text-sm"><strong>Phone:</strong> +46 XX XXX XX XX</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Arriving */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Arriving
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h4 className="font-semibold mb-3">What to Bring - Essentials</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• Toothbrush & toothpaste</li>
                    <li>• Pyjamas and change of clothes</li>
                    <li>• Personal medication or must-haves</li>
                    <li>• Rain jacket and extra layer (Swedish weather is unpredictable)</li>
                    <li>• Extra pair of socks (no shoes indoors in Swedish homes)</li>
                    <li>• Good walking shoes or hiking boots</li>
                    <li>• Swimming gear for lake activities</li>
                  </ul>
                </div>
                <Separator />
                <div>
                  <h4 className="font-semibold mb-3">Nice to Have</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• A good book for quiet lakeside mornings</li>
                    <li>• Headlamp or flashlight (gets very dark at night)</li>
                    <li>• Snacks or special food items</li>
                    <li>• Fishing gear (fishing license required - fiskekort.se)</li>
                    <li>• Camera for stunning lake views</li>
                  </ul>
                </div>
                <Separator />
                <div>
                  <h4 className="font-semibold mb-3">Provided at the House</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• Toilet paper, hand soap, dish soap</li>
                    <li>• Basic spices: salt, pepper, olive oil</li>
                    <li>• Coffee beans</li>
                    <li>• Bed linens and towels</li>
                  </ul>
                </div>
                <Separator />
                <div>
                  <h4 className="font-semibold mb-3">Check-in & Parking</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    Check-in is after 4:00 PM (16:00). Free parking available at the property.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    We'll send detailed arrival instructions including access codes 24 hours before your stay.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* House Systems */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Home className="h-5 w-5" />
                  How Things Work
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h4 className="font-semibold mb-3">Sustainability & Energy</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• Powered by solar panels with smart heating system</li>
                    <li>• Heating adjusts automatically to outdoor temperature</li>
                    <li>• Please be mindful of energy usage on cloudy days</li>
                    <li>• Turn off lights and unplug unused appliances</li>
                  </ul>
                </div>
                <Separator />
                <div>
                  <h4 className="font-semibold mb-3">Kitchen & Appliances</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• Oven with specific heating instructions</li>
                    <li>• Water system for dishes and drinking</li>
                    <li>• Outdoor kitchen with gas stove available</li>
                    <li>• BBQ grill and cooking utensils provided</li>
                  </ul>
                </div>
                <Separator />
                <div>
                  <h4 className="font-semibold mb-3">Water & Waste Systems</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• Water supply from lake filtration system</li>
                    <li>• Separett composting toilet system</li>
                    <li>• Gray water system for dishwashing</li>
                    <li>• Recycling bins and compost bucket provided</li>
                  </ul>
                </div>
                <Separator />
                <div>
                  <h4 className="font-semibold mb-3">Safety & Heating</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• Wood-burning stove for heating</li>
                    <li>• LED lighting throughout</li>
                    <li>• Fire safety equipment available</li>
                    <li>• Extra blankets in bedroom closet</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Lake & Outdoor Activities */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TreePine className="h-5 w-5" />
                  Lake & Outdoor Activities
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h4 className="font-semibold mb-3">Lake Access</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• Private dock for swimming and fishing</li>
                    <li>• Kayak available for guest use</li>
                    <li>• Life jackets provided in various sizes</li>
                    <li>• Fishing equipment available on-site</li>
                  </ul>
                </div>
                <Separator />
                <div>
                  <h4 className="font-semibold mb-3">Outdoor Cooking & Fire</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• Fire pit for evening gatherings</li>
                    <li>• Firewood stored in shed</li>
                    <li>• Indoor fireplace for cozy evenings</li>
                    <li>• Kindling and fire starters provided</li>
                  </ul>
                </div>
                <Separator />
                <div>
                  <h4 className="font-semibold mb-3">Nature Activities</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• Lakeside trail circuit (2-3 hours)</li>
                    <li>• Forest mushroom and berry picking</li>
                    <li>• Bird watching from the dock</li>
                    <li>• Photography spots marked on property</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Local Adventures */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Local Adventures
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h4 className="font-semibold mb-3">Nearby Attractions</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• Traditional Swedish village - 15 minutes</li>
                    <li>• Local artisan workshops</li>
                    <li>• Historic wooden church</li>
                    <li>• Farmers market (weekends only)</li>
                  </ul>
                </div>
                <Separator />
                <div>
                  <h4 className="font-semibold mb-3">Seasonal Activities</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• Summer: Swimming, kayaking, midnight sun</li>
                    <li>• Autumn: Mushroom picking, northern lights</li>
                    <li>• Winter: Ice fishing, cross-country skiing</li>
                    <li>• Spring: Bird migration, wildflower blooms</li>
                  </ul>
                </div>
                <Separator />
                <div>
                  <h4 className="font-semibold mb-3">Shopping & Services</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• ICA Kvantum - grocery store nearby</li>
                    <li>• Local farm shop for fresh produce</li>
                    <li>• Gas station and firewood available</li>
                    <li>• Recycling station near ICA</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* First Time in Sweden */}
            <Card>
              <CardHeader>
                <CardTitle>First Time in Sweden?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h4 className="font-semibold mb-3">Cultural Tips</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• "Allemansrätten" - Freedom to roam in nature</li>
                    <li>• "Lagom" - The Swedish art of balance</li>
                    <li>• "Fika" - Coffee break culture (very important!)</li>
                    <li>• Swedes value personal space and quietness</li>
                    <li>• Remove shoes when entering homes</li>
                  </ul>
                </div>
                <Separator />
                <div>
                  <h4 className="font-semibold mb-3">Nature Etiquette</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• Leave no trace - pack out what you bring</li>
                    <li>• Don't disturb wildlife or nesting birds</li>
                    <li>• Fire only in designated areas</li>
                    <li>• Respect private property boundaries</li>
                  </ul>
                </div>
                <Separator />
                <div>
                  <h4 className="font-semibold mb-3">Practical Information</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• Currency: Swedish Krona (SEK)</li>
                    <li>• Cards accepted almost everywhere</li>
                    <li>• Emergency number: 112</li>
                    <li>• Most Swedes speak excellent English</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Check-out */}
            <Card>
              <CardHeader>
                <CardTitle>Check-out Guidelines</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h4 className="font-semibold mb-3">Before Departure</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• Check-out by 11:00 AM</li>
                    <li>• Strip beds and place linens in hamper</li>
                    <li>• Wash and put away all dishes</li>
                    <li>• Empty compost bucket into outdoor bin</li>
                  </ul>
                </div>
                <Separator />
                <div>
                  <h4 className="font-semibold mb-3">Sustainability Steps</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• Turn off all lights and equipment</li>
                    <li>• Close water valves</li>
                    <li>• Sort recycling properly</li>
                    <li>• Leave outdoor equipment clean and dry</li>
                  </ul>
                </div>
                <Separator />
                <div>
                  <h4 className="font-semibold mb-3">Final Steps</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• Ensure fire is completely extinguished</li>
                    <li>• Close and lock all windows and doors</li>
                    <li>• Return keys to lockbox</li>
                    <li>• Return borrowed items (kayak, life jackets)</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Special Message */}
          <Card className="mt-8 bg-gradient-to-r from-accent/5 to-primary/5 border-primary/20">
            <CardHeader>
              <CardTitle className="text-xl">A Note From Us</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-muted-foreground">
                  This is a place we care deeply about. It's built on simplicity, sustainability and space to breathe.
                </p>
                <p className="text-muted-foreground">
                  We ask that you treat the house and nature around it with the same love and respect we do.
                </p>
                <p className="font-medium">
                  Enjoy every moment. You're officially on slow time now.
                </p>
                <div className="mt-4 p-4 bg-background/80 rounded-lg border">
                  <p className="text-sm italic text-muted-foreground">
                    "What you see here is more than a house – it's a story told in wood, light, effort and love. 
                    Thank you for treating it with care."
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact Section */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5" />
                Need Assistance?
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                For any questions or assistance during your stay:
              </p>
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <h4 className="font-semibold">Email</h4>
                  <p className="text-sm text-muted-foreground">jolofsson87@gmail.com</p>
                </div>
                <div>
                  <h4 className="font-semibold">Phone</h4>
                  <p className="text-sm text-muted-foreground">+46 XX XXX XX XX</p>
                </div>
                <div>
                  <h4 className="font-semibold">Weather</h4>
                  <p className="text-sm text-muted-foreground">
                    <a 
                      href="https://www.smhi.se/vader/prognoser-och-varningar/vaderprognos/q/Lerum/Stora%20H%C3%A4rsj%C3%B6n/2673117" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      Local forecast
                    </a>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default LakehouseGuide;