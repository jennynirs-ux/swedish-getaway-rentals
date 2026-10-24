import { type ReactNode, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Link } from "@/i18n/router";
import { type Copy, useCopy } from "@/i18n";
import { CheckCircle, Home, Calendar, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { COMPANY } from "@/content/company";

const en = {
  processingTitle: "Processing your booking...",
  processingText: "Please wait while we confirm your payment. This can take up to half a minute.",
  titles: {
    confirmed: "Booking Confirmed!",
    datesTaken: "These dates were just booked",
    refunded: "Your payment has been refunded",
    unconfirmed: "We're confirming your booking",
  },
  thankYou: "Thank you for your booking! Your payment has been processed and your reservation is now confirmed.",
  whatNext: "What happens next:",
  confirmationEmail: "You will receive a confirmation email shortly",
  checkInDetails: "We will contact you with check-in details before your arrival",
  questions: (email: ReactNode): ReactNode => <>Questions? Email us at {email}</>,
  datesTaken: (email: ReactNode): ReactNode => (
    <>
      Someone else booked these dates while you were paying, so your booking could not be completed. We have refunded
      everything you paid, including the service fee, and sent you an email. The refund usually shows on your card within
      5–10 business days. Sorry about that – please pick other dates or email {email}.
    </>
  ),
  refunded: (email: ReactNode): ReactNode => (
    <>
      Your booking could not be completed, so you have no booking for these dates. We have refunded everything you paid,
      including the service fee. The refund usually shows on your card within 5–10 business days. If you'd like to book
      again or have questions, email {email}.
    </>
  ),
  unconfirmed: (email: ReactNode): ReactNode => (
    <>
      You'll receive a confirmation email within a few minutes. If it doesn't arrive, email {email} and we'll sort it out.
    </>
  ),
  home: "Home",
  myBookings: "My Bookings",
};
const COPY: Copy<typeof en> = {
  en,
  sv: {
    processingTitle: "Vi behandlar din bokning…",
    processingText: "Vänta medan vi bekräftar din betalning. Det kan ta upp till en halv minut.",
    titles: {
      confirmed: "Bokningen är bekräftad!",
      datesTaken: "Datumen blev precis bokade",
      refunded: "Din betalning har betalats tillbaka",
      unconfirmed: "Vi bekräftar din bokning",
    },
    thankYou: "Tack för din bokning! Betalningen är klar och din bokning är nu bekräftad.",
    whatNext: "Det här händer nu:",
    confirmationEmail: "Du får snart en bokningsbekräftelse via e-post",
    checkInDetails: "Före ankomsten hör vi av oss med information om incheckningen",
    questions: (email) => <>Frågor? Mejla oss på {email}</>,
    datesTaken: (email) => (
      <>
        Någon annan bokade de här datumen medan du betalade, så din bokning kunde inte slutföras. Vi har betalat tillbaka
        allt du betalade, även serviceavgiften, och skickat ett mejl till dig. Pengarna syns oftast på ditt kort inom 5–10
        bankdagar. Förlåt för det – välj gärna andra datum eller mejla {email}.
      </>
    ),
    refunded: (email) => (
      <>
        Din bokning kunde inte slutföras, så du har ingen bokning för de här datumen. Vi har betalat tillbaka allt du
        betalade, även serviceavgiften. Pengarna syns oftast på ditt kort inom 5–10 bankdagar. Vill du boka igen eller har
        du frågor? Mejla {email}.
      </>
    ),
    unconfirmed: (email) => (
      <>Du får en bokningsbekräftelse via e-post inom några minuter. Om den inte kommer, mejla {email} så löser vi det.</>
    ),
    home: "Startsidan",
    myBookings: "Mina bokningar",
  },
  de: {
    processingTitle: "Deine Buchung wird bearbeitet…",
    processingText: "Bitte warte kurz, während wir deine Zahlung bestätigen. Das kann bis zu einer halben Minute dauern.",
    titles: {
      confirmed: "Buchung bestätigt!",
      datesTaken: "Dieser Zeitraum wurde gerade gebucht",
      refunded: "Deine Zahlung wurde erstattet",
      unconfirmed: "Wir bestätigen deine Buchung",
    },
    thankYou: "Danke für deine Buchung! Deine Zahlung ist eingegangen und deine Buchung ist jetzt bestätigt.",
    whatNext: "So geht es weiter:",
    confirmationEmail: "Du bekommst in Kürze eine Buchungsbestätigung per E-Mail",
    checkInDetails: "Vor deiner Anreise melden wir uns mit den Infos zum Check-in",
    questions: (email) => <>Fragen? Schreib uns an {email}</>,
    datesTaken: (email) => (
      <>
        Jemand anderes hat diesen Zeitraum gebucht, während du bezahlt hast, deshalb konnte deine Buchung nicht
        abgeschlossen werden. Wir haben dir alles erstattet, was du bezahlt hast, auch die Servicegebühr, und dir eine
        E-Mail geschickt. Die Erstattung ist meist innerhalb von 5–10 Werktagen auf deiner Karte zu sehen. Das tut uns
        leid – wähle gern einen anderen Zeitraum oder schreib an {email}.
      </>
    ),
    refunded: (email) => (
      <>
        Deine Buchung konnte nicht abgeschlossen werden, du hast also keine Buchung für diesen Zeitraum. Wir haben dir
        alles erstattet, was du bezahlt hast, auch die Servicegebühr. Die Erstattung ist meist innerhalb von 5–10
        Werktagen auf deiner Karte zu sehen. Wenn du noch einmal buchen möchtest oder Fragen hast, schreib an {email}.
      </>
    ),
    unconfirmed: (email) => (
      <>
        Du bekommst innerhalb weniger Minuten eine Buchungsbestätigung per E-Mail. Falls sie nicht ankommt, schreib an{" "}
        {email}, dann kümmern wir uns darum.
      </>
    ),
    home: "Startseite",
    myBookings: "Meine Buchungen",
  },
};

// handle-payment-success answers success:false with message 'processing' while
// the Stripe webhook is saving the same booking (the usual race when the guest
// lands here). Ask again every few seconds for about half a minute.
const POLL_INTERVAL_MS = 3000;
const POLL_TIMEOUT_MS = 30000;

/**
 * checking: still asking (or polling 'processing')
 * confirmed: the booking is saved
 * datesTaken: someone else got the dates while the guest paid; refunded in full
 * refunded: the payment was refunded before a booking was saved
 * unconfirmed: no answer yet (error or still processing after the timeout);
 *   the webhook saves it and the confirmation email follows
 */
type Outcome = "checking" | "confirmed" | "datesTaken" | "refunded" | "unconfirmed";

const supportLink = (
  <a className="underline" href={`mailto:${COMPANY.email}`}>
    {COMPANY.email}
  </a>
);

const BookingSuccess = () => {
  const t = useCopy(COPY);
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [outcome, setOutcome] = useState<Outcome>(sessionId ? "checking" : "unconfirmed");

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const startedAt = Date.now();

    const check = async () => {
      let success = false;
      let message: string | undefined;
      try {
        const { data, error } = await supabase.functions.invoke('handle-payment-success', {
          body: { session_id: sessionId }
        });
        if (error) throw error;
        success = data?.success === true;
        message = typeof data?.message === 'string' ? data.message : undefined;
      } catch (error) {
        console.error('Error processing payment:', error);
      }
      if (cancelled) return;

      if (success) return setOutcome("confirmed");
      if (message === 'dates_taken_refunded') return setOutcome("datesTaken");
      if (message === 'refunded') return setOutcome("refunded");
      if (message === 'processing' && Date.now() - startedAt + POLL_INTERVAL_MS <= POLL_TIMEOUT_MS) {
        timer = setTimeout(check, POLL_INTERVAL_MS);
        return;
      }
      setOutcome("unconfirmed");
    };

    check();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [sessionId]);

  if (outcome === "checking") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center" role="status">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
            <h3 className="text-lg font-semibold mb-2">{t.processingTitle}</h3>
            <p className="text-muted-foreground">{t.processingText}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const success = outcome === "confirmed";
  const title = t.titles[outcome];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto text-center">
          <Card className="shadow-lg">
            <CardHeader className="pb-4">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${success ? "bg-green-100" : "bg-muted"}`}>
                {success ? <CheckCircle className="w-8 h-8 text-green-600" /> : <Info className="w-8 h-8 text-muted-foreground" />}
              </div>
              <CardTitle className={`text-2xl ${success ? "text-green-600" : ""}`}>{title}</CardTitle>
            </CardHeader>

            <CardContent className="space-y-6">
              {outcome === "confirmed" ? (
                <div className="space-y-4">
                  <p className="text-lg text-muted-foreground">
                    {t.thankYou}
                  </p>

                  <div className="bg-primary/5 p-4 rounded-lg">
                    <h4 className="font-semibold text-primary mb-2">{t.whatNext}</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• {t.confirmationEmail}</li>
                      <li>• {t.checkInDetails}</li>
                      <li>• {t.questions(supportLink)}</li>
                    </ul>
                  </div>
                </div>
              ) : outcome === "datesTaken" ? (
                <p className="text-lg text-muted-foreground">{t.datesTaken(supportLink)}</p>
              ) : outcome === "refunded" ? (
                <p className="text-lg text-muted-foreground">{t.refunded(supportLink)}</p>
              ) : (
                <p className="text-lg text-muted-foreground">{t.unconfirmed(supportLink)}</p>
              )}

              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Link to="/" className="flex-1">
                  <Button variant="outline" className="w-full">
                    <Home className="w-4 h-4 mr-2" />
                    {t.home}
                  </Button>
                </Link>

                <Link to="/profile" className="flex-1">
                  <Button className="w-full">
                    <Calendar className="w-4 h-4 mr-2" />
                    {t.myBookings}
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default BookingSuccess;
