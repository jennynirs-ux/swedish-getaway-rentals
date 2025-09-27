import { useState, useRef } from "react";
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

  const currentItem = media[currentIndex];

  const nextMedia = () => {
    setCurrentIndex((prev) => (prev + 1) % media.length);
    setIsPlaying(false);
  };

  const prevMedia = () => {
    setCurrentIndex((prev) => (prev - 1 + media.length) % media.length);
    setIsPlaying(false);
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  if (!currentItem) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-4xl h-auto max-h-[80vh] p-0 bg-black border-none rounded-lg">
        <div className="relative w-full h-full flex flex-col">
          {/* Close button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 z-20 bg-black/50 hover:bg-black/70 text-white border-none"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </Button>

          {/* Main media container */}
          <div className="flex-1 relative flex items-center justify-center p-2 overflow-hidden">
            {/* Navigation arrows */}
            {media.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-2 top-1/2 transform -translate-y-1/2 z-10 bg-black/50 hover:bg-black/70 text-white border-none"
                  onClick={prevMedia}
                >
                  <ChevronLeft className="h-6 w-6" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 z-10 bg-black/50 hover:bg-black/70 text-white border-none"
                  onClick={nextMedia}
                >
                  <ChevronRight className="h-6 w-6" />
                </Button>
              </>
            )}

            {/* Media content */}
            <div className="max-w-full max-h-[65vh] flex items-center justify-center">
              {currentItem.type === "image" ? (
                <img
                  src={currentItem.url}
                  alt={currentItem.alt || currentItem.title || ""}
                  className="max-w-full max-h-[65vh] object-contain rounded-lg"
                />
              ) : (
                <div className="relative flex items-center justify-center">
                  <video
                    ref={videoRef}
                    src={currentItem.url}
                    className="max-w-full max-h-[65vh] object-contain rounded-lg"
                    controls
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white border-none"
                    onClick={togglePlay}
                  >
                    {isPlaying ? (
                      <Pause className="h-6 w-6" />
                    ) : (
                      <Play className="h-6 w-6" />
                    )}
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Bottom info and thumbnails */}
          <div className="bg-black/80 p-3 space-y-3">
            {/* Title and description */}
            {(currentItem.title || currentItem.description) && (
              <div className="text-center text-white">
                {currentItem.title && (
                  <h3 className="text-base font-semibold mb-1">
                    {currentItem.title}
                  </h3>
                )}
                {currentItem.description && (
                  <p className="text-xs text-white/80">
                    {currentItem.description}
                  </p>
                )}
              </div>
            )}

            {/* Thumbnail navigation */}
            {media.length > 1 && (
              <div className="flex justify-center space-x-2 overflow-x-auto pb-1">
                {media.map((item, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setCurrentIndex(index);
                      setIsPlaying(false);
                    }}
                    className={`flex-shrink-0 w-14 h-14 rounded-lg border-2 overflow-hidden transition-all ${
                      index === currentIndex
                        ? "border-white"
                        : "border-transparent hover:border-white/50"
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
                        <video
                          src={item.url}
                          className="w-full h-full object-cover"
                          muted
                        />
                        <Play className="absolute h-4 w-4 text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Counter */}
            {media.length > 1 && (
              <div className="text-center text-xs text-white/60">
                {currentIndex + 1} of {media.length}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
