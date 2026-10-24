import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import {
  Home,
  TrendingUp,
  Shield,
  Calendar,
  DollarSign,
  ArrowRight,
  HelpCircle,
  Mail,
  X,
  Loader2,
} from "lucide-react";
import MainNavigation from "@/components/MainNavigation";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { usePageMeta } from "@/hooks/usePageMeta";
import forestHeroBg from "@/assets/forest-hero-light.webp";
import { HOST_TERMS_PATH } from "@/content/hostTerms";
import {
  FOUNDING_HOST_DEADLINE,
  FOUNDING_HOST_FEE_PCT,
  PLATFORM_SERVICE_FEE_RATE,
  foundingHostOfferOpen,
  withServiceFee,
} from "@/lib/constants";

// The host landing page in English (/become-host) and Swedish (/bli-vard).
// Same facts in both: keep the two texts saying the same when one changes.

type Lang = "en" | "sv";

const PATHS: Record<Lang, string> = { en: "/become-host", sv: "/bli-vard" };
const FEE_PCT = Math.round(PLATFORM_SERVICE_FEE_RATE * 100);
// "31 December 2026" → "31 Dec 2026", so the meta description stays within 155 characters
const FOUNDING_HOST_DEADLINE_SHORT = FOUNDING_HOST_DEADLINE.replace(/([A-Za-z]{3})[a-z]+/, "$1");
const FOUNDING_HOST_DEADLINE_SV = FOUNDING_HOST_DEADLINE.replace("December", "december");
// Host price used in the fee examples below
const EXAMPLE_PRICE = 2500;
const money = (lang: Lang) => (amount: number) =>
  `${Math.round(amount).toLocaleString("sv-SE")} ${lang === "sv" ? "kr" : "SEK"}`;
// Swedish writes a space before the percent sign
const pct = (lang: Lang, n: number) => (lang === "sv" ? `${n} %` : `${n}%`);

// A new tab, so the host keeps their place here. The router doesn't scroll to
// #hashes; HostTerms scrolls to the section itself once it has rendered.
const hostTermsLink = (label: string, section?: string) => (
  <a
    href={section ? `${HOST_TERMS_PATH}#${section}` : HOST_TERMS_PATH}
    target="_blank"
    rel="noopener"
    className="underline text-primary"
  >
    {label}
  </a>
);

const skatteverketLink = (label: string, href = "https://www.skatteverket.se") => (
  <a href={href} target="_blank" rel="noopener noreferrer" className="underline text-primary">
    {label}
  </a>
);

const RENTAL_TAX_URL = "https://www.skatteverket.se/privat/skatter/bostad/uthyrningavprivatbostad";

interface Copy {
  metaTitle: string;
  metaDescription: string;
  switchLabel: string;
  heroTitle: string;
  heroText: string;
  offerPill: string;
  start: string;
  whyTitle: string;
  whySubtitle: string;
  benefits: { icon: typeof Home; title: string; description: string }[];
  offerTitle: string;
  offerText: string;
  offerExample: string;
  offerButton: string;
  exampleTitle: string;
  yourPrice: string;
  guestFee: string;
  guestPays: string;
  exampleNote: string;
  faqTitle: string;
  faqs: { question: string; answer: ReactNode }[];
  helpTitle: string;
  helpText: string;
  contact: string;
  name: string;
  email: string;
  message: string;
  cancel: string;
  send: string;
  missingTitle: string;
  missingText: string;
  sentTitle: string;
  sentText: string;
  errorTitle: string;
  errorText: string;
  ctaTitle: string;
  ctaText: string;
  ctaTerms: ReactNode;
  footer: string;
}

const copy = (lang: Lang): Copy => {
  const offer = foundingHostOfferOpen();
  const kr = money(lang);
  if (lang === "sv") {
    return {
      metaTitle: "Hyr ut din stuga i Sverige",
      metaDescription: `Hyr ut din stuga eller ditt fritidshus var som helst i Sverige. Du sätter priset och behåller allt; gästen betalar ${pct("sv", FEE_PCT)} i serviceavgift${offer ? ` (${pct("sv", FOUNDING_HOST_FEE_PCT)} om du ansluter senast 31 dec 2026)` : " ovanpå"}.`,
      switchLabel: "In English",
      heroTitle: "Bli värd",
      heroText: `Hyr ut ditt boende i Sverige på dina villkor. Du sätter priset, och gästen betalar en serviceavgift på ${pct("sv", FEE_PCT)} ovanpå.`,
      offerPill: `Erbjudande för nya värdar: anslut senast ${FOUNDING_HOST_DEADLINE_SV} så lägger vi bara på ${pct("sv", FOUNDING_HOST_FEE_PCT)} under dina första 12 månader.`,
      start: "Kom igång",
      whyTitle: "Varför hyra ut via Nordic Getaways?",
      whySubtitle: "Tydligt. Rättvist. Gjort för värdar som vill ha det enkelt.",
      benefits: [
        {
          icon: DollarSign,
          title: "Du behåller hela ditt pris",
          description: `Du sätter ditt eget pris. Vi lägger på en avgift på ${pct("sv", FEE_PCT)} ovanpå, som betalar kortbetalningar, marknadsföring, utveckling av sajten och support.`,
        },
        { icon: Shield, title: "Enkelt och tryggt", description: "Säkra kortbetalningar via Stripe och full kontroll över din kalender." },
        {
          icon: Calendar,
          title: "Full flexibilitet",
          description:
            "Hyr ut när det passar dig – en helg, en månad eller hela sommaren. Synka kalendern med Airbnb och andra sajter så slipper du dubbelbokningar.",
        },
        {
          icon: TrendingUp,
          title: "Gästguide ingår",
          description: "Ge gästerna en digital gästguide med incheckning, vägbeskrivning, husregler och lokala tips.",
        },
      ],
      offerTitle: `Erbjudande för nya värdar: ${pct("sv", FOUNDING_HOST_FEE_PCT)} i ett år`,
      offerText: `Anslut senast ${FOUNDING_HOST_DEADLINE_SV} så betalar gästerna bara ${pct("sv", FOUNDING_HOST_FEE_PCT)} i serviceavgift på din annons under dina första 12 månader, i stället för ${pct("sv", FEE_PCT)}. Med samma pris som på andra sajter blir ditt boende billigare för gästen här, och du behåller fortfarande hela ditt pris.`,
      offerExample: `Exempel: ditt pris ${kr(EXAMPLE_PRICE)}, gästen betalar ${kr(withServiceFee(EXAMPLE_PRICE, FOUNDING_HOST_FEE_PCT))} (i stället för ${kr(withServiceFee(EXAMPLE_PRICE))}). Du får ${kr(EXAMPLE_PRICE)}.`,
      offerButton: "Ta del av erbjudandet",
      exampleTitle: "Så räknar vi – ett exempel",
      yourPrice: "Ditt pris",
      guestFee: "Gästens serviceavgift",
      guestPays: "Gästen betalar",
      exampleNote: `Avgiften på ${pct("sv", FEE_PCT)} betalar säkra betalningar (kortavgifter på upp till cirka 5,5 %, beroende på gästens land och valuta), marknadsföring, support och utveckling av sajten.`,
      faqTitle: "Vanliga frågor",
      faqs: [
        {
          question: "Var kan mitt fritidshus ligga?",
          answer:
            "Var som helst i Sverige – en stuga vid en sjö, ett sommarhus vid kusten, en fjällstuga eller en lägenhet i stan. Du publicerar och sköter din annons själv, och gästerna hittar den på startsidan och i sökningen.",
        },
        {
          question: "Behöver jag ett företag för att hyra ut?",
          answer: (
            <>
              Nej. Värdarna på Nordic Getaways hyr ut sina egna boenden som privatpersoner. Som privatperson får du dra
              av <strong>40 000 kr per år</strong> från dina hyresinkomster, plus 20 % av hyran om du äger huset (för en
              bostadsrätt i stället den del av månadsavgiften som hör till uthyrningen). De 40 000 kronorna gäller alla
              dina privata hyresinkomster tillsammans, oavsett var du hyr ut. Läs mer hos{" "}
              {skatteverketLink("Skatteverket", RENTAL_TAX_URL)}.
            </>
          ),
        },
        {
          question: "Hur fungerar betalningen?",
          answer: (
            <>
              Gästen betalar med kort via <strong>Stripe</strong> vid bokningen. Din del går direkt till ditt eget
              Stripe-konto, och vi betalar ut den till din bank <strong>dagen efter incheckning</strong>, eller 85 dagar
              efter att gästen betalade om det kommer först. Om gästen får pengar tillbaka efter det dras beloppet från
              din nästa utbetalning. Gästen betalar en serviceavgift på {pct("sv", FEE_PCT)} ovanpå ditt pris
              {offer ? ` (${pct("sv", FOUNDING_HOST_FEE_PCT)} under nya värdars första 12 månader)` : ""}, så du får hela
              ditt pris. Se {hostTermsLink("utbetalningar i värdvillkoren", "payouts")} (på engelska).
            </>
          ),
        },
        {
          question: "Vad är Stripe, och varför behöver jag ett konto där?",
          answer: (
            <>
              Nordic Getaways använder <strong>Stripe</strong> för alla betalningar. Stripe är ett av världens största
              betalföretag och ett reglerat betalinstitut i EU. Det är Stripe som tar emot gästens kortbetalning och
              betalar ut dina pengar till din bank. Med ett eget Stripe-konto går dina pengar direkt till dig, inte via
              oss: vi behåller bara serviceavgiften som gästen betalar ovanpå ditt pris. Kontot skapar du i värdpanelen
              på ungefär fem minuter. Stripe frågar efter till exempel namn, adress, födelsedatum, mobilnummer och
              bankkonto, och ibland en bild på din legitimation. Det kräver lagen mot penningtvätt, och uppgifterna går
              till Stripe, inte till oss. Det kostar inget för dig: kortavgiften ingår i gästens serviceavgift. Det enda
              undantaget är om du själv avbokar en bokning, då betalar du kortavgiften för den.
            </>
          ),
        },
        {
          question: "Vem bokar gästen hos?",
          answer:
            "Hos dig. Du hyr ut som privatperson, och gästen har kontakt med dig om vistelsen. Nordic Getaways (Mojjo AB) visar din annons och tar emot bokningen och betalningen i ditt namn.",
        },
        {
          question: "Vad godkänner jag som värd?",
          answer: (
            <>
              Våra {hostTermsLink("värdvillkor")} (på engelska): ditt ansvar för en korrekt och säker annons, försäkring
              och skatt, gästens serviceavgift, när du får betalt och vad som händer om gästen eller du avbokar. Du
              godkänner dem när du ansöker om att bli värd.
            </>
          ),
        },
        {
          question: "Hur blir det med försäkring?",
          answer:
            "För att hålla avgiften låg ingår ingen försäkring – du har själv full kontroll. De flesta svenska hemförsäkringar täcker korttidsuthyrning med ett tillägg. Kolla med ditt försäkringsbolag, och se till att gästerna godkänner dina husregler.",
        },
        {
          question: "Hur fungerar incheckningen?",
          answer:
            "Du sköter incheckningen själv och har kontakt med gästerna direkt. Du bestämmer hur du delar portkod, nyckel och instruktioner – gästerna får dem först när de har bokat.",
        },
        {
          question: "Hur sköter jag min annons?",
          answer:
            "I din värdpanel ändrar du bilder, priser, regler och tillgänglighet när du vill. Ändringarna syns direkt på sajten.",
        },
        {
          question: "Hur mycket kan jag tjäna?",
          answer:
            "Det beror på var ditt boende ligger, hur stort det är och säsongen. Du sätter ditt eget pris per natt, och ser både vad du får och vad gästen betalar, inklusive serviceavgiften.",
        },
        {
          question: "Hur blir det med städning?",
          answer:
            "Det bestämmer du. Du kan städa själv eller ta hjälp av någon lokalt, och lägga till en städavgift i annonsen. Ett rent och väl förberett boende ger nöjdare gäster – och bättre omdömen.",
        },
        {
          question: "Hur fungerar avbokningar och återbetalningar?",
          answer: (
            <>
              Du väljer själv avbokningsregel: <strong>Flexibel</strong>, <strong>Måttlig</strong>,{" "}
              <strong>Standard</strong> (90 % tillbaka mer än 21 dagar före ankomst, 50 % 8–21 dagar före, inget inom 7
              dagar) eller <strong>Strikt</strong>. Gästen ser regeln innan bokningen. Vi sköter avbokningar och
              återbetalningar. Återbetalningen dras från din utbetalning för bokningen; serviceavgiften betalas inte
              tillbaka till gästen och minskar aldrig din del. Om du själv måste avboka får gästen tillbaka allt, du får
              inget för bokningen och du betalar kortavgiften. Detaljer finns i {hostTermsLink("värdvillkoren", "guest-cancels")}.
            </>
          ),
        },
        {
          question: "Hur blir det med skatten?",
          answer: (
            <>
              Du deklarerar själv dina hyresinkomster. Enligt lag (EU:s DAC7-regler) rapporterar vi värdarnas
              hyresinkomster via Nordic Getaways till Skatteverket en gång per år, och ber dig om de uppgifter som behövs
              innan din annons publiceras. Kontrollera alltid aktuella regler hos {skatteverketLink("Skatteverket")}.
            </>
          ),
        },
        {
          question: "Ingår en digital gästguide?",
          answer:
            "Ja. Varje annons får en gästguide med avsnitt för incheckning, vägbeskrivning, wifi, husregler och lokala tips. Du fyller i dem utifrån exempel, och allmänna tips om Sverige, som sopsortering och svenska seder, ingår.",
        },
        {
          question: "Hur kontrolleras gästerna?",
          answer:
            "Gästerna betalar med kort via Stripe när de bokar och måste först godkänna dina husregler. Bokningar bekräftas direkt, så håll kalendern uppdaterad och blockera de datum du inte vill hyra ut.",
        },
        {
          question: "Kan jag blockera vissa datum?",
          answer:
            "Ja, du styr kalendern helt själv. Blockera de datum du inte vill hyra ut – när du själv vill vara där eller behöver fixa något.",
        },
        {
          question: "Vad gör Nordic Getaways annorlunda?",
          answer:
            "Vi satsar på äkta nordiska upplevelser, inte massturism. Sajten kopplar ihop gäster med riktiga hem och lokala värdar som bryr sig om hållbarhet, design och gästfrihet. Vi lyfter fram människorna och platserna som gör Sverige speciellt.",
        },
      ],
      helpTitle: "Behöver du mer hjälp?",
      helpText: "Vi hjälper dig gärna att lägga upp din första annons, eller svarar på frågor om att vara värd.",
      contact: "Kontakta oss",
      name: "Ditt namn",
      email: "Din e-post",
      message: "Ditt meddelande …",
      cancel: "Avbryt",
      send: "Skicka",
      missingTitle: "Fyll i alla fält",
      missingText: "Skriv namn, e-post och meddelande innan du skickar.",
      sentTitle: "Tack!",
      sentText: "Vi hör av oss snart.",
      errorTitle: "Något gick fel",
      errorText: "Meddelandet kunde inte skickas. Försök igen eller mejla support@mojjo.se.",
      ctaTitle: "Redo att hyra ut?",
      ctaText:
        "Börja i liten skala – hyr ut en helg eller några sommarveckor och upptäck både glädjen i att ta emot gäster och den extra inkomsten.",
      ctaTerms: <>När du ansöker godkänner du våra {hostTermsLink("värdvillkor")} (på engelska): avgifter, utbetalningar och avbokningar.</>,
      footer:
        "Nordic Getaways är helt öppet med kostnaderna. Du sätter priset och ser vad gästen betalar – och vad avgiften går till: marknadsföring, support, betalningar och utveckling av sajten.",
    };
  }
  return {
    metaTitle: "List your cabin in Sweden",
    metaDescription: `List your cabin or holiday home anywhere in Sweden. You set the price and keep all of it; guests pay a ${FEE_PCT}% service fee ${
      offer ? `(${FOUNDING_HOST_FEE_PCT}% if you join by ${FOUNDING_HOST_DEADLINE_SHORT})` : "on top"
    }.`,
    switchLabel: "På svenska",
    heroTitle: "Become a Host",
    heroText: `Share your home in Sweden and earn on your terms. You set the price; guests pay a ${FEE_PCT}% service fee on top.`,
    offerPill: `Founding-host offer: join by ${FOUNDING_HOST_DEADLINE} and we add only ${FOUNDING_HOST_FEE_PCT}% for your first 12 months.`,
    start: "Start Hosting Now",
    whyTitle: "Why Host with Nordic Getaways?",
    whySubtitle: "Transparent. Fair. Built for hosts who value simplicity.",
    benefits: [
      {
        icon: DollarSign,
        title: "You keep what you set",
        description: `Set your own price. We will add a ${FEE_PCT}% fee on top of your price to cover payments, marketing, platform development and support.`,
      },
      { icon: Shield, title: "Simple & secure", description: "Secure card payments through Stripe and full control over your calendar." },
      {
        icon: Calendar,
        title: "Full flexibility",
        description:
          "Rent out on your schedule — a weekend, a month, or the whole summer. Sync your calendar with Airbnb and other platforms to avoid double bookings.",
      },
      {
        icon: TrendingUp,
        title: "Guidebooks included",
        description: "Stand out with built-in guidebooks that elevate your hosting experience and delight your guests.",
      },
    ],
    offerTitle: `Founding-host offer: ${FOUNDING_HOST_FEE_PCT}% for a year`,
    offerText: `Join by ${FOUNDING_HOST_DEADLINE} and guests pay only a ${FOUNDING_HOST_FEE_PCT}% service fee on your listing for your first 12 months, instead of ${FEE_PCT}%. With the same price as on other sites, your place can cost guests less here, and you still keep 100% of your price.`,
    offerExample: `Example: your price ${kr(EXAMPLE_PRICE)}, the guest pays ${kr(withServiceFee(EXAMPLE_PRICE, FOUNDING_HOST_FEE_PCT))} (instead of ${kr(withServiceFee(EXAMPLE_PRICE))}). You receive ${kr(EXAMPLE_PRICE)}.`,
    offerButton: "Claim the offer",
    exampleTitle: "Transparent Earnings Example",
    yourPrice: "Your Price",
    guestFee: "Guest service fee",
    guestPays: "Guest Pays",
    exampleNote: `The ${FEE_PCT}% covers secure payments (card fees of up to about 5.5%, depending on the guest's country and currency), marketing, support and platform improvements.`,
    faqTitle: "Common Questions",
    faqs: [
      {
        question: "Where can my holiday home be?",
        answer:
          "Anywhere in Sweden – a lakeside stuga, a summer house on the coast, a mountain cabin or a flat in town. You publish and run your own listing, and guests find it on the home page and in search.",
      },
      {
        question: "Do I need a company to host?",
        answer: (
          <>
            No. Hosts on Nordic Getaways rent out their own place as private individuals. In Sweden, private hosts can
            deduct <strong>40,000 SEK a year</strong> from their rental income, plus 20% of the rent if they own the
            house (for a tenant-owned flat, the share of the monthly fee instead). The 40,000 SEK covers all your private
            rental income together, wherever you rent out. Learn more at {skatteverketLink("Skatteverket", RENTAL_TAX_URL)}.
          </>
        ),
      },
      {
        question: "How do payments work?",
        answer: (
          <>
            Guests pay by card through <strong>Stripe</strong> when they book. Your share goes straight to your own
            Stripe account, and we pay it out to your bank <strong>the day after check-in</strong>, or 85 days after the
            guest paid if that comes first. If a guest is refunded after that, the refund is taken from your next payout.
            Guests pay a {FEE_PCT}% service fee on top of your price
            {offer ? ` (${FOUNDING_HOST_FEE_PCT}% for founding hosts' first 12 months)` : ""}, so you receive your price
            in full. See {hostTermsLink("payouts in the host terms", "payouts")}.
          </>
        ),
      },
      {
        question: "What is Stripe, and why do I need an account?",
        answer: (
          <>
            Nordic Getaways uses <strong>Stripe</strong> for all payments. Stripe is one of the world's largest payment
            companies and a regulated payment institution in the EU. Stripe takes the guest's card payment and pays your
            money out to your bank. With your own Stripe account, your money goes straight to you, not through us: we
            keep only the service fee the guest pays on top of your price. You create the account from your host
            dashboard in about five minutes. Stripe asks for, for example, your name, address, date of birth, mobile
            number and bank account, and sometimes a photo of your ID. Anti-money-laundering law requires this, and the
            details go to Stripe, not to us. It costs you nothing: the card fee is included in the guest's service fee.
            The only exception: if you cancel a booking yourself, you pay that booking's card fee.
          </>
        ),
      },
      {
        question: "Who do guests book with?",
        answer:
          "With you. You rent out your place as a private person, and guests deal directly with you about their stay. Nordic Getaways (Mojjo AB) shows your listing and takes the booking and payment in your name.",
      },
      {
        question: "What do I agree to as a host?",
        answer: (
          <>
            Our {hostTermsLink("host terms")}: your responsibility for an accurate and safe listing, insurance and taxes,
            the guest service fee, when you are paid out, and what happens when a guest or you cancel. You accept them
            when you apply to become a host.
          </>
        ),
      },
      {
        question: "What about insurance?",
        answer:
          "To keep platform fees low, insurance is not included — this gives you full control. Most Swedish home insurance plans already cover short-term rentals with an add-on. We recommend confirming with your insurer and ensuring guests agree to your house rules.",
      },
      {
        question: "How does check-in work?",
        answer:
          "You manage check-ins yourself and coordinate with guests directly. You decide how you share door codes, keys and instructions – guests only get them once they have booked.",
      },
      {
        question: "How do I manage my listing?",
        answer:
          "From your host dashboard you change photos, prices, rules and availability whenever you like. Changes show on the site straight away.",
      },
      {
        question: "How much can I earn?",
        answer:
          "Your earnings depend on your home’s location, size, and season. You set your own nightly price, and we make it easy to see both your payout and what the guest pays, including the guest service fee.",
      },
      {
        question: "What about cleaning and maintenance?",
        answer:
          "You decide! You can handle cleaning yourself or work with a trusted local partner, and add a cleaning fee to your listing. A clean and well-prepared home brings happier guests — and better reviews.",
      },
      {
        question: "How do cancellations and refunds work?",
        answer: (
          <>
            You choose your cancellation policy: <strong>Flexible</strong>, <strong>Moderate</strong>,{" "}
            <strong>Standard</strong> (90% back more than 21 days before arrival, 50% 8–21 days before, nothing within 7
            days) or <strong>Strict</strong>. Guests see it before they book. Our team handles cancellations and refunds.
            The refund comes out of your payout for that booking; the service fee is not refunded to the guest and never
            reduces your share. If you have to cancel, the guest gets everything back, you get nothing for that booking
            and you pay the card fee. Details are in the {hostTermsLink("host terms", "guest-cancels")}.
          </>
        ),
      },
      {
        question: "What about taxes?",
        answer: (
          <>
            You’re responsible for declaring your rental income. By law (the EU's DAC7 rules) we report hosts' rental
            income from Nordic Getaways to Skatteverket once a year, and ask you for the details needed before your
            listing goes live. Always double-check with {skatteverketLink("Skatteverket")} for updated details.
          </>
        ),
      },
      {
        question: "Is a digital guidebook included?",
        answer:
          "Yes. Every listing gets a guest guide with sections for check-in, directions, Wi-Fi, house rules and local tips. You fill them in, with examples to start from, and general Swedish tips such as recycling and customs are included.",
      },
      {
        question: "How are guests verified?",
        answer:
          "Guests pay by card through Stripe when they book and must accept your house rules first. Bookings are confirmed instantly, so keep your calendar up to date and block any dates you don’t want to rent out.",
      },
      {
        question: "Can I block certain dates?",
        answer:
          "Yes, your calendar is fully under your control. You can block any dates when you don’t want to rent out your home — perfect for personal use or maintenance days.",
      },
      {
        question: "What makes Nordic Getaways different?",
        answer:
          "We focus on authentic Nordic experiences, not mass tourism. Our platform connects guests with real homes and local hosts who care about sustainability, design, and hospitality. We celebrate the people and places that make Sweden special.",
      },
    ],
    helpTitle: "Need more help?",
    helpText: "Our team is here to help you set up your first listing or answer any questions about hosting.",
    contact: "Contact Support",
    name: "Your name",
    email: "Your email",
    message: "Your message...",
    cancel: "Cancel",
    send: "Send Message",
    missingTitle: "Missing Information",
    missingText: "Please fill in all fields before sending your message.",
    sentTitle: "Message sent!",
    sentText: "Our team will get back to you shortly.",
    errorTitle: "Error",
    errorText: "Something went wrong while sending your message.",
    ctaTitle: "Ready to Share Your Space?",
    ctaText:
      "Start small — rent out a weekend or a few summer weeks and discover how hosting can bring both joy and extra income.",
    ctaTerms: <>When you apply, you accept our {hostTermsLink("host terms")}: fees, payouts and cancellations.</>,
    footer:
      "Nordic Getaways is 100% transparent. You set the price — see what the guests pay, and you see what goes to marketing, support, payment handling, and platform improvement.",
  };
};

const BecomeHost = ({ lang = "en" }: { lang?: Lang }) => {
  const t = copy(lang);
  const kr = money(lang);
  usePageMeta({
    title: t.metaTitle,
    description: t.metaDescription,
    path: PATHS[lang],
    lang,
    alternates: { en: PATHS.en, sv: PATHS.sv },
  });

  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [showSupport, setShowSupport] = useState(false);
  const [supportLoading, setSupportLoading] = useState(false);
  const [supportForm, setSupportForm] = useState({
    name: "",
    email: "",
    message: "",
  });

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      if (user) {
        setSupportForm((prev) => ({ ...prev, email: user.email || "" }));
      }
    });
  }, []);

  const handleHostRedirect = () => {
    // Keep a referral code from an invitation link (/become-host?ref=...)
    const ref = new URLSearchParams(window.location.search).get("ref");
    const target = ref ? `/host-application?ref=${encodeURIComponent(ref)}` : "/host-application";
    if (!user) {
      navigate(`/auth?redirect=${encodeURIComponent(target)}`);
    } else {
      navigate(target);
    }
  };

  const handleSupportSubmit = async () => {
    if (!supportForm.name || !supportForm.email || !supportForm.message) {
      toast({ title: t.missingTitle, description: t.missingText, variant: "destructive" });
      return;
    }

    setSupportLoading(true);

    try {
      // Save to database
      const { error: dbError } = await supabase.from("guest_messages").insert({
        name: supportForm.name,
        email: supportForm.email,
        message: supportForm.message,
        subject: "Become a Host - Support Request",
        created_at: new Date().toISOString(),
      });

      if (dbError) throw dbError;

      // Send email to support
      const { error: emailError } = await supabase.functions.invoke('send-support-email', {
        body: {
          name: supportForm.name,
          email: supportForm.email,
          subject: "Become a Host - Support Request",
          message: supportForm.message,
        },
      });

      if (emailError) {
        console.error("Email send error:", emailError);
        // Don't throw - message is saved in DB
      }

      toast({ title: t.sentTitle, description: t.sentText });
      setSupportForm({ name: "", email: user?.email || "", message: "" });
      setShowSupport(false);
    } catch (error) {
      console.error("Support form error:", error);
      toast({ title: t.errorTitle, description: t.errorText, variant: "destructive" });
    } finally {
      setSupportLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background" lang={lang}>
      <MainNavigation />

      {/* Hero Section */}
      <div className="relative h-[60vh] flex items-center justify-center overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              `url(${forestHeroBg})`,
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-background" />
        </div>

        <div className="relative z-10 container mx-auto px-4 text-center text-white">
          <Link
            to={PATHS[lang === "sv" ? "en" : "sv"]}
            hrefLang={lang === "sv" ? "en" : "sv"}
            className="mb-4 inline-block text-sm underline opacity-90 hover:opacity-100"
          >
            {t.switchLabel}
          </Link>
          <h1 className="text-5xl md:text-6xl font-bold mb-6">{t.heroTitle}</h1>
          <p className="text-xl md:text-2xl mb-8 max-w-2xl mx-auto opacity-90">{t.heroText}</p>
          {foundingHostOfferOpen() && (
            <p className="mb-8 inline-block rounded-full bg-white/15 px-5 py-2 text-base md:text-lg backdrop-blur">
              {t.offerPill}
            </p>
          )}
          <Button size="lg" onClick={handleHostRedirect} className="text-lg px-8 py-6">
            {t.start}
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </div>

      <div className="container mx-auto px-4 py-16">
        {/* Benefits Section */}
        <div className="mb-20">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">{t.whyTitle}</h2>
          <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">{t.whySubtitle}</p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {t.benefits.map((benefit, index) => (
              <Card key={index} className="text-center p-6 hover:shadow-md transition">
                <CardContent className="flex flex-col items-center">
                  <benefit.icon className="h-10 w-10 text-primary mb-3" />
                  <h3 className="text-lg font-semibold mb-1">{benefit.title}</h3>
                  <p className="text-sm text-muted-foreground">{benefit.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Founding-host offer */}
        {foundingHostOfferOpen() && (
        <div className="mb-12 max-w-4xl mx-auto">
          <Card className="border-2 border-primary">
            <CardContent className="p-8 text-center space-y-4">
              <h2 className="text-2xl md:text-3xl font-bold">{t.offerTitle}</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">{t.offerText}</p>
              <p className="font-medium">{t.offerExample}</p>
              <Button size="lg" onClick={handleHostRedirect}>
                {t.offerButton}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </CardContent>
          </Card>
        </div>
        )}

        {/* Earnings Example */}
        <div className="mb-20 max-w-4xl mx-auto">
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-8">
              <h2 className="text-2xl md:text-3xl font-bold text-center mb-6">{t.exampleTitle}</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                <div>
                  <div className="text-4xl font-bold text-primary mb-2">{kr(EXAMPLE_PRICE)}</div>
                  <div className="text-muted-foreground">{t.yourPrice}</div>
                </div>
                <div>
                  <div className="text-4xl font-bold text-primary mb-2">+{pct(lang, FEE_PCT)}</div>
                  <div className="text-muted-foreground">{t.guestFee}</div>
                </div>
                <div>
                  <div className="text-4xl font-bold text-primary mb-2">{kr(withServiceFee(EXAMPLE_PRICE))}</div>
                  <div className="text-muted-foreground">{t.guestPays}</div>
                </div>
              </div>
              <p className="text-center text-sm text-muted-foreground mt-6">{t.exampleNote}</p>
            </CardContent>
          </Card>
        </div>

        {/* FAQ Section */}
        <div className="max-w-3xl mx-auto mb-20">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-10">{t.faqTitle}</h2>
          <Accordion type="single" collapsible className="w-full">
            {t.faqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`}>
                <AccordionTrigger className="text-lg font-medium flex items-center gap-2 text-left justify-start w-full">
                  <HelpCircle className="h-5 w-5 text-primary" />
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground text-base">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          {/* Contact Support */}
          <div className="text-center mt-12">
            <Mail className="h-8 w-8 mx-auto text-primary mb-3" />
            <p className="text-lg font-semibold mb-2">{t.helpTitle}</p>
            <p className="text-muted-foreground mb-4">{t.helpText}</p>
            <Button variant="outline" onClick={() => setShowSupport(true)}>
              {t.contact}
            </Button>
          </div>
        </div>

        {/* Contact Modal */}
        <Dialog open={showSupport} onOpenChange={setShowSupport}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{t.contact}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                placeholder={t.name}
                value={supportForm.name}
                onChange={(e) => setSupportForm({ ...supportForm, name: e.target.value })}
              />
              <Input
                type="email"
                placeholder={t.email}
                value={supportForm.email}
                onChange={(e) => setSupportForm({ ...supportForm, email: e.target.value })}
              />
              <Textarea
                placeholder={t.message}
                rows={4}
                value={supportForm.message}
                onChange={(e) => setSupportForm({ ...supportForm, message: e.target.value })}
              />
            </div>
            <DialogFooter className="mt-4 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowSupport(false)}>
                <X className="w-4 h-4 mr-2" /> {t.cancel}
              </Button>
              <Button onClick={handleSupportSubmit} disabled={supportLoading}>
                {supportLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                {t.send}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* CTA Section */}
        <div className="text-center bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl p-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">{t.ctaTitle}</h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">{t.ctaText}</p>
          <Button size="lg" onClick={handleHostRedirect} className="text-lg px-8 py-6">
            {t.start}
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
          <p className="text-sm text-muted-foreground mt-6">{t.ctaTerms}</p>
        </div>

        <p className="text-xs text-muted-foreground text-center mt-6">{t.footer}</p>
      </div>
    </div>
  );
};

export default BecomeHost;
