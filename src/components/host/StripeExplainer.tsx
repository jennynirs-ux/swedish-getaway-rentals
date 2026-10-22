import { useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";

// What Stripe is and how the host gets paid, next to the bank account button.
// The same facts as the host terms (payouts, cancellations) and the Stripe
// question on /become-host and /bli-vard: keep them saying the same.
const QUESTIONS: { q: string; a: string }[] = [
  {
    q: "What is Stripe?",
    a: "Nordic Getaways uses Stripe for all payments. Stripe is one of the world's largest payment companies and a regulated payment institution in the EU. Stripe takes the guest's card payment and pays your money out to your bank.",
  },
  {
    q: "Why do I need a Stripe account?",
    a: "So your money goes straight to you, not through us. When a guest books, your share lands in your own Stripe account. Nordic Getaways keeps only the service fee the guest pays on top of your price.",
  },
  {
    q: "How do I create it?",
    a: "Press \"Connect bank account\". Stripe asks for, for example, your name, address, date of birth, mobile number and bank account, and sometimes a photo of your ID. Anti-money-laundering law requires this, and the details go to Stripe, not to us. It takes about five minutes.",
  },
  {
    q: "When do I get the money?",
    a: "The guest pays when booking. We pay your share out to your bank the day after check-in; for bookings made far ahead, at the latest 85 days after the guest paid. It usually reaches your account within a couple of banking days.",
  },
  {
    q: "What does it cost?",
    a: "Nothing for you. The card fee is included in the guest's service fee, so you get your full price. The only exception: if you cancel a booking yourself, you pay that booking's card fee.",
  },
  {
    q: "What if a guest cancels?",
    a: "The guest gets back what your cancellation policy gives. If your share hasn't been paid out yet, the refund comes out of that payout; if it has, out of your next one.",
  },
  {
    q: "Where do I see my money?",
    a: "Your dashboard shows every booking, what you get and when it is paid out. Once your account is connected, \"Manage payout settings in Stripe\" here opens Stripe, with all your payouts.",
  },
];

export function StripeExplainer({ defaultOpen = false }: { defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Collapsible open={open} onOpenChange={setOpen} className="rounded-lg border">
      <CollapsibleTrigger asChild>
        <Button variant="ghost" className="w-full justify-between px-4">
          How you get paid – about Stripe
          <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-3 px-4 pb-4">
        {QUESTIONS.map(({ q, a }) => (
          <div key={q}>
            <p className="text-sm font-medium">{q}</p>
            <p className="text-sm text-muted-foreground">{a}</p>
          </div>
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}
