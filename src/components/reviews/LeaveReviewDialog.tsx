// @ts-nocheck
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Star } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingId: string;
  propertyId: string;
  propertyTitle: string;
  /** userId of the host (reviewee) */
  hostProfileId: string;
  onSubmitted?: () => void;
}

/**
 * Let a guest leave a review for a property they stayed at.
 *
 * Uses the existing `reviews` table with review_type='property'.
 * Starts as is_published=false / moderation_status='pending' per the table's
 * default; admin approves from ReviewsManagement.
 */
const LeaveReviewDialog = ({
  open,
  onOpenChange,
  bookingId,
  propertyId,
  propertyTitle,
  hostProfileId,
  onSubmitted,
}: Props) => {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (rating < 1 || rating > 5) {
      toast.error("Please select a rating");
      return;
    }

    setSubmitting(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        toast.error("You must be signed in to review");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", userData.user.id)
        .single();
      if (!profile) {
        toast.error("Profile not found");
        return;
      }

      const { error } = await supabase.from("reviews").insert({
        booking_id: bookingId,
        reviewer_id: profile.id,
        reviewee_id: hostProfileId,
        review_type: "property",
        rating,
        comment: comment.trim() || null,
        is_published: false,
        moderation_status: "pending",
      });

      if (error) throw error;

      toast.success("Thanks! Your review will be published after moderation.");
      onOpenChange(false);
      setRating(0);
      setComment("");
      onSubmitted?.();
    } catch (e) {
      toast.error((e as Error).message || "Failed to submit review");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>How was your stay?</DialogTitle>
          <DialogDescription>
            Review <strong>{propertyTitle}</strong> to help future guests.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div>
            <Label>Rating *</Label>
            <div className="flex gap-1 pt-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setRating(i)}
                  onMouseEnter={() => setHoverRating(i)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="hover:scale-110 transition-transform"
                  aria-label={`${i} star${i === 1 ? "" : "s"}`}
                >
                  <Star
                    className={`h-8 w-8 ${
                      i <= (hoverRating || rating)
                        ? "fill-amber-400 text-amber-400"
                        : "text-muted-foreground/30"
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label>Your review (optional)</Label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={5}
              maxLength={2000}
              placeholder="Share what you liked, what could be better, tips for future guests..."
            />
            <p className="text-xs text-muted-foreground mt-1">{comment.length}/2000</p>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={submitting || rating === 0}>
              {submitting ? "Submitting..." : "Submit review"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LeaveReviewDialog;
