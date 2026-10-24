import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { LucideIcon } from "lucide-react";
import {
  DollarSign,
  Camera,
  FileText,
  Home,
  MessageCircle,
  HelpCircle,
  CheckSquare,
  Info,
  Users,
  Star,
  Lightbulb,
  Calendar,
  Percent,
  TrendingUp,
  Target,
  BarChart3,
  Globe,
  XCircle,
  CheckCircle2,
} from "lucide-react";

/* ---------- Typer ---------- */

type PriceGuideBlock =
  | {
      type: "intro";
      title: string;
      icon?: string;
      body: string;
      serviceFeeExample?: {
        base: string;
        fee: string;
        guest: string;
        note?: string;
      };
    }
  | {
      type: "tiers";
      title: string;
      items: Array<{
        tier: string;
        range: string;
        icon?: string;
        color?: string; // tailwind text-färgklass
        points: string[];
      }>;
    }
  | {
      type: "factors";
      title: string;
      items: Array<{
        icon?: string;
        title: string;
        text: string;
      }>;
    }
  | {
      type: "psychology";
      title: string;
      items: Array<{ title: string; text: string }>;
    }
  | {
      type: "dynamic";
      title: string;
      items: Array<{
        icon?: string;
        title: string;
        text: string;
      }>;
    }
  | {
      type: "currency";
      title: string;
      currencies: Array<{ currency: string; amount: string }>;
      note?: string;
    }
  | {
      type: "final";
      title: string;
      tips: string[];
    };

type SectionContent = {
  title: string;
  description?: string;
  // Price Guide-specifikt
  sections?: PriceGuideBlock[];
  formula?: string;
  example?: string;
  // Övriga flikar
  tips?: string[];
  photoOrder?: string[];
  checklist?: string[];
  examples?: { good: string; bad: string };
  templates?: Record<string, string>;
  faqs?: Array<{ q: string; a: string }>;
  rooms?: Record<string, string[]>;
  final?: string[];
};

type SectionDef = {
  id: string;
  title: string;
  icon: LucideIcon;
  content: SectionContent;
};

interface HostGuidebookDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

/* ---------- Ikon-mappning från sträng → komponent ---------- */
const iconFromName = (name?: string): LucideIcon => {
  switch ((name || "").toLowerCase()) {
    case "dollarsign":
      return DollarSign;
    case "users":
      return Users;
    case "star":
      return Star;
    case "lightbulb":
      return Lightbulb;
    case "calendar":
      return Calendar;
    case "percent":
      return Percent;
    case "trendingup":
      return TrendingUp;
    case "target":
      return Target;
    case "barchart3":
      return BarChart3;
    case "globe":
      return Globe;
    default:
      return Info;
  }
};

/* ---------- Data ---------- */
const sections: SectionDef[] = [
  {
    id: "price-guide",
    title: "Prisguide",
    icon: DollarSign,
    content: {
      title: "Prisguide för värdar",
      description:
        "Så sätter du priser som ger fler bokningar och högre intäkter.",
      sections: [
        {
          type: "intro",
          title: "Förstå prissättningen",
          icon: "DollarSign",
          body:
            "Att sätta rätt pris på ditt boende är både konst och vetenskap, och priset kan avgöra hur det går för dig som värd. Här får du en överblick över marknaden, hur gäster tänker och olika sätt att sätta priser.",
          serviceFeeExample: {
            base: "2 000 kr",
            fee: "200 kr (10 %)",
            guest: "2 200 kr/natt",
            note:
              "Gästen betalar en serviceavgift ovanpå ditt pris (10 %, eller 5 % under erbjudandet för nya värdar). Gästen ser totalpriset inklusive avgiften. Du får hela ditt pris, utbetalt dagen efter incheckning, eller 85 dagar efter att gästen betalade om det kommer först. Din exakta avgift ser du under Utbetalningar via Stripe.",
          },
        },
        {
          type: "tiers",
          title: "Prisnivåer i Sverige",
          items: [
            {
              tier: "Budget",
              range: "800–1 500 kr/natt",
              icon: "Users",
              color: "text-blue-600",
              points: [
                "Grundläggande bekvämligheter",
                "Delade eller enkla egna utrymmen",
                "Landsbygd eller mindre centralt läge",
                "Passar gäster med liten budget",
              ],
            },
            {
              tier: "Mellanklass",
              range: "1 500–3 500 kr/natt",
              icon: "Star",
              color: "text-amber-600",
              points: [
                "Egna utrymmen",
                "Bra läge och bra bekvämligheter",
                "Det mest populära segmentet",
                "Passar familjer och par",
              ],
            },
            {
              tier: "Premium",
              range: "3 500+ kr/natt",
              icon: "Lightbulb",
              color: "text-purple-600",
              points: [
                "Lyxiga bekvämligheter (bastu, badtunna m.m.)",
                "Unikt läge eller toppläge",
                "Påkostad inredning och design",
                "En gästupplevelse utöver det vanliga",
              ],
            },
          ],
        },
        {
          type: "factors",
          title: "Det som påverkar priset mest",
          items: [
            {
              icon: "Users",
              title: "Antal sovrum",
              text:
                "Varje extra sovrum kan ge cirka 500–1 000 kr mer per natt. Tänk på hur många som får plats totalt och på flexibla sovplatser.",
            },
            {
              icon: "Calendar",
              title: "Säsong",
              text:
                "Sommaren (juni–augusti) och helgdagar ger högre priser. Under mellansäsong kan du behöva sänka med 20–30 %.",
            },
            {
              icon: "Target",
              title: "Läge",
              text:
                "Närhet till sevärdheter och natur spelar roll. Sjötomt, fjällutsikt eller ett läge i skogen motiverar högre priser.",
            },
            {
              icon: "Star",
              title: "Bekvämligheter och unika detaljer",
              text:
                "Bastu, badtunna, tillgång till sjön eller en speciell design kan höja grundpriset med 30–50 %.",
            },
            {
              icon: "BarChart3",
              title: "Konkurrensen i området",
              text:
                "Kolla in jämförbara boenden. Titta på vilka priser som faktiskt bokas, inte bara på de utannonserade priserna.",
            },
            {
              icon: "TrendingUp",
              title: "Omdömen och betyg",
              text:
                "Ett snittbetyg på 4,8 eller högre kan motivera 10–20 % högre priser. God service lönar sig mer och mer över tid.",
            },
          ],
        },
        {
          type: "psychology",
          title: "Prispsykologi",
          items: [
            {
              title: "Charmpriser (som slutar på 9)",
              text:
                "2 499 kr känns billigare än 2 500 kr. Det ger ofta fler bokningar.",
            },
            {
              title: "Ankarpriser",
              text:
                "Visa ett högre ankarpris (t.ex. helg eller högsäsong) så känns vardagar och lågsäsong som ett fynd.",
            },
            {
              title: "Jämna priser för lyx",
              text:
                "Exklusiva boenden kan använda jämna belopp för att signalera självförtroende och exklusivitet.",
            },
          ],
        },
        {
          type: "dynamic",
          title: "Rörliga priser",
          items: [
            {
              icon: "Calendar",
              title: "Helg eller vardag",
              text:
                "Ta 20–40 % mer för fredag–lördag. Fritidsresenärer har en annan budget än de som bokar på vardagar.",
            },
            {
              icon: "Percent",
              title: "Rabatt för längre vistelser",
              text:
                "Ge 10–15 % rabatt för en vecka och 20–25 % för en månad. Längre vistelser ger färre gästbyten och lägre kostnader.",
            },
            {
              icon: "TrendingUp",
              title: "Sista minuten och tidig bokning",
              text:
                "Sänk med 15–25 % inom 2 veckor för att fylla luckor. Belöna dem som bokar tidigt med 5–10 % rabatt.",
            },
            {
              icon: "Star",
              title: "Högre pris i högsäsong",
              text:
                "Ta 30–50 % mer under midsommar, jul och nyår samt under skolloven.",
            },
          ],
        },
        {
          type: "currency",
          title: "Valuta och internationella gäster",
          currencies: [
            { currency: "EUR", amount: "~220" },
            { currency: "USD", amount: "~240" },
            { currency: "GBP", amount: "~190" },
            { currency: "NOK", amount: "~2 650" },
          ],
          note:
            "Priser som ser jämna ut i kronor kan se konstiga ut i andra valutor. Tänk på vanliga prisnivåer på dina viktigaste marknader.",
        },
        {
          type: "final",
          title: "Sista tipsen",
          tips: [
            "Se över och justera priserna var 2–4:e vecka",
            "Testa olika prisnivåer när efterfrågan är låg",
            "Tävla inte om att vara billigast, fokusera på värdet",
            "Bra bilder och texter motiverar ett högre pris",
            "Svara snabbt på förfrågningar så får du bättre betyg",
            "Var tydlig med vad som ingår",
            "Erbjud gärna tillval (ved, frukost, sen utcheckning)",
          ],
        },
      ],
      formula: "Gästen betalar: ditt pris + gästens serviceavgift (10 %, eller 5 % under erbjudandet för nya värdar)",
      example:
        "Om du sätter 1 000 kr/natt ser gästen 1 100 kr/natt och du får 1 000 kr.",
    },
  },
  {
    id: "gallery",
    title: "Fotoguide",
    icon: Camera,
    content: {
      title: "Ta bra bilder på ditt boende",
      description: "Bra bilder är avgörande för att locka gäster.",
      tips: [
        "Fotografera under gyllene timmen (morgon- eller kvällsljus)",
        "Städa och plocka undan överallt innan du fotograferar",
        "Använd vidvinkelobjektiv inomhus",
        "Ta en riktigt bra huvudbild, med den mest fantastiska vyn",
        "Markera din bästa bild som huvudbild i galleriet",
        "Visa bekvämligheterna i bruk (eld i kaminen, dukat bord)",
        "Ta med utsidan och naturen runt omkring",
        "Fotografera från flera vinklar",
      ],
      photoOrder: [
        "1. Huvudbild (markerad i galleriet)",
        "2. Utsida/entré",
        "3. Vardagsrum",
        "4. Kök",
        "5. Sovrum",
        "6. Badrum",
        "7. Uteplatser och trädgård",
        "8. Extra bekvämligheter (bastu, badtunna m.m.)",
      ],
    },
  },
  {
    id: "basic-info",
    title: "Grundinformation",
    icon: FileText,
    content: {
      title: "Skriv en bra annons",
      description: "Rubriken och beskrivningen är det första gästerna ser.",
      tips: [
        "Rubrik: Håll den under 60 tecken",
        "Rubrik: Ta med plats och typ av boende",
        "Rubrik: Lyft fram det som är unikt",
        "Beskrivning: Börja med ditt starkaste säljargument",
        "Beskrivning: Var konkret (inte bara \"mysigt\")",
        "Beskrivning: Nämn sevärdheter i närheten",
        "Beskrivning: Var ärlig om utrymmet",
        "Beskrivning: Berätta vad som gör just ditt boende speciellt",
      ],
      examples: {
        good: "Sjöstuga med egen bastu – Åsunden",
        bad: "Fint hus",
      },
    },
  },
  {
    id: "house-prep",
    title: "Förbered boendet",
    icon: Home,
    content: {
      title: "Gör ditt hem redo",
      description: "Så gör du boendet redo för gäster.",
      checklist: [
        "Storstäda överallt (se Städchecklista)",
        "Rena lakan och handdukar",
        "Kontrollera att alla apparater fungerar",
        "Fyll på med det grundläggande (toalettpapper, tvål m.m.)",
        "Tydliga instruktioner för värme, varmvatten och wifi",
        "Nödnummer och kontaktuppgifter väl synliga",
        "Ta bort personliga värdesaker",
        "Se till att det finns bra belysning överallt",
        "Testa brandvarnare och brandsläckare",
        "Lägg fram lokala kartor och restaurangtips",
      ],
    },
  },
  {
    id: "guest-communication",
    title: "Kontakt med gäster",
    icon: MessageCircle,
    content: {
      title: "Så håller du kontakten med gästerna",
      description: "Tips för riktigt bra gästservice.",
      tips: [
        "Svara på förfrågningar inom 2 timmar",
        "Skicka incheckningsinformation 24 timmar före ankomst",
        "Var nåbar vid incheckningen om gästerna har frågor",
        "Hör av dig efter första natten och kolla att allt är bra",
        "Ge tydliga instruktioner om allt",
        "Ligg steget före när det gäller möjliga problem",
        "Be om synpunkter under och efter vistelsen",
        "Hantera klagomål snabbt och professionellt",
      ],
      templates: {
        välkomst: "Välkommen! Här är allt du behöver veta inför incheckningen...",
        incheckning: "Vi hoppas att du har kommit fram ordentligt. Är allt bra?",
        utcheckning: "Tack för att du bodde hos oss! Trevlig resa hem!",
      },
    },
  },
  {
    id: "common-problems",
    title: "Vanliga problem",
    icon: HelpCircle,
    content: {
      title: "Frågor och lösningar",
      description: "Snabba lösningar på vanliga problem för värdar.",
      faqs: [
        {
          q: "Gästen hittar inte nyckelboxen",
          a: "Ge tydliga bilder och en detaljerad vägbeskrivning. Nämn landmärken. Ring gärna ett välkomstsamtal.",
        },
        {
          q: "Wifi fungerar inte",
          a: "Skriv i gästguiden var routern står och hur man startar om den. Ha en reserv, till exempel en mobil surfpunkt.",
        },
        {
          q: "Problem med värme eller varmvatten",
          a: "Ge detaljerade instruktioner med bilder. Ha en lokal hantverkare som kan rycka in.",
        },
        {
          q: "Grannarna klagar på oväsen",
          a: "Sätt tydliga husregler. Påminn gästerna före ankomst. Agera direkt om något händer.",
        },
        {
          q: "Gästen vill avboka",
          a: "Be gästen kontakta Nordic Getaways: vi sköter avbokningar och återbetalningar. Gästen får tillbaka det som din avbokningsregel ger (du väljer den under Regler; Standard ger 90 % av ditt pris mer än 21 dagar före ankomst, 50 % 8–21 dagar före och inget inom 7 dagar). Återbetalningen dras från bokningens utbetalning. Gästens serviceavgift betalas inte tillbaka.",
        },
        {
          q: "Du måste avboka en bokning",
          a: "Kontakta Nordic Getaways direkt. Gästen får tillbaka allt, även serviceavgiften. Du får inget betalt för bokningen, och kortavgiften för den dras från din nästa utbetalning (du ser den under Utbetalningar via Stripe).",
        },
      ],
    },
  },
  {
    id: "cleaning-checklist",
    title: "Städchecklista",
    icon: CheckSquare,
    content: {
      title: "Städning mellan gäster",
      description: "Checklista steg för steg inför nästa gäst.",
      rooms: {
        Kök: [
          "Torka av alla ytor och bänkar",
          "Rengör alla apparater in- och utvändigt",
          "Töm och rengör kylskåpet",
          "Kontrollera att all disk är ren och undanplockad",
          "Fyll på kaffe, te och basvaror",
          "Töm soporna och återvinningen",
          "Sopa och moppa golvet",
        ],
        Badrum: [
          "Skrubba toalett, handfat och dusch/badkar",
          "Putsa speglar och blandare",
          "Fyll på toalettpapper, tvål och schampo",
          "Tvätta badrumsmattorna och byt handdukar",
          "Töm soporna",
          "Kolla efter hårstrån och rensa avloppen",
        ],
        Sovrum: [
          "Byt alla lakan och örngott",
          "Kontrollera madrassernas skick",
          "Damma alla ytor",
          "Dammsug under sängen",
          "Putsa fönster vid behov",
          "Kontrollera att garderoberna är tomma",
        ],
        Vardagsrum: [
          "Dammsug alla golv och mattor",
          "Damma alla ytor och prydnadssaker",
          "Fluffa kuddar och ställ i ordning möblerna",
          "Putsa fönster och speglar",
          "Kontrollera att fjärrkontrollerna fungerar",
          "Lägg tidningar och böcker prydligt",
        ],
        Utomhus: [
          "Sopa altanen eller verandan",
          "Rengör utemöblerna",
          "Töm soporna utomhus",
          "Kontrollera att grillen är ren (om det finns en)",
          "Se till att gångarna är fria",
        ],
      },
      final: [
        "Kontrollera att alla lampor fungerar",
        "Ställ in termostaten",
        "Lås alla fönster och dörrar",
        "Ta bilder för din egen dokumentation",
        "Lägg tillbaka nyckeln i nyckelboxen",
      ],
    },
  },
];

/* ---------- Komponent ---------- */

const HostGuidebookDialog = ({ isOpen, onClose }: HostGuidebookDialogProps) => {
  const [activeIndex, setActiveIndex] = useState(0);

  const renderPriceGuideBlocks = (blocks: PriceGuideBlock[]) => {
    return (
      <div className="space-y-8">
        {blocks.map((block, idx) => {
          if (block.type === "intro") {
            const Icon = iconFromName(block.icon);
            return (
              <section key={`intro-${idx}`} className="space-y-4">
                <h4 className="text-xl font-semibold flex items-center gap-2">
                  <Icon className="h-6 w-6 text-primary" />
                  {block.title}
                </h4>
                <p className="text-muted-foreground">{block.body}</p>
                {block.serviceFeeExample && (
                  <div className="bg-primary/10 p-4 rounded-lg border border-primary/20">
                    <p className="font-semibold text-primary mb-2">Exempel på gästens serviceavgift (10 %)</p>
                    <div className="text-sm space-y-1">
                      <div className="flex justify-between">
                        <span>Ditt pris per natt:</span>
                        <span className="font-semibold">{block.serviceFeeExample.base}</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>Gästens serviceavgift:</span>
                        <span>+ {block.serviceFeeExample.fee}</span>
                      </div>
                      <div className="flex justify-between border-t pt-1 font-bold">
                        <span>Gästen betalar:</span>
                        <span className="text-primary">{block.serviceFeeExample.guest}</span>
                      </div>
                    </div>
                    {block.serviceFeeExample.note && (
                      <p className="text-xs text-muted-foreground mt-2">{block.serviceFeeExample.note}</p>
                    )}
                  </div>
                )}
              </section>
            );
          }

          if (block.type === "tiers") {
            return (
              <section key={`tiers-${idx}`}>
                <h4 className="text-xl font-semibold mb-4">{block.title}</h4>
                <div className="grid md:grid-cols-3 gap-6">
                  {block.items.map((tier, i) => {
                    const Icon = iconFromName(tier.icon);
                    return (
                      <div key={`tier-${i}`} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-xs font-semibold px-2 py-1 rounded ${tier.color || ""} bg-muted/60`}>
                            {tier.tier}
                          </span>
                          <Icon className={`h-6 w-6 ${tier.color || ""}`} />
                        </div>
                        <div className="text-lg font-semibold mb-2">{tier.range}</div>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          {tier.points.map((p, j) => (
                            <li key={`point-${j}`} className="flex items-start gap-2">
                              <span className="text-primary leading-5">•</span>
                              <span>{p}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          }

          if (block.type === "factors") {
            return (
              <section key={`factors-${idx}`}>
                <h4 className="text-xl font-semibold mb-4">{block.title}</h4>
                <div className="grid md:grid-cols-2 gap-4">
                  {block.items.map((item, i) => {
                    const Icon = iconFromName(item.icon);
                    return (
                      <div key={`factor-${i}`} className="border rounded-lg p-4 hover:shadow-sm">
                        <div className="flex items-center gap-2 font-semibold mb-2">
                          <Icon className="h-5 w-5 text-primary" />
                          {item.title}
                        </div>
                        <p className="text-sm text-muted-foreground">{item.text}</p>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          }

          if (block.type === "psychology") {
            return (
              <section key={`psych-${idx}`} className="space-y-3">
                <h4 className="text-xl font-semibold">{block.title}</h4>
                {block.items.map((item, i) => (
                  <div key={`psych-item-${i}`}>
                    <h5 className="font-semibold">{item.title}</h5>
                    <p className="text-sm text-muted-foreground">{item.text}</p>
                  </div>
                ))}
              </section>
            );
          }

          if (block.type === "dynamic") {
            return (
              <section key={`dynamic-${idx}`} className="space-y-3">
                <h4 className="text-xl font-semibold">{block.title}</h4>
                {block.items.map((item, i) => {
                  const Icon = iconFromName(item.icon);
                  return (
                    <div key={`dyn-${i}`} className="space-y-1">
                      <div className="flex items-center gap-2 font-semibold">
                        <Icon className="h-5 w-5 text-primary" />
                        {item.title}
                      </div>
                      <p className="text-sm text-muted-foreground">{item.text}</p>
                    </div>
                  );
                })}
              </section>
            );
          }

          if (block.type === "currency") {
            return (
              <section key={`currency-${idx}`} className="space-y-4">
                <h4 className="text-xl font-semibold">{block.title}</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {block.currencies.map((c, i) => (
                    <div key={`cur-${i}`} className="bg-primary/10 border border-primary/20 rounded p-3 text-center">
                      <div className="text-xl font-bold text-primary">{c.amount}</div>
                      <div className="text-xs text-muted-foreground">{c.currency}</div>
                    </div>
                  ))}
                </div>
                {block.note && <p className="text-sm text-muted-foreground">{block.note}</p>}
              </section>
            );
          }

          if (block.type === "final") {
            return (
              <section key={`final-${idx}`}>
                <h4 className="text-xl font-semibold mb-3">{block.title}</h4>
                <ul className="space-y-2">
                  {block.tips.map((tip, i) => (
                    <li key={`tip-${i}`} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5" />
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </section>
            );
          }

          return null;
        })}
      </div>
    );
  };

  const renderSectionContent = (section: SectionDef) => {
    const content = section.content;

    // Special rendering för Price Guide-block
    if (section.id === "price-guide" && Array.isArray(content.sections)) {
      return (
        <div className="space-y-6">
          <div>
            <h3 className="text-xl font-semibold mb-2">{content.title}</h3>
            {content.description && <p className="text-muted-foreground">{content.description}</p>}
          </div>

          {renderPriceGuideBlocks(content.sections)}

          {(content.formula || content.example) && (
            <div className="bg-primary/10 p-4 rounded-lg border border-primary/20">
              <h4 className="font-semibold mb-2">Prisformel</h4>
              {content.formula && <p className="text-sm font-mono">{content.formula}</p>}
              {content.example && (
                <p className="text-sm text-muted-foreground mt-2">
                  <strong>Exempel:</strong> {content.example}
                </p>
              )}
            </div>
          )}
        </div>
      );
    }

    // Generisk rendering (övriga flikar)
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-xl font-semibold mb-2">{content.title}</h3>
          {content.description && <p className="text-muted-foreground">{content.description}</p>}
        </div>

        {content.tips && (
          <div>
            <h4 className="font-semibold mb-3">Tips:</h4>
            <ul className="space-y-2">
              {content.tips.map((tip, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <CheckSquare className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                  <span className="text-sm">{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {content.photoOrder && (
          <div>
            <h4 className="font-semibold mb-3">Rekommenderad ordning på bilderna:</h4>
            <ol className="space-y-2 list-decimal list-inside text-sm">
              {content.photoOrder.map((item, idx) => (
                <li key={idx} className="text-muted-foreground">
                  {item}
                </li>
              ))}
            </ol>
          </div>
        )}

        {content.checklist && (
          <div>
            <h4 className="font-semibold mb-3">Checklista:</h4>
            <ul className="space-y-2">
              {content.checklist.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <CheckSquare className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                  <span className="text-sm">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {content.examples && (
          <div>
            <h4 className="font-semibold mb-3">Exempel:</h4>
            <div className="space-y-2">
              <div className="flex items-start gap-3 bg-green-50 dark:bg-green-950/20 p-3 rounded">
                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <span className="text-xs font-semibold text-green-700 dark:text-green-400">BRA:</span>
                  <p className="text-sm mt-1">{content.examples.good}</p>
                </div>
              </div>
              <div className="flex items-start gap-3 bg-red-50 dark:bg-red-950/20 p-3 rounded">
                <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
                <div>
                  <span className="text-xs font-semibold text-red-700 dark:text-red-400">DÅLIGT:</span>
                  <p className="text-sm mt-1">{content.examples.bad}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {content.templates && (
          <div>
            <h4 className="font-semibold mb-3">Exempel på meddelanden:</h4>
            <div className="space-y-3">
              {Object.entries(content.templates).map(([key, value]) => (
                <div key={key} className="bg-muted/50 p-3 rounded">
                  <span className="text-xs font-semibold uppercase">{key}:</span>
                  <p className="text-sm mt-1">{value}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {content.faqs && (
          <div>
            <h4 className="font-semibold mb-3">Vanliga frågor:</h4>
            <div className="space-y-4">
              {content.faqs.map((faq, idx) => (
                <div key={idx} className="border-l-2 border-primary pl-4">
                  <p className="font-medium text-sm mb-1">{faq.q}</p>
                  <p className="text-sm text-muted-foreground">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {content.rooms && (
          <div>
            <h4 className="font-semibold mb-3">Checklista rum för rum:</h4>
            <div className="space-y-4">
              {Object.entries(content.rooms).map(([room, tasks]) => (
                <div key={room} className="border rounded-lg p-4">
                  <h5 className="font-semibold mb-2">{room}</h5>
                  <ul className="space-y-1">
                    {(tasks as string[]).map((task, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <CheckSquare className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{task}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

        {content.final && (
          <div>
            <h4 className="font-semibold mb-3">Sista stegen:</h4>
            <ul className="space-y-2">
              {content.final.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <CheckSquare className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                  <span className="text-sm font-medium">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {content.formula && (
          <div className="bg-primary/10 p-4 rounded-lg">
            <h4 className="font-semibold mb-2">Prisformel:</h4>
            <p className="text-sm font-mono">{content.formula}</p>
            {content.example && (
              <p className="text-sm text-muted-foreground mt-2">
                <strong>Exempel:</strong> {content.example}
              </p>
            )}
          </div>
        )}
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl h-[90vh] flex flex-col p-0">
        <div className="flex-1 flex m-0 h-full">
          <TooltipProvider>
            <nav className="w-28 border-r border-muted/20 bg-card/50 flex flex-col items-center py-6 gap-6 overflow-y-auto h-full">
              {sections.map((section, index) => {
                const isActive = activeIndex === index;
                const Icon = section.icon;
                return (
                  <Tooltip key={section.id}>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => setActiveIndex(index)}
                        className={`p-3 rounded-xl flex items-center justify-center transition-all ${
                          isActive
                            ? "bg-primary text-white scale-110"
                            : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
                        }`}
                        aria-label={section.title}
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
                <DialogTitle className="text-3xl font-bold">
                  {sections[activeIndex].title}
                </DialogTitle>
              </div>
            </DialogHeader>

            <div className="prose prose-sm max-w-none">
              {renderSectionContent(sections[activeIndex])}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default HostGuidebookDialog;
