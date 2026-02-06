import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface PolicyTier {
  min_days: number;
  max_days?: number;
  refund_percentage: number;
  label: string;
}

interface CancellationPolicyData {
  tiers: PolicyTier[];
  footer_note: string;
}

export const CancellationPolicyDisplay = () => {
  const { data: policy, isLoading } = useQuery({
    queryKey: ["cancellation-policy"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_settings")
        .select("setting_value")
        .eq("setting_key", "cancellation_policy")
        .single();
      
      if (error) throw error;
      return data?.setting_value as unknown as CancellationPolicyData;
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  if (isLoading) {
    return (
      <Alert>
        <Loader2 className="h-4 w-4 animate-spin" />
        <AlertDescription>Loading cancellation policy...</AlertDescription>
      </Alert>
    );
  }

  if (!policy) {
    return null;
  }

  return (
    <Alert className="bg-muted/50 border-muted-foreground/20">
      <Info className="h-4 w-4" />
      <AlertDescription>
        <div className="space-y-3">
          <div className="font-semibold text-foreground">Cancellation Policy – Nordic Getaway</div>
          <div className="space-y-2">
            {policy.tiers.map((tier, index) => (
              <div key={index} className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">{tier.label}:</span>
                <span className={`font-medium ${tier.refund_percentage > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {tier.refund_percentage > 0 ? `${tier.refund_percentage}% refund` : 'No refund'}
                </span>
              </div>
            ))}
          </div>
          {policy.footer_note && (
            <p className="text-xs text-muted-foreground pt-2 border-t border-muted-foreground/10">
              {policy.footer_note}
            </p>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
};
