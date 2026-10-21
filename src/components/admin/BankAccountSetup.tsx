import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Building2, CheckCircle2, ExternalLink, AlertCircle, RefreshCw, Loader2, Clock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { HOST_PAYOUT_TIMING_TEXT, stockholmDate } from "@/lib/constants";
// Pure rules, shared with the onboarding checklist and tested in src/lib/hostDashboard.test.ts
import { formatSek, payoutState, payoutStatusPollMs, type PayoutStatus } from "@/lib/hostDashboard";

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
      if (error) throw new Error(await functionErrorMessage(error, "Could not check your payout status."));
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

const formatDay = (isoDate: string) =>
  new Date(`${isoDate}T12:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

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
      const back = `${window.location.origin}/host-dashboard?tab=payouts`;
      const { data, error } = await supabase.functions.invoke("create-connect-account", {
        body: { returnUrl: back, refreshUrl: back },
      });
      if (error) throw new Error(await functionErrorMessage(error, "We couldn't open Stripe. Please try again."));
      if (!data?.url) throw new Error("Stripe did not send a sign-up link. Please try again.");
      window.location.href = data.url;
    } catch (error) {
      console.error("Error connecting Stripe:", error);
      toast.error("Could not open Stripe", {
        description: `${sentence(error instanceof Error ? error.message : "Please try again")} If it keeps happening, email support@mojjo.se.`,
        duration: 10_000,
      });
      setLoading(false);
    }
  };

  const handleManageAccount = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-connect-dashboard-link");
      if (error) throw new Error(await functionErrorMessage(error, "Failed to open Stripe. Please try again."));
      if (!data?.url) throw new Error("No dashboard link received from Stripe");
      window.open(data.url, "_blank");
    } catch (error) {
      console.error("Error opening Stripe dashboard:", error);
      toast.error("Could not open Stripe", {
        description: error instanceof Error ? error.message : "Failed to open Stripe. Please try again.",
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
          <CardTitle>Bank Account & Payouts</CardTitle>
        </div>
        {state === "ready" && (
          <Badge className="bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 border-emerald-200">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Connected
          </Badge>
        )}
      </div>
      <CardDescription>
        Your price is paid out to your bank {HOST_PAYOUT_TIMING_TEXT}. If a guest cancels, the refund is taken from
        that booking's payout, or from your next payout if it has already been paid.
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
        <span className="text-muted-foreground">You receive:</span>
        <span className="font-medium text-emerald-600 text-right">100% of your price</span>
      </div>
      <div className="flex justify-between gap-4 text-sm">
        <span className="text-muted-foreground">Guests pay:</span>
        <span className="font-medium text-right">a {rate}% service fee on top</span>
      </div>
      <div className="flex justify-between gap-4 text-sm">
        <span className="text-muted-foreground">Paid out:</span>
        <span className="font-medium text-right">{HOST_PAYOUT_TIMING_TEXT}</span>
      </div>
      {offerActive && rate < baseRate && (
        <p className="text-xs text-muted-foreground">
          Founding-host offer until {formatDay(fee!.fee_offer_until!)}, then {baseRate}%.
        </p>
      )}
    </div>
  );

  // e.g. the card fee when the host cancelled a booking (host terms)
  const owed = owedOre > 0 && (
    <Alert>
      <AlertCircle className="h-4 w-4" />
      <AlertDescription className="space-y-1">
        <p className="font-medium">To be taken from your next payout: {formatSek(owedOre)}</p>
        <ul className="text-sm text-muted-foreground list-disc pl-4">
          {charges.map((c) => (
            <li key={c.id}>
              {formatSek(c.amount)}: {c.reason} ({formatDay(stockholmDate(c.created_at))})
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted-foreground">
          This is, for example, the card fee for a booking you cancelled, or a refund to a guest made after your share
          of that booking was paid out. We take it from your next payout, and from the ones after it if one payout is
          not enough.
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
              {sentence(statusError instanceof Error ? statusError.message : "Could not check your payout status")} Try
              "Refresh status", or email support@mojjo.se if it keeps happening.
            </AlertDescription>
          </Alert>
        )}
        {owed}
        {state === "action_needed" ? (
          <>
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <p className="font-medium mb-1">Stripe can't pay out to this account</p>
                <p className="text-sm">
                  Stripe has stopped this account and there is nothing more to fill in. Email support@mojjo.se and we
                  will sort it out with Stripe. Your listings can't be published until it is fixed.
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
                <p className="font-medium">Your bank account is connected.</p>
                <p className="text-sm">
                  For each booking, your price is paid out to your bank {HOST_PAYOUT_TIMING_TEXT}.
                </p>
                {status?.payoutsEnabled === false && (
                  <p className="text-sm mt-1">
                    Stripe is still checking your bank account. You can publish now; payouts start once Stripe has
                    verified it.
                  </p>
                )}
              </AlertDescription>
            </Alert>
            {fees}
            <Button onClick={handleManageAccount} disabled={loading} variant="outline" className="w-full">
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ExternalLink className="mr-2 h-4 w-4" />}
              Manage payout settings in Stripe
            </Button>
          </>
        ) : state === "verifying" ? (
          <>
            <Alert className="border-2 border-primary/20">
              <Clock className="h-4 w-4 text-primary" />
              <AlertDescription className="text-foreground">
                <p className="font-medium mb-1">Stripe is verifying your details</p>
                <p className="text-sm text-muted-foreground">
                  You have sent Stripe everything it asked for. Checking usually takes a few minutes, sometimes a
                  day. This page checks again every 30 seconds; you can publish your listing as soon as it is done.
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
                    <p className="font-medium mb-1">Finish your payout setup with Stripe</p>
                    <p className="text-sm text-muted-foreground">
                      Stripe still needs a few details
                      {status?.requirementsDue ? ` (${status.requirementsDue} left)` : ""} before it can pay you. You
                      can publish your listing once this is done.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="font-medium mb-1">Connect your bank account to get paid</p>
                    <p className="text-sm text-muted-foreground">
                      It takes a few minutes on Stripe: your details, ID and bank account. You can publish your listing
                      once this is done.
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
              {state === "details_missing" ? "Finish setup on Stripe" : "Connect bank account"}
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              You'll go to Stripe to enter your details securely and come back here when you're done. We never see your
              bank details.
            </p>
          </>
        )}
        <Button
          onClick={() => refetch()}
          disabled={isFetching}
          variant="ghost"
          size="sm"
          className="w-full"
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          Refresh status
        </Button>
      </CardContent>
    </Card>
  );
};
