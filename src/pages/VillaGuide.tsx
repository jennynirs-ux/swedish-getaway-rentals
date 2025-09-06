import { ArrowLeft, Wifi, MapPin, Home, Phone, AlertCircle, Flame, TreePine, Car, Utensils, HelpCircle, CheckCircle, Clock, Users, Coffee, Waves, Mountain, Sun, Moon } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useState } from "react";

const VillaGuide = () => {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link to="/villa-hacken">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Villa Häcken
              </Button>
            </Link>
            <h1 className="text-2xl font-bold">Villa Häcken - Guest Guide</h1>
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
                  <li>Use the fireplace, pizza oven, hot tub and more</li>
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
                  <p className="text-sm"><strong>Phone:</strong> +46 70 123 4567</p>
                  <p className="text-sm"><strong>Email:</strong> villa@hacken.se</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Interactive Guide Sections */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {[
              { 
                icon: MapPin, 
                title: "Arriving", 
                description: "Everything you need for a smooth arrival",
                color: "text-blue-600",
                section: "arriving"
              },
              { 
                icon: Home, 
                title: "House Systems", 
                description: "How our eco-friendly systems work",
                color: "text-green-600",
                section: "systems"
              },
              { 
                icon: Flame, 
                title: "Outdoor Features", 
                description: "Pizza oven, hot tub, and fireplace",
                color: "text-orange-600",
                section: "outdoor"
              },
              { 
                icon: TreePine, 
                title: "Local Adventures", 
                description: "Hiking, dining, and nature activities",
                color: "text-emerald-600",
                section: "local"
              },
              { 
                icon: Users, 
                title: "Swedish Culture", 
                description: "Tips for first-time visitors",
                color: "text-yellow-600",
                section: "culture"
              },
              { 
                icon: CheckCircle, 
                title: "Check-out", 
                description: "Simple steps before departure",
                color: "text-purple-600",
                section: "checkout"
              }
            ].map((item, index) => (
              <Card 
                key={index} 
                className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105"
                onClick={() => toggleSection(item.section)}
              >
                <CardHeader className="text-center pb-2">
                  <item.icon className={`h-12 w-12 mx-auto mb-2 ${item.color}`} />
                  <CardTitle className="text-lg">{item.title}</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-sm text-muted-foreground text-center">
                    {item.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Detailed Sections */}
          <div className="space-y-8">
            {/* Arriving */}
            {(expandedSection === "arriving" || expandedSection === null) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-blue-600" />
                    Arriving
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <Coffee className="h-4 w-4" />
                      What to Bring - Essentials
                    </h4>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>• Toothbrush & toothpaste</li>
                      <li>• Pyjamas and change of clothes</li>
                      <li>• Personal medication or must-haves</li>
                      <li>• Rain jacket and extra layer (Swedish weather is unpredictable)</li>
                      <li>• Extra pair of socks (no shoes indoors in Swedish homes)</li>
                      <li>• Good walking shoes or hiking boots</li>
                      <li>• Swimming gear for the lake</li>
                    </ul>
                  </div>
                  <Separator />
                  <div>
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <Sun className="h-4 w-4" />
                      Nice to Have
                    </h4>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>• A good book for quiet forest mornings</li>
                      <li>• Headlamp or flashlight (gets very dark at night)</li>
                      <li>• Snacks or special food items</li>
                      <li>• Fishing gear (fishing license required - fiskekort.se)</li>
                    </ul>
                  </div>
                  <Separator />
                  <div>
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <CheckCircle className="h-4 w-4" />
                      Provided at the House
                    </h4>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>• Toilet paper, hand soap, dish soap</li>
                      <li>• Basic spices: salt, pepper, olive oil</li>
                      <li>• Coffee beans</li>
                      <li>• Bed linens and towels</li>
                    </ul>
                  </div>
                  <Separator />
                  <div>
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Check-in & Parking
                    </h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      Check-in is after 3:00 PM. Free parking available directly at the property.
                    </p>
                    <p className="text-sm text-muted-foreground">
                      We'll provide detailed arrival instructions with door codes via email before your stay.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* House Systems */}
            {(expandedSection === "systems" || expandedSection === null) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Home className="h-5 w-5 text-green-600" />
                    How Things Work
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <Sun className="h-4 w-4" />
                      Sustainability & Energy
                    </h4>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>• Powered by solar panels with grid backup</li>
                      <li>• Smart heating adjusts automatically to outdoor temperature</li>
                      <li>• Fresh drinking water from our well</li>
                      <li>• Please be mindful of energy usage on cloudy days</li>
                    </ul>
                  </div>
                  <Separator />
                  <div>
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <Coffee className="h-4 w-4" />
                      Smart Features
                    </h4>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>• Control lights via switches or "Hey Google"</li>
                      <li>• Bean-to-cup espresso machine in kitchen</li>
                      <li>• Microwave/oven combo unit</li>
                      <li>• Dishwasher (no frying pans or wooden tools)</li>
                    </ul>
                  </div>
                  <Separator />
                  <div>
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <Mountain className="h-4 w-4" />
                      Heritage & Character
                    </h4>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>• Many furnishings are restored heritage pieces</li>
                      <li>• Preserved to honor the history of our ancestors</li>
                      <li>• Exterior panel treatment dates back 1000 years</li>
                      <li>• Connected to rich Scandinavian heritage</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Outdoor Features */}
            {(expandedSection === "outdoor" || expandedSection === null) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Flame className="h-5 w-5 text-orange-600" />
                    Outdoor Features
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <Utensils className="h-4 w-4" />
                      Pizza Oven
                    </h4>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>• Wood-fired Neapolitan pizza oven</li>
                      <li>• Firewood provided in storage area</li>
                      <li>• Allow 45-60 minutes for proper heating</li>
                      <li>• Pizza stones and tools available</li>
                    </ul>
                  </div>
                  <Separator />
                  <div>
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <Waves className="h-4 w-4" />
                      Hot Tub
                    </h4>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>• Available year-round</li>
                      <li>• Instructions posted beside the tub</li>
                      <li>• Please rinse before entering</li>
                      <li>• Cover after use to maintain temperature</li>
                    </ul>
                  </div>
                  <Separator />
                  <div>
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <Flame className="h-4 w-4" />
                      Indoor Fireplace
                    </h4>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>• Cozy fireplace for evening warmth</li>
                      <li>• Dry firewood stored nearby</li>
                      <li>• Fire starter and matches provided</li>
                      <li>• Always close damper when not in use</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Local Favorites */}
            {(expandedSection === "local" || expandedSection === null) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TreePine className="h-5 w-5 text-emerald-600" />
                    Local Favorites
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <Mountain className="h-4 w-4" />
                      Hiking & Nature
                    </h4>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>• Forest trails directly from the property</li>
                      <li>• Lake Härssjön - 15 minutes walk</li>
                      <li>• Delsjöområdet nature reserve - 20 minutes drive</li>
                      <li>• Marked hiking trails with varying difficulty</li>
                    </ul>
                  </div>
                  <Separator />
                  <div>
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <Car className="h-4 w-4" />
                      Shopping & Dining
                    </h4>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>• ICA Kvantum - 7 km away (grocery store)</li>
                      <li>• Local farm shop for fresh produce</li>
                      <li>• Lerum town center - restaurants & cafes</li>
                      <li>• Gothenburg city center - 30 minutes drive</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* First Time in Sweden */}
            {(expandedSection === "culture" || expandedSection === null) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-yellow-600" />
                    First Time in Sweden?
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h4 className="font-semibold mb-3">Cultural Tips</h4>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>• "Allemansrätten" - Right to roam freely in nature</li>
                      <li>• Remove shoes when entering homes</li>
                      <li>• Most Swedes speak excellent English</li>
                      <li>• Tipping is not expected but appreciated</li>
                    </ul>
                  </div>
                  <Separator />
                  <div>
                    <h4 className="font-semibold mb-3">Practical Information</h4>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>• Sweden uses SEK (Swedish Krona)</li>
                      <li>• Card payments accepted everywhere</li>
                      <li>• 220V electrical outlets (European plug)</li>
                      <li>• Emergency number: 112</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Check-out */}
            {(expandedSection === "checkout" || expandedSection === null) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-purple-600" />
                    Check-out Guidelines
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      General Areas
                    </h4>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>• Check-out by 11:00 AM</li>
                      <li>• Put furniture back in original place</li>
                      <li>• Empty all trash bins</li>
                      <li>• Take waste to recycling station near ICA Kvantum</li>
                    </ul>
                  </div>
                  <Separator />
                  <div>
                    <h4 className="font-semibold mb-3">Final Steps</h4>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>• Load and start dishwasher</li>
                      <li>• Strip beds and place linens on laundry room floor</li>
                      <li>• Close all windows and turn off lights</li>
                      <li>• Return borrowed items and lock all doors</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            )}
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
                Need Help?
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                If you have any questions during your stay, don't hesitate to reach out:
              </p>
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <h4 className="font-semibold">Email</h4>
                  <p className="text-sm text-muted-foreground">villa@hacken.se</p>
                </div>
                <div>
                  <h4 className="font-semibold">Phone</h4>
                  <p className="text-sm text-muted-foreground">+46 70 123 4567</p>
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

export default VillaGuide;