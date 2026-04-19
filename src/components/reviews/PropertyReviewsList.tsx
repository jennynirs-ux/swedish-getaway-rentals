// @ts-nocheck
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Star } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  reviewer_name: string | null;
}

interface Props {
  propertyId: string;
  limit?: number;
}

/**
 * Public-facing list of reviews for a property.
 *
 * Only shows reviews where moderation_status = 'approved' and is_published = true.
 * RLS handles the access control; this component just renders what it gets back.
 */
const PropertyReviewsList = ({ propertyId, limit = 10 }: Props) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propertyId]);

  const load = async () => {
    setLoading(true);
    try {
      // Fetch reviews for bookings on this property, reviewing the property
      // (review_type = 'property' per the schema)
      const { data } = await supabase
        .from("reviews")
        .select(`
          id, rating, comment, created_at, reviewer_id,
          bookings!inner(property_id, guest_name)
        `)
        .eq("bookings.property_id", propertyId)
        .eq("review_type", "property")
        .eq("is_published", true)
        .eq("moderation_status", "approved")
        .order("created_at", { ascending: false })
        .limit(limit);

      const mapped: Review[] = (data || []).map((r: any) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        created_at: r.created_at,
        reviewer_name: r.bookings?.guest_name || "Guest",
      }));

      setReviews(mapped);
    } catch {
      setReviews([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-sm text-muted-foreground">Loading reviews...</div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Star className="h-8 w-8 mx-auto mb-2 opacity-30" />
        <p className="text-sm">No reviews yet. Be the first to stay and review!</p>
      </div>
    );
  }

  const avgRating =
    reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="flex">
          {[1, 2, 3, 4, 5].map((i) => (
            <Star
              key={i}
              className={`h-5 w-5 ${
                i <= Math.round(avgRating)
                  ? "fill-amber-400 text-amber-400"
                  : "text-muted-foreground/30"
              }`}
            />
          ))}
        </div>
        <span className="font-semibold">{avgRating.toFixed(1)}</span>
        <span className="text-sm text-muted-foreground">
          ({reviews.length} {reviews.length === 1 ? "review" : "reviews"})
        </span>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {reviews.map((r) => {
          const initials = (r.reviewer_name || "G")
            .split(" ")
            .map((p) => p[0])
            .slice(0, 2)
            .join("")
            .toUpperCase();

          return (
            <Card key={r.id}>
              <CardContent className="pt-6 space-y-3">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-sm">{r.reviewer_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(r.created_at), "MMMM yyyy")}
                    </p>
                  </div>
                </div>
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star
                      key={i}
                      className={`h-3 w-3 ${
                        i <= r.rating
                          ? "fill-amber-400 text-amber-400"
                          : "text-muted-foreground/30"
                      }`}
                    />
                  ))}
                </div>
                {r.comment && (
                  <p className="text-sm text-foreground/90 leading-relaxed">
                    {r.comment}
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default PropertyReviewsList;
