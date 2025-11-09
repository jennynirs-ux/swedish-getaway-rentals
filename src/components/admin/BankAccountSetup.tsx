import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Building2, CheckCircle2, ExternalLink, AlertCircle, RefreshCw, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

export const BankAccountSetup = () => {
  const [loading, setLoading] = useState(false);

  const { data: profile, isLoading, refetch } = useQuery({
    queryKey: ["host-stripe-connect"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("profiles")
        .select("stripe_connect_account_id")
        .eq("user_id", user.id)
        .single();

      if (error) throw error;
      
      return data;
    },
    refetchInterval: 10000, // Auto-refresh every 10 seconds
  });

  const handleConnectStripe = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error("You must be logged in to connect a bank account");
      }

      const { data, error } = await supabase.functions.invoke("create-connect-account", {
        body: { 
          returnUrl: window.location.href,
          refreshUrl: window.location.href
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        console.error("Stripe Connect error:", error);
        throw new Error(error.message || "Failed to connect to Stripe. Please try again.");
      }

      if (data?.url) {
        toast.success("Opening Stripe Connect", {
          description: "Complete the setup in the new window, then return here.",
        });
        
        // Open in new window
        window.open(data.url, "_blank");
        
        // Refetch profile after a delay to check if connection was successful
        setTimeout(() => {
          refetch();
          toast.info("Checking connection status...");
        }, 5000);
      } else {
        throw new Error("No onboarding URL received from Stripe");
      }
    } catch (error: any) {
      console.error("Error connecting Stripe:", error);
      toast.error("Connection Failed", {
        description: error.message || "We couldn't connect your bank account. Please try again or contact support.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleManageAccount = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error("You must be logged in to manage your account");
      }

      const { data, error } = await supabase.functions.invoke("create-connect-dashboard-link", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        console.error("Dashboard link error:", error);
        throw new Error(error.message || "Failed to open Stripe dashboard");
      }

      if (data?.url) {
        window.open(data.url, "_blank");
        toast.success("Opening Stripe Dashboard");
      } else {
        throw new Error("No dashboard URL received from Stripe");
      }
    } catch (error: any) {
      console.error("Error opening Stripe dashboard:", error);
      toast.error("Error", {
        description: error.message || "Failed to open Stripe dashboard. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const isConnected = !!profile?.stripe_connect_account_id;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            <CardTitle>Bank Account & Payouts</CardTitle>
          </div>
          <CardDescription>
            Connect your bank account to receive payouts from bookings
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            <CardTitle>Bank Account & Payouts</CardTitle>
          </div>
          {isConnected && (
            <Badge className="bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 border-emerald-200">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Connected ✅
            </Badge>
          )}
        </div>
        <CardDescription>
          Connect your bank account via Stripe to receive automatic payouts from bookings
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isConnected ? (
          <>
            <Alert className="bg-emerald-50 border-emerald-200">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <AlertDescription className="text-emerald-800 font-medium">
                ✅ Your bank account is successfully connected! Payouts will be sent automatically after each booking, minus the platform commission.
              </AlertDescription>
            </Alert>
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Platform Fee:</span>
                <span className="font-medium">10% per booking</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">You Receive:</span>
                <span className="font-medium text-emerald-600">90% of booking amount</span>
              </div>
            </div>
            <div className="grid gap-2">
              <Button 
                onClick={handleManageAccount} 
                disabled={loading}
                variant="outline"
                className="w-full"
              >
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ExternalLink className="mr-2 h-4 w-4" />
                )}
                Manage Payout Settings in Stripe
              </Button>
              <Button 
                onClick={() => {
                  refetch();
                  toast.info("Refreshing connection status...");
                }} 
                disabled={loading}
                variant="ghost"
                size="sm"
                className="w-full"
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh Status
              </Button>
            </div>
          </>
        ) : (
          <>
            <Alert className="border-2 border-primary/20">
              <AlertCircle className="h-4 w-4 text-primary" />
              <AlertDescription className="text-foreground">
                <p className="font-medium mb-2">Connect your bank account to start receiving payouts</p>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Secure setup through Stripe Connect</li>
                  <li>Automatic payouts after bookings</li>
                  <li>10% platform commission per booking</li>
                  <li>Support for multiple currencies (SEK, EUR, GBP)</li>
                </ul>
              </AlertDescription>
            </Alert>
            <Button 
              onClick={handleConnectStripe} 
              disabled={loading}
              className="w-full h-12 text-base"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Building2 className="mr-2 h-5 w-5" />
                  Connect Bank Account
                </>
              )}
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              You'll be redirected to Stripe to securely connect your bank account. No sensitive information is stored on our servers.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
};
