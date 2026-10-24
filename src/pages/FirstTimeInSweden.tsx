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
  type LucideIcon,
} from "lucide-react";
import { usePageMeta } from "@/hooks/usePageMeta";
import { type Copy, useCopy } from "@/i18n";

interface Section {
  icon: LucideIcon;
  title: string;
  image: string;
  content: string;
}

const en = {
  metaTitle: "First time in Sweden? A practical guide",
  metaDescription:
    "Practical tips for your first trip to Sweden: fika, allemansrätten (the right to roam), etiquette, paying by card, buying alcohol, recycling and must-try Swedish food.",
  heading: "First Time in Sweden?",
  subheading: "Everything you need to know about Swedish customs, culture, and daily life",
  footerLocation: "Sweden",
  footerTagline: "Your guide to Swedish culture and customs",
  sections: [
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
  ] as Section[],
};

const COPY: Copy<typeof en> = {
  en,
  sv: {
    metaTitle: "Första gången i Sverige? En praktisk guide",
    metaDescription:
      "Praktiska tips inför din första resa till Sverige: fika, allemansrätten, vett och etikett, att betala med kort, att köpa alkohol, återvinning och svensk mat du måste smaka.",
    heading: "Första gången i Sverige?",
    subheading: "Allt du behöver veta om svenska seder, kultur och vardagsliv",
    footerLocation: "Sverige",
    footerTagline: "Din guide till svensk kultur och svenska seder",
    sections: [
      {
        icon: Coffee,
        title: "Svensk fika",
        image: "/placeholder.svg",
        content:
          "Fika är mer än en kafferast – det är en älskad svensk tradition. Ta dig tid att stanna upp, njuta av en kopp kaffe (ofta med en kanelbulle eller en kaka) och umgås med vänner, familj eller kollegor. Svenskar fikar flera gånger om dagen, och fikat anses viktigt för både välmående och gemenskap.",
      },
      {
        icon: Smile,
        title: "Seder och etikett",
        image: "/placeholder.svg",
        content:
          "Svenskar värdesätter punktlighet, personligt utrymme och lågmälda samtal. Det är vanligt att vara lite reserverad i början, men när man väl lär känna någon är svenskar varma och vänliga. Köer tas på stort allvar – vänta alltid på din tur. När man hälsar på någon är ett fast handslag och ögonkontakt det vanliga.",
      },
      {
        icon: Home,
        title: "Inga skor inomhus",
        image: "/placeholder.svg",
        content:
          "I Sverige tar man av sig skorna när man kommer in i någons hem eller i ett hyrt boende. Det håller hemmet rent och är ett tecken på respekt. Många hem har en särskild plats för skor vid entrén. Bli inte förvånad om värden erbjuder dig tofflor!",
      },
      {
        icon: CreditCard,
        title: "Kortet är kung",
        image: "/placeholder.svg",
        content:
          "Sverige är ett av världens mest kontantlösa samhällen. De flesta ställen – från restauranger till kollektivtrafiken – vill helst att du betalar med kort eller mobilen (Swish är väldigt populärt). Vissa mindre butiker och marknader tar inte emot kontanter alls, så se till att du har ett kort som fungerar.",
      },
      {
        icon: Volume2,
        title: "Lugn och ro",
        image: "/placeholder.svg",
        content:
          "Svenskar uppskattar lugn och ro, särskilt på allmänna platser och i bostadsområden. Högljudda samtal, musik eller telefonsamtal i kollektivtrafiken är ovanliga. Nattro (oftast 22.00–07.00) respekteras i bostadsområden, så undvik att störa under de tiderna.",
      },
      {
        icon: Thermometer,
        title: "Ingen AC?",
        image: "/placeholder.svg",
        content:
          "Luftkonditionering är ovanligt i svenska hem och hotell, eftersom somrarna oftast är milda. I stället förlitar sig svenskar på öppna fönster, fläktar och bra isolering. Kommer du på sommaren kan du räkna med behagliga temperaturer, men var beredd på en och annan varm dag utan AC.",
      },
      {
        icon: Wine,
        title: "Att köpa alkohol",
        image: "/placeholder.svg",
        content:
          "Alkohol starkare än 3,5 % får bara säljas av Systembolaget, statens egna butiker. De har begränsade öppettider (stängt på söndagar och helgdagar), och du måste ha fyllt 20 för att handla där. Öl och vin finns i mataffären, men bara upp till 3,5 %.",
      },
      {
        icon: UtensilsCrossed,
        title: "Svenska delikatesser du måste smaka",
        image: "/placeholder.svg",
        content:
          "Lämna inte Sverige utan att ha smakat kanelbullar, köttbullar med lingonsylt, gravlax, surströmming (om du vågar!), raggmunk, semlor och knäckebröd.",
      },
      {
        icon: Trees,
        title: "Allemansrätten",
        image: "/placeholder.svg",
        content:
          "Allemansrätten ger alla rätt att röra sig fritt i naturen – du får vandra, tälta, bada och plocka bär och svamp på all mark (med hänsyn). Men stör inte djurlivet, skräpa inte ner och tälta inte för nära någons hus. Var rädd om naturen och lämna inga spår efter dig.",
      },
      {
        icon: Squirrel,
        title: "Djurliv",
        image: "/placeholder.svg",
        content:
          "I Sverige finns älg, rådjur, vildsvin och räv, och i avlägsna trakter till och med björn och varg. Kör du bil, var försiktig i gryning och skymning, när djuren är som mest aktiva. På landsbygden kan du få se ren eller till och med lodjur. Titta alltid på vilda djur från ett säkert avstånd.",
      },
      {
        icon: Droplet,
        title: "Kranvattnet är utmärkt",
        image: "/placeholder.svg",
        content:
          "Svenskt kranvatten är bland det renaste i världen. Du kan dricka det direkt ur kranen i hela landet. Du behöver inte köpa vatten på flaska – ta med en återanvändbar flaska och fyll på. Det är säkert, friskt och miljövänligt.",
      },
      {
        icon: Recycle,
        title: "Återvinning och pant",
        image: "/placeholder.svg",
        content:
          "I Sverige tar man återvinning på stort allvar. De flesta hem och hyrda boenden har separata kärl för matavfall, papper, plast, metall och glas. Flaskor och burkar kan lämnas tillbaka i butiken mot en liten pant. Leta efter pantautomaterna i mataffären för att få tillbaka pengarna.",
      },
    ],
  },
  de: {
    metaTitle: "Zum ersten Mal in Schweden? Ein praktischer Ratgeber",
    metaDescription:
      "Praktische Tipps für deine erste Reise nach Schweden: Fika, Allemansrätten (das Jedermannsrecht), Umgangsformen, Zahlen mit Karte, Alkohol kaufen, Recycling und schwedisches Essen, das du probieren musst.",
    heading: "Zum ersten Mal in Schweden?",
    subheading: "Alles, was du über schwedische Bräuche, Kultur und den Alltag wissen musst",
    footerLocation: "Schweden",
    footerTagline: "Dein Ratgeber zu schwedischer Kultur und Bräuchen",
    sections: [
      {
        icon: Coffee,
        title: "Schwedische Fika",
        image: "/placeholder.svg",
        content:
          "Fika ist mehr als nur eine Kaffeepause – es ist eine geliebte schwedische Tradition. Nimm dir Zeit, halte inne, genieß eine Tasse Kaffee (oft mit einer Zimtschnecke oder einem Keks) und verbring Zeit mit Freunden, Familie oder Kollegen. In Schweden wird mehrmals am Tag Fika gemacht, und sie gilt als wichtig für das Wohlbefinden und das Miteinander.",
      },
      {
        icon: Smile,
        title: "Bräuche & Umgangsformen",
        image: "/placeholder.svg",
        content:
          "Die Menschen in Schweden legen Wert auf Pünktlichkeit, persönlichen Freiraum und leise Gespräche. Anfangs sind viele zurückhaltend, aber wenn man sich erst einmal kennt, sind sie herzlich und freundlich. Anstehen wird ernst genommen – warte immer, bis du an der Reihe bist. Zur Begrüßung sind ein fester Händedruck und direkter Blickkontakt üblich.",
      },
      {
        icon: Home,
        title: "Keine Schuhe im Haus",
        image: "/placeholder.svg",
        content:
          "In Schweden zieht man die Schuhe aus, wenn man ein fremdes Zuhause oder eine Ferienunterkunft betritt. Das hält das Haus sauber und ist ein Zeichen von Respekt. Viele Häuser haben am Eingang einen eigenen Platz für Schuhe. Sei nicht überrascht, wenn dir dein Gastgeber Hausschuhe anbietet!",
      },
      {
        icon: CreditCard,
        title: "Karte statt Bargeld",
        image: "/placeholder.svg",
        content:
          "Schweden ist eines der bargeldlosesten Länder der Welt. Fast überall – vom Restaurant bis zum Nahverkehr – zahlt man am liebsten mit Karte oder mobil (Swish ist sehr beliebt). Manche kleineren Läden und Märkte nehmen gar kein Bargeld an, also sorg dafür, dass du eine funktionierende Karte dabeihast.",
      },
      {
        icon: Volume2,
        title: "Ruhe wird geschätzt",
        image: "/placeholder.svg",
        content:
          "In Schweden schätzt man Ruhe, besonders an öffentlichen Orten und in Wohngebieten. Laute Gespräche, Musik oder Telefonate in öffentlichen Verkehrsmitteln sind unüblich. Die Nachtruhe (meist 22:00–07:00 Uhr) wird in Wohngegenden eingehalten, also vermeide in dieser Zeit Lärm.",
      },
      {
        icon: Thermometer,
        title: "Keine Klimaanlage?",
        image: "/placeholder.svg",
        content:
          "Klimaanlagen sind in schwedischen Häusern und Hotels selten, weil die Sommer meist mild sind. Stattdessen setzt man auf offene Fenster, Ventilatoren und gute Dämmung. Im Sommer kannst du mit angenehmen Temperaturen rechnen, solltest aber auf den einen oder anderen warmen Tag ohne Klimaanlage vorbereitet sein.",
      },
      {
        icon: Wine,
        title: "Alkohol kaufen",
        image: "/placeholder.svg",
        content:
          "Alkohol mit mehr als 3,5 % gibt es nur bei Systembolaget, den staatlichen Alkoholläden. Sie haben eingeschränkte Öffnungszeiten (sonntags und an Feiertagen geschlossen), und du musst mindestens 20 Jahre alt sein. Bier und Wein gibt es auch im Supermarkt, aber nur bis 3,5 % Alkohol.",
      },
      {
        icon: UtensilsCrossed,
        title: "Schwedische Spezialitäten, die du probieren musst",
        image: "/placeholder.svg",
        content:
          "Verlass Schweden nicht, ohne das hier probiert zu haben: Kanelbullar (Zimtschnecken), Köttbullar (Fleischbällchen mit Preiselbeermarmelade), Gravlax (gebeizter Lachs), Surströmming (fermentierter Hering – wenn du dich traust!), Raggmunk (Kartoffelpuffer), Semla (mit Sahne gefülltes Gebäck) und schwedisches Knäckebrot.",
      },
      {
        icon: Trees,
        title: "Jedermannsrecht (Allemansrätten)",
        image: "/placeholder.svg",
        content:
          "Das schwedische Jedermannsrecht erlaubt allen den freien Zugang zur Natur – du darfst auf jedem Grund (mit Rücksicht) wandern, zelten, baden und Beeren und Pilze sammeln. Stör aber keine Wildtiere, lass keinen Müll zurück und zelte nicht zu nah an fremden Häusern. Geh achtsam mit der Natur um und hinterlass keine Spuren.",
      },
      {
        icon: Squirrel,
        title: "Wildtiere",
        image: "/placeholder.svg",
        content:
          "In Schweden leben Elche, Rehe, Wildschweine und Füchse, in abgelegenen Gegenden sogar Bären und Wölfe. Wenn du Auto fährst, sei in der Morgen- und Abenddämmerung vorsichtig, wenn die Tiere am aktivsten sind. Auf dem Land siehst du vielleicht Rentiere oder sogar einen Luchs. Beobachte Wildtiere immer aus sicherer Entfernung.",
      },
      {
        icon: Droplet,
        title: "Ausgezeichnetes Leitungswasser",
        image: "/placeholder.svg",
        content:
          "Schwedisches Leitungswasser gehört zu den saubersten der Welt. Du kannst es überall im Land direkt aus dem Hahn trinken. Wasser in Flaschen musst du nicht kaufen – nimm einfach eine wiederverwendbare Flasche mit und füll sie auf. Das ist sicher, frisch und umweltfreundlich.",
      },
      {
        icon: Recycle,
        title: "Recycling & Pfand (Pant)",
        image: "/placeholder.svg",
        content:
          "Recycling wird in Schweden sehr ernst genommen. Die meisten Häuser und Ferienunterkünfte haben getrennte Behälter für Bioabfall, Papier, Plastik, Metall und Glas. Flaschen und Dosen kannst du gegen ein kleines Pfand (pant) im Laden zurückgeben. Halte im Supermarkt Ausschau nach den Pfandautomaten, um dein Geld zurückzubekommen.",
      },
    ],
  },
};

const FirstTimeInSweden = () => {
  const t = useCopy(COPY);
  usePageMeta({
    title: t.metaTitle,
    description: t.metaDescription,
    path: "/first-time-in-sweden",
  });

  const sections = t.sections;

  // Using a dummy property for the footer (the quick links stay in English:
  // PropertyFooter maps these labels to paths)
  const dummyProperty = {
    id: "sweden-guide",
    title: "Nordic Getaways",
    location: t.footerLocation,
    tagline_line1: t.footerTagline,
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
              {t.heading}
            </h1>
            <p className="text-xl md:text-2xl text-primary-foreground/90">
              {t.subheading}
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

      <PropertyFooter property={dummyProperty as never} />
    </div>
  );
};

export default FirstTimeInSweden;
