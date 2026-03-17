'use client';

import React, { useState, useCallback } from 'react';
import useEmblaCarousel from 'embla-carousel-react';

interface SwipeableGalleryProps {
  images: string[];
  alt?: string;
  onImageClick?: (index: number) => void;
  className?: string;
}

export function SwipeableGallery({ images, alt = 'Property image', onImageClick, className = '' }: SwipeableGalleryProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
  const [selectedIndex, setSelectedIndex] = useState(0);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  React.useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on('select', onSelect);
    return () => { emblaApi.off('select', onSelect); };
  }, [emblaApi, onSelect]);

  if (!images || images.length === 0) return null;

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <div ref={emblaRef} className="overflow-hidden">
        <div className="flex">
          {images.map((src, index) => (
            <div
              key={index}
              className="flex-[0_0_100%] min-w-0"
              onClick={() => onImageClick?.(index)}
            >
              <img
                src={src}
                alt={`${alt} ${index + 1}`}
                className="w-full h-64 sm:h-80 object-cover"
                loading={index === 0 ? 'eager' : 'lazy'}
                decoding="async"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Dot indicators */}
      {images.length > 1 && (
        <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5" role="tablist" aria-label="Image carousel indicators">
          {images.slice(0, Math.min(images.length, 5)).map((_, index) => (
            <button
              key={index}
              className={`h-1.5 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-transparent ${
                index === selectedIndex % Math.min(images.length, 5)
                  ? 'w-4 bg-white'
                  : 'w-1.5 bg-white/70'
              }`}
              role="tab"
              tabIndex={0}
              aria-label={`Image ${index + 1}`}
              aria-current={index === selectedIndex % Math.min(images.length, 5) ? 'true' : 'false'}
              onClick={() => {
                // Find the absolute index and select that slide
                const absoluteIndex = index;
                if (emblaApi) {
                  emblaApi.scrollSnapList().forEach((_, snapIndex) => {
                    if (snapIndex % Math.min(images.length, 5) === absoluteIndex) {
                      emblaApi.scrollSnapList()[snapIndex] && emblaApi.scrollTo(snapIndex);
                    }
                  });
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  const absoluteIndex = index;
                  if (emblaApi) {
                    emblaApi.scrollSnapList().forEach((_, snapIndex) => {
                      if (snapIndex % Math.min(images.length, 5) === absoluteIndex) {
                        emblaApi.scrollSnapList()[snapIndex] && emblaApi.scrollTo(snapIndex);
                      }
                    });
                  }
                }
              }}
            />
          ))}
          {images.length > 5 && (
            <div className="h-1.5 w-1.5 rounded-full bg-white/70" />
          )}
        </div>
      )}

      {/* Image counter */}
      <div className="absolute top-3 right-3 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
        {selectedIndex + 1} / {images.length}
      </div>
    </div>
  );
}
