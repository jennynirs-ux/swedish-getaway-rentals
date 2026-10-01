import { MessageCircle, Receipt, ShieldCheck } from "lucide-react";

// Keep in line with the booking rules (src/lib/stayRules.ts and
// supabase/functions/_shared/cancellation.ts)
const POINTS = [
  {
    icon: MessageCircle,
    title: "Talk to the host",
    text: "Questions before and during your stay go straight to the people who look after the cabin.",
  },
  {
    icon: Receipt,
    title: "Every fee up front",
    text: "Cleaning and the service fee are shown before you pay. Payment is by card through Stripe.",
  },
  {
    icon: ShieldCheck,
    title: "Clear cancellation",
    text: "90% back if you cancel more than 21 days before arrival, 50% up to 8 days before.",
  },
];

const WhyBookDirect = () => (
  <section className="py-16">
    <div className="container mx-auto px-4 max-w-6xl">
      <h2 className="text-3xl font-bold text-foreground text-center mb-10">Why book direct?</h2>
      <div className="grid gap-8 md:grid-cols-3">
        {POINTS.map(({ icon: Icon, title, text }) => (
          <div key={title} className="text-center">
            <span className="inline-flex p-3 rounded-full bg-primary/10 mb-4">
              <Icon className="h-6 w-6 text-primary" aria-hidden="true" />
            </span>
            <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
            <p className="text-muted-foreground">{text}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default WhyBookDirect;
