import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { alertAdminOnce } from "../_shared/alert.ts";

// Runs daily (cron job daily-health-check) and e-mails support@mojjo.se when
// something needs a person: failing calendar syncs, failing scheduled jobs,
// bookings stuck before payment. Checks live in the SQL function health_issues().
// Anyone may trigger it, but it only ever mails support, at most once a day.
serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  const { data: issues, error } = await supabase.rpc("health_issues");
  const problems: string[] = error ? [`Health check itself failed: ${error.message}`] : (issues ?? []);

  if (problems.length > 0) {
    const today = new Date().toISOString().slice(0, 10);
    await alertAdminOnce(supabase, `health:${today}`, `${problems.length} thing(s) need attention`, [
      ...problems,
      "This check runs every morning; you get at most one e-mail a day.",
    ]);
  }

  console.log("[DAILY-HEALTH-CHECK]", { problems });
  return new Response(JSON.stringify({ ok: problems.length === 0, problems: problems.length }), {
    headers: { "Content-Type": "application/json" },
  });
});
