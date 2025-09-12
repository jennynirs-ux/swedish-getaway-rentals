import { Button } from "@/components/ui/button";
import { Property } from "@/hooks/useProperties";
import { BookOpen, Sparkles, Mountain, Flame } from "lucide-react";

interface PropertySpecialHighlightsProps {
  property: Property;
  onViewGuide: () => void;
}

interface Highlight {
  title: string;
  description: string;
  icon?: string;
}

const PropertySpecialHighlights = ({ property, onViewGuide }: PropertySpecialHighlightsProps) => {
  // Icon mapping for special highlights
  const getHighlightIcon = (iconName?: string) => {
    switch (iconName?.toLowerCase()) {
      case 'mountain':
        return Mountain;
      case 'flame':
        return Flame;
      case 'sparkles':
      default:
        return Sparkles;
    }
  };

  const highlights = (property.special_highlights as Highlight[]) || [];

  // Take only first 3 highlights for the row display
  const displayHighlights = highlights.slice(0, 3);

  if (!displayHighlights.length) {
    return null;
  }
  return (
    <section className="py-16 bg-gradient-to-br from-primary/5 to-secondary/5">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          {/* Section Title */}
          <h2 className="text-4xl md:text-5xl font-bold text-center mb-16">
            What Makes {property.title} Special
          </h2>

          {/* Special Highlights Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            {displayHighlights.map((highlight, index) => {
              const IconComponent = getHighlightIcon(highlight.icon);
              
              return (
                <div key={index} className="text-center group">
                  <div className="inline-flex items-center justify-center w-20 h-20 bg-primary/10 rounded-full mb-6 group-hover:bg-primary/20 transition-all duration-300 group-hover:scale-110">
                    <IconComponent className="h-10 w-10 text-primary" />
                  </div>
                  <h3 className="text-2xl font-bold mb-4">{highlight.title}</h3>
                  <p className="text-lg text-muted-foreground leading-relaxed">
                    {highlight.description}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Guest Guide Button */}
          <div className="text-center">
            <Button 
              size="lg" 
              onClick={onViewGuide}
              className="text-lg px-8 py-6"
            >
              <BookOpen className="h-5 w-5 mr-2" />
              View Complete Guest Guide
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PropertySpecialHighlights;