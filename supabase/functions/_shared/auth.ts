import type { SupabaseClient, User } from "https://esm.sh/@supabase/supabase-js@2.57.2";

// verify_jwt lets the public anon key through too, so "the request carries a
// JWT" never means "someone is signed in". These helpers check who called.

function bearerToken(req: Request): string | null {
  const header = req.headers.get("Authorization") ?? "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : null;
}

/** Another edge function or a cron job calling with the service role key */
export function isServiceRoleRequest(req: Request): boolean {
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  return !!serviceKey && bearerToken(req) === serviceKey;
}

/** The signed-in user behind the request, or null for anon/invalid tokens */
export async function getCallerUser(req: Request, supabase: SupabaseClient): Promise<User | null> {
  const token = bearerToken(req);
  if (!token || isServiceRoleRequest(req)) return null;
  const { data } = await supabase.auth.getUser(token);
  return data.user ?? null;
}

export async function isAdmin(supabase: SupabaseClient, userId: string): Promise<boolean> {
  const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  return data === true;
}

/** Service role, or a signed-in admin */
export async function isAdminOrService(req: Request, supabase: SupabaseClient): Promise<boolean> {
  if (isServiceRoleRequest(req)) return true;
  const user = await getCallerUser(req, supabase);
  return !!user && (await isAdmin(supabase, user.id));
}

export const escapeHtml = (value: unknown) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
