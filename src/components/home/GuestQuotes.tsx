import { Link } from "react-router-dom";
import { Quote } from "lucide-react";
import { PROPERTY_CONTENT, type GuestQuote } from "@/content/propertyContent";
import { propertyPath } from "@/lib/propertySeo";

interface QuoteProperty {
  id: string;
  slug: string | null;
  title: string;
}

interface PickedQuote extends GuestQuote {
  property: QuoteProperty;
  nickname: string;
}

/** One quote from each cabin in turn, so every cabin is represented */
export function pickQuotes(properties: QuoteProperty[], count = 3): PickedQuote[] {
  const lists = properties
    .map((property) => ({ property, content: property.slug ? PROPERTY_CONTENT[property.slug] : undefined }))
    .filter((l) => l.content && l.content.quotes.length > 0);

  const picked: PickedQuote[] = [];
  for (let i = 0; picked.length < count; i++) {
    const round = lists.filter((l) => l.content!.quotes[i]);
    if (round.length === 0) break;
    for (const { property, content } of round) {
      if (picked.length === count) break;
      picked.push({ ...content!.quotes[i], property, nickname: content!.nickname });
    }
  }
  return picked;
}

const GuestQuotes = ({ properties }: { properties: QuoteProperty[] }) => {
  const quotes = pickQuotes(properties);
  if (quotes.length === 0) return null;

  return (
    <section className="py-16 bg-card">
      <div className="container mx-auto px-4 max-w-6xl">
        <h2 className="text-3xl font-bold text-foreground text-center mb-10">What guests say</h2>
        <div className="grid gap-6 md:grid-cols-3">
          {quotes.map((q) => (
            <figure key={`${q.property.id}-${q.name}`} className="rounded-lg border border-border bg-background p-6 flex flex-col">
              <Quote className="h-6 w-6 text-primary/60 mb-3" aria-hidden="true" />
              <blockquote className="text-foreground leading-relaxed flex-1">{q.text}</blockquote>
              <figcaption className="mt-4 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{q.name}</span>, {q.from} · stayed at{" "}
                <Link to={propertyPath(q.property)} className="text-primary hover:underline">
                  {q.nickname}
                </Link>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
};

export default GuestQuotes;
