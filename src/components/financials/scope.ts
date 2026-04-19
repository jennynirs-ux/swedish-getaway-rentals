// @ts-nocheck
import { supabase } from "@/integrations/supabase/client";

/**
 * Financial components are used in two contexts:
 *   - "admin": sees all active properties across all hosts
 *   - "host":  sees only the current user's properties
 *
 * This module resolves a FinancialScope into the concrete set of property IDs
 * the caller is allowed to see. Keeps the fetching logic in one place so the
 * duplicate host/admin components can be collapsed into one.
 */

export type FinancialScope = "admin" | "host";

export interface ScopedProperty {
  id: string;
  title: string;
}

export interface ResolvedScope {
  /** Property IDs the user can see. Empty array = user has no properties. */
  propertyIds: string[];
  /** Basic metadata for dropdowns and labels. */
  properties: ScopedProperty[];
  /** Whether the scope resolution failed (e.g. unauthenticated). */
  error?: string;
}

/**
 * Resolve a FinancialScope to concrete property metadata.
 *
 * For "host": looks up the current user's profile, then queries properties
 * where host_id matches. If no user / no profile / no properties, returns
 * an empty array (not an error — just means nothing to show).
 *
 * For "admin": queries all active properties. RLS still enforces actual access.
 */
export async function resolveScope(scope: FinancialScope): Promise<ResolvedScope> {
  if (scope === "host") {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      return { propertyIds: [], properties: [], error: "Not authenticated" };
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("user_id", userData.user.id)
      .single();

    if (!profile) {
      return { propertyIds: [], properties: [], error: "No profile" };
    }

    const { data } = await supabase
      .from("properties")
      .select("id, title")
      .eq("host_id", profile.id)
      .order("title");

    const properties = data || [];
    return {
      propertyIds: properties.map((p) => p.id),
      properties,
    };
  }

  // Admin: all active properties
  const { data } = await supabase
    .from("properties")
    .select("id, title")
    .eq("active", true)
    .order("title");

  const properties = data || [];
  return {
    propertyIds: properties.map((p) => p.id),
    properties,
  };
}
