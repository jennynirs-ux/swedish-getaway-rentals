import { Link } from "@/i18n/router";
import { Quote } from "lucide-react";
import { PROPERTY_CONTENT, type GuestQuote } from "@/content/propertyContent";
import { propertyPath } from "@/lib/propertySeo";
import { type Copy, type Lang, useCopy, useLang } from "@/i18n";

// The quotes are the guests' own words and stay as they are; only the labels around them are translated
const en = {
  title: "What guests say",
  stayedAt: "stayed at",
};
const COPY: Copy<typeof en> = {
  en,
  sv: { title: "Det här säger gästerna", stayedAt: "bodde på" },
  de: { title: "Das sagen unsere Gäste", stayedAt: "zu Gast in" },
};

interface QuoteProperty {
  id: string;
  slug: string | null;
  title: string;
  city: string | null;
}

interface PickedQuote extends GuestQuote {
  property: QuoteProperty;
  nickname: string;
  /** Where the quote comes from, shown in the caption */
  source: string;
}

// The quotes in PROPERTY_CONTENT are shortened Airbnb reviews of the two original cabins
const CONTENT_QUOTE_SOURCE: Record<Lang, string> = { en: "Airbnb review", sv: "Omdöme på Airbnb", de: "Airbnb-Bewertung" };

// Where the guests in PROPERTY_CONTENT come from, written in English there
const PLACES: Copy<Record<string, string>> = {
  en: {},
  sv: { "United Kingdom": "Storbritannien", Gothenburg: "Göteborg", Australia: "Australien", Switzerland: "Schweiz", Germany: "Tyskland" },
  de: { "United Kingdom": "Großbritannien", Gothenburg: "Göteborg", Australia: "Australien", Switzerland: "Schweiz", Germany: "Deutschland" },
};

/** One quote from each cabin in turn, so every cabin is represented */
export function pickQuotes(properties: QuoteProperty[], count = 3, lang: Lang = "en"): PickedQuote[] {
  const lists = properties
    .map((property) => ({ property, content: property.slug ? PROPERTY_CONTENT[property.slug] : undefined }))
    .filter((l) => l.content && l.content.quotes.length > 0);

  const picked: PickedQuote[] = [];
  for (let i = 0; picked.length < count; i++) {
    const round = lists.filter((l) => l.content!.quotes[i]);
    if (round.length === 0) break;
    for (const { property, content } of round) {
      if (picked.length === count) break;
      const quote = content!.quotes[i];
      picked.push({
        ...quote,
        from: PLACES[lang][quote.from] ?? quote.from,
        property,
        nickname: content!.nickname,
        source: CONTENT_QUOTE_SOURCE[lang],
      });
    }
  }
  return picked;
}

const town = (city: string | null) => (city ? city.charAt(0).toUpperCase() + city.slice(1) : null);

const GuestQuotes = ({ properties }: { properties: QuoteProperty[] }) => {
  const t = useCopy(COPY);
  const lang = useLang();
  const quotes = pickQuotes(properties, 3, lang);
  if (quotes.length === 0) return null;

  return (
    <section className="py-16 bg-card">
      <div className="container mx-auto px-4 max-w-6xl">
        <h2 className="text-3xl font-bold text-foreground text-center mb-10">{t.title}</h2>
        <div className="grid gap-6 md:grid-cols-3">
          {quotes.map((q) => (
            <figure key={`${q.property.id}-${q.name}`} className="rounded-lg border border-border bg-background p-6 flex flex-col">
              <Quote className="h-6 w-6 text-primary/60 mb-3" aria-hidden="true" />
              {/* PROPERTY_CONTENT is written in English, so screen readers read the quote as English on every page */}
              <blockquote lang="en" className="text-foreground leading-relaxed flex-1">{q.text}</blockquote>
              <figcaption className="mt-4 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{q.name}</span>, {q.from} · {t.stayedAt}{" "}
                <Link to={propertyPath(q.property)} className="text-primary hover:underline">
                  {q.nickname}
                </Link>
                {town(q.property.city) && `, ${town(q.property.city)}`} · {q.source}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
};

export default GuestQuotes;
