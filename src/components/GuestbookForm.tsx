import { useState, type ReactNode } from "react";
import { useNavigate } from "@/i18n/router";
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
import { type Copy, useCopy } from "@/i18n";

const en = {
  nameTooShort: "Name must be at least 2 characters",
  nameTooLong: "Name must be less than 100 characters",
  messageTooShort: "Message must be at least 10 characters",
  messageTooLong: "Message must be less than 2000 characters",
  signInFirst: "Please sign in to submit your guestbook entry",
  thanks: "Thank you for your guestbook entry! It will be published after review.",
  failed: "Failed to submit guestbook entry",
  title: "Words from Our Guests",
  intro: (property: ReactNode) => <>Share your experience at <strong>{property}</strong></>,
  name: "Your Name *",
  namePlaceholder: "Enter your name",
  rating: "Rating (Optional)",
  message: "Your Message *",
  messagePlaceholder: "Share your favorite moments, what made your stay special, or simply a kind word...",
  characters: (n: number) => `${n}/2000 characters`,
  photo: "Share a Photo (Optional)",
  photoUpload: "Upload a memory from your stay",
  submitting: "Submitting...",
  submit: "Submit Guestbook Entry 🌿",
  reviewNote: "Your entry will be reviewed and published within 24 hours",
};
const COPY: Copy<typeof en> = {
  en,
  sv: {
    nameTooShort: "Namnet måste vara minst 2 tecken",
    nameTooLong: "Namnet får vara högst 100 tecken",
    messageTooShort: "Meddelandet måste vara minst 10 tecken",
    messageTooLong: "Meddelandet får vara högst 2000 tecken",
    signInFirst: "Logga in för att skriva i gästboken",
    thanks: "Tack för ditt inlägg i gästboken! Det publiceras när det har granskats.",
    failed: "Det gick inte att skicka ditt inlägg",
    title: "Ord från våra gäster",
    intro: (property) => <>Berätta om din vistelse på <strong>{property}</strong></>,
    name: "Ditt namn *",
    namePlaceholder: "Skriv ditt namn",
    rating: "Betyg (valfritt)",
    message: "Ditt meddelande *",
    messagePlaceholder: "Berätta om dina favoritstunder, vad som gjorde vistelsen speciell eller skriv bara några vänliga ord…",
    characters: (n) => `${n}/2000 tecken`,
    photo: "Dela en bild (valfritt)",
    photoUpload: "Ladda upp ett minne från vistelsen",
    submitting: "Skickar…",
    submit: "Skriv i gästboken 🌿",
    reviewNote: "Ditt inlägg granskas och publiceras inom 24 timmar",
  },
  de: {
    nameTooShort: "Der Name muss mindestens 2 Zeichen lang sein",
    nameTooLong: "Der Name darf höchstens 100 Zeichen lang sein",
    messageTooShort: "Die Nachricht muss mindestens 10 Zeichen lang sein",
    messageTooLong: "Die Nachricht darf höchstens 2000 Zeichen lang sein",
    signInFirst: "Bitte melde dich an, um dich ins Gästebuch einzutragen",
    thanks: "Danke für deinen Gästebucheintrag! Er wird nach einer kurzen Prüfung veröffentlicht.",
    failed: "Dein Gästebucheintrag konnte nicht gesendet werden",
    title: "Was unsere Gäste sagen",
    intro: (property) => <>Teile deine Eindrücke von <strong>{property}</strong></>,
    name: "Dein Name *",
    namePlaceholder: "Gib deinen Namen ein",
    rating: "Bewertung (optional)",
    message: "Deine Nachricht *",
    messagePlaceholder: "Erzähl von deinen schönsten Momenten, was deinen Aufenthalt besonders gemacht hat, oder hinterlasse einfach ein paar nette Worte…",
    characters: (n) => `${n}/2000 Zeichen`,
    photo: "Foto teilen (optional)",
    photoUpload: "Lade eine Erinnerung an deinen Aufenthalt hoch",
    submitting: "Wird gesendet…",
    submit: "Ins Gästebuch eintragen 🌿",
    reviewNote: "Dein Eintrag wird geprüft und innerhalb von 24 Stunden veröffentlicht",
  },
};

const guestbookSchema = (t: typeof en) => z.object({
  guestName: z.string()
    .min(2, t.nameTooShort)
    .max(100, t.nameTooLong)
    .trim(),
  message: z.string()
    .min(10, t.messageTooShort)
    .max(2000, t.messageTooLong)
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
  const t = useCopy(COPY);
  const navigate = useNavigate();
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

      const validatedData = guestbookSchema(t).parse(sanitizedData);

      setLoading(true);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error(t.signInFirst);
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

      // Mark token as used via secure RPC (only succeeds for the exact token)
      const { error: tokenError } = await supabase
        .rpc("consume_guestbook_token", { _token: token });

      if (tokenError) console.error("Error marking token as used:", tokenError);

      toast.success(t.thanks);
      
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
        toast.error(error.message || t.failed);
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
            <CardTitle className="text-3xl font-bold">{t.title}</CardTitle>
            <CardDescription className="text-base">
              {t.intro(propertyTitle)}
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="guestName">{t.name}</Label>
                <Input
                  id="guestName"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder={t.namePlaceholder}
                  maxLength={100}
                  required
                  className="border-border/50 focus:border-primary"
                />
              </div>

              <div className="space-y-2">
                <Label>{t.rating}</Label>
                <div className="flex gap-2 p-3 bg-secondary/20 rounded-lg w-fit">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setRating(i + 1)}
                      onMouseEnter={() => setHoveredRating(i + 1)}
                      onMouseLeave={() => setHoveredRating(0)}
                      className="transition-transform hover:scale-110"
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
                <Label htmlFor="message">{t.message}</Label>
                <Textarea
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={t.messagePlaceholder}
                  rows={6}
                  maxLength={2000}
                  required
                  className="border-border/50 focus:border-primary resize-none"
                />
                <p className="text-xs text-muted-foreground text-right">
                  {t.characters(message.length)}
                </p>
              </div>

              <div className="space-y-2">
                <Label>{t.photo}</Label>
                <ImageUpload
                  value={imageUrl}
                  onChange={setImageUrl}
                  onRemove={() => setImageUrl("")}
                  label={t.photoUpload}
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
                      {t.submitting}
                    </>
                  ) : (
                    t.submit
                  )}
                </Button>
                
                <p className="text-sm text-muted-foreground text-center">
                  {t.reviewNote}
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
