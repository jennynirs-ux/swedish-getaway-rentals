import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import type { User } from "@supabase/supabase-js";
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
import { usePageMeta } from "@/hooks/usePageMeta";
import forestHeroBg from "@/assets/forest-hero-light.webp";
import { HOST_TERMS_PATH } from "@/content/hostTerms";
import {
  FOUNDING_HOST_DEADLINE,
  FOUNDING_HOST_FEE_PCT,
  PLATFORM_SERVICE_FEE_RATE,
  foundingHostOfferOpen,
  withServiceFee,
} from "@/lib/constants";

const FEE_PCT = Math.round(PLATFORM_SERVICE_FEE_RATE * 100);
// "31 December 2026" → "31 Dec 2026", so the meta description stays within 155 characters
const FOUNDING_HOST_DEADLINE_SHORT = FOUNDING_HOST_DEADLINE.replace(/([A-Za-z]{3})[a-z]+/, "$1");
// Host price used in the fee examples below
const EXAMPLE_PRICE = 2500;
const sek = (amount: number) => `${Math.round(amount).toLocaleString("sv-SE")} SEK`;
// A new tab, so the host keeps their place here. The router doesn't scroll to
// #hashes; HostTerms scrolls to the section itself once it has rendered.
const hostTermsLink = (label: string, section?: string) => (
  <a
    href={section ? `${HOST_TERMS_PATH}#${section}` : HOST_TERMS_PATH}
    target="_blank"
    rel="noopener"
    className="underline text-primary"
  >
    {label}
  </a>
);

const BecomeHost = () => {
  const feeTerms = foundingHostOfferOpen()
    ? `(${FOUNDING_HOST_FEE_PCT}% if you join by ${FOUNDING_HOST_DEADLINE_SHORT})`
    : "on top";
  usePageMeta({
    title: "List your cabin in Sweden",
    description: `List your cabin or holiday home anywhere in Sweden. You set the price and keep all of it; guests pay a ${FEE_PCT}% service fee ${feeTerms}.`,
    path: "/become-host",
  });

  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
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
    // Keep a referral code from an invitation link (/become-host?ref=...)
    const ref = new URLSearchParams(window.location.search).get("ref");
    const target = ref ? `/host-application?ref=${encodeURIComponent(ref)}` : "/host-application";
    if (!user) {
      navigate(`/auth?redirect=${encodeURIComponent(target)}`);
    } else {
      navigate(target);
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
    
    try {
      // Save to database
      const { error: dbError } = await supabase.from("guest_messages").insert({
        name: supportForm.name,
        email: supportForm.email,
        message: supportForm.message,
        subject: "Become a Host - Support Request",
        created_at: new Date().toISOString(),
      });

      if (dbError) throw dbError;

      // Send email to support
      const { error: emailError } = await supabase.functions.invoke('send-support-email', {
        body: {
          name: supportForm.name,
          email: supportForm.email,
          subject: "Become a Host - Support Request",
          message: supportForm.message,
        },
      });

      if (emailError) {
        console.error("Email send error:", emailError);
        // Don't throw - message is saved in DB
      }

      toast({
        title: "Message sent!",
        description: "Our team will get back to you shortly.",
      });
      setSupportForm({ name: "", email: user?.email || "", message: "" });
      setShowSupport(false);
    } catch (error) {
      console.error("Support form error:", error);
      toast({
        title: "Error",
        description: "Something went wrong while sending your message.",
        variant: "destructive",
      });
    } finally {
      setSupportLoading(false);
    }
  };

  const benefits = [
    {
      icon: DollarSign,
      title: "You keep what you set",
      description:
        `Set your own price. We will add a ${FEE_PCT}% fee on top of your price to cover payments, marketing, platform development and support.`,
    },
    {
      icon: Shield,
      title: "Simple & secure",
      description:
        "Secure card payments through Stripe and full control over your calendar.",
    },
    {
      icon: Calendar,
      title: "Full flexibility",
      description:
        "Rent out on your schedule — a weekend, a month, or the whole summer. Sync your calendar with Airbnb and other platforms to avoid double bookings.",
    },
    {
      icon: TrendingUp,
      title: "Guidebooks included",
      description:
        "Stand out with built-in guidebooks that elevate your hosting experience and delight your guests.",
    },
  ];

  const faqs = [
    {
      question: "Where can my holiday home be?",
      answer: (
        <>
          Anywhere in Sweden – a lakeside stuga, a summer house on the coast, a mountain cabin or a flat in town. You
          publish and run your own listing, and guests find it on the home page and in search.
        </>
      ),
    },
    {
      question: "Do I need a company to host?",
      answer: (
        <>
          No. Hosts on Nordic Getaways rent out their own place as private individuals.
          In Sweden, private hosts can deduct <strong>40,000 SEK a year</strong> from their rental income, plus 20%
          of the rent if they own the house (for a tenant-owned flat, the share of the monthly fee instead). The
          40,000 SEK covers all your private rental income together, wherever you rent out.  
          Learn more at{" "}
          <a
            href="https://www.skatteverket.se/privat/skatter/bostad/uthyrningavprivatbostad"
            target="_blank"
            rel="noopener noreferrer"
            className="underline text-primary"
          >
            Skatteverket
          </a>.
        </>
      ),
    },
    {
      question: "How do payments work?",
      answer: (
        <>
          Guests pay by card through <strong>Stripe</strong> when they book. Your share goes straight to your own
          Stripe account, and we pay it out to your bank <strong>the day after check-in</strong>, or 85 days after
          the guest paid if that comes first. If a guest is refunded after that, the refund is taken from your next
          payout. Guests pay a{" "}
          {FEE_PCT}% service fee on top of your price
          {foundingHostOfferOpen() ? ` (${FOUNDING_HOST_FEE_PCT}% for founding hosts' first 12 months)` : ""}, so you
          receive your price in full. See {hostTermsLink("payouts in the host terms", "payouts")}.
        </>
      ),
    },
    {
      question: "Who do guests book with?",
      answer: (
        <>
          With you. You rent out your place as a private person, and guests deal directly with you about their
          stay. Nordic Getaways (Mojjo AB) shows your listing and takes the booking and payment in
          your name.
        </>
      ),
    },
    {
      question: "What do I agree to as a host?",
      answer: (
        <>
          Our {hostTermsLink("host terms")}: your responsibility for an accurate and safe listing, insurance and
          taxes, the guest service fee, when you are paid out, and what happens when a guest or you cancel.
          You accept them when you apply to become a host.
        </>
      ),
    },
    {
      question: "What about insurance?",
      answer: (
        <>
          To keep platform fees low, insurance is not included — this gives you full control.  
          Most Swedish home insurance plans already cover short-term rentals with an add-on.  
          We recommend confirming with your insurer and ensuring guests agree to your house rules.
        </>
      ),
    },
    {
      question: "How does check-in work?",
      answer: (
        <>
          You can manage check-ins yourself and coordinate with guests directly.  
          You have full control over how you share access details and instructions with your guests.
        </>
      ),
    },
    {
      question: "How do I manage my listing?",
      answer: (
        <>
          Once your property is created, you can easily update photos, prices, and availability 
          from your Host Dashboard.  
          All changes sync automatically across the platform — simple, transparent, and fast.
        </>
      ),
    },
    {
      question: "How much can I earn?",
      answer: (
        <>
          Your earnings depend on your home’s location, size, and season.  
          You set your own nightly price, and we make it easy to see both your payout 
          and what the guest pays, including the guest service fee.
        </>
      ),
    },
    {
      question: "What about cleaning and maintenance?",
      answer: (
        <>
          You decide! You can handle cleaning yourself or work with a trusted local partner,  
          and add a cleaning fee to your listing.  
          A clean and well-prepared home brings happier guests — and better reviews.
        </>
      ),
    },
    {
      question: "How do cancellations and refunds work?",
      answer: (
        <>
          You choose your cancellation policy: <strong>Flexible</strong>, <strong>Moderate</strong>,{" "}
          <strong>Standard</strong> (90% back more than 21 days before arrival, 50% 8–21 days before, nothing within 7
          days) or <strong>Strict</strong>. Guests see it before they book. Our team handles cancellations and refunds.
          The refund comes out of your payout for that booking; the service fee is not refunded to the guest and
          never reduces your share. If you have to cancel, the guest gets everything back, you get nothing for that
          booking and you pay the card fee. Details are in the {hostTermsLink("host terms", "guest-cancels")}.
        </>
      ),
    },
    {
      question: "What about taxes?",
      answer: (
        <>
          You’re responsible for declaring your rental income based on local tax rules.  
          In Sweden, most hosts can rent out part of their home tax-free up to a certain limit.  
          By law (the EU's DAC7 rules) we report hosts' rental income from Nordic Getaways to Skatteverket, and
          ask you for the details needed.  
          Always double-check with <a
            href="https://www.skatteverket.se"
            target="_blank"
            rel="noopener noreferrer"
            className="underline text-primary"
          >
            Skatteverket
          </a> for updated details.
        </>
      ),
    },
    {
      question: "Is a digital guidebook included?",
      answer: (
        <>
          Yes. Every listing gets a guest guide with sections for check-in, directions, Wi-Fi, house rules
          and local tips. You fill them in, with examples to start from, and general Swedish tips such as
          recycling and customs are included.
        </>
      ),
    },
    {
      question: "How are guests verified?",
      answer: (
        <>
          Guests pay by card through Stripe when they book and must accept your house rules first.  
          Bookings are confirmed instantly, so keep your calendar up to date and block any dates 
          you don’t want to rent out.
        </>
      ),
    },
    {
      question: "Can I block certain dates?",
      answer: (
        <>
          Yes, your calendar is fully under your control.  
          You can block any dates when you don’t want to rent out your home — perfect 
          for personal use or maintenance days.
        </>
      ),
    },
    {
      question: "What makes Nordic Getaways different?",
      answer: (
        <>
          We focus on <strong>authentic Nordic experiences</strong>, not mass tourism.  
          Our platform connects guests with real homes and local hosts who care about sustainability, 
          design, and hospitality.  
          We celebrate the people and places that make Sweden special.
        </>
      ),
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
              `url(${forestHeroBg})`,
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-background" />
        </div>

        <div className="relative z-10 container mx-auto px-4 text-center text-white">
          <h1 className="text-5xl md:text-6xl font-bold mb-6">Become a Host</h1>
          <p className="text-xl md:text-2xl mb-8 max-w-2xl mx-auto opacity-90">
            Share your home in Sweden and earn on your terms. You set the price; guests pay a {FEE_PCT}% service fee
            on top.
          </p>
          {foundingHostOfferOpen() && (
            <p className="mb-8 inline-block rounded-full bg-white/15 px-5 py-2 text-base md:text-lg backdrop-blur">
              Founding-host offer: join by {FOUNDING_HOST_DEADLINE} and we add only {FOUNDING_HOST_FEE_PCT}% for your
              first 12 months.
            </p>
          )}
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

        {/* Founding-host offer */}
        {foundingHostOfferOpen() && (
        <div className="mb-12 max-w-4xl mx-auto">
          <Card className="border-2 border-primary">
            <CardContent className="p-8 text-center space-y-4">
              <h2 className="text-2xl md:text-3xl font-bold">Founding-host offer: {FOUNDING_HOST_FEE_PCT}% for a year</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Join by {FOUNDING_HOST_DEADLINE} and guests pay only a {FOUNDING_HOST_FEE_PCT}% service fee on your
                listing for your first 12 months, instead of {FEE_PCT}%. With the same price as on other sites, your
                place can cost guests less here, and you still keep 100% of your price.
              </p>
              <p className="font-medium">
                Example: your price {sek(EXAMPLE_PRICE)}, the guest pays{" "}
                {sek(withServiceFee(EXAMPLE_PRICE, FOUNDING_HOST_FEE_PCT))} (instead of{" "}
                {sek(withServiceFee(EXAMPLE_PRICE))}). You receive {sek(EXAMPLE_PRICE)}.
              </p>
              <Button size="lg" onClick={handleHostRedirect}>
                Claim the offer
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </CardContent>
          </Card>
        </div>
        )}

        {/* Earnings Example */}
        <div className="mb-20 max-w-4xl mx-auto">
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-8">
              <h2 className="text-2xl md:text-3xl font-bold text-center mb-6">
                Transparent Earnings Example
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                <div>
                  <div className="text-4xl font-bold text-primary mb-2">{sek(EXAMPLE_PRICE)}</div>
                  <div className="text-muted-foreground">Your Price</div>
                </div>
                <div>
                  <div className="text-4xl font-bold text-primary mb-2">+{FEE_PCT}%</div>
                  <div className="text-muted-foreground">Guest service fee</div>
                </div>
                <div>
                  <div className="text-4xl font-bold text-primary mb-2">{sek(withServiceFee(EXAMPLE_PRICE))}</div>
                  <div className="text-muted-foreground">Guest Pays</div>
                </div>
              </div>
              <p className="text-center text-sm text-muted-foreground mt-6">
                The {FEE_PCT}% covers secure payments (card fees of up to about 5.5%, depending on the guest's country and currency), marketing, support and platform improvements.
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
                <AccordionTrigger className="text-lg font-medium flex items-center gap-2 text-left justify-start w-full">
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
          <p className="text-sm text-muted-foreground mt-6">
            When you apply, you accept our {hostTermsLink("host terms")}: fees, payouts and cancellations.
          </p>
        </div>

        <p className="text-xs text-muted-foreground text-center mt-6">
          Nordic Getaways is 100% transparent. You set the price — see what the guests pay, and you see what goes to marketing, support, payment handling, and platform improvement.
        </p>
      </div>
    </div>
  );
};

export default BecomeHost;
