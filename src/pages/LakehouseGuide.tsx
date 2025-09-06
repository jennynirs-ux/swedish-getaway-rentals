import { ArrowLeft, Wifi, MapPin, Home, Phone, AlertCircle, Flame, TreePine, Car, Utensils, CheckCircle, Clock, Users, Coffee, Waves, Mountain, Sun, Moon } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useState } from "react";

const LakehouseGuide = () => {
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
                description: "How our off-grid systems work",
                color: "text-green-600",
                section: "systems"
              },
              { 
                icon: Waves, 
                title: "Lake Activities", 
                description: "Dock, kayak, fishing, and more",
                color: "text-cyan-600",
                section: "lake"
              },
              { 
                icon: TreePine, 
                title: "Local Adventures", 
                description: "Nature trails and attractions",
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
                      <li>• Swimming gear for lake activities</li>
                    </ul>
                  </div>
                  <Separator />
                  <div>
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <Sun className="h-4 w-4" />
                      Nice to Have
                    </h4>
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
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Check-in & Parking
                    </h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      Check-in is after 4:00 PM (16:00). Free parking available at the property.
                    </p>
                    <p className="text-sm text-muted-foreground">
                      We'll send detailed arrival instructions including access codes 24 hours before your stay.
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
                      <li>• Powered by solar panels with smart heating system</li>
                      <li>• Heating adjusts automatically to outdoor temperature</li>
                      <li>• Please be mindful of energy usage on cloudy days</li>
                      <li>• Turn off lights and unplug unused appliances</li>
                    </ul>
                  </div>
                  <Separator />
                  <div>
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <Utensils className="h-4 w-4" />
                      Kitchen & Appliances
                    </h4>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>• Oven with specific heating instructions</li>
                      <li>• Water system for dishes and drinking</li>
                      <li>• Outdoor kitchen with gas stove available</li>
                      <li>• BBQ grill and cooking utensils provided</li>
                    </ul>
                  </div>
                  <Separator />
                  <div>
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <Waves className="h-4 w-4" />
                      Water & Waste Systems
                    </h4>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>• Water supply from lake filtration system</li>
                      <li>• Separett composting toilet system</li>
                      <li>• Gray water system for dishwashing</li>
                      <li>• Recycling bins and compost bucket provided</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Lake & Outdoor Activities */}
            {(expandedSection === "lake" || expandedSection === null) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Waves className="h-5 w-5 text-cyan-600" />
                    Lake & Outdoor Activities
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <Waves className="h-4 w-4" />
                      Lake Access
                    </h4>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>• Private dock for swimming and fishing</li>
                      <li>• Kayak available for guest use</li>
                      <li>• Life jackets provided in various sizes</li>
                      <li>• Fishing equipment available on-site</li>
                    </ul>
                  </div>
                  <Separator />
                  <div>
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <Flame className="h-4 w-4" />
                      Outdoor Cooking & Fire
                    </h4>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>• Fire pit for evening gatherings</li>
                      <li>• Firewood stored in shed</li>
                      <li>• Indoor fireplace for cozy evenings</li>
                      <li>• Kindling and fire starters provided</li>
                    </ul>
                  </div>
                  <Separator />
                  <div>
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <TreePine className="h-4 w-4" />
                      Nature Activities
                    </h4>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>• Lakeside trail circuit (2-3 hours)</li>
                      <li>• Forest mushroom and berry picking</li>
                      <li>• Bird watching from the dock</li>
                      <li>• Photography spots marked on property</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Local Adventures */}
            {(expandedSection === "local" || expandedSection === null) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TreePine className="h-5 w-5 text-emerald-600" />
                    Local Adventures
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <Mountain className="h-4 w-4" />
                      Nearby Attractions
                    </h4>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>• Traditional Swedish village - 15 minutes</li>
                      <li>• Local artisan workshops</li>
                      <li>• Historic wooden church</li>
                      <li>• Farmers market (weekends only)</li>
                    </ul>
                  </div>
                  <Separator />
                  <div>
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <Sun className="h-4 w-4" />
                      Seasonal Activities
                    </h4>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>• Summer: Swimming, kayaking, midnight sun</li>
                      <li>• Autumn: Mushroom picking, northern lights</li>
                      <li>• Winter: Ice fishing, cross-country skiing</li>
                      <li>• Spring: Bird migration, wildflower blooms</li>
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
                      Before Departure
                    </h4>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>• Check-out by 11:00 AM</li>
                      <li>• Strip beds and place linens in hamper</li>
                      <li>• Wash and put away all dishes</li>
                      <li>• Empty compost bucket into outdoor bin</li>
                    </ul>
                  </div>
                  <Separator />
                  <div>
                    <h4 className="font-semibold mb-3">Final Steps</h4>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>• Turn off all lights and equipment</li>
                      <li>• Close water valves and sort recycling</li>
                      <li>• Ensure fire is completely extinguished</li>
                      <li>• Return keys and borrowed equipment</li>
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