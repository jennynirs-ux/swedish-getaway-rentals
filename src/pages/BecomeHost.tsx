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
  ArrowRight,
  HelpCircle,
} from "lucide-react";
import MainNavigation from "@/components/MainNavigation";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";

const BecomeHost = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });
  }, []);

  const handleHostRedirect = () => {
    // Always send users to auth if not logged in, otherwise to host dashboard
    if (!user) {
      navigate("/auth?redirect=/host-dashboard");
    } else {
      navigate("/host-dashboard");
    }
  };

  const benefits = [
    {
      icon: DollarSign,
      title: "Transparent Earnings",
      description:
        "Set your price and see exactly what the guest pays — including the 10% that goes to marketing, support, payment handling, and platform development.",
    },
    {
      icon: Home,
      title: "Full Control",
      description:
        "You decide your price, availability, and rules. Update or pause anytime.",
    },
    {
      icon: Shield,
      title: "Bring Your Own Insurance",
      description:
        "To keep hosting affordable, you use your own home insurance. Guests sign that they’re responsible for any damages.",
    },
    {
      icon: Users,
      title: "Respectful Guests",
      description:
        "We connect you with guests who value unique Nordic stays and treat your home with care.",
    },
    {
      icon: TrendingUp,
      title: "Strong Visibility",
      description:
        "Your property is featured in our marketing and showcased across the Nordic Getaways platform.",
    },
    {
      icon: Calendar,
      title: "Effortless Management",
      description:
        "Automatic payments, easy calendar sync, and direct support whenever you need it.",
    },
  ];

  const steps = [
    "Create your host account (free)",
    "Add your property details and photos",
    "Set your pricing and availability",
    "Get your first booking and start earning",
  ];

  const faqs = [
    {
      question: "Do I need a registered company to host?",
      answer:
        "No — you can rent out as a private individual. If you rent out frequently or several properties, we recommend checking local tax and business registration rules.",
    },
    {
      question: "How do payments work?",
      answer:
        "Guests pay securely via our payment provider. You receive your full listed amount directly, and the 10% platform fee (for marketing, support, and payment transfer) is added transparently on top of the guest’s price.",
    },
    {
      question: "What if a guest causes damage?",
      answer:
        "Guests agree in writing to take full responsibility for any damage they cause. We recommend having your own home insurance covering short-term rentals for extra peace of mind.",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <MainNavigation />

      {/* Hero Section */}
      <div className="relative h-[60vh] flex items-center justify-center overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              "url('/public/lovable-uploads/93c33182-c9b7-4857-831a-49ed13df4375.png')",
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-background" />
        </div>

        <div className="relative z-10 container mx-auto px-4 text-center text-white">
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            Become a Host
          </h1>
          <p className="text-xl md:text-2xl mb-8 max-w-2xl mx-auto opacity-90">
            Share your Nordic home — earn income on your terms. You set the
            price, we add 10%.
          </p>
          <Button
            size="lg"
            onClick={handleHostRedirect}
            className="text-lg px-8 py-6"
          >
            Start Hosting Now
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </div>

      <div className="container mx-auto px-4 py-16">
        {/* Hosting Mindset Section */}
        <div className="mb-20 max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Hosting is more than income — it’s a mindset
          </h2>
          <p className="text-muted-foreground text-lg">
            It’s natural to feel unsure at first: What if something breaks? Will
            guests respect my space? Most hosts start with the same worries, but
            quickly realize it’s smoother and more rewarding than expected.{" "}
            <br />
            With honest communication and clear expectations, hosting becomes a
            chance to share your story — and earn from it.
          </p>
        </div>

        {/* Benefits Section */}
        <div className="mb-20">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
            Why Host with Nordic Getaways?
          </h2>
          <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
            Transparent, flexible, and fair — designed for hosts who value
            freedom and simplicity.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {benefits.map((benefit, index) => (
              <Card key={index} className="hover-scale">
                <CardContent className="p-6">
                  <benefit.icon className="h-12 w-12 text-primary mb-4" />
                  <h3 className="text-xl font-semibold mb-2">
                    {benefit.title}
                  </h3>
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

        {/* FAQ Section */}
        <div className="max-w-3xl mx-auto mb-20">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-10">
            Common Questions
          </h2>
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`}>
                <AccordionTrigger className="text-lg font-medium flex items-center gap-2">
                  <HelpCircle className="h-5 w-5 text-primary" />
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground text-base">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

        {/* CTA Section */}
        <div className="text-center bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl p-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Share Your Space?
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Start small — rent out a weekend or a few summer weeks and discover
            how hosting can bring both joy and extra income.
          </p>
          <Button
            size="lg"
            onClick={handleHostRedirect}
            className="text-lg px-8 py-6"
          >
            Start Hosting Now
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>

        <p className="text-xs text-muted-foreground text-center mt-6">
          Nordic Getaways is 100% transparent. You set the price — guests see
          what they pay, and you see what goes to marketing, support, payment
          handling, and platform improvement.
        </p>
      </div>
    </div>
  );
};

export default BecomeHost;
