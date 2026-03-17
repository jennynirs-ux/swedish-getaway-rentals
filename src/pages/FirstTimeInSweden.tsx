import MainNavigation from "@/components/MainNavigation";
import PropertyFooter from "@/components/PropertyFooter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Coffee,
  Smile,
  Home,
  CreditCard,
  Volume2,
  Thermometer,
  Wine,
  UtensilsCrossed,
  Trees,
  Squirrel,
  Droplet,
  Recycle,
} from "lucide-react";

const FirstTimeInSweden = () => {
  const sections = [
    {
      icon: Coffee,
      title: "Swedish Fika",
      image: "/placeholder.svg",
      content:
        "Fika is more than just a coffee break—it's a cherished Swedish tradition. Take time to pause, enjoy a cup of coffee (often with a cinnamon bun or cookie), and connect with friends, family, or colleagues. Swedes fika multiple times a day, and it's considered important for well-being and social bonding.",
    },
    {
      icon: Smile,
      title: "Local Customs & Etiquette",
      image: "/placeholder.svg",
      content:
        "Swedes value punctuality, personal space, and quiet conversation. It's common to be reserved at first, but once you get to know someone, they're warm and friendly. Queuing is taken seriously—always wait your turn. When meeting someone, a firm handshake and direct eye contact are the norm.",
    },
    {
      icon: Home,
      title: "No Shoes Indoors",
      image: "/placeholder.svg",
      content:
        "It's customary in Sweden to remove your shoes when entering someone's home or rental property. This keeps homes clean and is a sign of respect. Many homes have a designated area near the entrance for shoes. Don't be surprised if your host offers you slippers!",
    },
    {
      icon: CreditCard,
      title: "Card is King",
      image: "/placeholder.svg",
      content:
        "Sweden is one of the most cashless societies in the world. Most places—from restaurants to public transport—prefer card or mobile payments (Swish is very popular). Some smaller shops and markets may not accept cash at all, so make sure you have a functioning card.",
    },
    {
      icon: Volume2,
      title: "Quiet Culture",
      image: "/placeholder.svg",
      content:
        "Swedes value peace and quiet, especially in public spaces and residential areas. Loud conversations, music, or phone calls on public transport are uncommon. Quiet hours (typically 22:00–07:00) are respected in neighborhoods, so avoid making noise during these times.",
    },
    {
      icon: Thermometer,
      title: "No Air Conditioning?",
      image: "/placeholder.svg",
      content:
        "Air conditioning is rare in Swedish homes and hotels, as summers are generally mild. Instead, Swedes rely on open windows, fans, and good insulation. If you're visiting in summer, expect comfortable temperatures but be prepared for the occasional warm day without AC.",
    },
    {
      icon: Wine,
      title: "Buying Alcohol",
      image: "/placeholder.svg",
      content:
        "Alcohol stronger than 3.5% can only be purchased at Systembolaget, the government-run liquor store. They're open limited hours (closed Sundays and holidays), and you must be 20+ to buy. Beer and wine can be found in grocery stores, but only up to 3.5% alcohol.",
    },
    {
      icon: UtensilsCrossed,
      title: "Must-try Swedish Delicacies",
      image: "/placeholder.svg",
      content:
        "Don't leave Sweden without trying: Kanelbullar (cinnamon buns), Köttbullar (meatballs with lingonberry jam), Gravlax (cured salmon), Surströmming (fermented herring—if you dare!), Raggmunk (potato pancakes), Semla (cream-filled bun), and Swedish crispbread.",
    },
    {
      icon: Trees,
      title: "The Right to Roam (Allemansrätten)",
      image: "/placeholder.svg",
      content:
        "Sweden's 'freedom to roam' law allows everyone to access nature freely—you can walk, camp, swim, and pick berries and mushrooms on any land (with respect). However, don't disturb wildlife, leave trash, or camp too close to someone's home. Respect nature and leave no trace.",
    },
    {
      icon: Squirrel,
      title: "Wildlife",
      image: "/placeholder.svg",
      content:
        "Sweden is home to moose, deer, wild boar, foxes, and even bears and wolves in remote areas. If you're driving, be cautious at dawn and dusk when animals are most active. In the countryside, you might spot reindeer or even lynx. Always observe wildlife from a safe distance.",
    },
    {
      icon: Droplet,
      title: "Tap Water is Excellent",
      image: "/placeholder.svg",
      content:
        "Swedish tap water is some of the cleanest in the world. You can drink it straight from the tap anywhere in the country. There's no need to buy bottled water—just bring a reusable bottle and fill it up. It's safe, fresh, and environmentally friendly.",
    },
    {
      icon: Recycle,
      title: "Recycling & Pant",
      image: "/placeholder.svg",
      content:
        "Sweden takes recycling very seriously. Most homes and rentals have separate bins for food waste, paper, plastic, metal, and glass. Bottles and cans can be returned to stores for a small deposit refund (pant). Look for reverse vending machines at supermarkets to get your money back.",
    },
  ];

  // Using a dummy property for the footer
  const dummyProperty = {
    id: "sweden-guide",
    title: "Nordic Getaways",
    location: "Sweden",
    tagline_line1: "Your guide to Swedish culture and customs",
    footer_quick_links: ["The Nordic Collection", "Contact", "First time in Sweden"],
    get_in_touch_info: {},
  };

  return (
    <div className="min-h-screen flex flex-col">
      <MainNavigation />
      
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-primary to-primary/80 text-primary-foreground py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              First Time in Sweden?
            </h1>
            <p className="text-xl md:text-2xl text-primary-foreground/90">
              Everything you need to know about Swedish customs, culture, and daily life
            </p>
          </div>
        </div>
      </section>

      {/* Content Sections */}
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto grid gap-8">
            {sections.map((section, index) => {
              const Icon = section.icon;
              return (
                <Card key={index} className="overflow-hidden hover:shadow-lg transition-shadow">
                  <CardHeader className="bg-gradient-to-r from-primary/10 to-transparent">
                    <CardTitle className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Icon className="h-6 w-6 text-primary" />
                      </div>
                      <span className="text-2xl">{section.title}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row gap-6">
                      <div className="md:w-1/3">
                        <img
                          src={section.image}
                          alt={section.title}
                          loading="lazy"
                          decoding="async"
                          className="w-full h-48 object-cover rounded-lg"
                        />
                      </div>
                      <div className="md:w-2/3">
                        <p className="text-muted-foreground leading-relaxed">
                          {section.content}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      <PropertyFooter property={dummyProperty as any} />
    </div>
  );
};

export default FirstTimeInSweden;
