import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import MainNavigation from "@/components/MainNavigation";
import { Gift } from "lucide-react";

const HostApplication = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const [referralCode, setReferralCode] = useState("");
  const [formData, setFormData] = useState({
    businessName: '',
    description: '',
    experience: '',
    contactPhone: ''
  });
  const navigate = useNavigate();

  useEffect(() => {
    const ref = searchParams.get("ref");
    if (ref) {
      setReferralCode(ref);
    }
  }, [searchParams]);

  const phoneRegex = /^\+?[\d\s\-()]{7,20}$/;

  const validatePhone = (phone: string): boolean => {
    if (!phone) return true; // Phone is optional
    return phoneRegex.test(phone);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate phone number
      if (formData.contactPhone && !validatePhone(formData.contactPhone)) {
        toast({ title: 'Error', description: 'Please enter a valid phone number', variant: 'destructive' });
        setLoading(false);
        return;
      }

      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        toast({ title: 'Error', description: 'Please log in to submit an application', variant: 'destructive' });
        navigate('/auth');
        return;
      }

      // Validate referral code if provided
      if (referralCode) {
        const { data: referralData, error: referralError } = await supabase
          .from("host_referrals")
          .select("id, status, expires_at")
          .eq("referral_code", referralCode)
          .single();

        if (referralError || !referralData) {
          toast({ title: 'Error', description: 'Invalid referral code', variant: 'destructive' });
          setLoading(false);
          return;
        }

        if (referralData.status !== "pending") {
          toast({ title: 'Error', description: 'This referral code has already been used', variant: 'destructive' });
          setLoading(false);
          return;
        }

        if (new Date(referralData.expires_at) < new Date()) {
          toast({ title: 'Error', description: 'This referral code has expired', variant: 'destructive' });
          setLoading(false);
          return;
        }
      }

      // Check if user already has an application
      const { data: existingApplication, error: existingAppError } = await supabase
        .from('host_applications')
        .select('id')
        .eq('user_id', user.user.id)
        .single();

      // Only treat PGRST116 (not found) as "no existing application"
      // Re-throw other errors
      if (existingAppError && existingAppError.code !== 'PGRST116') {
        throw existingAppError;
      }

      if (existingApplication) {
        toast({ title: 'Error', description: 'You have already submitted a host application', variant: 'destructive' });
        return;
      }

      const { error } = await supabase
        .from('host_applications')
        .insert({
          user_id: user.user.id,
          business_name: formData.businessName,
          description: formData.description,
          experience: formData.experience,
          contact_phone: formData.contactPhone
        });

      if (error) throw error;

      // If referral code was used and application approved, trigger completion
      if (referralCode) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("id")
          .eq("user_id", user.user.id)
          .single();

        if (profileData) {
          await supabase.functions.invoke("complete-host-referral", {
            body: { 
              referralCode,
              newHostProfileId: profileData.id 
            },
          });
        }
      }

      toast({ title: 'Success', description: 'Host application submitted successfully! We will review it and get back to you.' });
      navigate('/');
    } catch (error) {
      console.error('Error submitting application:', error);
      toast({ title: 'Error', description: 'Failed to submit application', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="min-h-screen bg-background">
      <MainNavigation />
      
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-foreground mb-4">
              Become a Nordic Getaways Host
            </h1>
            <p className="text-lg text-muted-foreground">
              Share your beautiful Nordic property with travelers from around the world
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Host Application</CardTitle>
            </CardHeader>
            <CardContent>
              {referralCode && (
                <Alert className="mb-6 border-primary/20 bg-primary/5">
                  <Gift className="h-4 w-4 text-primary" />
                  <AlertDescription className="text-sm">
                    You're using a referral code! Complete your application to help your referrer earn a reward.
                  </AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <Label htmlFor="businessName">Business Name *</Label>
                  <Input
                    id="businessName"
                    name="businessName"
                    value={formData.businessName}
                    onChange={handleChange}
                    required
                    placeholder="Your business or property name"
                  />
                </div>

                <div>
                  <Label htmlFor="description">Property Description *</Label>
                  <Textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    required
                    placeholder="Describe your property and what makes it special..."
                    rows={4}
                  />
                </div>

                <div>
                  <Label htmlFor="experience">Hosting Experience</Label>
                  <Textarea
                    id="experience"
                    name="experience"
                    value={formData.experience}
                    onChange={handleChange}
                    placeholder="Tell us about your experience in hospitality or property management..."
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="contactPhone">Contact Phone</Label>
                  <Input
                    id="contactPhone"
                    name="contactPhone"
                    type="tel"
                    value={formData.contactPhone}
                    onChange={handleChange}
                    placeholder="+46 70 123 45 67"
                  />
                </div>

                <div className="bg-muted p-4 rounded-lg">
                  <h3 className="font-semibold mb-2">What happens next?</h3>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Our team will review your application within 2-3 business days</li>
                    <li>• If approved, you'll get access to your host dashboard</li>
                    <li>• You can then add your properties and start receiving bookings</li>
                    <li>• We handle payments and take a 10% commission on successful bookings</li>
                  </ul>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={loading}
                >
                  {loading ? 'Submitting...' : 'Submit Application'}
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