import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { CheckCircle, Home, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

const OrderSuccess = () => {
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
            <h3 className="text-lg font-semibold mb-2">Processing your order...</h3>
            <p className="text-muted-foreground">Please wait while we confirm your payment.</p>
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
                {success ? "Order Confirmed!" : "We're confirming your order"}
              </CardTitle>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {success ? (
                <div className="space-y-4">
                  <p className="text-lg text-muted-foreground">
                    Thank you for your purchase! Your payment has been processed and your order is being prepared.
                  </p>
                  
                  <div className="bg-primary/5 p-4 rounded-lg">
                    <h4 className="font-semibold text-primary mb-2">What happens next:</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• You'll receive an order confirmation email shortly</li>
                      <li>• Your order will be processed and printed</li>
                      <li>• You'll get tracking information once shipped</li>
                      <li>• Questions? Contact us at support@mojjo.se</li>
                    </ul>
                  </div>
                </div>
              ) : (
                <p className="text-lg text-muted-foreground">
                  You'll receive an order confirmation email within a few minutes. If it doesn't arrive, email{" "}
                  <a className="underline" href="mailto:support@mojjo.se">support@mojjo.se</a> and we'll sort it out.
                </p>
              )}

              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Link to="/" className="flex-1">
                  <Button variant="outline" className="w-full">
                    <Home className="w-4 h-4 mr-2" />
                    Home
                  </Button>
                </Link>
                
                <Link to="/shop" className="flex-1">
                  <Button className="w-full">
                    <ShoppingBag className="w-4 h-4 mr-2" />
                    Continue Shopping
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