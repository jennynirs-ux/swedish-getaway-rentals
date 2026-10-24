import { useEffect, useState, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import { Link } from "@/i18n/router";
import { CheckCircle, Home, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { type Copy, useCopy } from "@/i18n";

const en = {
  processingTitle: "Processing your order...",
  processingText: "Please wait while we confirm your payment.",
  confirmed: "Order Confirmed!",
  confirming: "We're confirming your order",
  thanks: "Thank you for your purchase! Your payment has been processed and your order is being prepared.",
  nextTitle: "What happens next:",
  next: [
    "You'll receive an order confirmation email shortly",
    "Your order will be processed and printed",
    "You'll get tracking information once shipped",
    "Questions? Contact us at support@mojjo.se",
  ],
  pending: (email: ReactNode) => (
    <>You'll receive an order confirmation email within a few minutes. If it doesn't arrive, email {email} and we'll sort it out.</>
  ),
  home: "Home",
  continueShopping: "Continue Shopping",
};
const COPY: Copy<typeof en> = {
  en,
  sv: {
    processingTitle: "Vi behandlar din beställning…",
    processingText: "Vänta en stund medan vi bekräftar din betalning.",
    confirmed: "Beställningen är bekräftad!",
    confirming: "Vi bekräftar din beställning",
    thanks: "Tack för ditt köp! Betalningen har gått igenom och vi förbereder din beställning.",
    nextTitle: "Det här händer nu:",
    next: [
      "Du får snart en orderbekräftelse via e-post",
      "Din beställning behandlas och trycks",
      "Du får spårningsinformation när paketet har skickats",
      "Frågor? Kontakta oss på support@mojjo.se",
    ],
    pending: (email) => (
      <>Du får en orderbekräftelse via e-post inom några minuter. Om den inte kommer, mejla {email} så löser vi det.</>
    ),
    home: "Startsidan",
    continueShopping: "Fortsätt handla",
  },
  de: {
    processingTitle: "Deine Bestellung wird bearbeitet…",
    processingText: "Bitte warte kurz, während wir deine Zahlung bestätigen.",
    confirmed: "Bestellung bestätigt!",
    confirming: "Wir bestätigen deine Bestellung",
    thanks: "Vielen Dank für deinen Einkauf! Deine Zahlung ist eingegangen und deine Bestellung wird vorbereitet.",
    nextTitle: "So geht es weiter:",
    next: [
      "Du erhältst in Kürze eine Bestellbestätigung per E-Mail",
      "Deine Bestellung wird bearbeitet und gedruckt",
      "Sobald sie versandt ist, bekommst du die Sendungsverfolgung",
      "Fragen? Schreib uns an support@mojjo.se",
    ],
    pending: (email) => (
      <>Du erhältst innerhalb weniger Minuten eine Bestellbestätigung per E-Mail. Falls sie nicht ankommt, schreib an {email}, dann kümmern wir uns darum.</>
    ),
    home: "Startseite",
    continueShopping: "Weiter einkaufen",
  },
};

const OrderSuccess = () => {
  const t = useCopy(COPY);
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [processing, setProcessing] = useState(!!sessionId);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (sessionId) {
      handlePaymentSuccess();
    }
  }, [sessionId]);

  const handlePaymentSuccess = async () => {
    try {
      // Shop payments run on the shop Stripe account, handled by this function
      const { data, error } = await supabase.functions.invoke('handle-shop-payment-success', {
        body: { session_id: sessionId }
      });

      if (error) throw error;
      
      if (data.success) {
        setSuccess(true);
      }
    } catch (error) {
      console.error('Error processing payment:', error);
    } finally {
      setProcessing(false);
    }
  };

  if (processing) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
            <h3 className="text-lg font-semibold mb-2">{t.processingTitle}</h3>
            <p className="text-muted-foreground">{t.processingText}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto text-center">
          <Card className="shadow-lg">
            <CardHeader className="pb-4">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${success ? "bg-green-100" : "bg-muted"}`}>
                <CheckCircle className={`w-8 h-8 ${success ? "text-green-600" : "text-muted-foreground"}`} />
              </div>
              <CardTitle className={`text-2xl ${success ? "text-green-600" : ""}`}>
                {success ? t.confirmed : t.confirming}
              </CardTitle>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {success ? (
                <div className="space-y-4">
                  <p className="text-lg text-muted-foreground">
                    {t.thanks}
                  </p>
                  
                  <div className="bg-primary/5 p-4 rounded-lg">
                    <h4 className="font-semibold text-primary mb-2">{t.nextTitle}</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      {t.next.map((step) => (
                        <li key={step}>• {step}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : (
                <p className="text-lg text-muted-foreground">
                  {t.pending(<a className="underline" href="mailto:support@mojjo.se">support@mojjo.se</a>)}
                </p>
              )}

              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Link to="/" className="flex-1">
                  <Button variant="outline" className="w-full">
                    <Home className="w-4 h-4 mr-2" />
                    {t.home}
                  </Button>
                </Link>
                
                <Link to="/shop" className="flex-1">
                  <Button className="w-full">
                    <ShoppingBag className="w-4 h-4 mr-2" />
                    {t.continueShopping}
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

export default OrderSuccess;