import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { 
  Home, 
  TrendingUp, 
  Users, 
  Shield, 
  Calendar, 
  DollarSign,
  CheckCircle2,
  ArrowRight
} from "lucide-react";
import MainNavigation from "@/components/MainNavigation";

const BecomeHost = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });
  }, []);

  const handleCreateHostAccount = async () => {
    if (!user) {
      // Redirect to auth with a clear message
      toast({
        title: "Sign in required",
        description: "Please sign in or create an account to become a host.",
      });
      navigate('/auth?redirect=/become-host');
      return;
    }

    setLoading(true);
    try {
      // Get the current profile
      const { data: profile, error: fetchError } = await supabase
        .from('profiles')
        .select('id, is_host, host_approved')
        .eq('user_id', user.id)
        .maybeSingle();

      if (fetchError) throw fetchError;

      // If no profile exists, create one
      if (!profile) {
        const { error: createError } = await supabase
          .from('profiles')
          .insert({
            user_id: user.id,
            email: user.email,
            full_name: user.user_metadata?.full_name || user.email,
            is_host: true,
            host_approved: true,
            host_application_date: new Date().toISOString(),
          });

        if (createError) throw createError;
      } else if (profile.is_host && profile.host_approved) {
        // Already a host, just redirect
        toast({
          title: "You're already a host!",
          description: "Redirecting to your dashboard.",
        });
        navigate('/host-dashboard');
        return;
      } else {
        // Update existing profile to become a host
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            is_host: true,
            host_approved: true,
            host_application_date: new Date().toISOString(),
          })
          .eq('user_id', user.id);

        if (updateError) throw updateError;
      }

      toast({
        title: "Welcome to Nordic Getaways Hosting!",
        description: "You're now a host. Let's create your first property.",
      });

      // Redirect to host dashboard
      navigate('/host-dashboard');
    } catch (error) {
      console.error('Error creating host account:', error);
      toast({
        title: "Error",
        description: "Failed to create host account. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const benefits = [
    {
      icon: DollarSign,
      title: "Earn Extra Income",
      description: "Turn your property into a profitable rental and earn up to 90% of booking revenue."
    },
    {
      icon: Calendar,
      title: "Full Control",
      description: "Set your own prices, availability, and house rules. You're in complete control."
    },
    {
      icon: Shield,
      title: "Protected Hosting",
      description: "Host protection insurance and secure payment processing for peace of mind."
    },
    {
      icon: Users,
      title: "Quality Guests",
      description: "Connect with verified guests looking for unique Nordic experiences."
    },
    {
      icon: TrendingUp,
      title: "Marketing Support",
      description: "Your property featured on our platform with professional marketing."
    },
    {
      icon: Home,
      title: "Easy Management",
      description: "Simple booking management, automated payments, and 24/7 support."
    }
  ];

  const steps = [
    "Create your host account (free)",
    "Add your property details and photos",
    "Set your pricing and availability",
    "Get your first booking and start earning"
  ];

  return (
    <div className="min-h-screen bg-background">
      <MainNavigation />
      
      {/* Hero Section */}
      <div className="relative h-[60vh] flex items-center justify-center overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: "url('/public/lovable-uploads/93c33182-c9b7-4857-831a-49ed13df4375.png')",
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-background" />
        </div>
        
        <div className="relative z-10 container mx-auto px-4 text-center text-white">
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            Become a Host
          </h1>
          <p className="text-xl md:text-2xl mb-8 max-w-2xl mx-auto opacity-90">
            Share your property and start earning money.
          </p>
          <Button 
            size="lg" 
            onClick={handleCreateHostAccount}
            disabled={loading}
            className="text-lg px-8 py-6"
          >
            {loading ? "Creating Account..." : "Create Host Account"}
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </div>

      <div className="container mx-auto px-4 py-16">
        {/* Benefits Section */}
        <div className="mb-20">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
            Why Host with Nordic Getaways?
          </h2>
          <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
            Join our community of hosts and unlock the full potential of your property
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {benefits.map((benefit, index) => (
              <Card key={index} className="hover-scale">
                <CardContent className="p-6">
                  <benefit.icon className="h-12 w-12 text-primary mb-4" />
                  <h3 className="text-xl font-semibold mb-2">{benefit.title}</h3>
                  <p className="text-muted-foreground">{benefit.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* How It Works */}
        <div className="mb-20 max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            How It Works
          </h2>
          
          <div className="space-y-6">
            {steps.map((step, index) => (
              <div key={index} className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg">
                  {index + 1}
                </div>
                <div className="flex-1 pt-2">
                  <p className="text-lg">{step}</p>
                </div>
                <CheckCircle2 className="h-6 w-6 text-green-500 mt-2" />
              </div>
            ))}
          </div>
        </div>

        {/* Earnings Example */}
        <div className="mb-20 max-w-4xl mx-auto">
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-8">
              <h2 className="text-2xl md:text-3xl font-bold text-center mb-6">
                Transparent Earnings Example
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                <div>
                  <div className="text-4xl font-bold text-primary mb-2">
                    2,500 SEK
                  </div>
                  <div className="text-muted-foreground">Your Price</div>
                </div>
                <div>
                  <div className="text-4xl font-bold text-primary mb-2">
                    +10%
                  </div>
                  <div className="text-muted-foreground">Platform Fee</div>
                </div>
                <div>
                  <div className="text-4xl font-bold text-green-600 mb-2">
                    2,750 SEK
                  </div>
                  <div className="text-muted-foreground">Guest Pays</div>
                </div>
              </div>

              <p className="text-center text-sm text-muted-foreground mt-6">
                The 10% covers marketing, support, secure payments, and ongoing
                platform development — keeping hosting transparent and fair.
              </p>
            </CardContent>
          </Card>
        </div>
        
        {/* CTA Section */}
        <div className="text-center bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl p-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Start Hosting?
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Create your host account today and list your first property in minutes
          </p>
          <Button 
            size="lg" 
            onClick={handleCreateHostAccount}
            disabled={loading}
            className="text-lg px-8 py-6"
          >
            {loading ? "Creating Account..." : "Create Host Account"}
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default BecomeHost;
