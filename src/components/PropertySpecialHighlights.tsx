import { Sparkles } from "lucide-react";

interface Highlight {
  title: string;
  description: string;
}

interface PropertySpecialHighlightsProps {
  propertyTitle: string;
  highlights: Highlight[];
}

const PropertySpecialHighlights = ({ propertyTitle, highlights }: PropertySpecialHighlightsProps) => {
  return (
    <section className="py-16 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-12">
            What Makes {propertyTitle} Special
          </h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {highlights.map((highlight, index) => (
              <div key={index} className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-6">
                  <Sparkles className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-3">{highlight.title}</h3>
                <p className="text-muted-foreground">{highlight.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default PropertySpecialHighlights;