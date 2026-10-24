import type { ReactNode } from "react";
import { Link } from "@/i18n/router";
import { Check, Info, Quote } from "lucide-react";
import type { PropertyContent } from "@/content/propertyContent";
import { AREAS } from "@/content/areas";
import { type Copy, useCopy, useLang, useLocale } from "@/i18n";

const en = {
  about: (name: string) => `About ${name}`,
  highlights: "Highlights",
  goodToKnow: "Good to know",
  guestsSay: "What guests say",
  rated: (rating: number, count: number, _locale: string) => `Rated ${rating} out of 5 by ${count} guests on Airbnb.`,
  faq: "Frequently asked questions",
  planning: (link: ReactNode) => <>Planning your days? See our{" "}{link}.</>,
  localGuide: (area: string) => `local guide to ${area}`,
};
const COPY: Copy<typeof en> = {
  en,
  sv: {
    about: (name) => `Om ${name}`,
    highlights: "Höjdpunkter",
    goodToKnow: "Bra att veta",
    guestsSay: "Det här säger gästerna",
    rated: (rating, count, locale) =>
      `Betyg ${rating.toLocaleString(locale)} av 5 från ${count.toLocaleString(locale)} ${count === 1 ? "gäst" : "gäster"} på Airbnb.`,
    faq: "Vanliga frågor",
    planning: (link) => <>Planerar du dagarna? Läs vår{" "}{link}.</>,
    localGuide: (area) => `lokala guide till ${area}`,
  },
  de: {
    about: (name) => `Über ${name}`,
    highlights: "Highlights",
    goodToKnow: "Gut zu wissen",
    guestsSay: "Das sagen Gäste",
    rated: (rating, count, locale) =>
      `Auf Airbnb von ${count.toLocaleString(locale)} ${count === 1 ? "Gast" : "Gästen"} mit ${rating.toLocaleString(locale)} von 5 bewertet.`,
    faq: "Häufige Fragen",
    planning: (link) => <>Du planst deine Tage? Schau in unseren{" "}{link}.</>,
    localGuide: (area) => `lokalen Guide zu ${area}`,
  },
};

interface PropertyAboutProps {
  content: PropertyContent;
  rating?: number | null;
  reviewCount?: number | null;
  /** properties.city; the area-guide link shows only when a guide covers it */
  city?: string | null;
  /** "Translated from Swedish · Show original", under the heading */
  translationNote?: ReactNode;
}

/**
 * Long-form description, highlights, guest quotes and FAQ. Everything is plain,
 * always-rendered HTML (no collapsed accordions) so the prerendered page gives
 * search engines and AI assistants the full text.
 */
const PropertyAbout = ({ content, rating, reviewCount, city, translationNote }: PropertyAboutProps) => {
  const t = useCopy(COPY);
  const lang = useLang();
  const locale = useLocale();
  const area = AREAS.find((a) => a.city === city?.toLowerCase());
  return (
    <section className="py-16" aria-labelledby="about-heading">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto space-y-12">
          <div>
            <h2 id="about-heading" className="text-3xl md:text-4xl font-bold mb-6">
              {t.about(content.nickname)}
            </h2>
            {translationNote}
            <div className="space-y-4 text-lg text-muted-foreground leading-relaxed">
              {content.intro.map((paragraph) => (
                <p key={paragraph.slice(0, 40)}>{paragraph}</p>
              ))}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-xl font-semibold mb-4">{t.highlights}</h3>
              <ul className="space-y-2">
                {content.highlights.map((item) => (
                  <li key={item} className="flex gap-2">
                    <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" aria-hidden />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-4">{t.goodToKnow}</h3>
              <ul className="space-y-2">
                {content.goodToKnow.map((item) => (
                  <li key={item} className="flex gap-2">
                    <Info className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" aria-hidden />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {content.quotes.length > 0 && (
            <div>
              <h3 className="text-xl font-semibold mb-1">{t.guestsSay}</h3>
              {rating && reviewCount ? (
                <p className="text-muted-foreground mb-4">
                  {t.rated(rating, reviewCount, locale)}
                </p>
              ) : null}
              <div className="grid md:grid-cols-3 gap-4">
                {content.quotes.map((quote) => (
                  <figure key={quote.name} className="rounded-lg border bg-card p-5">
                    <Quote className="h-5 w-5 text-primary mb-2" aria-hidden />
                    {/* The guests' own words, in English on every page */}
                    <blockquote lang={lang === "en" ? undefined : "en"} className="text-sm leading-relaxed">“{quote.text}”</blockquote>
                    <figcaption className="mt-3 text-sm text-muted-foreground">
                      {quote.name}, {quote.from}
                    </figcaption>
                  </figure>
                ))}
              </div>
            </div>
          )}

          <div>
            <h3 className="text-2xl font-semibold mb-6">{t.faq}</h3>
            <dl className="space-y-6">
              {content.faq.map(({ q, a }) => (
                <div key={q}>
                  <dt className="font-semibold mb-1">{q}</dt>
                  <dd className="text-muted-foreground leading-relaxed">{a}</dd>
                </div>
              ))}
            </dl>
            {area && (
              <p className="mt-8 text-muted-foreground">
                {t.planning(
                  <Link to={area.path} className="text-primary underline">
                    {t.localGuide(area.name)}
                  </Link>,
                )}
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default PropertyAbout;
