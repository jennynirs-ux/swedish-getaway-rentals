import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Building2, CheckCircle2, ExternalLink } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

export const BankAccountSetup = () => {
  const [loading, setLoading] = useState(false);

  const { data: profile, refetch } = useQuery({
    queryKey: ["host-profile"],
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
    }
  });

  const handleConnectStripe = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-connect-account", {
        body: { 
          returnUrl: window.location.href,
          refreshUrl: window.location.href
        }
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, "_blank");
        toast({
          title: "Opening Stripe Connect",
          description: "Complete the setup in the new window, then return here.",
        });
        
        // Refetch profile after a delay to check if connection was successful
        setTimeout(() => refetch(), 5000);
      }
    } catch (error: any) {
      console.error("Error connecting Stripe:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to connect to Stripe",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleManageAccount = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-connect-dashboard-link");

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (error: any) {
      console.error("Error opening Stripe dashboard:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to open Stripe dashboard",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const isConnected = !!profile?.stripe_connect_account_id;

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
      <CardContent className="space-y-4">
        {isConnected ? (
          <>
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Your bank account is connected. Payouts will be sent after each booking, minus the 10% platform fee.
              </AlertDescription>
            </Alert>
            <Button 
              onClick={handleManageAccount} 
              disabled={loading}
              variant="outline"
              className="w-full"
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Manage Payout Settings
            </Button>
          </>
        ) : (
          <>
            <Alert>
              <AlertDescription>
                You need to connect your bank account via Stripe to receive payouts from your bookings. 
                The platform fee is 10% per booking.
              </AlertDescription>
            </Alert>
            <Button 
              onClick={handleConnectStripe} 
              disabled={loading}
              className="w-full"
            >
              <Building2 className="mr-2 h-4 w-4" />
              Connect Bank Account
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
};
