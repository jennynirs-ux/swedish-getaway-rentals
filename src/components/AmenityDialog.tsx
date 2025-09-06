import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { LucideIcon } from "lucide-react";

interface AmenityDialogProps {
  amenity: {
    icon: LucideIcon;
    title: string;
    description: string;
    detailedDescription?: string;
    image?: string;
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
      <DialogContent className="max-w-2xl w-full p-0 bg-card">
        <DialogHeader className="p-6 pb-0 flex flex-row items-center justify-between">
          <DialogTitle className="text-2xl font-bold text-foreground">{amenity.title}</DialogTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0 hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>
        
        <div className="p-6">
          {/* Icon and main description */}
          <div className="flex items-start gap-4 mb-6">
            <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <IconComponent className="w-8 h-8 text-primary" />
            </div>
            <div>
              <p className="text-muted-foreground text-lg leading-relaxed">
                {amenity.description}
              </p>
            </div>
          </div>

          {/* Detailed description */}
          {amenity.detailedDescription && (
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-foreground mb-3">Details</h4>
              <p className="text-muted-foreground leading-relaxed">
                {amenity.detailedDescription}
              </p>
            </div>
          )}

          {/* Features list */}
          {amenity.features && amenity.features.length > 0 && (
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-foreground mb-3">Included Features</h4>
              <ul className="space-y-2">
                {amenity.features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-2 text-muted-foreground">
                    <div className="w-1.5 h-1.5 bg-primary rounded-full flex-shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Image if available */}
          {amenity.image && (
            <div className="rounded-lg overflow-hidden">
              <img
                src={amenity.image}
                alt={amenity.title}
                className="w-full h-48 object-cover"
              />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};