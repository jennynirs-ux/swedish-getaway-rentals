import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InvitationRequest {
  refereeEmail: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { refereeEmail }: InvitationRequest = await req.json();

    if (!refereeEmail || !/^\S+@\S+\.\S+$/.test(refereeEmail)) {
      return new Response(JSON.stringify({ error: "Invalid email" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log("Processing invitation from user:", user.id, "to:", refereeEmail);

    // Get referrer profile
    const { data: referrerProfile, error: profileError } = await supabase
      .from("profiles")
      .select("id, full_name, email, is_host, host_approved")
      .eq("user_id", user.id)
      .single();

    if (profileError || !referrerProfile || !referrerProfile.is_host || !referrerProfile.host_approved) {
      return new Response(
        JSON.stringify({ error: "Only approved hosts can send invitations" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Generate unique referral code
    const referralCode = `HOST-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

    // Create referral record
    const { data: referral, error: referralError } = await supabase
      .from("host_referrals")
      .insert({
        referrer_id: referrerProfile.id,
        referee_email: refereeEmail,
        referral_code: referralCode,
      })
      .select()
      .single();

    if (referralError) {
      console.error("Error creating referral:", referralError);
      throw new Error("Failed to create referral");
    }

    console.log("Referral created:", referral.id);

    // Send invitation email
    const origin = req.headers.get("origin") || Deno.env.get("SITE_URL") || "http://localhost:5173";
    const invitationLink = `${origin}/become-host?ref=${referralCode}`;

    const { error: emailError } = await resend.emails.send({
      from: "Nordic Collection <onboarding@resend.dev>",
      to: [refereeEmail],
      subject: `${referrerProfile.full_name || "A host"} invited you to become a host!`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">You're Invited to Become a Host!</h1>
          <p>Hi there,</p>
          <p>${referrerProfile.full_name || "A fellow host"} has invited you to join our hosting community.</p>
          <p>As a host, you'll be able to:</p>
          <ul>
            <li>List your properties on our platform</li>
            <li>Connect with guests from around the world</li>
            <li>Earn income from your properties</li>
            <li>Get a special discount in the Nordic Collection shop</li>
          </ul>
          <p>Use your referral code: <strong>${referralCode}</strong></p>
          <p style="margin: 30px 0;">
            <a href="${invitationLink}" 
               style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Accept Invitation & Apply
            </a>
          </p>
          <p style="color: #666; font-size: 14px;">This invitation expires in 30 days.</p>
          <p>Best regards,<br>The Nordic Collection Team</p>
        </div>
      `,
    });

    if (emailError) {
      console.error("Resend email error:", emailError);
      return new Response(
        JSON.stringify({ error: "Failed to send invitation email" }),
        { status: 502, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        referralCode,
        message: "Invitation sent successfully"
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-host-invitation:", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    
    // Return safe error message to client
    const isUserError = error.message?.includes('Invalid') || error.message?.includes('Failed to create');
    const clientMessage = isUserError 
      ? error.message 
      : 'Unable to send invitation. Please try again or contact support.';
    
    return new Response(
      JSON.stringify({ error: clientMessage }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});