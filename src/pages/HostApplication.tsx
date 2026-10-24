import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import MainNavigation from "@/components/MainNavigation";
import { Gift, CheckCircle, ArrowRight } from "lucide-react";
import { FOUNDING_HOST_DEADLINE, FOUNDING_HOST_FEE_PCT, foundingHostOfferOpen } from "@/lib/constants";
import { HOST_PAYOUT_TIMING_SV } from "@/lib/hostDashboard";
import { HOST_TERMS_PATH, HOST_TERMS_VERSION } from "@/content/hostTerms";

// "31 December 2026" → "31 december 2026" (as on /bli-vard)
const FOUNDING_HOST_DEADLINE_SV = FOUNDING_HOST_DEADLINE.replace("December", "december");

// Publishing needs accepted host terms (prevent_self_publish); a failure here
// is not fatal, as the dashboard checklist asks again
const recordTermsAcceptance = async () => {
  const { error } = await supabase.rpc('accept_host_terms', { _version: HOST_TERMS_VERSION });
  if (error) {
    console.error('Error saving host terms acceptance:', error);
    toast.warning('Vi kunde inte spara att du godkände värdvillkoren. Godkänn dem igen i din värdpanel.');
  }
};

const HostApplication = () => {
  const [loading, setLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const [referralCode, setReferralCode] = useState("");
  const [formData, setFormData] = useState({
    businessName: '',
    contactPhone: ''
  });
  const [termsAccepted, setTermsAccepted] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const ref = searchParams.get("ref");
    if (ref) setReferralCode(ref);
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!termsAccepted) {
      toast.error('Godkänn värdvillkoren för att fortsätta.');
      return;
    }
    setLoading(true);

    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        toast.error('Logga in först');
        navigate('/auth?redirect=/host-application');
        return;
      }

      // Check if already a host
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, is_host, host_approved')
        .eq('user_id', user.user.id)
        .single();

      if (profile?.is_host && profile?.host_approved) {
        await recordTermsAcceptance();
        toast.success('Du är redan värd!');
        navigate('/host-dashboard');
        return;
      }

      // One trusted step in the database: marks the profile as host and records
      // the application (a direct profile update is blocked for non-admins).
      const { data: profileId, error: signupError } = await supabase.rpc('become_host', {
        _business_name: formData.businessName,
        _contact_phone: formData.contactPhone || null,
      });

      if (signupError) throw signupError;

      // After become_host: the terms are a host's terms
      await recordTermsAcceptance();

      // Handle referral code
      if (referralCode && profileId) {
        supabase.functions.invoke("complete-host-referral", {
          body: { referralCode, newHostProfileId: profileId },
        }).catch(() => {});
      }

      // Send welcome email (non-blocking)
      supabase.functions.invoke('notify-host-approved', {
        body: { userId: user.user.id }
      }).catch(() => {});

      // Notify admin (non-blocking)
      supabase.functions.invoke('notify-new-host-application', {
        body: { userId: user.user.id }
      }).catch(() => {});

      toast.success('Välkommen! Nu är du värd. Dags att lägga till ditt första boende.');
      navigate('/host-dashboard');
    } catch (error) {
      console.error('Error becoming host:', error);
      const message = (error as { message?: string } | null)?.message;
      toast.error(message ? `Något gick fel: ${message}` : 'Något gick fel. Försök igen.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <MainNavigation />

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-lg mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-foreground mb-4">
              Bli värd
            </h1>
            <p className="text-lg text-muted-foreground">
              Skapa ditt värdkonto på en minut, lägg till ditt boende och publicera det när du är redo.
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Kom igång</CardTitle>
            </CardHeader>
            <CardContent>
              {referralCode && (
                <Alert className="mb-6 border-primary/20 bg-primary/5">
                  <Gift className="h-4 w-4 text-primary" />
                  <AlertDescription className="text-sm">
                    Din inbjudningskod är tillagd.
                  </AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <Label htmlFor="businessName">Boendets eller företagets namn *</Label>
                  <Input
                    id="businessName"
                    value={formData.businessName}
                    onChange={(e) => setFormData(prev => ({ ...prev, businessName: e.target.value }))}
                    required
                    placeholder="t.ex. Stugan vid sjön, Dalarna"
                  />
                </div>

                <div>
                  <Label htmlFor="contactPhone">Ditt telefonnummer (valfritt)</Label>
                  <Input
                    id="contactPhone"
                    type="tel"
                    value={formData.contactPhone}
                    onChange={(e) => setFormData(prev => ({ ...prev, contactPhone: e.target.value }))}
                    placeholder="+46 70 123 45 67"
                  />
                </div>

                {/* What you get */}
                <div className="bg-muted/50 p-4 rounded-lg space-y-3">
                  <h3 className="font-semibold text-sm">Det här ingår:</h3>
                  <div className="space-y-2">
                    {[
                      'Din egen värdpanel',
                      'Kalendersynk med Airbnb och Booking.com',
                      'Automatiska bokningsbekräftelser',
                      'Säkra betalningar via Stripe',
                      `Ditt pris betalas ut till din bank ${HOST_PAYOUT_TIMING_SV}`,
                      'Digital gästguide för dina gäster',
                    ].map((item) => (
                      <div key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />
                        {item}
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground pt-1">
                    Du sätter priset. Gästen betalar en serviceavgift på 10 % ovanpå
                    {foundingHostOfferOpen()
                      ? ` (erbjudande för nya värdar: bara ${FOUNDING_HOST_FEE_PCT} % under dina första 12 månader om du ansluter senast ${FOUNDING_HOST_DEADLINE_SV})`
                      : ""}
                    .
                  </p>
                </div>

                <div className="flex items-start gap-2">
                  <Checkbox
                    id="acceptHostTerms"
                    checked={termsAccepted}
                    onCheckedChange={(v) => setTermsAccepted(v === true)}
                    className="mt-0.5"
                    aria-required="true"
                  />
                  <Label htmlFor="acceptHostTerms" className="text-sm font-normal leading-snug">
                    Jag godkänner{' '}
                    <a
                      href={HOST_TERMS_PATH}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline underline-offset-2"
                    >
                      värdvillkoren
                    </a>{' '}
                    (på engelska: avgifter, utbetalningar, avbokningar och återbetalningar) *
                  </Label>
                </div>

                <Button type="submit" className="w-full" size="lg" disabled={loading || !termsAccepted}>
                  {loading ? 'Skapar ditt konto …' : (
                    <>
                      Bli värd nu
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default HostApplication;
