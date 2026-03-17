import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { CheckCircle, Home, Calendar, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

const BookingSuccess = () => {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [processing, setProcessing] = useState(true);
  const [success, setSuccess] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  useEffect(() => {
    if (sessionId) {
      handlePaymentSuccess();
    }
  }, [sessionId]);

  const handlePaymentSuccess = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('handle-payment-success', {
        body: { session_id: sessionId }
      });

      if (error) throw error;

      if (data.success) {
        setSuccess(true);
        // Booking confirmation email is sent automatically by handle-payment-success
        // → send-booking-notifications edge function (Resend + tracking)
        setEmailSent(true);
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
            <h3 className="text-lg font-semibold mb-2">Processing your booking...</h3>
            <p className="text-muted-foreground">Please wait while we confirm your payment.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!success) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-2xl mx-auto text-center">
            <Card className="shadow-lg">
              <CardHeader className="pb-4">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <XCircle className="w-8 h-8 text-red-600" />
                </div>
                <CardTitle className="text-2xl text-red-600">
                  Payment Failed
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <p className="text-lg text-muted-foreground">
                    Unfortunately, we couldn't process your booking at this time.
                  </p>

                  <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                    <p className="text-sm text-red-700">
                      Please try again or contact our support team if the issue persists.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 pt-4">
                  <Link to="/" className="flex-1">
                    <Button variant="outline" className="w-full">
                      <Home className="w-4 h-4 mr-2" />
                      Home
                    </Button>
                  </Link>

                  <Link to="/contact" className="flex-1">
                    <Button className="w-full bg-red-600 hover:bg-red-700">
                      Contact Support
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto text-center">
          <Card className="shadow-lg">
            <CardHeader className="pb-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <CardTitle className="text-2xl text-green-600">
                Booking Confirmed!
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="space-y-4">
                <p className="text-lg text-muted-foreground">
                  Thank you for your booking! Your payment has been processed and your reservation is now confirmed.
                </p>

                {emailSent && (
                  <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                    <p className="text-sm text-green-800 font-medium">
                      ✓ A confirmation email has been sent to your inbox. Please check your spam folder if you don't see it.
                    </p>
                  </div>
                )}

                <div className="bg-primary/5 p-4 rounded-lg">
                  <h4 className="font-semibold text-primary mb-2">What happens next:</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Check your email for booking confirmation and details</li>
                    <li>• We will contact you with check-in details before your arrival</li>
                    <li>• If you have any questions, please use the contact form on the property page</li>
                  </ul>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Link to="/" className="flex-1">
                  <Button variant="outline" className="w-full">
                    <Home className="w-4 h-4 mr-2" />
                    Home
                  </Button>
                </Link>

                <Link to="/profile" className="flex-1">
                  <Button className="w-full">
                    <Calendar className="w-4 h-4 mr-2" />
                    My Bookings
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
