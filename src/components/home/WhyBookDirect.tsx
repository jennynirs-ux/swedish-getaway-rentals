import { BadgeCheck, MessageCircle, Receipt, ShieldCheck } from "lucide-react";
import { PLATFORM_SERVICE_FEE_RATE } from "@/lib/constants";
import { useCancellationPolicy } from "@/hooks/useCancellationPolicy";
import { summarizeCancellation } from "@/lib/cancellationSummary";

const FEE_PCT = Math.round(PLATFORM_SERVICE_FEE_RATE * 100);

// The fee claim holds because set_host_commission_rate caps a host's rate at
// 10%; "Paid through Stripe" because hosts can't publish before their Stripe
// account is ready (prevent_self_publish). The cancellation numbers come from
// the same setting the refunds use.
const WhyBookDirect = () => {
  const { data: policy } = useCancellationPolicy();
  const { fullPct, fullDays, partPct, partDays } = summarizeCancellation(policy?.tiers);

  const points = [
    {
      icon: MessageCircle,
      title: "Talk to the host",
      text: "Questions before and during your stay go straight to the person who looks after the cabin, through the chat on your booking.",
    },
    {
      icon: Receipt,
      title: "Every cost up front",
      text: `Cleaning, extra guests and the service fee are shown before you pay. The service fee is ${FEE_PCT}% or less, and hosts pay no commission.`,
    },
    {
      icon: BadgeCheck,
      title: "Paid through Stripe",
      text: "You pay by card through Stripe. Hosts are paid out through Stripe too, which checks who they are and their bank details before a new host can publish.",
    },
    {
      icon: ShieldCheck,
      title: "Clear cancellation",
      text:
        `The same rules for every cabin: ${fullPct}% back if you cancel more than ${fullDays} days before arrival` +
        (partPct != null ? `, ${partPct}% up to ${partDays} days before.` : "."),
    },
  ];

  return (
    <section className="py-16">
      <div className="container mx-auto px-4 max-w-6xl">
        <h2 className="text-3xl font-bold text-foreground text-center mb-3">Book directly with the host</h2>
        <p className="text-muted-foreground text-center max-w-2xl mx-auto mb-10">
          Each cabin is run by its own host. Nordic Getaways handles the booking and the payment.
        </p>
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {points.map(({ icon: Icon, title, text }) => (
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
};

export default WhyBookDirect;
