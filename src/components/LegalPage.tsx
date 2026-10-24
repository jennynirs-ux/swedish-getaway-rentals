import type { ReactNode } from "react";
import { format, isValid, parse } from "date-fns";
import { enGB } from "date-fns/locale";
import MainNavigation from "@/components/MainNavigation";
import PropertyFooter from "@/components/PropertyFooter";
import { type Copy, useCopy, useLang } from "@/i18n";
import { useDateFnsLocale } from "@/i18n/dates";

const en = {
  lastUpdated: (date: string) => `Last updated ${date}`,
  /** date-fns pattern for the "last updated" date; null keeps it as written in src/content/company.ts */
  dateFormat: null as string | null,
  footerLocation: "Sweden",
  footerTagline: "Holiday cabins in Sweden, booked directly with the host",
};
const COPY: Copy<typeof en> = {
  en,
  sv: {
    lastUpdated: (date) => `Senast uppdaterad ${date}`,
    dateFormat: "d MMMM yyyy",
    footerLocation: "Sverige",
    footerTagline: "Stugor i Sverige, bokade direkt hos värden",
  },
  de: {
    lastUpdated: (date) => `Zuletzt aktualisiert am ${date}`,
    dateFormat: "d. MMMM yyyy",
    footerLocation: "Schweden",
    footerTagline: "Ferienhäuser in Schweden, direkt beim Gastgeber gebucht",
  },
};

// The quick links stay in English: PropertyFooter maps these labels to paths
const footerProperty = (t: typeof en) => ({
  id: "legal",
  title: "Nordic Getaways",
  location: t.footerLocation,
  tagline_line1: t.footerTagline,
  footer_quick_links: ["Contact", "First time in Sweden?"],
  get_in_touch_info: {},
});

// Shared layout for the privacy policy and booking terms; `updated` is the
// page's own date from src/content/company.ts ("22 October 2026"). The legal
// text is in English only for now (the English version is the binding one):
// in Swedish and German the page's own heading and chrome are translated,
// `notice` says so at the top, and the body is marked as English.
const LegalPage = ({
  title,
  lead,
  updated,
  notice,
  children,
}: {
  title: string;
  lead: string;
  updated: string;
  /** Shown above the body on pages whose text is not in the page's language */
  notice?: string | null;
  children: ReactNode;
}) => {
  const t = useCopy(COPY);
  const lang = useLang();
  const dateLocale = useDateFnsLocale();
  const date = parse(updated, "d MMMM yyyy", new Date(), { locale: enGB });
  const updatedText = t.dateFormat && isValid(date) ? format(date, t.dateFormat, { locale: dateLocale }) : updated;

  return (
    <div className="min-h-screen flex flex-col">
      <MainNavigation />

      <section className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground py-16">
        <div className="container mx-auto px-4 max-w-3xl">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">{title}</h1>
          <p className="text-lg text-primary-foreground/90">{lead}</p>
          <p className="text-sm text-primary-foreground/80 mt-4">{t.lastUpdated(updatedText)}</p>
        </div>
      </section>

      <main className="flex-1 py-12 bg-background">
        {notice && (
          <div className="container mx-auto px-4 max-w-3xl mb-10">
            <p role="note" className="rounded-lg border border-border bg-muted/50 p-4 text-foreground">
              {notice}
            </p>
          </div>
        )}
        <article
          lang={lang === "en" ? undefined : "en"}
          className="container mx-auto px-4 max-w-3xl space-y-10 text-foreground leading-relaxed [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:mb-3 [&_p]:text-muted-foreground [&_li]:text-muted-foreground [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-2 [&_a]:text-primary [&_a]:underline"
        >
          {children}
        </article>
      </main>

      <PropertyFooter property={footerProperty(t) as never} />
    </div>
  );
};

export default LegalPage;
