import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Star, Upload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";
import DOMPurify from "dompurify";
import { ImageUpload } from "./admin/ImageUpload";
import { useTranslation } from "@/lib/i18n/useTranslation";

const guestbookSchema = z.object({
  guestName: z.string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be less than 100 characters")
    .trim(),
  message: z.string()
    .min(10, "Message must be at least 10 characters")
    .max(2000, "Message must be less than 2000 characters")
    .trim(),
});

interface GuestbookFormProps {
  propertyId: string;
  propertyTitle: string;
  token: string;
  bookingId: string;
  guestEmail: string;
  checkInDate: string;
}

const GuestbookForm = ({
  propertyId,
  propertyTitle,
  token,
  bookingId,
  guestEmail,
  checkInDate
}: GuestbookFormProps) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [guestName, setGuestName] = useState("");
  const [message, setMessage] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Validate input
      const sanitizedData = {
        guestName: DOMPurify.sanitize(guestName.trim()),
        message: DOMPurify.sanitize(message.trim()),
      };

      const validatedData = guestbookSchema.parse(sanitizedData);

      setLoading(true);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error(t('guestbook.error.signIn', 'Please sign in to submit your guestbook entry'));
        return;
      }

      // Validate token before submitting
      const { data: tokenData, error: tokenFetchError } = await supabase
        .from("guestbook_tokens")
        .select("id, expires_at, used_at")
        .eq("token", token)
        .eq("booking_id", bookingId)
        .single();

      if (tokenFetchError || !tokenData) {
        toast.error(t('guestbook.error.invalidToken', 'Invalid or expired guestbook link'));
        return;
      }

      // Check if token is already used
      if (tokenData.used_at) {
        toast.error(t('guestbook.error.tokenUsed', 'This guestbook link has already been used'));
        return;
      }

      // Check if token is expired
      const expiresAt = new Date(tokenData.expires_at);
      if (expiresAt < new Date()) {
        toast.error(t('guestbook.error.tokenExpired', 'This guestbook link has expired'));
        return;
      }

      // Submit guestbook entry
      const { error: insertError } = await supabase
        .from("guestbook_entries")
        .insert({
          property_id: propertyId,
          booking_id: bookingId,
          guest_name: validatedData.guestName,
          guest_email: guestEmail,
          message: validatedData.message,
          rating: rating || null,
          image_url: imageUrl || null,
          stay_date: checkInDate,
          status: "pending",
        });

      if (insertError) throw insertError;

      // Mark token as used
      const { error: tokenError } = await supabase
        .from("guestbook_tokens")
        .update({ used_at: new Date().toISOString() })
        .eq("token", token);

      if (tokenError) console.error("Error marking token as used:", tokenError);

      toast.success(t('guestbook.success', 'Thank you for your guestbook entry! It will be published after review.'));

      // Redirect to property page after 2 seconds
      setTimeout(() => {
        navigate(`/property/${propertyId}`);
      }, 2000);

    } catch (error: any) {
      if (error instanceof z.ZodError) {
        error.issues.forEach((err) => {
          toast.error(err.message);
        });
      } else {
        console.error("Error submitting guestbook entry:", error);
        toast.error(error.message || t('guestbook.error.submit', 'Failed to submit guestbook entry'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/10 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <Card className="border-border/40 shadow-xl">
          <CardHeader className="text-center space-y-2 pb-8">
            <div className="text-4xl mb-2">🌿</div>
            <CardTitle className="text-3xl font-bold">{t('guestbook.title', 'Words from Our Guests')}</CardTitle>
            <CardDescription className="text-base">
              {t('guestbook.subtitle', 'Share your experience at')} <strong>{propertyTitle}</strong>
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="guestName">{t('guestbook.yourName', 'Your Name')} *</Label>
                <Input
                  id="guestName"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder={t('guestbook.namePlaceholder', 'Enter your name')}
                  maxLength={100}
                  required
                  className="border-border/50 focus:border-primary"
                />
              </div>

              <div className="space-y-2">
                <Label>{t('guestbook.rating', 'Rating')} ({t('guestbook.optional', 'Optional')})</Label>
                <div className="flex gap-2 p-3 bg-secondary/20 rounded-lg w-fit" role="radiogroup" aria-label="Rating">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setRating(i + 1)}
                      onMouseEnter={() => setHoveredRating(i + 1)}
                      onMouseLeave={() => setHoveredRating(0)}
                      onKeyDown={(e) => {
                        // BUG-045: Arrow key navigation for accessibility
                        if (e.key === 'ArrowRight' && i < 4) {
                          setRating(i + 2);
                          e.preventDefault();
                        } else if (e.key === 'ArrowLeft' && i > 0) {
                          setRating(i);
                          e.preventDefault();
                        }
                      }}
                      className="transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary rounded"
                      role="radio"
                      aria-checked={rating === i + 1}
                      aria-label={`${i + 1} star rating`}
                      tabIndex={rating === i + 1 ? 0 : -1}
                    >
                      <Star
                        className={`h-8 w-8 ${
                          i < (hoveredRating || rating)
                            ? "fill-primary text-primary"
                            : "text-muted-foreground"
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">{t('guestbook.message', 'Your Message')} *</Label>
                <Textarea
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={t('guestbook.messagePlaceholder', 'Share your favorite moments, what made your stay special, or simply a kind word...')}
                  rows={6}
                  maxLength={2000}
                  required
                  className="border-border/50 focus:border-primary resize-none"
                />
                <p className="text-xs text-muted-foreground text-right">
                  {message.length}/2000 {t('guestbook.characters', 'characters')}
                </p>
              </div>

              <div className="space-y-2">
                <Label>{t('guestbook.photo', 'Share a Photo')} ({t('guestbook.optional', 'Optional')})</Label>
                <ImageUpload
                  value={imageUrl}
                  onChange={setImageUrl}
                  onRemove={() => setImageUrl("")}
                  label={t('guestbook.uploadLabel', 'Upload a memory from your stay')}
                />
              </div>

              <div className="pt-4 space-y-3">
                <Button
                  type="submit"
                  disabled={loading || !guestName || !message}
                  className="w-full h-12 text-base font-semibold"
                  size="lg"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      {t('guestbook.submitting', 'Submitting...')}
                    </>
                  ) : (
                    t('guestbook.submitButton', 'Submit Guestbook Entry 🌿')
                  )}
                </Button>

                <p className="text-sm text-muted-foreground text-center">
                  {t('guestbook.reviewNotice', 'Your entry will be reviewed and published within 24 hours')}
                </p>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default GuestbookForm;
