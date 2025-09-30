import { useState, useEffect } from "react";
import MainNavigation from "@/components/MainNavigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Coffee,
  Handshake,
  Footprints,
  CreditCard,
  Clock,
  Snowflake,
  Wine,
  Utensils,
  Trees,
  PawPrint,
  Droplets,
  Recycle,
} from "lucide-react";

interface CustomsSection {
  title: string;
  content: string;
  icon: React.ElementType;
  image?: string; // optional background/illustration
}

const DEFAULT_SECTIONS: CustomsSection[] = [
  {
    title: "Swedish Fika",
    content:
      "Fika is more than a coffee break – it’s a Swedish ritual. Set aside time for coffee (or tea) and something sweet, usually with company. Try a classic cinnamon bun or a cinnamon roll with a glass of cold milk.",
    icon: Coffee,
    image: "/images/customs/fika.jpg",
  },
  {
    title: "Local Customs & Etiquette",
    content:
      "Be on time – punctuality is important in Sweden. Respect personal space and keep modesty in mind. Swedes may seem reserved at first, but are warm and helpful once you get to know them.",
    icon: Handshake,
    image: "/images/customs/etiquette.jpg",
  },
  {
    title: "No Shoes Indoors",
    content:
      "Swedes always remove shoes when entering a home, even at parties. Bring socks or slippers if you like.",
    icon: Footprints,
    image: "/images/customs/shoes.jpg",
  },
  {
    title: "Card Is King",
    content:
      "Cash is rarely used in Sweden. Most places accept debit/credit cards and Swish (a mobile payment app). Make sure your card works internationally.",
    icon: CreditCard,
    image: "/images/customs/card.jpg",
  },
  {
    title: "Quiet Culture",
    content:
      "Public transport, shops, and nature are often quiet. Swedes value peace and calm – enjoy the silence.",
    icon: Clock,
    image: "/images/customs/quiet.jpg",
  },
  {
    title: "No Air Conditioning",
    content:
      "Air conditioning is rare in Sweden. Windows and natural ventilation are preferred. The climate is usually cool enough.",
    icon: Snowflake,
    image: "/images/customs/ac.jpg",
  },
  {
    title: "Buying Alcohol",
    content:
      "Alcohol stronger than 3.5% is only sold at Systembolaget, the state-run liquor store. Open weekdays until 18:00, Saturdays until 15:00, closed Sundays. Minimum age: 20 years.",
    icon: Wine,
    image: "/images/customs/alcohol.jpg",
  },
  {
    title: "Must-Try Swedish Delicacies",
    content:
      "Pickled herring, cinnamon buns, lösgodis (pick & mix candy), Kalles Kaviar, and snaps with songs are true Swedish traditions. Don’t leave without trying them!",
    icon: Utensils,
    image: "/images/customs/food.jpg",
  },
  {
    title: "The Right to Roam",
    content:
      "Thanks to Allemansrätten, everyone can hike, swim, camp, and pick berries in nature – as long as you respect property and wildlife.",
    icon: Trees,
    image: "/images/customs/roam.jpg",
  },
  {
    title: "Wildlife",
    content:
      "Drive carefully – you may encounter deer, boar, or moose on rural roads, especially at dawn and dusk.",
    icon: PawPrint,
    image: "/images/customs/wildlife.jpg",
  },
  {
    title: "Tap Water",
    content:
      "Swedish tap water is clean, cold, and excellent. No need to buy bottled water – enjoy straight from the tap.",
    icon: Droplets,
    image: "/images/customs/water.jpg",
  },
  {
    title: "Recycling & Pant",
    content:
      "Recycling is taken seriously in Sweden. Plastic, paper, glass, food waste must all be sorted. Bottles and cans with a 'pant' label can be returned in grocery stores for a refund.",
    icon: Recycle,
    image: "/images/customs/recycling.jpg",
  },
];

const SwedishCustoms = () => {
  const [sections, setSections] = useState<CustomsSection[]>(DEFAULT_SECTIONS);
  const { toast } = useToast();

  useEffect(() => {
    fetchSections();
  }, []);

  const fetchSections = async () => {
    try {
      const { data, error } = await supabase
        .from("platform_settings")
        .select("setting_value")
        .eq("setting_key", "swedish_customs")
        .single();

      if (error && error.code !== "PGRST116") throw error;
      if (data?.setting_value) setSections(data.setting_value as CustomsSection[]);
    } catch (error) {
      console.error("Error fetching customs content:", error);
      toast({
        title: "Error",
        description: "Could not load Swedish customs info",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <MainNavigation showBackButton />

      <div className="container mx-auto px-4 py-24">
        <div className="max-w-5xl mx-auto space-y-12">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4">First time in Sweden?</h1>
            <p className="text-lg text-muted-foreground">
              A premium guide to Swedish culture, customs, and everyday life – simple, clear, and inspiring.
            </p>
          </div>

          {sections.map((sec, idx) => {
            const Icon = sec.icon;
            return (
              <Card key={idx} className="overflow-hidden">
                {sec.image && (
                  <div className="h-64 w-full overflow-hidden">
                    <img
                      src={sec.image}
                      alt={sec.title}
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                )}
                <CardHeader className="flex items-center gap-3">
                  <Icon className="h-6 w-6 text-primary" />
                  <CardTitle className="text-2xl font-semibold">{sec.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                    {sec.content}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default SwedishCustoms;
