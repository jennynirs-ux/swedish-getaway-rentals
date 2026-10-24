import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";
import { type Copy, useCopy, useLang } from "@/i18n";
import { policyFor, policyText, tierRefund } from "../../supabase/functions/_shared/cancellation";

const en = {
  title: (name: string) => `Cancellation policy: ${name}`,
};
const COPY: Copy<typeof en> = {
  en,
  sv: { title: (name) => `Avbokningsregler: ${name}` },
  de: { title: (name) => `Stornierungsbedingungen: ${name}` },
};

/** The listing's cancellation policy (one of four fixed policies its host chose), as the refunds follow it */
export const CancellationPolicyDisplay = ({ policyKey }: { policyKey?: string | null }) => {
  const t = useCopy(COPY);
  const lang = useLang();
  const policy = policyFor(policyKey);
  const text = policyText(policy.key, lang);
  return (
    <Alert className="bg-muted/50 border-muted-foreground/20">
      <Info className="h-4 w-4" />
      <AlertDescription>
        <div className="space-y-3">
          <div className="font-semibold text-foreground">{t.title(text.name)}</div>
          <div className="space-y-2">
            {policy.tiers.map((tier, i) => (
              <div key={tier.label} className="flex justify-between items-center gap-3 text-sm">
                <span className="text-muted-foreground">{text.tiers[i]}:</span>
                <span className={`font-medium ${tier.refund_percentage > 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                  {tierRefund(tier, lang)}
                </span>
              </div>
            ))}
          </div>
          {policy.footer_note && (
            <p className="text-xs text-muted-foreground pt-2 border-t border-muted-foreground/10">{text.footer}</p>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
};
