import { Star, Calendar } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface ReviewCardProps {
  reviewer: {
    display_name?: string;
    full_name?: string;
    avatar_url?: string;
  };
  rating: number;
  comment?: string;
  created_at: string;
  className?: string;
  propertyTitle?: string;
}

const ReviewCard = ({ reviewer, rating, comment, created_at, className, propertyTitle }: ReviewCardProps) => {
  const displayName = reviewer.display_name || reviewer.full_name || 'Anonymous';
  const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase();

  return (
    <Card className={className}>
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <Avatar className="h-12 w-12">
            <AvatarImage src={reviewer.avatar_url} alt={displayName} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <h4 className="font-semibold">{displayName}</h4>
              {propertyTitle && (
                <span className="text-sm text-muted-foreground">for {propertyTitle}</span>
              )}
              <div className="flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`h-4 w-4 ${
                      i < rating 
                        ? 'fill-yellow-400 text-yellow-400' 
                        : 'text-muted-foreground'
                    }`}
                  />
                ))}
              </div>
            </div>
            
            {comment && (
              <p className="text-muted-foreground leading-relaxed">{comment}</p>
            )}
            
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Calendar className="h-3 w-3" />
              {new Date(created_at).toLocaleDateString()}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ReviewCard;