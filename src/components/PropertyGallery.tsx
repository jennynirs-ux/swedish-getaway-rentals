import React, { useState, useEffect } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

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

export const MediaDialog: React.FC<MediaDialogProps> = ({
  media,
  isOpen,
  onClose,
  initialIndex = 0,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex);
      document.body.style.overflow = "hidden"; // förhindra scroll i bakgrunden
    } else {
      document.body.style.overflow = "auto";
    }
  }, [isOpen, initialIndex]);

  if (!isOpen || media.length === 0) return null;

  const currentMedia = media[currentIndex];

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + media.length) % media.length);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % media.length);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center">
      {/* Close button */}
      <button
        className="absolute top-4 right-4 text-white p-2 rounded-full bg-black/60 hover:bg-black/80"
        onClick={onClose}
      >
        <X className="w-6 h-6" />
      </button>

      {/* Navigation arrows */}
      {media.length > 1 && (
        <>
          <button
            className="absolute left-4 top-1/2 -translate-y-1/2 text-white p-2 rounded-full bg-black/60 hover:bg-black/80"
            onClick={handlePrev}
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white p-2 rounded-full bg-black/60 hover:bg-black/80"
            onClick={handleNext}
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </>
      )}

      {/* Media display */}
      <div className="max-w-[95vw] max-h-[90vh] flex flex-col items-center justify-center">
        {currentMedia.type === "image" ? (
          <img
            src={currentMedia.url}
            alt={currentMedia.alt || currentMedia.title}
            className="max-h-[90vh] max-w-[95vw] object-contain rounded-lg"
          />
        ) : (
          <video
            src={currentMedia.url}
            controls
            className="max-h-[90vh] max-w-[95vw] rounded-lg"
          />
        )}

        {/* Title & description */}
        <div className="text-center text-white mt-4 px-4 max-w-2xl">
          {currentMedia.title && (
            <h3 className="text-lg font-semibold">{currentMedia.title}</h3>
          )}
          {currentMedia.description && (
            <p className="text-sm opacity-80">{currentMedia.description}</p>
          )}
        </div>
      </div>
    </div>
  );
};
