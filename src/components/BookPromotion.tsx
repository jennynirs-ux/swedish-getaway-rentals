import { useState } from "react";
import LazyImage from "@/components/LazyImage";
import { Button } from "@/components/ui/button";
import { Star, ChevronLeft, ChevronRight } from "lucide-react";
import bookCover from "@/assets/book-cover.png";

const reviews = [
  {
    text: `"When the Ocean Changed Everything" stays with you long after the last page. A tribute to strength and resilience.`,
    author: "Patrik",
    date: "2025-01-03",
    rating: 5,
  },
  {
    text: "A moving account of how a single event can change a life. Honest and full of hope.",
    author: "Helena",
    date: "2024-12-17",
    rating: 4,
  },
  {
    text: "A gripping description of one of the greatest natural disasters of our time. Worth reading.",
    author: "Per",
    date: "2024-12-14",
    rating: 5,
  },
  {
    text: "An incredibly captivating book. I couldn’t put it down.",
    author: "Anna",
    date: "2024-12-14",
    rating: 5,
  },
  {
    text: "A dramatic and well-written story about the tsunami in Sri Lanka that hooks you instantly.",
    author: "Karl-Olov",
    date: "2024-12-14",
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
        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-8">
          Vacation Read – A Story of Survival & Meaning
        </h2>

        <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-6 items-start">
          {/* Left: Book image */}
          <div className="flex-shrink-0 flex justify-center md:justify-start">
            <LazyImage
              src={bookCover}
              alt="When the Ocean Changed Everything book cover"
              className="w-28 sm:w-40 md:w-56 lg:w-64 rounded shadow-lg"
            />
          </div>

          {/* Right: Text + Reviews + CTAs */}
          <div className="flex-1 space-y-4">
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              A gripping and unforgettable story about survival, resilience, and
              finding light after the darkest moments. Perfect for your getaway
              reading.
            </p>

            {/* Review Carousel */}
            <div className="bg-muted/30 p-4 rounded-lg shadow-md relative">
              <p className="text-sm text-muted-foreground italic mb-3">
                "{review.text}"
              </p>
              <div className="flex items-center gap-1 mb-2">
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
              <p className="text-xs text-muted-foreground">{review.date}</p>

              {/* Navigation */}
              <div className="absolute inset-y-0 left-2 flex items-center">
                <button onClick={prev}>
                  <ChevronLeft className="w-5 h-5 text-muted-foreground hover:text-primary" />
                </button>
              </div>
              <div className="absolute inset-y-0 right-2 flex items-center">
                <button onClick={next}>
                  <ChevronRight className="w-5 h-5 text-muted-foreground hover:text-primary" />
                </button>
              </div>
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
