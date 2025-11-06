import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "npm:resend@2.0.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Validate input data format
const referralSchema = z.object({
  referralCode: z.string().regex(/^HOST-[A-Z0-9]{8}$/, "Invalid referral code format"),
  newHostProfileId: z.string().uuid("Invalid profile ID format"),
});

interface CompleteReferralRequest {
  referralCode: string;
  newHostProfileId: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 🔒 SECURITY: Authenticate the user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Authentication required" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Initialize Supabase with ANON key for authentication
    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: { headers: { Authorization: authHeader } }
      }
    );

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Parse and validate input
    const requestData: CompleteReferralRequest = await req.json();
    
    // Validate input format
    try {
      referralSchema.parse(requestData);
    } catch (validationError) {
      return new Response(JSON.stringify({ 
        error: "Invalid input format", 
        details: validationError instanceof z.ZodError ? validationError.errors : undefined 
      }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { referralCode, newHostProfileId } = requestData;

    console.log("Completing referral:", referralCode, "for new host:", newHostProfileId, "by user:", user.id);

    // 🔒 SECURITY: Verify user owns the newHostProfileId
    const { data: profileCheck } = await supabaseAuth
      .from("profiles")
      .select("user_id")
      .eq("id", newHostProfileId)
      .single();

    if (!profileCheck || profileCheck.user_id !== user.id) {
      return new Response(JSON.stringify({ error: "You can only complete referrals for your own profile" }), {
        status: 403,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Use service role ONLY for operations that require bypassing RLS
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // Get the referral
    const { data: referral, error: referralError } = await supabase
      .from("host_referrals")
      .select("*, referrer:referrer_id(id, user_id, email, full_name)")
      .eq("referral_code", referralCode)
      .eq("status", "pending")
      .single();

    if (referralError || !referral) {
      console.error("Referral not found or already completed:", referralError);
      throw new Error("Invalid or expired referral code");
    }

    // Create discount coupon for referrer (20% off in Nordic Collection)
    const couponCode = `REFERRAL-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
    const { data: coupon, error: couponError } = await supabase
      .from("coupons")
      .insert({
        code: couponCode,
        name: "Host Referral Reward",
        description: "20% discount in Nordic Collection for referring a new host",
        discount_type: "percentage",
        discount_value: 20,
        valid_from: new Date().toISOString(),
        valid_until: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year
        usage_limit: 1,
        created_by: referral.referrer.user_id,
        is_active: true,
      })
      .select()
      .single();

    if (couponError) {
      console.error("Error creating coupon:", couponError);
      throw new Error("Failed to create reward coupon");
    }

    console.log("Reward coupon created:", coupon.id);

    // Update referral as completed
    const { error: updateError } = await supabase
      .from("host_referrals")
      .update({
        status: "completed",
        referee_user_id: newHostProfileId,
        referrer_reward_coupon_id: coupon.id,
        completed_at: new Date().toISOString(),
      })
      .eq("id", referral.id);

    if (updateError) {
      console.error("Error updating referral:", updateError);
      throw new Error("Failed to update referral");
    }

    // Send email to referrer with discount code
    const { error: emailError } = await resend.emails.send({
      from: "Nordic Collection <onboarding@resend.dev>",
      to: [referral.referrer.email],
      subject: "Your Referral Reward is Here! 🎉",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">Congratulations! 🎉</h1>
          <p>Hi ${referral.referrer.full_name || "there"},</p>
          <p>Great news! The host you invited has joined our community and been approved.</p>
          <p>As a thank you for growing our hosting community, here's your reward:</p>
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h2 style="margin: 0 0 10px 0; color: #2563eb;">20% OFF Nordic Collection</h2>
            <p style="margin: 0; font-size: 14px;">Your discount code:</p>
            <p style="margin: 10px 0 0 0; font-size: 24px; font-weight: bold; color: #1f2937;">${couponCode}</p>
          </div>
          <p>Use this code at checkout in the Nordic Collection shop. Valid for 1 year!</p>
          <p style="margin: 30px 0;">
            <a href="${Deno.env.get("SITE_URL") || "http://localhost:5173"}/shop" 
               style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Shop Now
            </a>
          </p>
          <p>Thank you for helping us grow!</p>
          <p>Best regards,<br>The Nordic Collection Team</p>
        </div>
      `,
    });

    if (emailError) {
      console.error("Resend email error:", emailError);
      return new Response(JSON.stringify({ error: "Failed to send reward email" }), {
        status: 502,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        couponCode,
        message: "Referral completed and reward sent"
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in complete-host-referral:", error);
    
    // Return safe error messages to client
    const clientMessage = error.message?.includes('Invalid') || error.message?.includes('expired')
      ? error.message 
      : 'An error occurred processing your request. Please try again.';
    
    return new Response(
      JSON.stringify({ error: clientMessage }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
