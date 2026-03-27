import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

/**
 * AI Guest Auto-Reply
 * ---
 * Triggered when a guest sends a booking message.
 * Uses the property's guidebook data + booking details to generate
 * a helpful auto-response via Claude API (Anthropic).
 *
 * Env vars:
 *   ANTHROPIC_API_KEY — Claude API key
 *   AI_AUTO_REPLY_ENABLED — "true" to enable (default: false)
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("SITE_URL") || "",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { bookingId, messageId } = await req.json();

    if (!bookingId || !messageId) {
      return new Response(
        JSON.stringify({ error: "bookingId and messageId required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Check if AI auto-reply is enabled globally
    const aiEnabled = Deno.env.get("AI_AUTO_REPLY_ENABLED") === "true";
    if (!aiEnabled) {
      return new Response(
        JSON.stringify({ skipped: true, reason: "AI auto-reply disabled" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicKey) {
      console.error("ANTHROPIC_API_KEY not set");
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    // ── Fetch booking + property + guidebook ────────────────────────
    const { data: booking, error: bErr } = await supabase
      .from("bookings")
      .select(`
        id, guest_name, guest_email, check_in_date, check_out_date,
        number_of_guests, special_requests, status, access_code,
        properties (
          id, title, location, description, check_in_time, check_out_time,
          amenities, guidebook_sections, get_in_touch_info,
          check_in_instructions, parking_info, introduction_text
        )
      `)
      .eq("id", bookingId)
      .single();

    if (bErr || !booking) {
      console.error("Booking not found:", bErr);
      return new Response(
        JSON.stringify({ error: "Booking not found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      );
    }

    // Fetch the guest's message
    const { data: guestMessage } = await supabase
      .from("booking_messages")
      .select("message, sender_type")
      .eq("id", messageId)
      .single();

    if (!guestMessage || guestMessage.sender_type !== "guest") {
      return new Response(
        JSON.stringify({ skipped: true, reason: "Not a guest message" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch recent conversation history (last 10 messages)
    const { data: recentMessages } = await supabase
      .from("booking_messages")
      .select("message, sender_type, created_at")
      .eq("booking_id", bookingId)
      .order("created_at", { ascending: false })
      .limit(10);

    const conversationHistory = (recentMessages || [])
      .reverse()
      .map((m) => `${m.sender_type}: ${m.message}`)
      .join("\n");

    // Check if property has AI enabled (host can opt out)
    const property = (booking as any).properties;

    // ── Build context for Claude ────────────────────────────────────
    const guidebook = property?.guidebook_sections || [];
    const guidebookText = Array.isArray(guidebook)
      ? guidebook
          .map((s: any) => {
            const blocks = (s.blocks || [])
              .map((b: any) => {
                if (b.type === "text") return b.content;
                if (b.type === "list") return (b.items || []).join(", ");
                return "";
              })
              .filter(Boolean)
              .join("\n");
            return `## ${s.title}\n${blocks}`;
          })
          .join("\n\n")
      : "";

    const systemPrompt = `You are a friendly and helpful AI assistant for "${property?.title || "this property"}", a vacation rental in ${property?.location || "Sweden"}.

Your role: Answer guest questions accurately using ONLY the information provided below. If you don't know something, say so honestly and suggest the guest contact the host directly.

RULES:
- Be warm, concise, and professional
- Answer in the same language the guest writes in
- Never make up information not in the context below
- Never share other guests' information
- Keep responses under 150 words unless more detail is needed
- If the question is about an emergency, always suggest calling 112 (EU emergency) and contacting the host
- Sign off as "AI Assistant" so the guest knows this is automated

PROPERTY INFO:
- Name: ${property?.title}
- Location: ${property?.location}
- Description: ${property?.description || "N/A"}
- Check-in: ${property?.check_in_time || "15:00"}
- Check-out: ${property?.check_out_time || "11:00"}
- Check-in instructions: ${property?.check_in_instructions || "Contact host for details"}
- Parking: ${property?.parking_info || "Contact host for parking information"}
- Amenities: ${(property?.amenities || []).join(", ")}

BOOKING DETAILS:
- Guest: ${booking.guest_name}
- Check-in: ${booking.check_in_date}
- Check-out: ${booking.check_out_date}
- Guests: ${booking.number_of_guests}
- Status: ${booking.status}
${booking.access_code ? `- Door access code: ${booking.access_code}` : ""}
${booking.special_requests ? `- Special requests: ${booking.special_requests}` : ""}

GUIDEBOOK:
${guidebookText || "No guidebook available for this property."}

HOST CONTACT:
${property?.get_in_touch_info ? JSON.stringify(property.get_in_touch_info) : "Contact via this chat"}`;

    // ── Call Claude API ──────────────────────────────────────────────
    const claudeResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 500,
        system: systemPrompt,
        messages: [
          ...(conversationHistory
            ? [{ role: "user" as const, content: `Previous conversation:\n${conversationHistory}` }]
            : []),
          { role: "user" as const, content: guestMessage.message },
        ],
      }),
    });

    if (!claudeResponse.ok) {
      const errBody = await claudeResponse.text();
      console.error("Claude API error:", claudeResponse.status, errBody);
      throw new Error(`Claude API error: ${claudeResponse.status}`);
    }

    const claudeData = await claudeResponse.json();
    const aiReply =
      claudeData.content?.[0]?.text || "I'm sorry, I couldn't generate a response.";

    // ── Insert AI reply as system message ────────────────────────────
    const { data: aiMessage, error: insertErr } = await supabase
      .from("booking_messages")
      .insert({
        booking_id: bookingId,
        sender_type: "system",
        message: aiReply,
        message_type: "text",
        read_by_guest: false,
        read_by_host: true, // Host doesn't need to read AI replies
      })
      .select()
      .single();

    if (insertErr) {
      console.error("Error inserting AI reply:", insertErr);
      throw insertErr;
    }

    console.log("AI reply sent for booking:", bookingId);

    return new Response(
      JSON.stringify({ success: true, messageId: aiMessage?.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in ai-guest-reply:", error);
    return new Response(
      JSON.stringify({ error: "Failed to generate AI reply" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
