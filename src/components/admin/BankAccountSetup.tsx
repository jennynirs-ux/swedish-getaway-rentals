import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Building2, CheckCircle2, ExternalLink, AlertCircle, RefreshCw, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface PayoutStatus {
  hasAccount: boolean;
  ready: boolean;
  requirementsDue?: number;
}

export const BankAccountSetup = () => {
  const [loading, setLoading] = useState(false);

  // Asks Stripe, so a half-finished onboarding shows as such (and the result
  // is saved on the profile, which publishing a listing needs)
  const { data: status, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["host-stripe-connect"],
    queryFn: async (): Promise<PayoutStatus> => {
      const { data, error } = await supabase.functions.invoke("create-connect-account", {
        body: { action: "status" },
      });
      if (error) throw error;
      return data as PayoutStatus;
    },
    refetchOnWindowFocus: true,
  });

  const handleConnectStripe = async () => {
    setLoading(true);
    try {
      // Stripe brings the host back to this tab when done
      const back = `${window.location.origin}/host-dashboard?tab=payouts`;
      const { data, error } = await supabase.functions.invoke("create-connect-account", {
        body: { returnUrl: back, refreshUrl: back },
      });
      if (error) throw new Error(error.message || "Failed to connect to Stripe. Please try again.");
      if (!data?.url) throw new Error("No onboarding URL received from Stripe");
      window.location.href = data.url;
    } catch (error) {
      console.error("Error connecting Stripe:", error);
      toast.error("Connection failed", {
        description: error instanceof Error ? error.message : "We couldn't open Stripe. Please try again or contact support.",
      });
      setLoading(false);
    }
  };

  const handleManageAccount = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-connect-dashboard-link");
      if (error) throw new Error(error.message || "Failed to open Stripe");
      if (!data?.url) throw new Error("No dashboard URL received from Stripe");
      window.open(data.url, "_blank");
    } catch (error) {
      console.error("Error opening Stripe dashboard:", error);
      toast.error("Error", {
        description: error instanceof Error ? error.message : "Failed to open Stripe. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const header = (
    <CardHeader>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary" />
          <CardTitle>Bank Account & Payouts</CardTitle>
        </div>
        {status?.ready && (
          <Badge className="bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 border-emerald-200">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Connected
          </Badge>
        )}
      </div>
      <CardDescription>
        Payouts go straight to your bank account through Stripe, after each booking
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
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">You receive:</span>
        <span className="font-medium text-emerald-600">100% of your nightly price</span>
      </div>
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">Guests pay:</span>
        <span className="font-medium">a 10% service fee on top</span>
      </div>
    </div>
  );

  return (
    <Card className="border-2">
      {header}
      <CardContent className="space-y-4">
        {status?.ready ? (
          <>
            <Alert className="bg-emerald-50 border-emerald-200">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <AlertDescription className="text-emerald-800 font-medium">
                Your bank account is connected. Payouts are sent automatically after each booking.
              </AlertDescription>
            </Alert>
            {fees}
            <Button onClick={handleManageAccount} disabled={loading} variant="outline" className="w-full">
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ExternalLink className="mr-2 h-4 w-4" />}
              Manage payout settings in Stripe
            </Button>
          </>
        ) : (
          <>
            <Alert className="border-2 border-primary/20">
              <AlertCircle className="h-4 w-4 text-primary" />
              <AlertDescription className="text-foreground">
                {status?.hasAccount ? (
                  <>
                    <p className="font-medium mb-1">Finish your payout setup with Stripe</p>
                    <p className="text-sm text-muted-foreground">
                      Stripe still needs a few details{status.requirementsDue ? ` (${status.requirementsDue} left)` : ""} before
                      it can pay you. You can publish your listing once this is done.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="font-medium mb-1">Connect your bank account to get paid</p>
                    <p className="text-sm text-muted-foreground">
                      It takes a few minutes on Stripe: your details, ID and bank account. You can publish your listing once
                      this is done.
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
              {status?.hasAccount ? "Finish setup on Stripe" : "Connect bank account"}
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
