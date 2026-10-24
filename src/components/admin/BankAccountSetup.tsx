import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Building2, CheckCircle2, ExternalLink, AlertCircle, RefreshCw, Loader2, Clock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { stockholmDate } from "@/lib/constants";
// Pure rules, shared with the onboarding checklist and tested in src/lib/hostDashboard.test.ts
import {
  HOST_PAYOUT_TIMING_SV,
  formatSek,
  payoutState,
  payoutStatusPollMs,
  stripeRequirementLabels,
  type PayoutStatus,
} from "@/lib/hostDashboard";
import { StripeExplainer } from "@/components/host/StripeExplainer";

export { payoutState };
export type { PayoutState, PayoutStatus } from "@/lib/hostDashboard";

/**
 * The real reason an edge function failed: for a non-2xx reply supabase-js
 * only says "Edge Function returned a non-2xx status code", and the server's
 * message is in the response body.
 */
const functionErrorMessage = async (error: unknown, fallback: string) => {
  const context = (error as { context?: unknown } | null)?.context;
  if (context instanceof Response) {
    try {
      const body = await context.clone().json();
      if (body?.error) return String(body.error);
    } catch {
      // Not JSON: fall through
    }
  }
  const message = error instanceof Error ? error.message : "";
  return message && !/non-2xx/i.test(message) ? message : fallback;
};

/** End a server message with a full stop, so a hint can follow it */
const sentence = (text: string) => (/[.!?]\s*$/.test(text) ? text : `${text}.`);

export const HOST_PAYOUT_STATUS_KEY = ["host-stripe-connect"];

/**
 * The host's payout status, asked from Stripe (the result is also saved on
 * the profile, which publishing a listing needs). Shared by the Bank Account
 * tab and the onboarding checklist, so both always say the same. While Stripe
 * is checking the host's details it asks again every 30 s, and always on
 * returning to the window.
 */
export const useHostPayoutStatus = (enabled = true) =>
  useQuery({
    queryKey: HOST_PAYOUT_STATUS_KEY,
    enabled,
    queryFn: async (): Promise<PayoutStatus> => {
      const { data, error } = await supabase.functions.invoke("create-connect-account", {
        body: { action: "status" },
      });
      if (error) throw new Error(await functionErrorMessage(error, "Det gick inte att hämta din utbetalningsstatus."));
      return data as PayoutStatus;
    },
    refetchOnWindowFocus: true,
    // Only while Stripe is checking: when the host has to act, nothing changes on its own
    refetchInterval: (query) => payoutStatusPollMs(query.state.data as PayoutStatus | undefined),
  });

export const HOST_CHARGES_KEY = ["host-open-charges"];

export interface HostCharge {
  id: string;
  /** öre */
  amount: number;
  reason: string;
  booking_id: string | null;
  created_at: string;
}

/**
 * What the host owes us and has not been settled yet, e.g. the card fee of a
 * booking they cancelled or a refund made after a payout. The payout job takes
 * it from their next payouts (in part if one is smaller).
 * Filtered on the host's own profile: an admin who is also a host can read
 * every host's charges.
 */
export const useHostCharges = () =>
  useQuery({
    queryKey: HOST_CHARGES_KEY,
    queryFn: async (): Promise<HostCharge[]> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data: profile } = await supabase.from("profiles").select("id").eq("user_id", user.id).maybeSingle();
      if (!profile) return [];
      const { data, error } = await supabase
        .from("host_charges")
        .select("id, amount, reason, booking_id, created_at")
        .eq("host_profile_id", profile.id)
        .is("settled_at", null)
        .order("created_at");
      if (error) throw error;
      return data ?? [];
    },
    refetchOnWindowFocus: true,
  });

/**
 * Sends the host to Stripe to create (or finish) their payout account.
 * Stripe brings them back to returnPath: the Payouts tab, or the listing and
 * its publish window when they started from publishing.
 */
export const startStripeOnboarding = async (returnPath = "/host-dashboard?tab=payouts") => {
  const back = `${window.location.origin}${returnPath}`;
  const { data, error } = await supabase.functions.invoke("create-connect-account", {
    body: { returnUrl: back, refreshUrl: back },
  });
  if (error) throw new Error(await functionErrorMessage(error, "Det gick inte att öppna Stripe. Försök igen."));
  if (!data?.url) throw new Error("Vi fick ingen länk från Stripe. Försök igen.");
  window.location.href = data.url;
};

/** The toast when Stripe can't be opened */
export const stripeOpenFailed = (error: unknown) =>
  toast.error("Det gick inte att öppna Stripe", {
    description: `${sentence(error instanceof Error ? error.message : "Försök igen")} Om det fortsätter, mejla support@mojjo.se.`,
    duration: 10_000,
  });

const formatDay = (isoDate: string) =>
  new Date(`${isoDate}T12:00:00`).toLocaleDateString("sv-SE", { day: "numeric", month: "long", year: "numeric" });

export const BankAccountSetup = () => {
  const [loading, setLoading] = useState(false);
  const { data: status, isLoading, refetch, isFetching, error: statusError } = useHostPayoutStatus();
  const state = payoutState(status);
  const { data: charges = [] } = useHostCharges();
  const owedOre = charges.reduce((sum, c) => sum + c.amount, 0);

  // The guest fee on this host's listings (5 % during the founding-host offer)
  const { data: fee } = useQuery({
    queryKey: ["host-fee"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase
        .from("profiles")
        .select("commission_rate, fee_offer_rate, fee_offer_until")
        .eq("user_id", user.id)
        .single();
      return data;
    },
  });
  const baseRate = Number(fee?.commission_rate ?? 10);
  const offerActive =
    fee?.fee_offer_rate != null && !!fee.fee_offer_until && fee.fee_offer_until >= stockholmDate();
  // Same rule as the database (service_fee_rate): the offer only ever lowers the fee
  const rate = offerActive ? Math.min(Number(fee?.fee_offer_rate), baseRate) : baseRate;

  const handleConnectStripe = async () => {
    setLoading(true);
    try {
      // Stripe brings the host back to this tab when done
      await startStripeOnboarding();
    } catch (error) {
      console.error("Error connecting Stripe:", error);
      stripeOpenFailed(error);
      setLoading(false);
    }
  };

  const handleManageAccount = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-connect-dashboard-link");
      if (error) throw new Error(await functionErrorMessage(error, "Det gick inte att öppna Stripe. Försök igen."));
      if (!data?.url) throw new Error("Vi fick ingen länk från Stripe.");
      window.open(data.url, "_blank");
    } catch (error) {
      console.error("Error opening Stripe dashboard:", error);
      toast.error("Det gick inte att öppna Stripe", {
        description: error instanceof Error ? error.message : "Försök igen.",
      });
    } finally {
      setLoading(false);
    }
  };

  const header = (
    <CardHeader>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary" />
          <CardTitle>Utbetalningar via Stripe</CardTitle>
        </div>
        {state === "ready" && (
          <Badge className="bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 border-emerald-200">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Klart
          </Badge>
        )}
      </div>
      <CardDescription>
        Ditt pris betalas ut till din bank {HOST_PAYOUT_TIMING_SV}. Om en gäst avbokar dras återbetalningen från
        utbetalningen för den bokningen, eller från din nästa utbetalning om den redan är gjord.
      </CardDescription>
    </CardHeader>
  );

  if (isLoading) {
    return (
      <Card>
        {header}
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  const fees = (
    <div className="bg-muted/50 rounded-lg p-4 space-y-2">
      <div className="flex justify-between gap-4 text-sm">
        <span className="text-muted-foreground">Du får:</span>
        <span className="font-medium text-emerald-600 text-right">100 % av ditt pris</span>
      </div>
      <div className="flex justify-between gap-4 text-sm">
        <span className="text-muted-foreground">Gästen betalar:</span>
        <span className="font-medium text-right">{rate.toLocaleString("sv-SE")} % i serviceavgift ovanpå</span>
      </div>
      <div className="flex justify-between gap-4 text-sm">
        <span className="text-muted-foreground">Utbetalning:</span>
        <span className="font-medium text-right">{HOST_PAYOUT_TIMING_SV}</span>
      </div>
      {offerActive && rate < baseRate && (
        <p className="text-xs text-muted-foreground">
          Erbjudande för nya värdar till och med {formatDay(fee!.fee_offer_until!)}, sedan {baseRate.toLocaleString("sv-SE")} %.
        </p>
      )}
    </div>
  );

  // e.g. the card fee when the host cancelled a booking (host terms)
  const owed = owedOre > 0 && (
    <Alert>
      <AlertCircle className="h-4 w-4" />
      <AlertDescription className="space-y-1">
        <p className="font-medium">Dras från din nästa utbetalning: {formatSek(owedOre)}</p>
        <ul className="text-sm text-muted-foreground list-disc pl-4">
          {charges.map((c) => (
            <li key={c.id}>
              {formatSek(c.amount)}: {c.reason} ({formatDay(stockholmDate(c.created_at))})
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted-foreground">
          Det kan till exempel vara kortavgiften för en bokning som du avbokade, eller en återbetalning till en gäst efter
          att din del av bokningen redan betalats ut. Vi drar det från din nästa utbetalning, och från de följande om en
          utbetalning inte räcker.
        </p>
      </AlertDescription>
    </Alert>
  );

  return (
    <Card className="border-2">
      {header}
      <CardContent className="space-y-4">
        {statusError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {sentence(statusError instanceof Error ? statusError.message : "Det gick inte att hämta din utbetalningsstatus")}{" "}
              Tryck på ”Uppdatera status”, eller mejla support@mojjo.se om det fortsätter.
            </AlertDescription>
          </Alert>
        )}
        {owed}
        {state === "action_needed" ? (
          <>
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <p className="font-medium mb-1">Stripe kan inte betala ut till det här kontot</p>
                <p className="text-sm">
                  Stripe har stoppat kontot och det finns inget mer att fylla i. Mejla support@mojjo.se så löser vi det
                  med Stripe. Dina annonser kan inte publiceras förrän det är löst.
                </p>
              </AlertDescription>
            </Alert>
            {fees}
          </>
        ) : state === "ready" ? (
          <>
            <Alert className="bg-emerald-50 border-emerald-200">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <AlertDescription className="text-emerald-800">
                <p className="font-medium">Dina utbetalningar är klara.</p>
                <p className="text-sm">
                  För varje bokning betalas ditt pris ut till din bank {HOST_PAYOUT_TIMING_SV}.
                </p>
                {status?.payoutsEnabled === false && (
                  <p className="text-sm mt-1">
                    Stripe kontrollerar fortfarande ditt bankkonto. Du kan publicera redan nu; utbetalningarna börjar
                    när Stripe har godkänt kontot.
                  </p>
                )}
              </AlertDescription>
            </Alert>
            {fees}
            <Button onClick={handleManageAccount} disabled={loading} variant="outline" className="w-full">
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ExternalLink className="mr-2 h-4 w-4" />}
              Hantera utbetalningar hos Stripe
            </Button>
          </>
        ) : state === "verifying" ? (
          <>
            <Alert className="border-2 border-primary/20">
              <Clock className="h-4 w-4 text-primary" />
              <AlertDescription className="text-foreground">
                <p className="font-medium mb-1">Stripe kontrollerar dina uppgifter</p>
                <p className="text-sm text-muted-foreground">
                  Du har skickat allt som Stripe bad om. Kontrollen brukar ta några minuter, ibland ett dygn. Sidan
                  kollar igen var 30:e sekund, och du kan publicera din annons så fort det är klart.
                </p>
              </AlertDescription>
            </Alert>
            {fees}
          </>
        ) : (
          <>
            <Alert className="border-2 border-primary/20">
              <AlertCircle className="h-4 w-4 text-primary" />
              <AlertDescription className="text-foreground">
                {state === "details_missing" ? (
                  <>
                    <p className="font-medium mb-1">Gör klart dina utbetalningar hos Stripe</p>
                    {stripeRequirementLabels(status?.currentlyDue).length > 0 ? (
                      <>
                        <p className="text-sm text-muted-foreground">Stripe behöver fortfarande:</p>
                        <ul className="mt-1 list-disc pl-5 text-sm">
                          {stripeRequirementLabels(status?.currentlyDue).map((label) => <li key={label}>{label}</li>)}
                        </ul>
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Stripe behöver några uppgifter till
                        {status?.requirementsDue ? ` (${status.requirementsDue} kvar)` : ""} innan du kan få betalt.
                      </p>
                    )}
                    <p className="mt-1 text-sm text-muted-foreground">
                      {status?.currentDeadline
                        ? `Gör klart senast ${formatDay(stockholmDate(new Date(status.currentDeadline * 1000).toISOString()))}. `
                        : ""}
                      Tryck på ”Slutför hos Stripe” så fortsätter du där du slutade. Du kan publicera din annons när det
                      är klart.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="font-medium mb-1">Ställ in utbetalningar för att få betalt</p>
                    <p className="text-sm text-muted-foreground">
                      Du skapar ett kostnadsfritt Stripe-konto som betalar ut din del av varje bokning till din bank.
                      Det tar ungefär fem minuter: dina uppgifter, din legitimation och ditt bankkonto. Du kan publicera
                      din annons när det är klart.
                    </p>
                  </>
                )}
              </AlertDescription>
            </Alert>
            {fees}
            <Button onClick={handleConnectStripe} disabled={loading} className="w-full h-12 text-base">
              {loading ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <Building2 className="mr-2 h-5 w-5" />
              )}
              {state === "details_missing" ? "Slutför hos Stripe" : "Ställ in utbetalningar via Stripe"}
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              Du fyller i dina uppgifter säkert hos Stripe och kommer tillbaka hit när du är klar. Vi ser aldrig dina
              bankuppgifter.
            </p>
          </>
        )}
        {/* Open until the account is connected: hosts meet Stripe here first */}
        <StripeExplainer defaultOpen={state !== "ready"} />
        <Button
          onClick={() => refetch()}
          disabled={isFetching}
          variant="ghost"
          size="sm"
          className="w-full"
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          Uppdatera status
        </Button>
      </CardContent>
    </Card>
  );
};
