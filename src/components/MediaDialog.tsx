import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, X, Play, Pause } from "lucide-react";

interface MediaItem {
  type: "image" | "video";
  url: string;
  title?: string;
  description?: string;
  alt?: string;
}

interface MediaDialogProps {
  media: MediaItem[];
  isOpen: boolean;
  onClose: () => void;
  initialIndex?: number;
}

export const MediaDialog = ({
  media,
  isOpen,
  onClose,
  initialIndex = 0,
}: MediaDialogProps) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isPlaying, setIsPlaying] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const thumbsRef = useRef<HTMLDivElement>(null);
  const activeThumbRef = useRef<HTMLButtonElement>(null);

  // Guard
  const items: MediaItem[] = useMemo(() => Array.isArray(media) ? media : [], [media]);
  const currentItem = items[currentIndex];

  // Sync initial index when dialog opens
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(Math.min(Math.max(0, initialIndex), Math.max(0, items.length - 1)));
      setIsPlaying(false);
      // Pause any playing video if reopened
      if (videoRef.current) videoRef.current.pause();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialIndex, items.length]);

  // Auto-scroll active thumbnail into view
  useEffect(() => {
    if (activeThumbRef.current) {
      activeThumbRef.current.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }
  }, [currentIndex]);

  const nextMedia = () => {
    if (!items.length) return;
    setCurrentIndex((prev) => (prev + 1) % items.length);
    setIsPlaying(false);
    if (videoRef.current) videoRef.current.pause();
  };

  const prevMedia = () => {
    if (!items.length) return;
    setCurrentIndex((prev) => (prev - 1 + items.length) % items.length);
    setIsPlaying(false);
    if (videoRef.current) videoRef.current.pause();
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  if (!items.length || !currentItem) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="w-full max-w-4xl h-[80svh] p-0 bg-black border-none rounded-lg">
        <div className="relative w-full h-full flex flex-col">
          {/* Close button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 z-20 bg-black/60 hover:bg-black/80 text-white border-none"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </Button>

          {/* Main media area (fixed height via flex-1 inside fixed dialog height) */}
          <div className="flex-1 relative flex items-center justify-center px-2 py-2 overflow-hidden">
            {/* Nav arrows */}
            {items.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-black/50 hover:bg-black/70 text-white border-none"
                  onClick={prevMedia}
                  aria-label="Previous"
                >
                  <ChevronLeft className="h-6 w-6" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-black/50 hover:bg-black/70 text-white border-none"
                  onClick={nextMedia}
                  aria-label="Next"
                >
                  <ChevronRight className="h-6 w-6" />
                </Button>
              </>
            )}

            {/* Media content (contain to keep entire image visible) */}
            <div className="max-w-full max-h-full flex items-center justify-center">
              {currentItem.type === "image" ? (
                <img
                  src={currentItem.url}
                  alt={currentItem.alt || currentItem.title || ""}
                  className="max-w-full max-h-full object-contain rounded-md"
                />
              ) : (
                <div className="relative flex items-center justify-center">
                  <video
                    ref={videoRef}
                    src={currentItem.url}
                    className="max-w-full max-h-full object-contain rounded-md"
                    controls
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white border-none"
                    onClick={togglePlay}
                    aria-label={isPlaying ? "Pause" : "Play"}
                  >
                    {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Info + Thumbs (fixed height, won’t grow the dialog) */}
          <div className="bg-black/85 border-t border-white/10">
            {/* Title / description (single line styles to save space) */}
            {(currentItem.title || currentItem.description) && (
              <div className="px-3 pt-2 pb-1 text-center text-white">
                {currentItem.title && (
                  <h3 className="text-sm font-medium leading-snug">{currentItem.title}</h3>
                )}
                {currentItem.description && (
                  <p className="text-xs text-white/75 leading-snug">{currentItem.description}</p>
                )}
              </div>
            )}

            {/* Thumbnails strip — fixed height with horizontal scroll */}
            {items.length > 1 && (
              <div className="relative">
                {/* left mask */}
                <div className="pointer-events-none absolute left-0 top-0 h-full w-6 bg-gradient-to-r from-black/85 to-transparent z-10" />
                {/* right mask */}
                <div className="pointer-events-none absolute right-0 top-0 h-full w-6 bg-gradient-to-l from-black/85 to-transparent z-10" />

                <div
                  ref={thumbsRef}
                  className="flex items-center gap-2 overflow-x-auto px-4 py-2 h-20"
                >
                  {items.map((item, index) => {
                    const isActive = index === currentIndex;
                    return (
                      <button
                        key={`${item.url}-${index}`}
                        ref={isActive ? activeThumbRef : undefined}
                        onClick={() => {
                          setCurrentIndex(index);
                          setIsPlaying(false);
                          if (videoRef.current) videoRef.current.pause();
                        }}
                        className={`flex-shrink-0 w-16 h-16 rounded-md border-2 overflow-hidden transition-all ${
                          isActive ? "border-white" : "border-transparent hover:border-white/50"
                        }`}
                        aria-label={`Open media ${index + 1}`}
                      >
                        {item.type === "image" ? (
                          <img
                            src={item.url}
                            alt={item.alt || `Media ${index + 1}`}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="relative w-full h-full bg-gray-800 flex items-center justify-center">
                            <video
                              src={item.url}
                              className="w-full h-full object-cover"
                              muted
                            />
                            <Play className="absolute h-4 w-4 text-white" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Counter */}
            {items.length > 1 && (
              <div className="px-3 pb-2 text-center text-[11px] text-white/60">
                {currentIndex + 1} of {items.length}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
