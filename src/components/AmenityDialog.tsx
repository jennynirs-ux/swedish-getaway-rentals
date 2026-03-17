import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { LucideIcon } from "lucide-react";

interface AmenityDialogProps {
  amenity: {
    icon: LucideIcon;
    title: string;
    tagline: string;
    description: string;
    image_url?: string;
    features?: string[];
  } | null;
  isOpen: boolean;
  onClose: () => void;
}

export const AmenityDialog = ({ amenity, isOpen, onClose }: AmenityDialogProps) => {
  if (!amenity) return null;

  const IconComponent = amenity.icon;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl w-full max-h-[90vh] overflow-y-auto p-0 bg-card">
        <DialogHeader className="p-4 sm:p-6 pb-0 sticky top-0 bg-card z-10">
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-3 top-3 rounded-full"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
          <DialogTitle className="text-xl sm:text-2xl font-bold text-foreground pr-8">{amenity.title}</DialogTitle>
          <p className="text-primary font-medium mt-1 text-sm sm:text-base">{amenity.tagline}</p>
        </DialogHeader>
        
        <div className="p-4 sm:p-6">
          {/* Icon and main description */}
          <div className="flex items-start gap-3 sm:gap-4 mb-4 sm:mb-6">
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <IconComponent className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-muted-foreground text-sm sm:text-lg leading-relaxed">
                {amenity.description}
              </p>
            </div>
          </div>

          {/* Features list */}
          {amenity.features && amenity.features.length > 0 && (
            <div className="mb-4 sm:mb-6">
              <h4 className="text-base sm:text-lg font-semibold text-foreground mb-2 sm:mb-3">Included Features</h4>
              <ul className="space-y-2">
                {amenity.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2 sm:gap-3 text-muted-foreground text-sm sm:text-base">
                    <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-1.5" />
                    <span className="flex-1">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Image if available */}
          {amenity.image_url && (
            <div className="rounded-lg overflow-hidden">
              <img
                src={amenity.image_url}
                alt={amenity.title}
                loading="lazy"
                decoding="async"
                className="w-full h-40 sm:h-48 object-cover"
              />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};