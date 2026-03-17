import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ---------------------------------------------------------------------------
// Seam API helpers – https://docs.seam.co/latest/api/access_codes/create
// ---------------------------------------------------------------------------
const SEAM_API_BASE = "https://connect.getseam.com";

interface SeamAccessCode {
  access_code_id: string;
  code: string;
  type: "timebound" | "ongoing";
  starts_at: string;
  ends_at: string;
  status: string;
}

/**
 * Create a time-bound access code on a Seam-connected device.
 * The Seam API pushes the PIN to the physical lock automatically.
 */
async function createSeamAccessCode(
  seamApiKey: string,
  deviceId: string,
  startsAt: string,
  endsAt: string,
  name: string
): Promise<SeamAccessCode> {
  const res = await fetch(`${SEAM_API_BASE}/access_codes/create`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${seamApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      device_id: deviceId,
      name,
      starts_at: startsAt,
      ends_at: endsAt,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Seam API error ${res.status}: ${body}`);
  }

  const json = await res.json();
  return json.access_code as SeamAccessCode;
}

/**
 * Delete / revoke an access code on the physical lock via Seam.
 */
async function deleteSeamAccessCode(
  seamApiKey: string,
  accessCodeId: string
): Promise<void> {
  const res = await fetch(`${SEAM_API_BASE}/access_codes/delete`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${seamApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ access_code_id: accessCodeId }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error(`Seam delete error ${res.status}: ${body}`);
  }
}

// ---------------------------------------------------------------------------

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { bookingId, propertyId, checkInDate, checkOutDate } = await req.json();

    console.log("Generating access code for booking:", bookingId);

    // Decrypt credentials helper (matches SmartLockSetup encryption)
    const decryptCredentials = (encrypted: string): string => {
      // WARNING: Placeholder encoding – use Supabase Vault or AES-256-GCM in production
      try {
        return atob(encrypted);
      } catch (e) {
        console.error("Failed to decrypt credentials:", e);
        return "";
      }
    };

    // ── Get the lock for this property ────────────────────────────────
    const { data: lock, error: lockError } = await supabaseClient
      .from("yale_locks")
      .select("*")
      .eq("property_id", propertyId)
      .eq("is_active", true)
      .single();

    if (lockError || !lock) {
      console.error("No active lock found for property:", propertyId);
      return new Response(
        JSON.stringify({ error: "No smart lock configured for this property" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      );
    }

    // Seam API key: stored in env (platform-wide) or per-lock in api_credentials
    const seamApiKey =
      Deno.env.get("SEAM_API_KEY") ??
      (lock.api_credentials ? decryptCredentials(lock.api_credentials) : "");

    if (!seamApiKey) {
      throw new Error("No Seam API key configured. Set SEAM_API_KEY env var or provide key in lock setup.");
    }

    // ── Calculate time window ─────────────────────────────────────────
    const { data: property } = await supabaseClient
      .from("properties")
      .select("check_out_time")
      .eq("id", propertyId)
      .single();

    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);

    if (property?.check_out_time) {
      const [hours, minutes] = property.check_out_time.split(":");
      checkOut.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    }

    // Buffer after check-out so guest isn't locked out mid-departure
    checkOut.setHours(checkOut.getHours() + (lock.access_duration_hours || 1));

    // ── Create time-bound code via Seam API ───────────────────────────
    const seamCode = await createSeamAccessCode(
      seamApiKey,
      lock.lock_id, // This is the Seam device_id (host enters it in SmartLockSetup)
      checkIn.toISOString(),
      checkOut.toISOString(),
      `Booking ${bookingId}`
    );

    const accessCode = seamCode.code;
    console.log("Seam access code created:", seamCode.access_code_id, "PIN:", accessCode);

    // ── Log to our database ───────────────────────────────────────────
    const { error: logError } = await supabaseClient
      .from("lock_access_log")
      .insert({
        booking_id: bookingId,
        yale_lock_id: lock.id,
        access_code: accessCode,
        valid_from: checkIn.toISOString(),
        valid_to: checkOut.toISOString(),
        status: "active",
        seam_access_code_id: seamCode.access_code_id,
      })
      .select()
      .single();

    if (logError) {
      console.error("Error logging access code:", logError);
      // Non-fatal – the code was already created on the lock
    }

    // Update the booking with the access code
    const { error: updateError } = await supabaseClient
      .from("bookings")
      .update({
        access_code: accessCode,
        access_code_expires_at: checkOut.toISOString(),
      })
      .eq("id", bookingId);

    if (updateError) {
      console.error("Error updating booking with access code:", updateError);
    }

    // Update lock sync status
    await supabaseClient
      .from("yale_locks")
      .update({
        last_sync: new Date().toISOString(),
        sync_status: "synced",
      })
      .eq("id", lock.id);

    console.log("Access code generated successfully for booking:", bookingId);

    return new Response(
      JSON.stringify({
        success: true,
        accessCode,
        seamAccessCodeId: seamCode.access_code_id,
        validFrom: checkIn.toISOString(),
        validTo: checkOut.toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error("Error in generate-yale-code:", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    const isUserError =
      error instanceof Error &&
      (error.message?.includes("No smart lock") || error.message?.includes("No Seam API key"));
    const clientMessage = isUserError
      ? error.message
      : "Unable to generate access code. Please contact support.";

    return new Response(
      JSON.stringify({ error: clientMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
