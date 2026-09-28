import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

/**
 * Guest-only property data (exact address, check-in instructions, parking).
 * Lives in `property_private_details`, readable only by the property's host,
 * admins and the service role — never select these from `properties`.
 */
export type PropertyPrivateDetails =
  Database["public"]["Tables"]["property_private_details"]["Row"];

export type PropertyPrivateDetailsUpdate = Partial<
  Pick<PropertyPrivateDetails, "street" | "postal_code" | "check_in_instructions" | "parking_info">
>;

export const fetchPropertyPrivateDetails = async (
  propertyId: string
): Promise<PropertyPrivateDetails | null> => {
  const { data, error } = await supabase
    .from("property_private_details")
    .select("*")
    .eq("property_id", propertyId)
    .maybeSingle();

  if (error) throw error;
  return data;
};

export const savePropertyPrivateDetails = async (
  propertyId: string,
  updates: PropertyPrivateDetailsUpdate
): Promise<void> => {
  const { error } = await supabase
    .from("property_private_details")
    .upsert({ property_id: propertyId, ...updates }, { onConflict: "property_id" });

  if (error) throw error;
};
