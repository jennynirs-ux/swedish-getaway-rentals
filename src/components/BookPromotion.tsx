import { useState } from "react";
import LazyImage from "@/components/LazyImage";
import { Button } from "@/components/ui/button";
import { Star, ChevronLeft, ChevronRight } from "lucide-react";
import bookCover from "@/assets/book-cover.png";

const reviews = [
  {
    text: `"When the Ocean Changed Everything" stays with you long after the last page. A tribute to strength and resilience.`,
    author: "Patrik",
    rating: 5,
  },
  {
    text: "A moving account of how a single event can change a life. Honest and full of hope.",
    author: "Helena",
    rating: 4,
  },
  {
    text: "A gripping description of one of the greatest natural disasters of our time. Worth reading.",
    author: "Per",
    rating: 5,
  },
  {
    text: "An incredibly captivating book. I couldn’t put it down.",
    author: "Anna",
    rating: 5,
  },
  {
    text: "A dramatic and well-written story about the tsunami in Sri Lanka that hooks you instantly.",
    author: "Karl-Olov",
    rating: 5,
  },
];

const BookPromotion = () => {
  const [index, setIndex] = useState(0);
  const prev = () => setIndex((index - 1 + reviews.length) % reviews.length);
  const next = () => setIndex((index + 1) % reviews.length);

  const review = reviews[index];

  return (
    <section className="py-12 bg-card">
      <div className="container mx-auto px-4">
        {/* Title */}
        <h2 className="text-2xl sm:text-3xl font-bold text-left mb-8">
          Looking for Vacation Read?
        </h2>

        <div className="max-w-6xl mx-auto flex flex-row gap-6 items-start">
          {/* Left: Book image */}
          <div className="flex-shrink-0">
            <LazyImage
              src={bookCover}
              alt="When the Ocean Changed Everything book cover"
              className="w-24 sm:w-36 md:w-48 lg:w-56 rounded shadow-lg"
            />
          </div>

          {/* Right: Text + Reviews + CTAs */}
          <div className="flex-1 space-y-4">
            {/* Book name as subtitle */}
            <h3 className="text-lg font-semibold text-foreground">
              When the Ocean Changed Everything
            </h3>

            <p className="text-sm text-muted-foreground leading-relaxed max-w-xl">
              A gripping and unforgettable story about survival, resilience, and
              finding light after the darkest moments. Perfect for your getaway
              reading.
            </p>

            {/* Review Carousel */}
            <div className="relative flex items-center">
              {/* Prev button */}
              <button
                onClick={prev}
                className="absolute -left-6 top-1/2 -translate-y-1/2"
              >
                <ChevronLeft className="w-6 h-6 text-muted-foreground hover:text-primary" />
              </button>

              <div className="bg-muted/30 p-4 rounded-lg shadow-md flex-1">
                <p className="text-sm text-muted-foreground italic mb-2">
                  "{review.text}"
                </p>
                <div className="flex items-center gap-1 mb-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`w-4 h-4 ${
                        i < review.rating
                          ? "text-amber-700 fill-amber-700"
                          : "text-muted-foreground"
                      }`}
                    />
                  ))}
                </div>
                <p className="text-sm font-semibold">{review.author}</p>
              </div>

              {/* Next button */}
              <button
                onClick={next}
                className="absolute -right-6 top-1/2 -translate-y-1/2"
              >
                <ChevronRight className="w-6 h-6 text-muted-foreground hover:text-primary" />
              </button>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button size="sm" asChild>
                <a
                  href="https://bokshop.bod.se/naer-havet-foeraendrade-allt-jenny-nirs-9789180801843"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Swedish Edition
                </a>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a
                  href="https://bokshop.bod.se/when-the-ocean-changed-everything-jenny-nirs-9789180807661"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  English Edition
                </a>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default BookPromotion;
