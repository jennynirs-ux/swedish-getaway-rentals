import { useState } from "react";
import LazyImage from "@/components/LazyImage";
import { Button } from "@/components/ui/button";
import { Star, ChevronLeft, ChevronRight } from "lucide-react";

import bookCover from "@/assets/book-cover.png";

const reviews = [
  {
    text: `"When the Ocean Changed Everything" is a book that stays with you long after the last page. A tribute to human strength and resilience.`,
    author: "Patrik",
    date: "2025-01-03",
    rating: 5,
  },
  {
    text: "Jenny’s book is a powerful and moving account of how a single event can change a life, written with honesty and hope.",
    author: "Helena",
    date: "2024-12-17",
    rating: 4,
  },
  {
    text: "A compelling description of one of the greatest natural disasters of our time. The book is absolutely worth reading.",
    author: "Per",
    date: "2024-12-14",
    rating: 5,
  },
  {
    text: "An incredibly moving and captivating book. I couldn’t put it down and read it in one sitting.",
    author: "Anna",
    date: "2024-12-14",
    rating: 5,
  },
  {
    text: "A dramatic and well-written story about the tsunami in Sri Lanka that hooks you from the very first line.",
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
        <div className="max-w-6xl mx-auto flex flex-row gap-6 items-start">
          {/* Left: Book image */}
          <div className="flex-shrink-0">
            <LazyImage
              src={bookCover}
              alt="When the Ocean Changed Everything book cover"
              className="w-28 sm:w-40 md:w-56 lg:w-64 rounded shadow-lg"
            />
          </div>

          {/* Right: Text + Reviews + CTAs */}
          <div className="flex-1 space-y-4">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground">
              Vacation Read – A Story of Survival & Meaning
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              A gripping and unforgettable story about survival, resilience,
              and finding light after the darkest moments. Perfect for your
              getaway reading.
            </p>

            {/* Review Carousel */}
            <div className="bg-muted/30 p-4 rounded-lg shadow-md relative">
              <p className="text-sm sm:text-base italic text-muted-foreground mb-3">
                "{review.text}"
              </p>
              <div className="flex items-center gap-1 mb-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`w-4 h-4 sm:w-5 sm:h-5 ${
                      i < review.rating
                        ? "text-amber-700 fill-amber-700"
                        : "text-muted-foreground"
                    }`}
                  />
                ))}
              </div>
              <p className="font-semibold">{review.author}</p>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {review.date}
              </p>

              {/* Navigation */}
              <div className="absolute top-1/2 left-2 -translate-y-1/2">
                <button onClick={prev}>
                  <ChevronLeft className="w-6 h-6 text-muted-foreground hover:text-primary" />
                </button>
              </div>
              <div className="absolute top-1/2 right-2 -translate-y-1/2">
                <button onClick={next}>
                  <ChevronRight className="w-6 h-6 text-muted-foreground hover:text-primary" />
                </button>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button
                asChild
                className="text-sm sm:text-base px-4 py-2 sm:px-6 sm:py-3"
              >
                <a
                  href="https://bokshop.bod.se/naer-havet-foeraendrade-allt-jenny-nirs-9789180801843"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Swedish Edition
                </a>
              </Button>
              <Button
                variant="outline"
                asChild
                className="text-sm sm:text-base px-4 py-2 sm:px-6 sm:py-3"
              >
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
