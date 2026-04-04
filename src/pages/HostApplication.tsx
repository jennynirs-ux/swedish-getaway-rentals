import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import MainNavigation from "@/components/MainNavigation";
import { Gift, CheckCircle, ArrowRight } from "lucide-react";

const HostApplication = () => {
  const [loading, setLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const [referralCode, setReferralCode] = useState("");
  const [formData, setFormData] = useState({
    businessName: '',
    contactPhone: ''
  });
  const navigate = useNavigate();

  useEffect(() => {
    const ref = searchParams.get("ref");
    if (ref) setReferralCode(ref);
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        toast.error('Please log in first');
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
        toast.success('You are already a host!');
        navigate('/host-dashboard');
        return;
      }

      // Instantly approve: set is_host and host_approved on the profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          is_host: true,
          host_approved: true,
          host_business_name: formData.businessName || null,
          host_onboarding_completed: false,
        })
        .eq('user_id', user.user.id);

      if (profileError) throw profileError;

      // Also save to host_applications for record-keeping
      await supabase
        .from('host_applications')
        .insert({
          user_id: user.user.id,
          business_name: formData.businessName,
          contact_phone: formData.contactPhone,
          description: formData.businessName || 'New host application',
          status: 'approved',
        })
        .select('id')
        .single();

      // Handle referral code
      if (referralCode && profile) {
        supabase.functions.invoke("complete-host-referral", {
          body: { referralCode, newHostProfileId: profile.id },
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

      toast.success('Welcome! You are now a host. Let\'s set up your first property.');
      navigate('/host-dashboard');
    } catch (error) {
      console.error('Error becoming host:', error);
      toast.error('Something went wrong. Please try again.');
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
              Start Hosting
            </h1>
            <p className="text-lg text-muted-foreground">
              List your Nordic property in under 5 minutes
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Quick Setup</CardTitle>
            </CardHeader>
            <CardContent>
              {referralCode && (
                <Alert className="mb-6 border-primary/20 bg-primary/5">
                  <Gift className="h-4 w-4 text-primary" />
                  <AlertDescription className="text-sm">
                    Referral code applied! You'll both earn a reward.
                  </AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <Label htmlFor="businessName">Property or Business Name *</Label>
                  <Input
                    id="businessName"
                    value={formData.businessName}
                    onChange={(e) => setFormData(prev => ({ ...prev, businessName: e.target.value }))}
                    required
                    placeholder="e.g., Lakeside Cabin Dalarna"
                  />
                </div>

                <div>
                  <Label htmlFor="contactPhone">Your Phone (optional)</Label>
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
                  <h3 className="font-semibold text-sm">What's included:</h3>
                  <div className="space-y-2">
                    {[
                      'Your own host dashboard',
                      'Calendar sync with Airbnb & Booking.com',
                      'Automatic booking confirmations',
                      'Secure payments via Stripe',
                      'Smart lock integration',
                    ].map((item) => (
                      <div key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />
                        {item}
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground pt-1">
                    You set the price. We add a 10% service fee for guests.
                  </p>
                </div>

                <Button type="submit" className="w-full" size="lg" disabled={loading}>
                  {loading ? 'Setting up...' : (
                    <>
                      Start Hosting Now
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
