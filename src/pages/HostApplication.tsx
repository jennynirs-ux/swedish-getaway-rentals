import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import MainNavigation from "@/components/MainNavigation";

const HostApplication = () => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    businessName: '',
    description: '',
    experience: '',
    contactPhone: ''
  });
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        toast.error('Please log in to submit an application');
        navigate('/auth');
        return;
      }

      // Check if user already has an application
      const { data: existingApplication } = await supabase
        .from('host_applications')
        .select('id')
        .eq('user_id', user.user.id)
        .single();

      if (existingApplication) {
        toast.error('You have already submitted a host application');
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

      toast.success('Host application submitted successfully! We will review it and get back to you.');
      navigate('/');
    } catch (error) {
      console.error('Error submitting application:', error);
      toast.error('Failed to submit application');
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