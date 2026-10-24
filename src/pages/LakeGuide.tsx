import type { ReactNode } from "react";
import { Link } from "@/i18n/router";
import MainNavigation from "@/components/MainNavigation";
import PropertyFooter from "@/components/PropertyFooter";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Backpack, Bus, Mountain, Sparkles, Utensils, Waves, type LucideIcon } from "lucide-react";
import { usePageMeta, SITE_NAME, SITE_URL } from "@/hooks/usePageMeta";
import { type Copy, localizedPath, useCopy, useLang } from "@/i18n";

const PATH = "/stora-harsjon-lerum";

interface Section {
  icon: LucideIcon;
  title: string;
  /** [name, text]; place and business names stay as they are */
  items: [string, string][];
}

// From the hosts' own Airbnb guidebooks ("Adventures", "Restaurants", "Guidebook")
const en = {
  metaTitle: "Stora Härsjön & Lerum: a local's guide near Gothenburg",
  metaDescription:
    "Things to do around Stora Härsjön and Lerum, 30 minutes from Gothenburg: a 16 km lake hike, swimming and paddling, family activities, restaurants and how to get here.",
  subheading: "A local's guide to the lake, the forest and day trips – 30 minutes from Gothenburg",
  intro: (villa: ReactNode, lakehouse: ReactNode): ReactNode => (
    <>
      Stora Härsjön is a forest lake in Lerum, just east of Gothenburg in Västra Götaland. Our two lakeside
      stays – {villa} and {lakehouse} – sit right on its shore. These are the places we recommend to our guests,
      whether you want to spend every day on the water or combine nature with the city.
    </>
  ),
  newToSweden: (link: (text: string) => ReactNode): ReactNode => (
    <>New to Sweden? Read our {link("first-timer's guide")} too.</>
  ),
  seeStays: "See the stays and book directly",
  footerLocation: "Lerum, Sweden",
  footerTagline: "Lakeside stays on Stora Härsjön",
  sections: [
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
        ["By train and bus", "Commuter train from Gothenburg Central Station to Aspen station in Lerum, then bus 530 or 535 to Häckenvägen and a 3 km walk on an unlit gravel road. Weekend buses must be pre-booked with Västtrafik."],
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
  ] as Section[],
};

const COPY: Copy<typeof en> = {
  en,
  sv: {
    metaTitle: "Stora Härsjön & Lerum: lokala tips nära Göteborg",
    metaDescription:
      "Saker att göra runt Stora Härsjön och Lerum, 30 minuter från Göteborg: en 16 km lång vandring runt sjön, bad och paddling, aktiviteter för familjen, restauranger och hur du hittar hit.",
    subheading: "Lokala tips om sjön, skogen och utflykter – 30 minuter från Göteborg",
    intro: (villa, lakehouse) => (
      <>
        Stora Härsjön är en skogssjö i Lerum, strax öster om Göteborg i Västra Götaland. Våra två boenden vid
        sjön – {villa} och {lakehouse} – ligger precis vid stranden. Här är ställena vi tipsar våra gäster om,
        oavsett om du vill vara på sjön varje dag eller kombinera natur och stad.
      </>
    ),
    newToSweden: (link) => <>Första gången i Sverige? Läs också vår {link("guide med tips för besökare")}.</>,
    seeStays: "Se boendena och boka direkt",
    footerLocation: "Lerum, Sverige",
    footerTagline: "Boenden vid Stora Härsjön",
    sections: [
      {
        icon: Waves,
        title: "På och runt sjön",
        items: [
          ["Vandra runt Stora Härsjön", "Följ de svartvita ledmarkeringarna på en 16 km lång runda runt sjön genom friluftsområdet Härskogen – eller paddla runt den i stället."],
          ["Stränder och öar", "Bada från stränderna på sjöns östra sida eller ro ut till de små öarna. Gästerna älskar ett tidigt morgondopp."],
          ["Kanalen till Härsjödammen", "Utforska den lilla kanalen i sjöns södra del med kanot eller SUP."],
          ["Fiske", "Gäster har fått gädda här. Köp fiskekort på nätet innan du ger dig ut."],
          ["Bärplockning", "På sensommaren är skogen full av blåbär och lingon – fria att plocka enligt allemansrätten."],
        ],
      },
      {
        icon: Mountain,
        title: "Aktiviteter i Lerum med omnejd",
        items: [
          ["High Adventure", "Klättring och ziplines genom skogen."],
          ["Vattenpalatset (Actic Lerum)", "Ett litet äventyrsbad inomhus – perfekt en regnig dag."],
          ["Skidome", "Längdskidåkning inomhus, året runt."],
          ["Beach Center", "Beachvolleyboll inomhus."],
          ["Kåhögs Gårdsbutik", "Köp mjölk och råvaror direkt från gården."],
        ],
      },
      {
        icon: Sparkles,
        title: "Dagsutflykter till Göteborg",
        items: [
          ["Liseberg", "Göteborgs berömda nöjespark – en härlig dag med barnen."],
          ["Universeum", "Vetenskapscenter med regnskog, akvarium, exotiska djur och dinosaurier."],
          ["Slottsskogen", "En stor stadspark med älgar, sälar och pingviner – gratis."],
          ["Göteborgs botaniska trädgård", "En av de större botaniska trädgårdarna i Europa."],
          ["Göteborgs konstmuseum", "En omfattande samling nordisk konst."],
          ["Skärgården", "Ta spårvagnen till Saltholmen och båten ut till Göteborgs bilfria södra skärgård."],
        ],
      },
      {
        icon: Utensils,
        title: "Ät gott i Lerum",
        items: [
          ["Aludden Park & Restaurang", "Närmast stugorna, med god mat och sjöutsikt."],
          ["Brasserie Stationen", "Modern kvarterspub med god mat och vin i en avslappnad miljö."],
          ["Piano kvarterskrog & bar", "Bouillabaisse, en riktig carbonara och ett glas Barolo."],
          ["Gobi Sushi Lerum", "Vårt tips för Lerums bästa sushi."],
          ["ICA Kvantum Lerum", "Närmaste stora mataffär (med återvinningsstation) – handla på vägen."],
        ],
      },
      {
        icon: Bus,
        title: "Hitta hit",
        items: [
          ["Med bil", "Cirka 30 minuter från centrala Göteborg. De sista 3 km är en smal grusväg med mötesplatser."],
          ["Med tåg och buss", "Pendeltåg från Göteborgs centralstation till Aspen station i Lerum, sedan buss 530 eller 535 till Häckenvägen och en promenad på 3 km längs en obelyst grusväg. Bussar på helger måste förbokas hos Västtrafik."],
          ["Med taxi", "Enkelt från Aspen eller Lerums station, eller boka via Bolt-appen."],
        ],
      },
      {
        icon: Backpack,
        title: "Vad du ska packa",
        items: [
          ["Håll det enkelt", "Mat, ombyte, bra promenadskor, regnjacka och ett extra lager, tjocka sockor, en bra bok – och en pannlampa, för det blir riktigt mörkt i skogen."],
        ],
      },
    ],
  },
  de: {
    metaTitle: "Stora Härsjön & Lerum: Insidertipps nahe Göteborg",
    metaDescription:
      "Was du rund um den Stora Härsjön und Lerum unternehmen kannst, 30 Minuten von Göteborg: eine 16 km lange Wanderung um den See, Baden und Paddeln, Aktivitäten für Familien, Restaurants und die Anreise.",
    subheading: "Insidertipps für den See, den Wald und Ausflüge – 30 Minuten von Göteborg",
    intro: (villa, lakehouse) => (
      <>
        Der Stora Härsjön ist ein Waldsee in Lerum, gleich östlich von Göteborg in Västra Götaland. Unsere beiden
        Unterkünfte am See – {villa} und {lakehouse} – liegen direkt am Ufer. Das sind die Orte, die wir unseren
        Gästen empfehlen, ob du jeden Tag auf dem Wasser verbringen oder Natur und Stadt verbinden möchtest.
      </>
    ),
    newToSweden: (link) => <>Zum ersten Mal in Schweden? Lies auch unseren {link("Ratgeber für Erstbesucher")}.</>,
    seeStays: "Unterkünfte ansehen und direkt buchen",
    footerLocation: "Lerum, Schweden",
    footerTagline: "Unterkünfte am Stora Härsjön",
    sections: [
      {
        icon: Waves,
        title: "Am und auf dem See",
        items: [
          ["Wanderung um den Stora Härsjön", "Folge den schwarz-weißen Wegmarkierungen auf einer 16 km langen Runde um den See durch das Naturgebiet Härskogen – oder umrunde ihn stattdessen mit dem Kanu."],
          ["Strände und Inseln", "Bade an den Stränden am Ostufer des Sees oder rudere hinaus zu den kleinen Inseln. Unsere Gäste lieben ein Bad am frühen Morgen."],
          ["Der Kanal zum Härsjödammen", "Erkunde den kleinen Kanal im Süden des Sees mit Kanu oder SUP."],
          ["Angeln", "Gäste haben hier schon Hechte gefangen. Kauf vorher online eine Angelkarte."],
          ["Beeren sammeln", "Im Spätsommer ist der Wald voller Blaubeeren und Preiselbeeren – die du nach dem Allemansrätten, dem schwedischen Jedermannsrecht, frei pflücken darfst."],
        ],
      },
      {
        icon: Mountain,
        title: "Aktivitäten rund um Lerum",
        items: [
          ["High Adventure", "Klettern und Ziplines durch den Wald."],
          ["Vattenpalatset (Actic Lerum)", "Ein kleines Erlebnisbad – perfekt an einem Regentag."],
          ["Skidome", "Langlauf in der Halle, das ganze Jahr über."],
          ["Beach Center", "Beachvolleyball in der Halle."],
          ["Kåhögs Gårdsbutik", "Milch und Erzeugnisse direkt vom Hof."],
        ],
      },
      {
        icon: Sparkles,
        title: "Tagesausflüge nach Göteborg",
        items: [
          ["Liseberg", "Göteborgs berühmter Freizeitpark – ein toller Tag mit Kindern."],
          ["Universeum", "Wissenschaftszentrum mit Regenwald, Aquarium, exotischen Tieren und Dinosauriern."],
          ["Slottsskogen", "Ein großer Stadtpark mit Elchen, Robben und Pinguinen – kostenlos."],
          ["Botanischer Garten Göteborg", "Einer der größeren botanischen Gärten Europas."],
          ["Kunstmuseum Göteborg", "Eine umfangreiche Sammlung nordischer Kunst."],
          ["Die Schären", "Fahr mit der Straßenbahn nach Saltholmen und mit der Fähre hinaus zu den autofreien südlichen Schären von Göteborg."],
        ],
      },
      {
        icon: Utensils,
        title: "Essen gehen in Lerum",
        items: [
          ["Aludden Park & Restaurang", "Am nächsten an den Ferienhäusern, mit gutem Essen und Seeblick."],
          ["Brasserie Stationen", "Moderne Nachbarschaftskneipe mit gutem Essen und Wein in entspannter Atmosphäre."],
          ["Piano kvarterskrog & bar", "Bouillabaisse, eine echte Carbonara und ein Glas Barolo."],
          ["Gobi Sushi Lerum", "Unser Tipp für das beste Sushi in Lerum."],
          ["ICA Kvantum Lerum", "Der nächste große Supermarkt (mit Recyclingstation) – kauf auf dem Weg ein."],
        ],
      },
      {
        icon: Bus,
        title: "Anreise",
        items: [
          ["Mit dem Auto", "Etwa 30 Minuten von der Göteborger Innenstadt. Die letzten 3 km sind eine schmale Schotterstraße mit Ausweichstellen."],
          ["Mit Zug und Bus", "Mit dem Pendelzug vom Göteborger Hauptbahnhof (Göteborg Central) zur Station Aspen in Lerum, dann mit Bus 530 oder 535 bis Häckenvägen und 3 km zu Fuß auf einer unbeleuchteten Schotterstraße. Am Wochenende müssen Busse bei Västtrafik vorab gebucht werden."],
          ["Mit dem Taxi", "Ganz einfach ab Aspen oder dem Bahnhof Lerum, oder buch über die Bolt-App."],
        ],
      },
      {
        icon: Backpack,
        title: "Was du einpacken solltest",
        items: [
          ["Weniger ist mehr", "Essen, Wechselkleidung, gute Wanderschuhe, eine Regenjacke und eine zusätzliche Schicht, dicke Socken, ein gutes Buch – und eine Stirnlampe, denn im Wald wird es richtig dunkel."],
        ],
      },
    ],
  },
};

const LakeGuide = () => {
  const t = useCopy(COPY);
  const lang = useLang();
  usePageMeta({
    title: t.metaTitle,
    description: t.metaDescription,
    path: PATH,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: t.metaTitle,
      author: { "@type": "Person", name: "Jenny Nirs" },
      publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
      mainEntityOfPage: `${SITE_URL}${localizedPath(PATH, lang)}`,
      about: [
        { "@type": "LakeBodyOfWater", name: "Stora Härsjön", containedInPlace: { "@type": "Place", name: "Lerum, Sweden" } },
        { "@type": "City", name: "Lerum" },
      ],
    },
  });

  const footerProperty = {
    id: "lake-guide",
    title: "Nordic Getaways",
    location: t.footerLocation,
    tagline_line1: t.footerTagline,
    // Stay in English: PropertyFooter maps these labels to paths
    footer_quick_links: ["Contact", "First time in Sweden?"],
    get_in_touch_info: {},
  };

  return (
    <div className="min-h-screen flex flex-col">
      <MainNavigation />

      <section className="relative bg-gradient-to-br from-primary to-primary/80 text-primary-foreground py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">Stora Härsjön &amp; Lerum</h1>
            <p className="text-xl md:text-2xl text-primary-foreground/90">{t.subheading}</p>
          </div>
        </div>
      </section>

      <section className="py-16 bg-background">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto space-y-8">
            <p className="text-lg text-muted-foreground leading-relaxed">
              {t.intro(
                <Link to="/property/lakefront-retreat" className="text-primary underline">Villa Häcken</Link>,
                <Link to="/property/lakehouse-getaway" className="text-primary underline">Lakehouse Getaway</Link>,
              )}
            </p>

            {t.sections.map(({ icon: Icon, title, items }) => (
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
              <p className="text-lg mb-4">
                {t.newToSweden((text) => (
                  <Link to="/first-time-in-sweden" className="text-primary underline">{text}</Link>
                ))}
              </p>
              <Button asChild size="lg">
                <Link to="/cabins">{t.seeStays}</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <PropertyFooter property={footerProperty as never} />
    </div>
  );
};

export default LakeGuide;
