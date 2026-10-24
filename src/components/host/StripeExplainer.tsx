import { useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";

// What Stripe is and how the host gets paid, next to the bank account button.
// The same facts as the host terms (payouts, cancellations) and the Stripe
// question on /become-host and /bli-vard: keep them saying the same.
const QUESTIONS: { q: string; a: string }[] = [
  {
    q: "Vad är Stripe?",
    a: "Nordic Getaways använder Stripe för alla betalningar. Stripe är ett av världens största betalföretag och ett reglerat betalinstitut i EU. Det är Stripe som tar emot gästens kortbetalning och betalar ut dina pengar till din bank.",
  },
  {
    q: "Varför behöver jag ett Stripe-konto?",
    a: "Så att dina pengar går direkt till dig, inte via oss. När en gäst bokar hamnar din del på ditt eget Stripe-konto. Nordic Getaways behåller bara serviceavgiften som gästen betalar ovanpå ditt pris.",
  },
  {
    q: "Hur skapar jag kontot?",
    a: "Tryck på ”Ställ in utbetalningar via Stripe”. Stripe frågar efter till exempel namn, adress, födelsedatum, mobilnummer och bankkonto, och ibland en bild på din legitimation. Det kräver lagen mot penningtvätt, och uppgifterna går till Stripe, inte till oss. Det tar ungefär fem minuter.",
  },
  {
    q: "När får jag pengarna?",
    a: "Gästen betalar vid bokningen. Vi betalar ut din del till din bank dagen efter incheckning, eller senast 85 dagar efter att gästen betalade om bokningen är gjord långt i förväg. Pengarna brukar komma in på ditt konto inom ett par bankdagar.",
  },
  {
    q: "Vad kostar det?",
    a: "Ingenting för dig. Kortavgiften ingår i gästens serviceavgift, så du får hela ditt pris. Det enda undantaget: om du själv avbokar en bokning betalar du kortavgiften för den.",
  },
  {
    q: "Vad händer om en gäst avbokar?",
    a: "Gästen får tillbaka det som din avbokningsregel ger. Om din del inte är utbetald än dras återbetalningen från den utbetalningen, annars från din nästa.",
  },
  {
    q: "Var ser jag mina pengar?",
    a: "I din värdpanel ser du varje bokning, vad du får och när det betalas ut. När kontot är kopplat öppnar ”Hantera utbetalningar hos Stripe” här Stripe, med alla dina utbetalningar.",
  },
];

export function StripeExplainer({ defaultOpen = false }: { defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Collapsible open={open} onOpenChange={setOpen} className="rounded-lg border">
      <CollapsibleTrigger asChild>
        <Button variant="ghost" className="w-full justify-between px-4">
          Så får du betalt – om Stripe
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
