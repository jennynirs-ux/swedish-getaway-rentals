import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Home, Users, DollarSign, Shield, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

const BecomeHost = () => {
  const [formData, setFormData] = useState({
    businessName: "",
    description: "",
    experience: "",
    contactPhone: "",
  });
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmitApplication = async () => {
    try {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Fel",
          description: "Du måste vara inloggad för att ansöka som värd",
          variant: "destructive"
        });
        return;
      }

      // Get user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) {
        toast({
          title: "Fel",
          description: "Användarprofil hittades inte",
          variant: "destructive"
        });
        return;
      }

      // Submit host application
      const { error } = await supabase
        .from('host_applications')
        .insert({
          user_id: profile.id,
          business_name: formData.businessName,
          description: formData.description,
          experience: formData.experience,
          contact_phone: formData.contactPhone,
        });

      if (error) throw error;

      toast({
        title: "Ansökan skickad!",
        description: "Vi kommer att granska din ansökan och kontakta dig inom 2-3 arbetsdagar.",
      });

      navigate('/');
    } catch (error) {
      console.error('Error submitting application:', error);
      toast({
        title: "Fel",
        description: "Kunde inte skicka ansökan. Försök igen.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const benefits = [
    {
      icon: DollarSign,
      title: "Tjäna extra inkomst",
      description: "Dra nytta av din fastighet genom att hyra ut den till resenärer"
    },
    {
      icon: Users,
      title: "Möt nya människor",
      description: "Välkomna gäster från hela världen och dela dina lokala tips"
    },
    {
      icon: Shield,
      title: "Trygg plattform",
      description: "Fullständig försäkring och säker betalningshantering"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="villa-container py-16">
        {step === 1 && (
          <>
            {/* Hero Section */}
            <div className="text-center mb-16">
              <h1 className="text-5xl font-bold mb-6">Bli värd och tjäna pengar</h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Förvandla din fastighet till en inkomstkälla genom att välkomna resenärer från hela världen
              </p>
            </div>

            {/* Benefits */}
            <div className="grid md:grid-cols-3 gap-8 mb-16">
              {benefits.map((benefit, index) => (
                <Card key={index} className="villa-card text-center">
                  <CardContent className="pt-8">
                    <benefit.icon className="w-12 h-12 text-primary mx-auto mb-4" />
                    <h3 className="text-xl font-semibold mb-3">{benefit.title}</h3>
                    <p className="text-muted-foreground">{benefit.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* CTA */}
            <div className="text-center">
              <Button 
                size="lg" 
                className="text-lg px-8 py-6"
                onClick={() => setStep(2)}
              >
                Kom igång nu
                <ChevronRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
          </>
        )}

        {step === 2 && (
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl text-center">Ansök som värd</CardTitle>
                <p className="text-center text-muted-foreground">
                  Berätta lite om dig själv och din fastighet
                </p>
              </CardHeader>
              
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="businessName">Företagsnamn (valfritt)</Label>
                  <Input
                    id="businessName"
                    placeholder="T.ex. Stockholm Getaways AB"
                    value={formData.businessName}
                    onChange={(e) => handleInputChange('businessName', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Beskriv dig själv som värd *</Label>
                  <Textarea
                    id="description"
                    placeholder="Berätta om dig själv, varför du vill bli värd och vad som gör dig till en bra värd..."
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    required
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="experience">Tidigare erfarenhet</Label>
                  <Textarea
                    id="experience"
                    placeholder="Har du tidigare erfarenhet av uthyrning, hotellbranschen eller liknande?"
                    value={formData.experience}
                    onChange={(e) => handleInputChange('experience', e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contactPhone">Telefonnummer *</Label>
                  <Input
                    id="contactPhone"
                    type="tel"
                    placeholder="070-123 45 67"
                    value={formData.contactPhone}
                    onChange={(e) => handleInputChange('contactPhone', e.target.value)}
                    required
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <Button 
                    variant="outline" 
                    onClick={() => setStep(1)}
                    className="flex-1"
                  >
                    Tillbaka
                  </Button>
                  <Button 
                    onClick={handleSubmitApplication}
                    disabled={loading || !formData.description || !formData.contactPhone}
                    className="flex-1"
                  >
                    {loading ? "Skickar..." : "Skicka ansökan"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default BecomeHost;