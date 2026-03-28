import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

// Public endpoint — no auth required (token-based access)
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { token, notes } = await req.json();
    if (!token) throw new Error("Completion token is required");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Find task by token
    const { data: task, error: findError } = await supabase
      .from("cleaning_tasks")
      .select("id, status, property_id, properties(title)")
      .eq("completion_token", token)
      .single();

    if (findError || !task) {
      throw new Error("Invalid or expired cleaning link");
    }

    if (task.status === "completed") {
      return new Response(
        JSON.stringify({
          success: true,
          message: "This task was already marked as complete",
          propertyTitle: task.properties?.title,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Mark as completed
    const { error: updateError } = await supabase
      .from("cleaning_tasks")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        notes: notes || null,
      })
      .eq("id", task.id);

    if (updateError) throw new Error(`Failed to update task: ${updateError.message}`);

    console.log(`Cleaning task ${task.id} completed for property ${task.properties?.title}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Cleaning marked as complete. Thank you!",
        propertyTitle: task.properties?.title,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("complete-cleaning error:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
