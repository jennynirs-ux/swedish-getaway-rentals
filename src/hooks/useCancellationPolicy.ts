import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PolicyTier {
  min_days: number;
  max_days?: number;
  refund_percentage: number;
  label: string;
}

export interface CancellationPolicyData {
  tiers: PolicyTier[];
  footer_note: string;
}

/**
 * platform_settings.cancellation_policy, the one policy every booking follows
 * (supabase/functions/_shared/cancellation.ts refunds by the same tiers).
 * Visitors who aren't signed in can read it too.
 */
export const useCancellationPolicy = () =>
  useQuery({
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
