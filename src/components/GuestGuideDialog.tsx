import { useState, useMemo, useEffect, type ElementType, lazy, Suspense } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Share2,
  Download,
  Home,
  MapPin,
  Wifi,
  BookOpen,
  Key,
  Info,
  LogOut,
  Heart,
  CheckSquare,
  Coffee,
  Utensils,
  Cog,
  Landmark,
  Shield,
  Star,
  SmilePlus,
  Ban,
  Volume2,
  Clock,
  Apple,
  Newspaper,
  Package,
  Wine,
  Trash2,
  Skull,
  Recycle,
  CheckCircle,
} from "lucide-react";
import { Property } from "@/hooks/useProperties";
import { houseRuleLines } from "@/lib/stayRules";
import { type Copy, type Lang, localizedPath, useLang } from "@/i18n";
import { SHOW_ORIGINAL, translatedFromText } from "@/i18n/listingTexts";

const LeafletPropertyMapBasic = lazy(() => import("@/components/maps/LeafletPropertyMapBasic"));

type WasteCategory = { title: string; description: (string | { not: string })[]; tip: string };

const en = {
  // The guide's sections, by id; a host's own title replaces these
  sections: {
    home: "Welcome Home",
    directions: "Directions",
    stop: "Stop on the way",
    checkin: "Check-in",
    wifi: "Wi-Fi",
    kitchen: "Kitchen",
    howthingswork: "How things work",
    waste: "Waste & Recycling",
    places: "Places to visit",
    customs: "Swedish customs",
    rules: "House Rules",
    checkout: "Check-out",
    ratings: "Star Ratings",
    hoststory: "Host Story",
  },
  customs: ["No shoes indoors", "Fika tradition", "Alcohol only at Systembolaget"],
  shareTitle: (title: string) => `${title} - Guest Guide`,
  linkCopied: "Link copied!",
  linkCopiedText: "Guest guide link copied.",
  pdfSubtitle: "Guest Guidebook",
  pdfFileName: (title: string) => `${title}-guidebook.pdf`,
  pdfSaved: "PDF Downloaded",
  pdfSavedText: "Guidebook saved successfully!",
  loadingMap: "Loading map...",
  locations: "Locations:",
  wasteIntro: "Recycling saves raw materials and energy – every item you sort makes a difference!",
  // In the order of WASTE_ICONS
  wasteCategories: [
    {
      title: "Food Waste",
      description: [
        "Fruit and vegetable scraps, tea bags, coffee grounds, eggshells, meat bones, small amounts of kitchen paper.",
        { not: "Plastic, snus, cigarettes, flowers or candles." },
      ],
      tip: "Food waste becomes biogas and biofertilizer.",
    },
    {
      title: "Plastic Packaging",
      description: [
        "Plastic bags, bottles, refill packs, tubes, trays, crisp bags, styrofoam.",
        { not: "Plastic toys and furniture → bulky waste." },
      ],
      tip: "Recycled plastic becomes bags and recycling containers.",
    },
    {
      title: "Metal Packaging",
      description: [
        "Cans, empty spray cans, tubes, caps, lids, empty paint tins.",
        { not: "Tins with paint/glue → hazardous waste." },
        { not: "Scrap metal like pans → bulky waste." },
      ],
      tip: "Recycled metal can become wheel rims or sheet metal.",
    },
    {
      title: "Newspapers & Paper",
      description: [
        "Daily/weekly papers, magazines, flyers, brochures.",
        { not: "Envelopes & bound books → residual waste." },
      ],
      tip: "Old newspapers become kitchen rolls or new paper.",
    },
    {
      title: "Paper Packaging",
      description: [
        "Milk/juice cartons, cardboard boxes, shoeboxes. Flatten/fold.",
        { not: "Envelopes & bound books → residual waste." },
      ],
      tip: "Paper packaging usually becomes new packaging.",
    },
    {
      title: "Glass Packaging",
      description: [
        "Clear/colored bottles & jars. Remove caps/corks.",
        { not: "Porcelain, ceramics & bulbs → bulky/hazardous waste." },
        { not: "Deposit bottles → return to store." },
      ],
      tip: "Glass becomes new bottles and jars.",
    },
    {
      title: "Residual Waste",
      description: [
        "Diapers, envelopes, dishcloths, snus, toothbrushes, hair.",
        { not: "No recyclable, hazardous or electrical waste." },
      ],
      tip: "Residual waste is used for electricity and heat.",
    },
    {
      title: "Deposit Bottles & Cans (Pant)",
      description: [
        "Return bottles and cans with the Pant logo at stores for a refund instead of recycling.",
      ],
      tip: "Pant saves resources and gives you money back.",
    },
  ] as WasteCategory[],
  ratingsIntro:
    "Your review matters! Please let us know of any problem during your stay and we will do our best to fix it. We strive for a 5 star experience!",
  // From 5 stars down to 1
  ratings: [
    "Perfection doesn’t exist, but we were happy!",
    "A few issues, but we still enjoyed our stay.",
    "Major issues, most likely won’t return.",
    "Close the house down!",
    "Burn it!",
  ],
};
const COPY: Copy<typeof en> = {
  en,
  sv: {
    sections: {
      home: "Välkommen hem",
      directions: "Hitta hit",
      stop: "Stopp på vägen",
      checkin: "Incheckning",
      wifi: "Wifi",
      kitchen: "Kök",
      howthingswork: "Så fungerar det",
      waste: "Sopor och återvinning",
      places: "Utflyktsmål",
      customs: "Svenska seder och bruk",
      rules: "Husregler",
      checkout: "Utcheckning",
      ratings: "Stjärnbetyg",
      hoststory: "Om värden",
    },
    customs: ["Inga skor inomhus", "Fika", "Alkohol säljs bara på Systembolaget"],
    shareTitle: (title) => `${title} – gästguide`,
    linkCopied: "Länken är kopierad!",
    linkCopiedText: "Länken till gästguiden är kopierad.",
    pdfSubtitle: "Gästguide",
    pdfFileName: (title) => `${title}-gästguide.pdf`,
    pdfSaved: "PDF:en är nedladdad",
    pdfSavedText: "Gästguiden är sparad!",
    loadingMap: "Laddar karta…",
    locations: "Platser:",
    wasteIntro: "Återvinning sparar råvaror och energi – allt du sorterar gör skillnad!",
    wasteCategories: [
      {
        title: "Matavfall",
        description: [
          "Frukt- och grönsaksrester, tepåsar, kaffesump, äggskal, köttben och lite hushållspapper.",
          { not: "Plast, snus, cigaretter, blommor eller ljus." },
        ],
        tip: "Matavfallet blir biogas och biogödsel.",
      },
      {
        title: "Plastförpackningar",
        description: [
          "Plastpåsar, flaskor, refillpaket, tuber, tråg, chipspåsar och frigolit.",
          { not: "Leksaker och möbler av plast → grovavfall." },
        ],
        tip: "Återvunnen plast blir nya påsar och återvinningskärl.",
      },
      {
        title: "Metallförpackningar",
        description: [
          "Burkar, tomma sprayburkar, tuber, kapsyler, lock och tomma färgburkar.",
          { not: "Burkar med färg- eller limrester → farligt avfall." },
          { not: "Skrot som stekpannor → grovavfall." },
        ],
        tip: "Återvunnen metall kan bli fälgar eller plåt.",
      },
      {
        title: "Tidningar och papper",
        description: [
          "Dags- och veckotidningar, tidskrifter, reklamblad och broschyrer.",
          { not: "Kuvert och inbundna böcker → restavfall." },
        ],
        tip: "Gamla tidningar blir hushållspapper eller nytt papper.",
      },
      {
        title: "Pappersförpackningar",
        description: [
          "Mjölk- och juicepaket, kartonger och skokartonger. Platta till eller vik ihop dem.",
          { not: "Kuvert och inbundna böcker → restavfall." },
        ],
        tip: "Pappersförpackningar blir oftast nya förpackningar.",
      },
      {
        title: "Glasförpackningar",
        description: [
          "Ofärgade och färgade flaskor och burkar. Ta bort kapsyler och korkar.",
          { not: "Porslin, keramik och glödlampor → grovavfall eller farligt avfall." },
          { not: "Pantflaskor → lämna dem i butiken." },
        ],
        tip: "Glaset blir nya flaskor och burkar.",
      },
      {
        title: "Restavfall",
        description: [
          "Blöjor, kuvert, disktrasor, snus, tandborstar och hår.",
          { not: "Inget som kan återvinnas, inget farligt avfall och inget elavfall." },
        ],
        tip: "Restavfallet blir el och värme.",
      },
      {
        title: "Pantflaskor och pantburkar",
        description: [
          "Lämna flaskor och burkar med pantmärket i butiken i stället för i återvinningen, så får du pengar tillbaka.",
        ],
        tip: "Panten sparar resurser och ger dig pengar tillbaka.",
      },
    ],
    ratingsIntro:
      "Ditt omdöme betyder mycket! Säg till om något inte fungerar under vistelsen, så gör vi vårt bästa för att fixa det. Vi siktar på fem stjärnor!",
    ratings: [
      "Perfektion finns inte, men vi var nöjda!",
      "Några problem, men vi trivdes ändå.",
      "Stora problem, vi kommer nog inte tillbaka.",
      "Stäng huset!",
      "Bränn ner det!",
    ],
  },
  de: {
    sections: {
      home: "Willkommen",
      directions: "Anfahrt",
      stop: "Zwischenstopps",
      checkin: "Check-in",
      wifi: "WLAN",
      kitchen: "Küche",
      howthingswork: "So funktioniert's",
      waste: "Müll & Recycling",
      places: "Ausflugsziele",
      customs: "Schwedische Bräuche",
      rules: "Hausregeln",
      checkout: "Check-out",
      ratings: "Sternebewertung",
      hoststory: "Über den Gastgeber",
    },
    customs: ["Keine Schuhe im Haus", "Fika-Tradition", "Alkohol gibt es nur im Systembolaget"],
    shareTitle: (title) => `${title} – Gästeinfo`,
    linkCopied: "Link kopiert!",
    linkCopiedText: "Der Link zur Gästeinfo wurde kopiert.",
    pdfSubtitle: "Gästeinfo",
    pdfFileName: (title) => `${title}-Gästeinfo.pdf`,
    pdfSaved: "PDF heruntergeladen",
    pdfSavedText: "Die Gästeinfo wurde gespeichert!",
    loadingMap: "Karte wird geladen…",
    locations: "Orte:",
    wasteIntro: "Recycling spart Rohstoffe und Energie – jedes Teil, das du trennst, macht einen Unterschied!",
    wasteCategories: [
      {
        title: "Bioabfall",
        description: [
          "Obst- und Gemüsereste, Teebeutel, Kaffeesatz, Eierschalen, Fleischknochen und etwas Küchenpapier.",
          { not: "Plastik, Snus, Zigaretten, Blumen oder Kerzen." },
        ],
        tip: "Aus Bioabfall werden Biogas und Biodünger.",
      },
      {
        title: "Plastikverpackungen",
        description: [
          "Plastiktüten, Flaschen, Nachfüllpacks, Tuben, Schalen, Chipstüten und Styropor.",
          { not: "Spielzeug und Möbel aus Plastik → Sperrmüll." },
        ],
        tip: "Aus recyceltem Plastik werden Tüten und Sammelbehälter.",
      },
      {
        title: "Metallverpackungen",
        description: [
          "Dosen, leere Spraydosen, Tuben, Kronkorken, Deckel und leere Farbdosen.",
          { not: "Dosen mit Farb- oder Kleberresten → Sondermüll." },
          { not: "Altmetall wie Pfannen → Sperrmüll." },
        ],
        tip: "Aus recyceltem Metall werden Felgen oder Bleche.",
      },
      {
        title: "Zeitungen & Papier",
        description: [
          "Tages- und Wochenzeitungen, Zeitschriften, Prospekte und Broschüren.",
          { not: "Briefumschläge & gebundene Bücher → Restmüll." },
        ],
        tip: "Aus alten Zeitungen werden Küchenrollen oder neues Papier.",
      },
      {
        title: "Papierverpackungen",
        description: [
          "Milch- und Saftkartons, Pappkartons und Schuhkartons. Bitte flach zusammenfalten.",
          { not: "Briefumschläge & gebundene Bücher → Restmüll." },
        ],
        tip: "Aus Papierverpackungen werden meist neue Verpackungen.",
      },
      {
        title: "Glasverpackungen",
        description: [
          "Flaschen & Gläser aus Weiß- und Buntglas. Deckel und Korken entfernen.",
          { not: "Porzellan, Keramik & Glühbirnen → Sperrmüll bzw. Sondermüll." },
          { not: "Pfandflaschen → zurück in den Laden." },
        ],
        tip: "Aus Glas werden neue Flaschen und Gläser.",
      },
      {
        title: "Restmüll",
        description: [
          "Windeln, Briefumschläge, Spültücher, Snus, Zahnbürsten und Haare.",
          { not: "Keine Wertstoffe, kein Sondermüll und kein Elektroschrott." },
        ],
        tip: "Aus Restmüll werden Strom und Wärme.",
      },
      {
        title: "Pfandflaschen & -dosen (Pant)",
        description: [
          "Gib Flaschen und Dosen mit dem Pant-Logo im Laden zurück, statt sie zu recyceln – so bekommst du das Pfand zurück.",
        ],
        tip: "Pant schont Ressourcen und du bekommst Geld zurück.",
      },
    ],
    ratingsIntro:
      "Deine Bewertung ist uns wichtig! Sag uns bitte Bescheid, wenn während deines Aufenthalts etwas nicht stimmt – wir tun unser Bestes, um es zu beheben. Unser Ziel sind fünf Sterne!",
    ratings: [
      "Perfekt gibt es nicht, aber wir waren glücklich!",
      "Ein paar Probleme, aber uns hat es trotzdem gefallen.",
      "Große Probleme, wir kommen wohl nicht wieder.",
      "Macht das Haus dicht!",
      "Abfackeln!",
    ],
  },
};

const WASTE_ICONS = [Apple, Trash2, Cog, Newspaper, Package, Wine, Skull, Recycle];

type SectionType = "text" | "list" | "checkbox" | "custom";
type BlockType = "text" | "list" | "checkbox" | "map";

interface GuidebookBlock {
  id: string;
  type: BlockType;
  title?: string;
  content?: string;
  items?: string[];
  mapPins?: GuidePin[];
}

interface GuidePin {
  lat: number;
  lng: number;
  label: string;
  address?: string;
  geocoded?: boolean;
}

interface GuidebookSection {
  id: string;
  icon: ElementType;
  title: string;
  blocks?: GuidebookBlock[];
  image_url?: string;
}

interface GuideSection {
  id: string;
  title: string;
  content?: string;
  items?: string[];
  type?: SectionType;
  image_url?: string;
  icon?: ElementType;
  blocks?: GuidebookBlock[];
}

/** "Translated from Swedish · Show original", when the host's guide is shown translated */
interface GuideTranslationToggle {
  /** The language the host wrote the guide in */
  from: Lang | "other";
  /** Whether the host's own words are shown */
  showingOriginal: boolean;
  onToggle: () => void;
}

interface GuestGuideDialogProps {
  isOpen: boolean;
  onClose: () => void;
  property: Property;
  initialSectionId?: string;
  /** Inside the dialog, since the open dialog covers the page behind it */
  translationToggle?: GuideTranslationToggle;
}

// Shown even when the host hasn't written them: true for any stay in Sweden
const GENERAL_SECTION_IDS = ["waste", "customs", "ratings"];

// The editor saves blocks the host left empty (new guides start with example
// text in the fields, not real text), so guests only get what was filled in
const filledItems = (items?: string[]) => (items || []).filter((item) => item?.trim());
// A new pin starts at a default point (mid-Sweden, or Gothenburg in older
// guides) and gets its coordinates once the host's address is found
// (`geocoded`). Guests only get pins that were placed that way, never one
// still sitting at its starting point
const DEFAULT_PIN_POINTS = [
  [62.4, 16.5],
  [57.7, 12.0],
];
const placedPins = (pins?: GuidePin[]) =>
  (pins || []).filter((pin) =>
    pin.geocoded ??
    (!!pin.address?.trim() && !DEFAULT_PIN_POINTS.some(([lat, lng]) => pin.lat === lat && pin.lng === lng)));
const isFilledBlock = (block: GuidebookBlock) =>
  (block.type === "text" && !!block.content?.trim()) ||
  ((block.type === "list" || block.type === "checkbox") && filledItems(block.items).length > 0) ||
  (block.type === "map" && placedPins(block.mapPins).length > 0);
const pinName = (pin: GuidePin) => pin.label?.trim() || pin.address || "";

const GuestGuideDialog = ({ isOpen, onClose, property, initialSectionId, translationToggle }: GuestGuideDialogProps) => {
  const { toast } = useToast();
  const [activeIndex, setActiveIndex] = useState(0);
  const lang = useLang();
  const t = COPY[lang];

  // Order, titles and icons only: the text is the host's. Only the customs hold
  // for every stay in Sweden (they used to carry the original Lerum cabins' facts)
  const defaultSections: GuideSection[] = [
    { id: "home", title: t.sections.home, icon: Home, type: "text" },
    { id: "directions", title: t.sections.directions, icon: MapPin, type: "list" },
    { id: "stop", title: t.sections.stop, icon: Coffee, type: "list" },
    { id: "checkin", title: t.sections.checkin, icon: Key, type: "list" },
    { id: "wifi", title: t.sections.wifi, icon: Wifi, type: "list" },
    { id: "kitchen", title: t.sections.kitchen, icon: Utensils, type: "list" },
    { id: "howthingswork", title: t.sections.howthingswork, icon: Cog, type: "checkbox" },
    { id: "waste", title: t.sections.waste, icon: Recycle, type: "custom" },
    { id: "places", title: t.sections.places, icon: Landmark, type: "list" },
    { id: "customs", title: t.sections.customs, icon: BookOpen, type: "list", items: t.customs },
    { id: "rules", title: t.sections.rules, icon: Shield, type: "custom" },
    { id: "checkout", title: t.sections.checkout, icon: LogOut, type: "checkbox" },
    { id: "ratings", title: t.sections.ratings, icon: Star, type: "custom" },
    { id: "hoststory", title: t.sections.hoststory, icon: Heart, type: "text" },
  ];

  const customSections = (property.guidebook_sections as any[]) || [];

  // Only sections the host has filled in, plus the general ones that hold for
  // every Swedish stay; the placeholder defaults are not shown to guests
  const allSections = useMemo(() => {
    // Only block types renderSectionContent can show (the editor also saves e.g. "custom-recycling")
    const hasContent = (custom: any) =>
      (custom.blocks || []).some(isFilledBlock) ||
      custom.content?.trim() ||
      custom.items?.some((i: string) => i?.trim());
    return defaultSections.flatMap((section) => {
      const custom = customSections.find((s: any) => s.id === section.id);
      if (custom && hasContent(custom)) {
        // The host's text replaces the default's, even where the host left a part out
        return [{
          ...section,
          ...custom,
          items: custom.items,
          content: custom.content,
          icon: section.icon,
          blocks: custom.blocks || undefined,
        }];
      }
      // House rules always: the host sets them for the listing (Rules tab)
      return GENERAL_SECTION_IDS.includes(section.id) || section.id === "rules" ? [section] : [];
    });
  }, [customSections, t]);

  // Set initial section when dialog opens. Keyed on the section ids, not the
  // sections: the translated and the original listing have the same ones, so
  // "Show original" (or the translation arriving) keeps the guest where they are
  const sectionIds = allSections.map((s) => s.id).join("\n");
  useEffect(() => {
    if (isOpen && initialSectionId) {
      const index = allSections.findIndex((s) => s.id === initialSectionId);
      if (index !== -1) {
        setActiveIndex(index);
      }
    } else if (isOpen) {
      setActiveIndex(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialSectionId, sectionIds]);

  const getIndexById = (id: string) => allSections.findIndex((s) => s.id === id);

  const shareGuide = async () => {
    // The guide in the page's language ("/sv/property/…/guide")
    const guideUrl = `${window.location.origin}${localizedPath(`/property/${property.id}/guide`, lang)}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: t.shareTitle(property.title), url: guideUrl });
      } else {
        await navigator.clipboard.writeText(guideUrl);
        toast({ title: t.linkCopied, description: t.linkCopiedText });
      }
    } catch {
      await navigator.clipboard.writeText(guideUrl);
      toast({ title: t.linkCopied, description: t.linkCopiedText });
    }
  };

  const exportToPDF = async () => {
    // Loaded on demand: jsPDF (with html2canvas) is ~400 kB
    const { default: jsPDF } = await import("jspdf");
    const pdf = new jsPDF();
    let yPosition = 20;

    // Cover page
    pdf.setFontSize(24);
    pdf.text(property.title, 20, yPosition);
    yPosition += 10;
    pdf.setFontSize(12);
    pdf.text(t.pdfSubtitle, 20, yPosition);
    yPosition += 20;

    const keepOnPage = () => {
      if (yPosition > 270) {
        pdf.addPage();
        yPosition = 20;
      }
    };
    // Line by line, so long host texts continue on the next page
    const printLines = (text: string, x: number, width: number) => {
      (pdf.splitTextToSize(text, width) as string[]).forEach((line) => {
        keepOnPage();
        pdf.text(line, x, yPosition);
        yPosition += 5;
      });
    };
    const printItems = (items: string[], bullet: string) => {
      items.forEach((item) => {
        printLines(`${bullet} ${item}`, 25, 165);
        yPosition += 2;
      });
      yPosition += 5;
    };

    // Add sections: what the guide shows, including the host's blocks
    allSections.forEach((section) => {
      keepOnPage();
      pdf.setFontSize(16);
      pdf.text(section.title, 20, yPosition);
      yPosition += 10;

      pdf.setFontSize(10);
      const blocks = (section.blocks || []).filter(isFilledBlock);
      if (blocks.length > 0) {
        blocks.forEach((block) => {
          if (block.title?.trim()) {
            keepOnPage();
            pdf.setFontSize(12);
            pdf.text(block.title, 20, yPosition);
            pdf.setFontSize(10);
            yPosition += 7;
          }
          if (block.type === "text") {
            printLines(block.content || "", 20, 170);
            yPosition += 5;
          }
          if (block.type === "list") printItems(filledItems(block.items), "•");
          if (block.type === "checkbox") printItems(filledItems(block.items), "[ ]");
          if (block.type === "map") {
            printItems(
              filledItems(placedPins(block.mapPins).map((pin) =>
                pin.label?.trim() && pin.address ? `${pin.label}, ${pin.address}` : pinName(pin))),
              "•",
            );
          }
        });
        return;
      }

      if (section.content) {
        printLines(section.content, 20, 170);
        yPosition += 5;
      }
      if (section.items) printItems(section.items, "•");
    });

    pdf.save(t.pdfFileName(property.title));
    toast({ title: t.pdfSaved, description: t.pdfSavedText });
  };

  const renderPinMap = (pins: GuidePin[]) => {
    if (pins.length === 0) return null;
    return (
      <div className="mt-4">
        <div className="h-[400px] rounded-lg overflow-hidden border">
          <Suspense fallback={
            <div className="h-full bg-muted flex items-center justify-center">
              <p className="text-muted-foreground">{t.loadingMap}</p>
            </div>
          }>
            <LeafletPropertyMapBasic
              position={[pins[0].lat, pins[0].lng] as [number, number]}
              propertyTitle={pinName(pins[0])}
              googleMapsUrl={`https://www.google.com/maps/search/?api=1&query=${pins[0].lat},${pins[0].lng}`}
              routePositions={pins.slice(1).map(pin => [pin.lat, pin.lng] as [number, number])}
            />
          </Suspense>
        </div>
        <div className="mt-4 space-y-2">
          <h4 className="font-medium text-sm">{t.locations}</h4>
          <ul className="space-y-1">
            {pins.map((pin, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm">
                <MapPin className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <span className="font-medium">{pinName(pin)}</span>
                  {pin.address && pin.label?.trim() && <p className="text-muted-foreground text-xs">{pin.address}</p>}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  };

  const renderSectionContent = (section: GuideSection) => {
    // The listing's house rules (as the booking form showed them), then what
    // the host wrote in the guide's rules section, if anything
    if (section.id === "rules") {
      const hostWrote =
        (section.blocks || []).some(isFilledBlock) || section.content?.trim() || section.items?.some((i) => i?.trim());
      return (
        <div className="space-y-6">
          <ul className="space-y-2">
            {houseRuleLines(property, lang).map((line) => (
              <li key={line} className="flex items-start gap-2">
                <CheckSquare className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                <span className="text-muted-foreground">{line}</span>
              </li>
            ))}
          </ul>
          {hostWrote && renderSectionContent({ ...section, id: "rules-from-host" })}
        </div>
      );
    }

    // If the section has blocks (new format from GuidebookEditorEnhanced), render those
    const blocks = (section.blocks || []).filter(isFilledBlock);
    if (blocks.length > 0) {
      return (
        <div className="space-y-6">
          {blocks.map((block) => (
            <div key={block.id}>
              {block.title && <h3 className="font-semibold text-lg mb-2">{block.title}</h3>}

              {block.type === "text" && block.content && (
                <p className="text-muted-foreground whitespace-pre-wrap">{block.content}</p>
              )}

              {block.type === "list" && (
                <ul className="list-disc pl-5 space-y-2">
                  {filledItems(block.items).map((item, idx) => (
                    <li key={idx} className="text-muted-foreground">{item}</li>
                  ))}
                </ul>
              )}

              {block.type === "checkbox" && (
                <ul className="space-y-2">
                  {filledItems(block.items).map((item, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      <CheckSquare className="h-4 w-4 text-primary flex-shrink-0" />
                      <span className="text-muted-foreground">{item}</span>
                    </li>
                  ))}
                </ul>
              )}
              
              {block.type === "map" && renderPinMap(placedPins(block.mapPins))}
            </div>
          ))}
        </div>
      );
    }

    // Fallback to old format for backwards compatibility
    if (section.id === "waste") {
      const wasteCategories = t.wasteCategories.map((cat, i) => ({ ...cat, icon: WASTE_ICONS[i] }));

      return (
        <div className="grid gap-6">
          <p className="text-muted-foreground">
            {t.wasteIntro}
          </p>

          {wasteCategories.map((cat, index) => {
            const Icon = cat.icon;
            return (
              <div
                key={index}
                className="flex flex-col sm:flex-row gap-4 p-6 bg-card border rounded-lg hover:shadow-md transition-shadow"
              >
                <div className="flex-shrink-0 p-3 bg-primary/10 rounded-lg self-start">
                  <Icon className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-1">{cat.title}</h3>
                  {cat.description.map((desc, i) =>
                    typeof desc === "string" ? (
                      <p key={i} className="flex items-center gap-2 text-sm mb-1">
                        <CheckCircle className="h-4 w-4 text-success" />
                        <span className="text-muted-foreground">{desc}</span>
                      </p>
                    ) : (
                      <p key={i} className="flex items-center gap-2 text-sm mb-1">
                        <Ban className="h-4 w-4 text-destructive" />
                        <span className="text-muted-foreground">{desc.not}</span>
                      </p>
                    )
                  )}
                  <p className="text-xs text-primary font-medium mt-1">{cat.tip}</p>
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    if (section.id === "ratings") {
      const ratingInfo = t.ratings.map((text, i) => ({ stars: 5 - i, text }));
      return (
        <div className="space-y-6">
          <p className="text-muted-foreground">
            {t.ratingsIntro}
          </p>
          {ratingInfo.map((rating, index) => (
            <div key={index} className="flex items-start gap-3">
              <div className="flex gap-1 mt-1">
                {[...Array(rating.stars)].map((_, i) => (
                  <Star key={i} className="h-5 w-5 text-[#8B4513]" fill="#8B4513" />
                ))}
              </div>
              <p className="text-muted-foreground">{rating.text}</p>
            </div>
          ))}
        </div>
      );
    }

    if (section.type === "list" && section.items) {
      return <ul className="list-disc pl-5 space-y-2">{section.items.map((item, idx) => <li key={idx}>{item}</li>)}</ul>;
    }
    if (section.type === "checkbox" && section.items) {
      return (
        <ul className="space-y-2">
          {section.items.map((item, idx) => (
            <li key={idx} className="flex items-center gap-2">
              <CheckSquare className="h-4 w-4 text-primary" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      );
    }
    return <p className="text-muted-foreground">{section.content}</p>;
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl h-[90vh] flex flex-col p-0">
        <div className="flex-1 flex m-0 h-full">
          <TooltipProvider>
            <nav className="w-28 border-r border-muted/20 bg-card/50 flex flex-col items-center py-6 gap-6 overflow-y-auto h-full">
              {allSections.map((section, index) => {
                const isActive = activeIndex === index;
                const Icon = section.icon || Info;
                return (
                  <Tooltip key={section.id}>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => setActiveIndex(index)}
                        className={`p-3 rounded-xl flex items-center justify-center transition-all ${
                          isActive ? "bg-primary text-white scale-110" : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
                        }`}
                      >
                        <Icon className="h-6 w-6" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right">{section.title}</TooltipContent>
                  </Tooltip>
                );
              })}
            </nav>
          </TooltipProvider>

          <div className="flex-1 overflow-y-auto px-8 py-6 relative h-full">
            <DialogHeader className="mb-6">
              <div className="flex items-start justify-between">
                <DialogTitle className="text-3xl font-bold">{allSections[activeIndex].title}</DialogTitle>
                <div className="flex gap-2 mt-1">
                  <Button variant="outline" size="icon" onClick={shareGuide}><Share2 className="h-4 w-4" /></Button>
                  <Button variant="outline" size="icon" onClick={exportToPDF}><Download className="h-4 w-4" /></Button>
                </div>
              </div>
              {translationToggle && (
                <p className="text-xs text-muted-foreground">
                  {!translationToggle.showingOriginal && <>{translatedFromText(lang, translationToggle.from)} · </>}
                  <button
                    type="button"
                    onClick={translationToggle.onToggle}
                    className="underline underline-offset-2 hover:text-foreground"
                  >
                    {translationToggle.showingOriginal ? SHOW_ORIGINAL[lang].translation : SHOW_ORIGINAL[lang].original}
                  </button>
                </p>
              )}
            </DialogHeader>

            <div className="prose prose-sm max-w-none text-muted-foreground leading-relaxed">
              {renderSectionContent(allSections[activeIndex])}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GuestGuideDialog;
