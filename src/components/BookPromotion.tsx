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
    <section className="py-10 bg-card">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Title on top */}
        <h2 className="text-center text-2xl sm:text-3xl font-bold text-foreground mb-8">
          Vacation Read – A Story of Survival & Meaning
        </h2>

        <div className="flex flex-row gap-6 items-start">
          {/* Left: Book image */}
          <div className="flex-shrink-0">
            <LazyImage
              src={bookCover}
              alt="When the Ocean Changed Everything book cover"
              className="w-24 sm:w-36 md:w-48 lg:w-56 rounded shadow-md"
            />
          </div>

          {/* Right: Text + Reviews + CTAs */}
          <div className="flex-1 space-y-4">
            <p className="text-xs sm:text-sm md:text-base text-muted-foreground leading-snug">
              A gripping and unforgettable story about survival, resilience,
              and finding light after the darkest moments. Perfect for your
              getaway reading.
            </p>

            {/* Review Carousel */}
            <div className="bg-muted/20 p-3 sm:p-4 rounded-md shadow-sm relative">
              <p className="text-xs sm:text-sm italic text-muted-foreground mb-2 leading-snug">
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
              <p className="text-xs font-semibold">{review.author}</p>
              <p className="text-[10px] text-muted-foreground">{review.date}</p>

              {/* Navigation */}
              <div className="absolute top-1/2 left-2 -translate-y-1/2">
                <button onClick={prev}>
                  <ChevronLeft className="w-5 h-5 text-muted-foreground hover:text-primary" />
                </button>
              </div>
              <div className="absolute top-1/2 right-2 -translate-y-1/2">
                <button onClick={next}>
                  <ChevronRight className="w-5 h-5 text-muted-foreground hover:text-primary" />
                </button>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button
                asChild
                className="text-xs sm:text-sm px-3 py-2 sm:px-5 sm:py-2"
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
                className="text-xs sm:text-sm px-3 py-2 sm:px-5 sm:py-2"
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
