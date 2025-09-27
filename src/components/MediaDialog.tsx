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
  const activeThumbRef = useRef<HTMLButtonElement>(null);

  const items: MediaItem[] = useMemo(() => (Array.isArray(media) ? media : []), [media]);
  const currentItem = items[currentIndex];

  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(Math.min(Math.max(0, initialIndex), items.length - 1));
      setIsPlaying(false);
      if (videoRef.current) videoRef.current.pause();
    }
  }, [isOpen, initialIndex, items.length]);

  useEffect(() => {
    if (activeThumbRef.current) {
      activeThumbRef.current.scrollIntoView({ behavior: "smooth", inline: "center" });
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
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-full max-w-4xl h-[80svh] p-0 bg-black border-none rounded-lg">
        <div className="relative w-full h-full flex flex-col">
          {/* Close */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 z-20 bg-black/60 hover:bg-black/80 text-white"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </Button>

          {/* Media */}
          <div className="flex-1 relative flex items-center justify-center px-2 py-2 overflow-hidden">
            {items.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-black/50 text-white"
                  onClick={prevMedia}
                >
                  <ChevronLeft className="h-6 w-6" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-black/50 text-white"
                  onClick={nextMedia}
                >
                  <ChevronRight className="h-6 w-6" />
                </Button>
              </>
            )}

            <div className="max-w-full max-h-[60svh] flex items-center justify-center">
              {currentItem.type === "image" ? (
                <img
                  src={currentItem.url}
                  alt={currentItem.alt || currentItem.title || ""}
                  className="max-w-full max-h-[60svh] object-contain rounded-md"
                />
              ) : (
                <div className="relative flex items-center justify-center">
                  <video
                    ref={videoRef}
                    src={currentItem.url}
                    className="max-w-full max-h-[60svh] object-contain rounded-md"
                    controls
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/50 text-white"
                    onClick={togglePlay}
                  >
                    {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Info + Thumbnails */}
          <div className="bg-black/85 border-t border-white/10">
            {(currentItem.title || currentItem.description) && (
              <div className="px-3 pt-2 pb-1 text-center text-white">
                {currentItem.title && <h3 className="text-sm font-medium">{currentItem.title}</h3>}
                {currentItem.description && (
                  <p className="text-xs text-white/75">{currentItem.description}</p>
                )}
              </div>
            )}

            {items.length > 1 && (
              <div className="flex items-center gap-2 overflow-x-auto px-4 py-2 h-20">
                {items.map((item, index) => (
                  <button
                    key={`${item.url}-${index}`}
                    ref={index === currentIndex ? activeThumbRef : undefined}
                    onClick={() => setCurrentIndex(index)}
                    className={`flex-shrink-0 w-16 h-16 rounded-md border-2 overflow-hidden ${
                      index === currentIndex ? "border-white" : "border-transparent"
                    }`}
                  >
                    {item.type === "image" ? (
                      <img
                        src={item.url}
                        alt={item.alt || `Media ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="relative w-full h-full bg-gray-800 flex items-center justify-center">
                        <Play className="h-4 w-4 text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}

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
