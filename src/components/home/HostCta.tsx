import { format, isValid, parse, type Locale } from "date-fns";
import { Link } from "@/i18n/router";
import { Button } from "@/components/ui/button";
import {
  FOUNDING_HOST_DEADLINE,
  FOUNDING_HOST_FEE_PCT,
  PLATFORM_SERVICE_FEE_RATE,
  foundingHostOfferOpen,
} from "@/lib/constants";
import { type Copy, type Lang, useCopy, useLang } from "@/i18n";
import { useDateFnsLocale } from "@/i18n/dates";

const FEE_PCT = Math.round(PLATFORM_SERVICE_FEE_RATE * 100);

const en = {
  title: "Have a cabin or holiday home in Sweden?",
  pitch: (fee: number) =>
    `List it on Nordic Getaways, wherever in Sweden it is. You set the price and keep all of it; guests pay a ${fee}% service fee on top. You publish and run your own listing, get paid through Stripe and sync your calendar with Airbnb and other sites to avoid double bookings.`,
  offer: (deadline: string, pct: number) =>
    `Founding-host offer: join by ${deadline} and your guests pay only ${pct}% for your first 12 months.`,
  /** date-fns pattern for the offer's last day */
  longDate: "d MMMM yyyy",
  becomeHost: "Become a host",
  pricingGuide: "Pricing guide",
};
const COPY: Copy<typeof en> = {
  en,
  sv: {
    title: "Har du en stuga eller ett fritidshus i Sverige?",
    pitch: (fee) =>
      `Hyr ut det på Nordic Getaways, var i Sverige det än ligger. Du sätter priset och behåller allt; gästerna betalar en serviceavgift på ${fee} % utöver det. Du publicerar och sköter din egen annons, får betalt via Stripe och synkar kalendern med Airbnb och andra sajter så att du slipper dubbelbokningar.`,
    offer: (deadline, pct) =>
      `Erbjudande för nya värdar: anslut senast ${deadline} så betalar dina gäster bara ${pct} % under dina första 12 månader.`,
    longDate: "d MMMM yyyy",
    becomeHost: "Bli värd",
    pricingGuide: "Prisguide",
  },
  de: {
    title: "Du hast ein Ferienhaus in Schweden?",
    pitch: (fee) =>
      `Biete es auf Nordic Getaways an, egal wo in Schweden es liegt. Du legst den Preis fest und behältst ihn komplett; Gäste zahlen zusätzlich eine Servicegebühr von ${fee} %. Du veröffentlichst und verwaltest dein Inserat selbst, bekommst dein Geld über Stripe und synchronisierst deinen Kalender mit Airbnb und anderen Plattformen, damit es keine Doppelbuchungen gibt.`,
    offer: (deadline, pct) =>
      `Angebot für neue Gastgeber: Wenn du bis zum ${deadline} dabei bist, zahlen deine Gäste in deinen ersten 12 Monaten nur ${pct} %.`,
    longDate: "d. MMMM yyyy",
    becomeHost: "Gastgeber werden",
    pricingGuide: "Preisratgeber",
  },
};

// FOUNDING_HOST_DEADLINE is written in English ("31 December 2026")
const offerDeadline = (lang: Lang, pattern: string, locale: Locale) => {
  if (lang === "en") return FOUNDING_HOST_DEADLINE;
  const date = parse(FOUNDING_HOST_DEADLINE, "d MMMM yyyy", new Date());
  return isValid(date) ? format(date, pattern, { locale }) : FOUNDING_HOST_DEADLINE;
};

/** For people with a cabin of their own: the one host pitch on the home page */
const HostCta = () => {
  const t = useCopy(COPY);
  const lang = useLang();
  const dateLocale = useDateFnsLocale();

  return (
    <section className="py-12 bg-primary/5 border-t border-border">
      <div className="container mx-auto px-4 max-w-6xl flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">{t.title}</h2>
          <p className="text-muted-foreground mt-2 max-w-2xl">{t.pitch(FEE_PCT)}</p>
          {foundingHostOfferOpen() && (
            <p className="mt-4 inline-block rounded-2xl bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
              {t.offer(offerDeadline(lang, t.longDate, dateLocale), FOUNDING_HOST_FEE_PCT)}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-3 shrink-0">
          <Button asChild>
            <Link to="/become-host">{t.becomeHost}</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/pricing-guide">{t.pricingGuide}</Link>
          </Button>
        </div>
      </div>
    </section>
  );
};

export default HostCta;
