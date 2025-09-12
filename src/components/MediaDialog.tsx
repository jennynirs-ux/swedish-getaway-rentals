import { useState, useRef } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, X, Play, Pause } from "lucide-react";

interface MediaItem {
  type: 'image' | 'video';
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

export const MediaDialog = ({ media, isOpen, onClose, initialIndex = 0 }: MediaDialogProps) => {
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
      <DialogContent className="max-w-7xl w-[95vw] h-[95vh] p-0 bg-black border-none">
        <div className="relative w-full h-full flex flex-col">
          {/* Close button */}
          <Button
            variant="ghost"
            size="sm"
            className="absolute top-4 right-4 z-20 bg-black/50 hover:bg-black/70 text-white border-none"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </Button>

          {/* Main media container */}
          <div className="flex-1 relative flex items-center justify-center p-4">
            {/* Navigation arrows */}
            {media.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="lg"
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10 bg-black/50 hover:bg-black/70 text-white border-none"
                  onClick={prevMedia}
                >
                  <ChevronLeft className="h-8 w-8" />
                </Button>
                <Button
                  variant="ghost"
                  size="lg"
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 z-10 bg-black/50 hover:bg-black/70 text-white border-none"
                  onClick={nextMedia}
                >
                  <ChevronRight className="h-8 w-8" />
                </Button>
              </>
            )}

            {/* Media content */}
            <div className="max-w-full max-h-full flex items-center justify-center">
              {currentItem.type === 'image' ? (
                <img
                  src={currentItem.url}
                  alt={currentItem.alt || currentItem.title || ''}
                  className="max-w-full max-h-full object-contain rounded-lg"
                  style={{ maxHeight: 'calc(95vh - 150px)' }}
                />
              ) : (
                <div className="relative flex items-center justify-center">
                  <video
                    ref={videoRef}
                    src={currentItem.url}
                    className="max-w-full max-h-full object-contain rounded-lg"
                    style={{ maxHeight: 'calc(95vh - 150px)' }}
                    controls
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                  />
                  {currentItem.type === 'video' && (
                    <Button
                      variant="ghost"
                      size="lg"
                      className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white border-none"
                      onClick={togglePlay}
                    >
                      {isPlaying ? <Pause className="h-8 w-8" /> : <Play className="h-8 w-8" />}
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Bottom info and navigation */}
          <div className="bg-black/80 p-4 space-y-4">
            {/* Title and description */}
            {(currentItem.title || currentItem.description) && (
              <div className="text-center text-white">
                {currentItem.title && (
                  <h3 className="text-lg font-semibold mb-2">{currentItem.title}</h3>
                )}
                {currentItem.description && (
                  <p className="text-sm text-white/80">{currentItem.description}</p>
                )}
              </div>
            )}

            {/* Thumbnail navigation */}
            {media.length > 1 && (
              <div className="flex justify-center space-x-2 overflow-x-auto">
                {media.map((item, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setCurrentIndex(index);
                      setIsPlaying(false);
                    }}
                    className={`flex-shrink-0 w-16 h-16 rounded-lg border-2 overflow-hidden transition-all ${
                      index === currentIndex 
                        ? 'border-white' 
                        : 'border-transparent hover:border-white/50'
                    }`}
                  >
                    {item.type === 'image' ? (
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
              <div className="text-center text-sm text-white/60">
                {currentIndex + 1} of {media.length}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};