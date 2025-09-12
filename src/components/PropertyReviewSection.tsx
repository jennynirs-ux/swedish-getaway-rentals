import { Star } from "lucide-react";

interface PropertyReviewSectionProps {
  rating: number;
  reviewCount: number;
}

const PropertyReviewSection = ({ rating, reviewCount }: PropertyReviewSectionProps) => {
  return (
    <div className="flex items-center gap-2 mb-6">
      <div className="flex items-center gap-1">
        <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
        <span className="font-semibold text-lg">{rating}</span>
      </div>
      <span className="text-muted-foreground">•</span>
      <span className="text-muted-foreground">{reviewCount} reviews</span>
    </div>
  );
};

export default PropertyReviewSection;