import { Link } from "react-router-dom";
import MainNavigation from "@/components/MainNavigation";
import PropertyFooter from "@/components/PropertyFooter";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Backpack, Bus, Mountain, Sparkles, Utensils, Waves } from "lucide-react";
import { usePageMeta, SITE_NAME, SITE_URL } from "@/hooks/usePageMeta";

const PATH = "/stora-harsjon-lerum";

// From the hosts' own Airbnb guidebooks ("Adventures", "Restaurants", "Guidebook")
const SECTIONS = [
  {
    icon: Waves,
    title: "On and around the lake",
    items: [
      ["Hike around Stora Härsjön", "Follow the black-and-white trail markers for a 16 km loop around the lake through the Härskogen outdoor area – or paddle it instead."],
      ["Beaches and islands", "Swim from the beaches on the east side of the lake or row out to the small islands. Guests love early-morning dips."],
      ["The canal to Härsjödammen", "Explore the small canal in the southern part of the lake by canoe or SUP."],
      ["Fishing", "Guests have caught pike here. Buy a fishing licence online before you go."],
      ["Berry picking", "In late summer the forest is full of blueberries and lingonberries – free to pick under allemansrätten, the Swedish right to roam."],
    ],
  },
  {
    icon: Mountain,
    title: "Activities near Lerum",
    items: [
      ["High Adventure", "Climbing and zip lines through the forest."],
      ["Vattenpalatset (Actic Lerum)", "A small indoor water park – perfect on a rainy day."],
      ["Skidome", "Cross-country skiing indoors, all year round."],
      ["Beach Center", "Indoor beach volleyball."],
      ["Kåhögs Gårdsbutik", "Buy milk and produce directly from the farm."],
    ],
  },
  {
    icon: Sparkles,
    title: "Day trips to Gothenburg",
    items: [
      ["Liseberg", "Gothenburg's famous amusement park – a great day out with kids."],
      ["Universeum", "Science centre with rainforest, aquarium, exotic animals and dinosaurs."],
      ["Slottsskogen", "A large city park with moose, seals and penguins – free of charge."],
      ["Gothenburg Botanical Garden", "One of the larger botanical gardens in Europe."],
      ["Gothenburg Museum of Art", "An extensive collection of Nordic art."],
      ["The archipelago", "Take the tram to Saltholmen and the ferry out to Gothenburg's car-free southern archipelago."],
    ],
  },
  {
    icon: Utensils,
    title: "Where to eat in Lerum",
    items: [
      ["Aludden Park & Restaurang", "Closest to the cabins, with good food and a lake view."],
      ["Brasserie Stationen", "Modern neighbourhood pub with good food and wine in a relaxed setting."],
      ["Piano kvarterskrog & bar", "Bouillabaisse, a real carbonara and a glass of Barolo."],
      ["Gobi Sushi Lerum", "Our pick for the best sushi in Lerum."],
      ["ICA Kvantum Lerum", "The nearest large supermarket (with recycling station) – stock up on the way."],
    ],
  },
  {
    icon: Bus,
    title: "Getting here",
    items: [
      ["By car", "About 30 minutes from central Gothenburg. The last 3 km is a narrow gravel road with passing places."],
      ["By train and bus", "Commuter train from Gothenburg Central Station to Aspen station in Lerum, then bus 530 to Häckenvägen and a 3 km walk on an unlit gravel road. Weekend buses must be pre-booked with Västtrafik."],
      ["By taxi", "Easy from Aspen or Lerum station, or book through the Bolt app."],
    ],
  },
  {
    icon: Backpack,
    title: "What to pack",
    items: [
      ["Keep it simple", "Food, a change of clothes, good walking shoes, a rain jacket and an extra layer, thick socks, a good book – and a headlamp, because it gets properly dark in the forest."],
    ],
  },
] as const;

const FOOTER_PROPERTY = {
  id: "lake-guide",
  title: "Nordic Getaways",
  location: "Lerum, Sweden",
  tagline_line1: "Lakeside stays on Stora Härsjön",
  footer_quick_links: ["Contact", "First time in Sweden"],
  get_in_touch_info: {},
};

const LakeGuide = () => {
  usePageMeta({
    title: "Stora Härsjön & Lerum: a local's guide near Gothenburg",
    description:
      "Things to do around Stora Härsjön and Lerum, 30 minutes from Gothenburg: a 16 km lake hike, swimming and paddling, family activities, restaurants and how to get here.",
    path: PATH,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: "Stora Härsjön & Lerum: a local's guide near Gothenburg",
      author: { "@type": "Person", name: "Jenny Nirs" },
      publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
      mainEntityOfPage: `${SITE_URL}${PATH}`,
      about: [
        { "@type": "LakeBodyOfWater", name: "Stora Härsjön", containedInPlace: { "@type": "Place", name: "Lerum, Sweden" } },
        { "@type": "City", name: "Lerum" },
      ],
    },
  });

  return (
    <div className="min-h-screen flex flex-col">
      <MainNavigation />

      <section className="relative bg-gradient-to-br from-primary to-primary/80 text-primary-foreground py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">Stora Härsjön &amp; Lerum</h1>
            <p className="text-xl md:text-2xl text-primary-foreground/90">
              A local's guide to the lake, the forest and day trips – 30 minutes from Gothenburg
            </p>
          </div>
        </div>
      </section>

      <section className="py-16 bg-background">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto space-y-8">
            <p className="text-lg text-muted-foreground leading-relaxed">
              Stora Härsjön is a forest lake in Lerum, just east of Gothenburg in Västra Götaland. Our two
              lakeside stays – <Link to="/property/lakefront-retreat" className="text-primary underline">Villa Häcken</Link>{" "}
              and <Link to="/property/lakehouse-getaway" className="text-primary underline">Lakehouse Getaway</Link> – sit
              right on its shore. These are the places we recommend to our guests, whether you want to spend every day on
              the water or combine nature with the city.
            </p>

            {SECTIONS.map(({ icon: Icon, title, items }) => (
              <Card key={title}>
                <CardHeader className="bg-gradient-to-r from-primary/10 to-transparent">
                  <div className="flex items-center gap-3">
                    <span className="p-2 bg-primary/10 rounded-lg">
                      <Icon className="h-6 w-6 text-primary" aria-hidden />
                    </span>
                    <h2 className="text-2xl font-semibold">{title}</h2>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <dl className="space-y-4">
                    {items.map(([name, text]) => (
                      <div key={name}>
                        <dt className="font-semibold">{name}</dt>
                        <dd className="text-muted-foreground leading-relaxed">{text}</dd>
                      </div>
                    ))}
                  </dl>
                </CardContent>
              </Card>
            ))}

            <div className="text-center pt-4">
              <p className="text-lg mb-4">New to Sweden? Read our <Link to="/first-time-in-sweden" className="text-primary underline">first-timer's guide</Link> too.</p>
              <Button asChild size="lg">
                <Link to="/book-now">See the stays and book directly</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <PropertyFooter property={FOOTER_PROPERTY as never} />
    </div>
  );
};

export default LakeGuide;
