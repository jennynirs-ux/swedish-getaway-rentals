import { Link } from "react-router-dom";
import { Check, Info, Quote } from "lucide-react";
import type { PropertyContent } from "@/content/propertyContent";

interface PropertyAboutProps {
  content: PropertyContent;
  rating?: number | null;
  reviewCount?: number | null;
}

/**
 * Long-form description, highlights, guest quotes and FAQ. Everything is plain,
 * always-rendered HTML (no collapsed accordions) so the prerendered page gives
 * search engines and AI assistants the full text.
 */
const PropertyAbout = ({ content, rating, reviewCount }: PropertyAboutProps) => (
  <section className="py-16" aria-labelledby="about-heading">
    <div className="container mx-auto px-4">
      <div className="max-w-4xl mx-auto space-y-12">
        <div>
          <h2 id="about-heading" className="text-3xl md:text-4xl font-bold mb-6">
            About {content.nickname}
          </h2>
          <div className="space-y-4 text-lg text-muted-foreground leading-relaxed">
            {content.intro.map((paragraph) => (
              <p key={paragraph.slice(0, 40)}>{paragraph}</p>
            ))}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <h3 className="text-xl font-semibold mb-4">Highlights</h3>
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
            <h3 className="text-xl font-semibold mb-4">Good to know</h3>
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
            <h3 className="text-xl font-semibold mb-1">What guests say</h3>
            {rating && reviewCount ? (
              <p className="text-muted-foreground mb-4">
                Rated {rating} out of 5 by {reviewCount} guests on Airbnb.
              </p>
            ) : null}
            <div className="grid md:grid-cols-3 gap-4">
              {content.quotes.map((quote) => (
                <figure key={quote.name} className="rounded-lg border bg-card p-5">
                  <Quote className="h-5 w-5 text-primary mb-2" aria-hidden />
                  <blockquote className="text-sm leading-relaxed">“{quote.text}”</blockquote>
                  <figcaption className="mt-3 text-sm text-muted-foreground">
                    {quote.name}, {quote.from}
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        )}

        <div>
          <h3 className="text-2xl font-semibold mb-6">Frequently asked questions</h3>
          <dl className="space-y-6">
            {content.faq.map(({ q, a }) => (
              <div key={q}>
                <dt className="font-semibold mb-1">{q}</dt>
                <dd className="text-muted-foreground leading-relaxed">{a}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-8 text-muted-foreground">
            Planning your days? See our{" "}
            <Link to="/stora-harsjon-lerum" className="text-primary underline">
              local guide to Stora Härsjön, Lerum and Gothenburg
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  </section>
);

export default PropertyAbout;
