import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import {
  Home,
  TrendingUp,
  Shield,
  Calendar,
  DollarSign,
  ArrowRight,
  HelpCircle,
  Mail,
  X,
  Loader2,
} from "lucide-react";
import MainNavigation from "@/components/MainNavigation";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";

const BecomeHost = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [showSupport, setShowSupport] = useState(false);
  const [supportLoading, setSupportLoading] = useState(false);
  const [supportForm, setSupportForm] = useState({
    name: "",
    email: "",
    message: "",
  });

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      if (user) {
        setSupportForm((prev) => ({ ...prev, email: user.email || "" }));
      }
    });
  }, []);

  const handleHostRedirect = () => {
    if (!user) {
      navigate("/auth?redirect=/host-dashboard");
    } else {
      navigate("/host-dashboard");
    }
  };

  const handleSupportSubmit = async () => {
    if (!supportForm.name || !supportForm.email || !supportForm.message) {
      toast({
        title: "Missing Information",
        description: "Please fill in all fields before sending your message.",
        variant: "destructive",
      });
      return;
    }

    setSupportLoading(true);
    const { error } = await supabase.from("support_messages").insert({
      name: supportForm.name,
      email: supportForm.email,
      message: supportForm.message,
      created_at: new Date().toISOString(),
    });

    setSupportLoading(false);

    if (error) {
      toast({
        title: "Error",
        description: "Something went wrong while sending your message.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Message sent!",
      description: "Our team will get back to you shortly.",
    });
    setSupportForm({ name: "", email: user?.email || "", message: "" });
    setShowSupport(false);
  };

  const benefits = [
    {
      icon: DollarSign,
      title: "You keep what you set",
      description:
        "Set your own price. Guests see a transparent 10% platform fee added on top.",
    },
    {
      icon: Shield,
      title: "Simple & secure",
      description:
        "Safe payments, verified guests, and full control over your bookings.",
    },
    {
      icon: Calendar,
      title: "Full flexibility",
      description:
        "Rent out on your schedule — a weekend, a month, or the whole summer.",
    },
    {
      icon: TrendingUp,
      title: "Built for hosts",
      description:
        "Our 10% covers marketing, platform development, and support — nothing hidden.",
    },
  ];

  const faqs = [
    {
      question: "Do I need a company to host?",
      answer: (
        <>
          No, you can host as a private individual. If you rent out frequently or
          have multiple properties, you may need to register for taxes or business
          activity. In Sweden, you can earn up to 40,000 SEK tax-free per year from
          private rentals, plus a 20% deduction on the rest. See{" "}
          <a
            href="https://www.skatteverket.se/privat/skatter/bostad/uthyrningavprivatbostad"
            target="_blank"
            rel="noopener noreferrer"
            className="underline text-primary"
          >
            Skatteverket
          </a>{" "}
          for more info.
        </>
      ),
    },
    {
      question: "How do payments work?",
      answer:
        "Guests pay securely through our payment provider (Stripe). You receive your full listed amount directly. The guest sees a transparent 10% platform fee that covers marketing, support, and payment transfer. You always see exactly what you earn.",
    },
    {
      question: "What about insurance?",
      answer:
        "Nordic Getaways doesn’t include insurance — you keep full control. Most Swedish home insurances cover short-term rentals with an add-on, and guests agree to take full responsibility for any damage caused during their stay.",
    },
    {
      question: "How does check-in work?",
      answer:
        "You can manage check-ins yourself or connect your Yale Doorman smart lock in your host dashboard. Each guest receives a unique access code valid only during their stay.",
    },
    {
      question: "How do I manage my listing?",
      answer:
        "Once you’ve signed up and created your property, you can update details, pricing, and availability anytime in your host dashboard. Everything syncs automatically — simple and transparent.",
    },
    {
      question: "What if something goes wrong with a guest?",
      answer:
        "In rare cases, communication is key. Guests agree to terms that make them responsible for damages. You can report incidents directly in your dashboard, and our team will help you resolve them.",
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
          <h1 className="text-5xl md:text-6xl font-bold mb-6">Become a Host</h1>
          <p className="text-xl md:text-2xl mb-8 max-w-2xl mx-auto opacity-90">
            Share your Nordic home — earn income on your terms. You set the price, we add 10%.
          </p>
          <Button size="lg" onClick={handleHostRedirect} className="text-lg px-8 py-6">
            Start Hosting Now
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
            Transparent. Fair. Built for hosts who value simplicity.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {benefits.map((benefit, index) => (
              <Card key={index} className="text-center p-6 hover:shadow-md transition">
                <CardContent className="flex flex-col items-center">
                  <benefit.icon className="h-10 w-10 text-primary mb-3" />
                  <h3 className="text-lg font-semibold mb-1">{benefit.title}</h3>
                  <p className="text-sm text-muted-foreground">{benefit.description}</p>
                </CardContent>
              </Card>
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
                  <div className="text-4xl font-bold text-primary mb-2">2 500 SEK</div>
                  <div className="text-muted-foreground">Your Price</div>
                </div>
                <div>
                  <div className="text-4xl font-bold text-primary mb-2">+10%</div>
                  <div className="text-muted-foreground">Platform Fee</div>
                </div>
                <div>
                  <div className="text-4xl font-bold text-green-600 mb-2">2 750 SEK</div>
                  <div className="text-muted-foreground">Guest Pays</div>
                </div>
              </div>
              <p className="text-center text-sm text-muted-foreground mt-6">
                The 10% covers marketing, support, secure payments, and platform improvements.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* FAQ Section */}
        <div className="max-w-3xl mx-auto mb-20">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-10">Common Questions</h2>
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

          {/* Contact Support */}
          <div className="text-center mt-12">
            <Mail className="h-8 w-8 mx-auto text-primary mb-3" />
            <p className="text-lg font-semibold mb-2">Need more help?</p>
            <p className="text-muted-foreground mb-4">
              Our team is here to help you set up your first listing or answer any questions about hosting.
            </p>
            <Button variant="outline" onClick={() => setShowSupport(true)}>
              Contact Support
            </Button>
          </div>
        </div>

        {/* Contact Modal */}
        <Dialog open={showSupport} onOpenChange={setShowSupport}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Contact Support</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                placeholder="Your name"
                value={supportForm.name}
                onChange={(e) => setSupportForm({ ...supportForm, name: e.target.value })}
              />
              <Input
                type="email"
                placeholder="Your email"
                value={supportForm.email}
                onChange={(e) => setSupportForm({ ...supportForm, email: e.target.value })}
              />
              <Textarea
                placeholder="Your message..."
                rows={4}
                value={supportForm.message}
                onChange={(e) => setSupportForm({ ...supportForm, message: e.target.value })}
              />
            </div>
            <DialogFooter className="mt-4 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowSupport(false)}>
                <X className="w-4 h-4 mr-2" /> Cancel
              </Button>
              <Button onClick={handleSupportSubmit} disabled={supportLoading}>
                {supportLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Send Message
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* CTA Section */}
        <div className="text-center bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl p-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Share Your Space?
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Start small — rent out a weekend or a few summer weeks and discover how hosting can bring both joy and extra income.
          </p>
          <Button size="lg" onClick={handleHostRedirect} className="text-lg px-8 py-6">
            Start Hosting Now
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>

        <p className="text-xs text-muted-foreground text-center mt-6">
          Nordic Getaways is 100% transparent. You set the price — guests see what they pay, and you see what goes to marketing, support, payment handling, and platform improvement.
        </p>
      </div>
    </div>
  );
};

export default BecomeHost;
