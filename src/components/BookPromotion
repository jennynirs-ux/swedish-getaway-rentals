import LazyImage from "@/components/LazyImage";
import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

import bookCover from "@/assets/book-cover.png";

const BookPromotion = () => {
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
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
              Vacation Read – A Story of Survival & Meaning
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              A gripping and unforgettable story about survival, resilience,
              and finding light after the darkest moments. Perfect for your
              getaway reading.
            </p>

            {/* Reviews Carousel */}
            <div className="relative w-full max-w-lg">
              <Carousel>
                <CarouselContent>
                  {[
                    {
                      stars: 5,
                      text: "A gripping and unforgettable story... raw yet hopeful.",
                      author: "Patrik",
                    },
                    {
                      stars: 4,
                      text: "A deeply moving account of how a single event can change a life forever.",
                      author: "Helena",
                    },
                    {
                      stars: 5,
                      text: "Engaging and dramatic. A must-read.",
                      author: "Per",
                    },
                    {
                      stars: 5,
                      text: "Captivating – I couldn’t put it down.",
                      author: "Anna",
                    },
                    {
                      stars: 5,
                      text: "Dramatic and powerful from the very first sentence.",
                      author: "Karl-Olov",
                    },
                  ].map((review, idx) => (
                    <CarouselItem key={idx}>
                      <div className="space-y-2">
                        <div className="flex items-center gap-1 text-yellow-700">
                          {Array.from({ length: review.stars }).map((_, i) => (
                            <span key={i}>★</span>
                          ))}
                        </div>
                        <p className="text-muted-foreground text-sm">
                          “{review.text}” – {review.author}
                        </p>
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>

                {/* Arrows outside content for more space */}
                <div className="absolute -left-10 top-1/2 -translate-y-1/2">
                  <CarouselPrevious />
                </div>
                <div className="absolute -right-10 top-1/2 -translate-y-1/2">
                  <CarouselNext />
                </div>
              </Carousel>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button size="sm" sm:size="lg" asChild>
                <a
                  href="https://bokshop.bod.se/naer-havet-foeraendrade-allt-jenny-nirs-9789180801843"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Buy in Swedish
                </a>
              </Button>
              <Button variant="outline" size="sm" sm:size="lg" asChild>
                <a
                  href="https://bokshop.bod.se/when-the-ocean-changed-everything-jenny-nirs-9789180807661"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Buy in English
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
