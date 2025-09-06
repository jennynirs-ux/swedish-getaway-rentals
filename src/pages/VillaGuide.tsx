import { ArrowLeft, Wifi, MapPin, Car, Utensils, Flame, TreePine, Home, Phone } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
const VillaGuide = () => {
  return <div className="min-h-screen bg-background">
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
              <CardTitle className="text-2xl">Welcome to Your Stay</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                We're so happy to have you here! Whether you're here to relax, explore nature, enjoy outdoor cooking 
                or simply recharge, this place is designed for just that – comfort, simplicity, and a touch of off-grid living.
              </p>
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
                  <p className="text-sm"><strong>Phone:</strong> +46 70 123 4567</p>
                  <p className="text-sm"><strong>Email:</strong> villa@hacken.se</p>
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
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">What to Bring</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• Personal toiletries and medications</li>
                    <li>• Comfortable outdoor clothing</li>
                    <li>• Swimwear for the hot tub</li>
                    <li>• Your favorite coffee/tea</li>
                    <li>• Any special dietary items</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Parking</h4>
                  <p className="text-sm text-muted-foreground">
                    Free parking available directly at the property. Follow the gravel driveway to the designated parking area.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Check-in</h4>
                  <p className="text-sm text-muted-foreground">
                    Check-in is after 3:00 PM. We'll provide detailed arrival instructions with door codes via email before your stay.
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
                  <h4 className="font-semibold mb-2">Heating & Energy</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• Solar-powered with automatic heating</li>
                    <li>• Temperature adjusts based on outdoor conditions</li>
                    <li>• Backup heating available if needed</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Water System</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• Fresh drinking water from our well</li>
                    <li>• Hot water available throughout</li>
                    <li>• Please conserve water when possible</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Waste & Recycling</h4>
                  <p className="text-sm text-muted-foreground">
                    Managed locally. Separate bins for recycling, compost, and general waste are provided.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Outdoor Features */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Flame className="h-5 w-5" />
                  Outdoor Features
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Pizza Oven</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• Wood-fired oven for authentic cooking</li>
                    <li>• Firewood provided in the storage area</li>
                    <li>• Allow 45-60 minutes for proper heating</li>
                    <li>• Pizza stones and tools available</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Hot Tub</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• Available year-round</li>
                    <li>• Instructions posted beside the tub</li>
                    <li>• Please rinse before entering</li>
                    <li>• Cover after use to maintain temperature</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Fireplace</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• Indoor fireplace for cozy evenings</li>
                    <li>• Dry firewood stored nearby</li>
                    <li>• Fire starter and matches provided</li>
                    <li>• Always close the damper when not in use</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Local Favorites */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TreePine className="h-5 w-5" />
                  Local Favorites
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Hiking & Nature</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• Forest trails directly from the property</li>
                    <li>• Lake Härssjön - 15 minutes walk</li>
                    <li>• Delsjöområdet nature reserve - 20 minutes drive</li>
                    <li>• Marked hiking trails with varying difficulty</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Dining & Shopping</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• ICA Supermarket - 10 minutes drive</li>
                    <li>• Local farm shop for fresh produce</li>
                    <li>• Lerum town center - restaurants & cafes</li>
                    <li>• Gothenburg city center - 30 minutes</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Activities</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• Swimming in nearby lakes</li>
                    <li>• Berry picking in season</li>
                    <li>• Photography walks</li>
                    <li>• Star gazing (minimal light pollution)</li>
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
                    <li>• "Allemansrätten" - Right to roam freely in nature</li>
                    <li>• Remove shoes when entering homes</li>
                    <li>• Most Swedes speak excellent English</li>
                    <li>• Tipping is not expected but appreciated</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Practical Info</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• Sweden uses SEK (Swedish Krona)</li>
                    <li>• Card payments accepted everywhere</li>
                    <li>• 220V electrical outlets (European plug)</li>
                    <li>• Emergency number: 112</li>
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
                  <h4 className="font-semibold mb-2">Before You Leave</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• Check-out by 11:00 AM</li>
                    <li>• Strip beds and place linens in laundry basket</li>
                    <li>• Load and start the dishwasher</li>
                    <li>• Take out trash to designated bins</li>
                    <li>• Turn off all lights and heating</li>
                    <li>• Ensure all windows and doors are closed</li>
                    <li>• Leave keys in the designated lockbox</li>
                  </ul>
                </div>
                <div className="mt-4 p-4 bg-accent/10 rounded-lg">
                  <p className="text-sm italic text-muted-foreground">
                    "What you see here is more than a house – it's a story told in wood, light, effort and love. 
                    Thank you for treating it with care."
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Contact Section */}
          <Card className="mt-8">
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
                  <h4 className="font-semibold">WhatsApp</h4>
                  <p className="text-sm text-muted-foreground">Quick responses</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>;
};
export default VillaGuide;