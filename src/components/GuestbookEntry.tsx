import { Star } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface GuestbookEntryProps {
  guestName?: string;
  message: string;
  rating?: number;
  imageUrl?: string;
  stayDate?: string;
  submittedAt: string;
}

const GuestbookEntry = ({ 
  guestName, 
  message, 
  rating, 
  imageUrl, 
  stayDate,
  submittedAt 
}: GuestbookEntryProps) => {
  const initials = guestName
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "G";

  const formattedDate = new Date(submittedAt).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <Card className="overflow-hidden border-border/40 bg-card/50 backdrop-blur-sm hover:shadow-lg transition-all duration-300">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <Avatar className="h-12 w-12 border-2 border-primary/10">
            <AvatarImage src={imageUrl} alt={guestName} />
            <AvatarFallback className="bg-primary/5 text-primary font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h4 className="font-semibold text-foreground">
                  {guestName || "Anonymous Guest"}
                </h4>
                <p className="text-sm text-muted-foreground">
                  {stayDate ? `Stayed ${new Date(stayDate).toLocaleDateString("en-US", { month: "long", year: "numeric" })}` : formattedDate}
                </p>
              </div>
              
              {rating && (
                <div className="flex items-center gap-1 bg-primary/5 px-3 py-1 rounded-full">
                  {Array.from({ length: rating }).map((_, i) => (
                    <Star
                      key={i}
                      className="h-4 w-4 fill-primary text-primary"
                    />
                  ))}
                </div>
              )}
            </div>

            <p className="text-foreground/90 leading-relaxed italic border-l-2 border-primary/20 pl-4">
              "{message}"
            </p>

            {imageUrl && (
              <div className="mt-4 rounded-lg overflow-hidden max-w-md">
                <img
                  src={imageUrl}
                  alt="Guest memory"
                  className="w-full h-auto object-cover rounded-lg shadow-md hover:scale-105 transition-transform duration-300"
                />
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default GuestbookEntry;
