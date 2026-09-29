import { Resend } from "npm:resend@4.0.0";
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { escapeHtml } from "./auth.ts";

export const SUPPORT_EMAIL = "support@mojjo.se";
const FROM = `Nordic Getaways <${SUPPORT_EMAIL}>`;

/** Sends one e-mail; returns false (and logs) instead of throwing */
export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const key = Deno.env.get("RESEND_API_KEY");
  if (!key) {
    console.error("RESEND_API_KEY not configured; could not send:", subject);
    return false;
  }
  // Resend reports failures in the result instead of throwing
  const { error } = await new Resend(key).emails.send({ from: FROM, to: [to], replyTo: SUPPORT_EMAIL, subject, html });
  if (error) {
    console.error("Resend error:", subject, error.message);
    return false;
  }
  return true;
}

/** Tells support@mojjo.se that something needs a person */
export function alertAdmin(subject: string, lines: string[]): Promise<boolean> {
  const body = lines.map((line) => `<p>${escapeHtml(line)}</p>`).join("");
  return sendEmail(SUPPORT_EMAIL, `[Nordic Getaways] ${subject}`, body);
}

/**
 * alertAdmin once per key (e.g. a Stripe session): Stripe retries a failing
 * webhook for days, and the guest's redirect runs the same code.
 */
export async function alertAdminOnce(
  supabase: SupabaseClient,
  key: string,
  subject: string,
  lines: string[],
): Promise<void> {
  const { count } = await supabase
    .from("security_audit_log")
    .select("id", { count: "exact", head: true })
    .eq("action", "admin_alert")
    .eq("user_agent", key);
  if (count) return;
  await supabase.from("security_audit_log").insert({ action: "admin_alert", table_name: "alerts", user_agent: key });
  await alertAdmin(subject, lines);
}
