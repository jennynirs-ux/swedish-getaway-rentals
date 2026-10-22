import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";
import { policyFor } from "../../supabase/functions/_shared/cancellation";

/** The listing's cancellation policy (one of four fixed policies its host chose), as the refunds follow it */
export const CancellationPolicyDisplay = ({ policyKey }: { policyKey?: string | null }) => {
  const policy = policyFor(policyKey);
  return (
    <Alert className="bg-muted/50 border-muted-foreground/20">
      <Info className="h-4 w-4" />
      <AlertDescription>
        <div className="space-y-3">
          <div className="font-semibold text-foreground">Cancellation policy: {policy.name}</div>
          <div className="space-y-2">
            {policy.tiers.map((tier) => (
              <div key={tier.label} className="flex justify-between items-center gap-3 text-sm">
                <span className="text-muted-foreground">{tier.label}:</span>
                <span className={`font-medium ${tier.refund_percentage > 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                  {tier.refund_percentage > 0 ? `${tier.refund_percentage}% refund` : "No refund"}
                </span>
              </div>
            ))}
          </div>
          {policy.footer_note && (
            <p className="text-xs text-muted-foreground pt-2 border-t border-muted-foreground/10">{policy.footer_note}</p>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
};
