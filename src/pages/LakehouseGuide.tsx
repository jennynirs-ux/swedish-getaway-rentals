import { ArrowLeft, Wifi, MapPin, Car, Utensils, Flame, TreePine, Home, Phone } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

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
              <CardTitle className="text-2xl">🏡 Welcome to Your Stay – House & Nature Combined</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                We're so happy to have you here! Whether you're here to relax, explore nature, enjoy outdoor cooking 
                or simply recharge, this place is designed for just that – comfort, simplicity, and a touch of off-grid living.
              </p>
              <div className="space-y-2 mb-4 text-sm">
                <p>This guide will help you:</p>
                <ul className="list-disc list-inside text-muted-foreground space-y-1">
                  <li>🌲 Get familiar with the house and how things work</li>
                  <li>🚶‍♀️ Find local tips and outdoor adventures</li>
                  <li>🔥 Use the fireplace and more</li>
                  <li>🧼 Know what to bring and how to leave the house</li>
                  <li>💧 Understand our eco-friendly systems</li>
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
              <div className="grid md:grid-cols-2 gap-4">
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
                  Arriving at the Lakehouse
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">What to Bring</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• Personal toiletries and medications</li>
                    <li>• Comfortable outdoor and hiking gear</li>
                    <li>• Swimwear for lake activities</li>
                    <li>• Your favorite coffee/tea and snacks</li>
                    <li>• Camera for stunning lake views</li>
                    <li>• Warm clothes (Swedish weather can change)</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Directions & Parking</h4>
                  <p className="text-sm text-muted-foreground">
                    Free parking available at the property. Follow the lakeside road to the designated parking area. 
                    Detailed GPS coordinates will be provided before arrival.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Check-in Process</h4>
                  <p className="text-sm text-muted-foreground">
                    Check-in is after 3:00 PM. We'll send you detailed arrival instructions including access codes 
                    and a welcome package location 24 hours before your stay.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* House Guide */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Home className="h-5 w-5" />
                  How Things Work
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Eco-Friendly Systems</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• Off-grid living with sustainable power</li>
                    <li>• Rainwater collection and filtration</li>
                    <li>• Composting toilet system</li>
                    <li>• Solar heating for water</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Heating & Lighting</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• Wood-burning stove for heating</li>
                    <li>• LED lighting throughout</li>
                    <li>• Candles provided for ambiance</li>
                    <li>• Extra blankets in bedroom closet</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Water & Waste</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• Drinking water from lake filtration</li>
                    <li>• Gray water system for dishwashing</li>
                    <li>• Recycling bins provided</li>
                    <li>• Compost bucket for organic waste</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Lake Activities */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TreePine className="h-5 w-5" />
                  Lake & Outdoor Activities
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Lake Access</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• Private dock for swimming and fishing</li>
                    <li>• Kayak available for guest use</li>
                    <li>• Life jackets provided in various sizes</li>
                    <li>• Fishing equipment available</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Outdoor Cooking</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• Outdoor kitchen with gas stove</li>
                    <li>• BBQ grill and utensils</li>
                    <li>• Fire pit for evening gatherings</li>
                    <li>• Firewood stored in shed</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Fireplace Instructions</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• Indoor fireplace for cozy evenings</li>
                    <li>• Dry firewood available outside</li>
                    <li>• Kindling and fire starters provided</li>
                    <li>• Always ensure fire is completely out</li>
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
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Hiking & Nature</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• Lakeside trail circuit (2-3 hours)</li>
                    <li>• Forest mushroom and berry picking</li>
                    <li>• Bird watching from the dock</li>
                    <li>• Photography spots marked on property map</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Nearby Attractions</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• Traditional Swedish village - 15 minutes</li>
                    <li>• Local artisan workshops</li>
                    <li>• Historic wooden church</li>
                    <li>• Farmers market (weekends only)</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Seasonal Activities</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• Summer: Swimming, kayaking, midnight sun</li>
                    <li>• Autumn: Mushroom picking, northern lights</li>
                    <li>• Winter: Ice fishing, cross-country skiing</li>
                    <li>• Spring: Bird migration, wildflower blooms</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* First Time in Sweden */}
            <Card>
              <CardHeader>
                <CardTitle>🇸🇪 First Time in Sweden?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Cultural Tips</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• "Allemansrätten" - Freedom to roam in nature</li>
                    <li>• "Lagom" - The Swedish art of balance</li>
                    <li>• "Fika" - Coffee break culture (very important!)</li>
                    <li>• Swedes value personal space and quietness</li>
                    <li>• Remove shoes when entering homes</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Nature Etiquette</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• Leave no trace - pack out what you bring</li>
                    <li>• Don't disturb wildlife or nesting birds</li>
                    <li>• Fire only in designated areas</li>
                    <li>• Respect private property boundaries</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Practical Information</h4>
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
                <CardTitle>🧼 Check-out Guidelines</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Before Departure</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• Check-out by 11:00 AM</li>
                    <li>• Strip beds and place linens in hamper</li>
                    <li>• Wash and put away all dishes</li>
                    <li>• Empty compost bucket into outdoor bin</li>
                    <li>• Ensure fire is completely extinguished</li>
                    <li>• Close and lock all windows and doors</li>
                    <li>• Return keys to lockbox</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Sustainability</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• Turn off all lights and equipment</li>
                    <li>• Close water valves</li>
                    <li>• Sort recycling properly</li>
                    <li>• Leave outdoor equipment clean and dry</li>
                  </ul>
                </div>
                <div className="mt-4 p-4 bg-accent/10 rounded-lg">
                  <p className="text-sm italic text-muted-foreground">
                    "Thank you for respecting our little piece of paradise. We hope the lakehouse has given you 
                    the peace and connection with nature that it gives us."
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Special Message */}
          <Card className="mt-8 bg-gradient-to-r from-accent/5 to-primary/5 border-primary/20">
            <CardHeader>
              <CardTitle className="text-xl">💛 A Note From Us</CardTitle>
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