import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Building2, CheckCircle2, ExternalLink, AlertCircle, RefreshCw } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

export const BankAccountSetup = () => {
  const [loading, setLoading] = useState(false);
  const [accountStatus, setAccountStatus] = useState<'connected' | 'pending' | 'not_connected'>('not_connected');

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
      
      // Update status based on account ID presence
      if (data?.stripe_connect_account_id) {
        setAccountStatus('connected');
      } else {
        setAccountStatus('not_connected');
      }
      
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

  const isConnected = accountStatus === 'connected';
  const isPending = accountStatus === 'pending';

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            <CardTitle>Bank Account & Payouts</CardTitle>
          </div>
          {isConnected && (
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Connected
            </Badge>
          )}
          {isPending && (
            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
              <AlertCircle className="h-3 w-3 mr-1" />
              Pending
            </Badge>
          )}
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
            <div className="grid gap-2">
              <Button 
                onClick={handleManageAccount} 
                disabled={loading}
                variant="outline"
                className="w-full"
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Manage Payout Settings
              </Button>
              <Button 
                onClick={() => refetch()} 
                disabled={loading}
                variant="ghost"
                size="sm"
                className="w-full"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Verify Connection Status
              </Button>
            </div>
          </>
        ) : isPending ? (
          <>
            <Alert className="bg-yellow-50 border-yellow-200">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800">
                Your Stripe Connect account setup is pending. Please complete the setup process or verify your account details.
              </AlertDescription>
            </Alert>
            <div className="grid gap-2">
              <Button 
                onClick={handleConnectStripe} 
                disabled={loading}
                className="w-full"
              >
                <Building2 className="mr-2 h-4 w-4" />
                Complete Setup
              </Button>
              <Button 
                onClick={() => refetch()} 
                disabled={loading}
                variant="outline"
                size="sm"
                className="w-full"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Check Status
              </Button>
            </div>
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
