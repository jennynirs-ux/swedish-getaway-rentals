import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Resend } from "npm:resend@4.0.0";
import { escapeHtml } from "../_shared/auth.ts";
import { hhmm, longDate } from "../_shared/format.ts";
import { policyFor, policySummary } from "../_shared/cancellation.ts";
import { houseRuleLines } from "../_shared/stay-rules.ts";
import { alertAdminOnce } from "../_shared/alert.ts";
import { dayAfterCheckIn, hostShareAmount, MAX_HOLD_DAYS, payoutDueOn } from "../_shared/payout.ts";

// bookings.total_amount is stored in öre
const formatAmount = (ore: number) => (ore / 100).toLocaleString("sv-SE");

// The company that takes bookings and payments on the hosts' behalf
// (src/content/company.ts). Guests must see that the host provides the stay:
// Mojjo AB is the intermediary, which decides how VAT applies.
const COMPANY_NAME = "Mojjo AB";

// A name fit to show in an e-mail: profiles.full_name defaults to the e-mail address
const shownName = (...names: (string | null | undefined)[]) =>
  names.map((n) => n?.trim()).find((n) => n && !n.includes("@")) ?? null;

// booking_email_tracking.email_type of each e-mail this function sends; a
// recorded one is never sent again, so a retry only sends what failed
const GUEST_EMAIL_TYPE = "booking_confirmation";
const HOST_EMAIL_TYPE = "host_new_booking";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestData = await req.json();
    const { bookingId } = requestData;
    
    if (!bookingId) {
      return new Response(JSON.stringify({ error: 'Booking ID is required' }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }
    
    console.log('Processing booking notification for booking:', bookingId);
    
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Fetch booking data from database
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select(`
        id,
        property_id,
        guest_name,
        guest_email,
        guest_phone,
        number_of_guests,
        extras,
        cancellation_policy,
        check_in_date,
        check_out_date,
        total_amount,
        host_amount,
        service_fee,
        host_payout_status,
        host_payout_due_on,
        created_at,
        currency,
        properties (
          id,
          slug,
          title,
          city,
          country,
          check_in_time,
          check_out_time,
          min_nights,
          holiday_min_nights,
          pets_allowed,
          smoking_allowed,
          events_allowed,
          min_guest_age,
          guidebook_sections,
          email_templates,
          host_id,
          property_private_details (
            street,
            postal_code
          ),
          profiles (
            email,
            full_name,
            display_name,
            host_business_name
          )
        )
      `)
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      console.error('Booking not found:', bookingId, bookingError);
      return new Response(JSON.stringify({ error: 'Booking not found' }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 404,
      });
    }

    // Exact address is guest-only and lives in property_private_details
    // (service role can read it); flatten it onto the property object.
    const rawProperty = booking.properties as any;
    const rawPrivate = rawProperty?.property_private_details;
    const privateDetails = (Array.isArray(rawPrivate) ? rawPrivate[0] : rawPrivate) ?? {};
    const property = rawProperty
      ? { ...rawProperty, street: privateDetails.street ?? null, postal_code: privateDetails.postal_code ?? null }
      : rawProperty;
    const hostProfile = property?.profiles as any;
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!booking.guest_email || !emailRegex.test(booking.guest_email)) {
      console.error('Invalid guest email format:', booking.guest_email);
      return new Response(JSON.stringify({ error: 'Invalid email format' }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error('Missing RESEND_API_KEY');
      return new Response(JSON.stringify({ error: 'Email service not configured' }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }
    
    const resend = new Resend(resendApiKey);
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const baseUrl = Deno.env.get("SITE_URL") || "https://nordic-getaways.com";
    const guidebookUrl = `${baseUrl}/property/${property.slug || property.id}/guide`;
    const hostDashboardUrl = `${baseUrl}/host-dashboard?tab=bookings`;

    // E-mails already sent for this booking (a retry must not send them twice)
    const { data: sentRows } = await supabase
      .from('booking_email_tracking')
      .select('email_type')
      .eq('booking_id', bookingId)
      .in('email_type', [GUEST_EMAIL_TYPE, HOST_EMAIL_TYPE]);
    const alreadySent = new Set((sentRows ?? []).map((r: { email_type: string }) => r.email_type));

    // Everything below that comes from guests or hosts is escaped before it
    // goes into HTML: a name like "<b>" must not change the e-mail
    const titleHtml = escapeHtml(property.title);
    const guestNameHtml = escapeHtml(booking.guest_name);
    const currencyHtml = escapeHtml(booking.currency);

    // Who provides the stay: the host's business, else their name
    const hostName = shownName(hostProfile?.host_business_name, hostProfile?.display_name, hostProfile?.full_name);
    const providerText = hostName
      ? `Your stay at ${property.title} is provided by ${hostName}, the cabin's host. ${COMPANY_NAME} (Nordic Getaways) takes the booking and payment on the host's behalf.`
      : `Your stay at ${property.title} is provided by the cabin's host. ${COMPANY_NAME} (Nordic Getaways) takes the booking and payment on the host's behalf.`;
    const providerHtml = escapeHtml(providerText);
    
    // Format property address
    const propertyAddress = [
      property?.street,
      property?.postal_code,
      // stored lower-case ("lerum")
      property?.city ? property.city.charAt(0).toUpperCase() + property.city.slice(1) : null,
      property?.country
    ].filter(Boolean).join(", ");

    // Extract house rules from guidebook sections
    const guidebookSections = property.guidebook_sections || [];
    const rulesSection = guidebookSections.find((s: any) => s.id === 'rules');
    // The host's house rules for the listing, then any the guide adds
    const houseRules = [
      ...houseRuleLines(property),
      ...(rulesSection?.blocks?.filter((b: any) => b.type === 'list').flatMap((b: any) => b.items || []) || []),
    ];

    // The policy the guest booked on (the host's choice, saved on the
    // booking). The guest's written copy of it, so it says what the
    // percentage applies to: the price of the stay, never the service fee
    const policy = policyFor(booking.cancellation_policy);
    const stayPrice = hostShareAmount(booking);
    const serviceFee = booking.service_fee ?? Math.max(0, booking.total_amount - stayPrice);
    const cancellationPolicy = {
      title: `Cancellation policy (${policy.name})`,
      description:
        `${policySummary(policy)}. ` +
        `The percentage applies to the price of the stay (${formatAmount(stayPrice)} ${booking.currency}); ` +
        `the service fee${serviceFee > 0 ? ` (${formatAmount(serviceFee)} ${booking.currency})` : ""} is not refunded when you cancel. ` +
        "If the host or we cancel, you get everything back, service fee included. To cancel, reply to this e-mail.",
    };

    // Extras the guest added when booking ("Jacuzzi, one day (400 SEK)")
    const extrasText = (Array.isArray(booking.extras) ? booking.extras : [])
      .map((e: { name?: string; amount?: number }) => `${e.name ?? "Extra"} (${formatAmount(e.amount ?? 0)} ${booking.currency})`)
      .join(", ");

    // Format check-in and check-out times
    const checkInDateTime = `${longDate(booking.check_in_date)}, from ${hhmm(property.check_in_time, '15:00')}`;
    const checkOutDateTime = `${longDate(booking.check_out_date)}, by ${hhmm(property.check_out_time, '11:00')}`;

    // Create email open tracking pixel
    const trackingId = `${bookingId}-${Date.now()}`;
    const trackingPixel = `${supabaseUrl}/functions/v1/track-email-open?id=${trackingId}`;

    // Check if property has custom email template
    const templates = property.email_templates || {};
    const bookingTemplate = templates.booking_confirmation;

    let guestEmailHtml = "";
    let guestEmailSubject = "";

    if (bookingTemplate && bookingTemplate.enabled) {
      // Use custom template with placeholders. The subject is plain text; the
      // message is HTML, so the host's text and every value are escaped there.
      const replacements: Record<string, string> = {
        "{guest_name}": booking.guest_name,
        "{property_name}": property.title,
        "{check_in_date}": longDate(booking.check_in_date),
        "{check_out_date}": longDate(booking.check_out_date),
        "{check_in_time}": hhmm(property.check_in_time, "15:00"),
        "{check_out_time}": hhmm(property.check_out_time, "11:00"),
        "{number_of_guests}": booking.number_of_guests.toString(),
        "{total_amount}": formatAmount(booking.total_amount),
        "{currency}": booking.currency,
      };

      guestEmailSubject = String(bookingTemplate.subject ?? "");
      // Placeholders hold no HTML characters, so they survive the escaping
      let message = escapeHtml(bookingTemplate.message ?? "");

      Object.entries(replacements).forEach(([placeholder, value]) => {
        const escapedPlaceholder = placeholder.replace(/[{}]/g, '\\$&');
        // A function, so "$&" in a guest's name is not read as a pattern
        guestEmailSubject = guestEmailSubject.replace(new RegExp(escapedPlaceholder, "g"), () => value);
        message = message.replace(new RegExp(escapedPlaceholder, "g"), () => escapeHtml(value));
      });

      guestEmailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5; }
            .container { background: white; padding: 30px; border-radius: 8px; }
            p { margin: 15px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            ${message.split('\n').map((line: string) => `<p>${line}</p>`).join('')}
            <!-- The facts every confirmation needs, whatever the host's template says -->
            <div style="margin-top: 24px; padding: 16px 20px; background: #f8f9fa; border-radius: 8px;">
              <p>${providerHtml}</p>
              <p><strong>Check-in:</strong> ${checkInDateTime}</p>
              <p><strong>Check-out:</strong> ${checkOutDateTime}</p>
              ${propertyAddress ? `<p><strong>Address:</strong> ${escapeHtml(propertyAddress)}</p>` : ''}
              <p><strong>Guests:</strong> ${booking.number_of_guests}</p>
              ${extrasText ? `<p><strong>Extras:</strong> ${escapeHtml(extrasText)}</p>` : ''}
              <p><strong>Booking reference:</strong> ${booking.id.slice(0, 8).toUpperCase()}</p>
              <p><strong>${cancellationPolicy.title}:</strong> ${escapeHtml(cancellationPolicy.description)}</p>
              <p><a href="${guidebookUrl}">Open the guest guide</a> – house rules, practical details and local tips.</p>
              <p>Questions? Reply to this e-mail or write to support@mojjo.se.</p>
            </div>
          </div>
          <img src="${trackingPixel}" width="1" height="1" alt="" style="display:none;" />
        </body>
        </html>
      `;
    } else {
      // Use default template
      guestEmailSubject = `Booking Confirmed - ${property.title}`;
      guestEmailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Booking Confirmation - Nordic Getaways</title>
          <style>
            body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
            .header { background: linear-gradient(135deg, #2D5F5D 0%, #1a3635 100%); color: white; padding: 40px 30px; text-align: center; }
            .header h1 { margin: 0; font-size: 28px; font-weight: 600; }
            .content { padding: 40px 30px; }
            .section { margin-bottom: 30px; }
            .section-title { font-size: 20px; font-weight: 600; color: #2D5F5D; margin-bottom: 15px; border-bottom: 2px solid #2D5F5D; padding-bottom: 8px; }
            .info-box { background: #f8f9fa; border-left: 4px solid #2D5F5D; padding: 20px; margin: 15px 0; border-radius: 4px; }
            .info-row { display: flex; justify-content: space-between; margin: 10px 0; padding: 8px 0; border-bottom: 1px solid #e9ecef; }
            .info-label { font-weight: 600; color: #495057; }
            .info-value { color: #212529; }
            .rules-list { list-style: none; padding: 0; margin: 15px 0; }
            .rules-list li { padding: 12px; background: #f8f9fa; margin: 8px 0; border-radius: 4px; border-left: 3px solid #2D5F5D; }
            .cta-button { display: inline-block; background: linear-gradient(135deg, #2D5F5D 0%, #1a3635 100%); color: white !important; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 600; font-size: 16px; margin: 20px 0; }
            .cta-button:hover { background: linear-gradient(135deg, #1a3635 0%, #0f2221 100%); }
            .footer { background: #f8f9fa; padding: 30px; text-align: center; color: #6c757d; font-size: 14px; border-top: 1px solid #dee2e6; }
            @media only screen and (max-width: 600px) {
              .content { padding: 20px 15px; }
              .header { padding: 30px 20px; }
              .header h1 { font-size: 24px; }
              .info-row { flex-direction: column; }
              .info-label, .info-value { margin: 5px 0; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Booking Confirmed!</h1>
              <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Thank you for choosing Nordic Getaways</p>
            </div>
            
            <div class="content">
              <p style="font-size: 16px; line-height: 1.6;">Hi ${guestNameHtml},</p>
              <p style="font-size: 16px; line-height: 1.6;">Your booking for <strong>${titleHtml}</strong> has been confirmed!</p>
              <p style="font-size: 16px; line-height: 1.6;">${providerHtml}</p>
              
              <div class="section">
                <div class="section-title">Check-In & Check-Out</div>
                <div class="info-box">
                  <div class="info-row">
                    <span class="info-label">Check-In:</span>
                    <span class="info-value">${checkInDateTime}</span>
                  </div>
                  <div class="info-row">
                    <span class="info-label">Check-Out:</span>
                    <span class="info-value">${checkOutDateTime}</span>
                  </div>
                  <div class="info-row">
                    <span class="info-label">Guests:</span>
                    <span class="info-value">${booking.number_of_guests}</span>
                  </div>
                  ${extrasText ? `<div class="info-row">
                    <span class="info-label">Extras:</span>
                    <span class="info-value">${escapeHtml(extrasText)}</span>
                  </div>` : ''}
                </div>
              </div>

              <div class="section">
                <div class="section-title">Property Location</div>
                <p style="font-size: 16px; line-height: 1.6; color: #495057;">${escapeHtml(propertyAddress || property.title)}</p>
              </div>

              ${houseRules.length > 0 ? `
              <div class="section">
                <div class="section-title">House Rules</div>
                <ul class="rules-list">
                  ${houseRules.map((rule: string) => `<li>${escapeHtml(rule)}</li>`).join('')}
                </ul>
              </div>
              ` : ''}

              <div class="section">
                <div class="section-title">Cancellation Policy</div>
                <div class="info-box">
                  <strong style="color: #2D5F5D;">${cancellationPolicy.title}</strong>
                  <p style="margin: 10px 0 0 0; line-height: 1.6; color: #495057;">${escapeHtml(cancellationPolicy.description)}</p>
                </div>
              </div>

              <div style="text-align: center; margin: 40px 0;">
                <a href="${guidebookUrl}" class="cta-button">View Your Complete Guest Guide</a>
                <p style="margin: 15px 0; color: #6c757d; font-size: 14px;">Access directions, amenities, local recommendations, and more</p>
              </div>

              <div class="section">
                <div class="section-title">Booking Summary</div>
                <div class="info-box">
                  <div class="info-row">
                    <span class="info-label">Booking ID:</span>
                    <span class="info-value">${booking.id}</span>
                  </div>
                  <div class="info-row">
                    <span class="info-label">Total Amount:</span>
                    <span class="info-value">${formatAmount(booking.total_amount)} ${currencyHtml}</span>
                  </div>
                </div>
              </div>

              <p style="font-size: 16px; line-height: 1.6; margin-top: 30px;">If you have any questions, feel free to reach out to us. We're here to help make your stay unforgettable!</p>
              
              <p style="font-size: 16px; line-height: 1.6; margin-top: 20px;">Best regards,<br><strong>The Nordic Getaways Team</strong></p>
            </div>
            
            <div class="footer">
              <p style="margin: 5px 0;">Nordic Getaways - Your Home Away from Home</p>
              <p style="margin: 5px 0;">This is an automated confirmation email</p>
            </div>
          </div>
          <img src="${trackingPixel}" width="1" height="1" alt="" style="display:none;" />
        </body>
        </html>
      `;
    }

    // Send email to guest with plain text fallback
    const guestEmailPlainText = `
Booking Confirmed!

Hi ${booking.guest_name},

Your booking for ${property.title} has been confirmed!

${providerText}

CHECK-IN & CHECK-OUT:
- Check-In: ${checkInDateTime}
- Check-Out: ${checkOutDateTime}
- Guests: ${booking.number_of_guests}${extrasText ? `\n- Extras: ${extrasText}` : ''}

PROPERTY LOCATION:
${propertyAddress || property.title}

${houseRules.length > 0 ? `
HOUSE RULES:
${houseRules.map((rule: string, i: number) => `${i + 1}. ${rule}`).join('\n')}
` : ''}

CANCELLATION POLICY:
${cancellationPolicy.title}
${cancellationPolicy.description}

VIEW YOUR COMPLETE GUEST GUIDE:
${guidebookUrl}

BOOKING SUMMARY:
- Booking ID: ${booking.id}
- Total Amount: ${formatAmount(booking.total_amount)} ${booking.currency}

If you have any questions, feel free to reach out to us.

Best regards,
The Nordic Getaways Team
    `;

    // Resend reports failures in its result instead of throwing; an e-mail
    // counts as sent (and is recorded) only when Resend accepted it
    const send = async (to: string, subject: string, html: string, text?: string): Promise<string | null> => {
      try {
        const { error } = await resend.emails.send({
          from: "Nordic Getaways <support@mojjo.se>",
          to: [to],
          replyTo: "support@mojjo.se",
          subject,
          html,
          ...(text ? { text } : {}),
        });
        return error ? error.message || "Resend error" : null;
      } catch (e) {
        return e instanceof Error ? e.message : String(e);
      }
    };
    const record = async (emailType: string, recipient: string, id: string) => {
      const { error } = await supabase.from('booking_email_tracking').insert({
        booking_id: bookingId,
        tracking_id: id,
        recipient_email: recipient,
        email_type: emailType,
        sent_at: new Date().toISOString(),
      });
      if (error) console.error('Recording sent e-mail failed:', emailType, error.message);
    };
    const stay = `${property.title}, ${booking.check_in_date} to ${booking.check_out_date}`;

    // Guest confirmation: their only copy of the address and check-in details
    let guestError: string | null = null;
    if (alreadySent.has(GUEST_EMAIL_TYPE)) {
      console.log('Guest confirmation already sent for booking:', bookingId);
    } else {
      guestError = await send(booking.guest_email, guestEmailSubject, guestEmailHtml, guestEmailPlainText);
      if (guestError) {
        console.error('Failed to send guest email:', guestError);
        // Same key as the save path uses, so one failure is one alert
        await alertAdminOnce(supabase, `notify-failed:${bookingId}`, 'Booking confirmation e-mail not sent', [
          `${stay}`,
          `Guest: ${booking.guest_name} <${booking.guest_email}>`,
          `Booking: ${bookingId}`,
          `Error: ${guestError}`,
          'The booking is saved and confirmed. Send the guest their confirmation (address, check-in) by hand.',
        ]).catch((alertError) => console.error('Alert failed:', alertError));
      } else {
        console.log('Guest email sent for booking:', bookingId);
        await record(GUEST_EMAIL_TYPE, booking.guest_email, trackingId);
      }
    }

    // Host notice: sent even if the guest's failed, as it is the host's only
    // notification of the booking
    let hostError: string | null = null;
    const hostEmail = hostProfile?.email;
    if (alreadySent.has(HOST_EMAIL_TYPE)) {
      console.log('Host notification already sent for booking:', bookingId);
    } else if (!hostEmail) {
      hostError = 'The host has no e-mail address';
    } else {
      // What the host receives: their price, not the guest's total with our fee
      const hostAmount = hostShareAmount(booking);
      // Saved with the booking: the day after check-in, or for a held share
      // 85 days after payment if that comes first (Stripe holds money for at
      // most 90 days, and we always pay out before it would)
      const afterStay = dayAfterCheckIn(booking.check_in_date);
      const dueOn = booking.host_payout_due_on ||
        (booking.host_payout_status === 'held' ? payoutDueOn(booking.check_in_date, booking.created_at) : afterStay);
      const payoutDate = longDate(dueOn);
      const beforeStay = booking.host_payout_status !== 'manual' && dueOn < afterStay;
      const payoutHtml = booking.host_payout_status === 'manual'
        ? `This payment could not be sent to your Stripe account, so we will pay you by hand on ${payoutDate}, the day after check-in. Connect your bank account under Bank Account in your host dashboard so future payouts are automatic.`
        : beforeStay
          ? `Paid out to your bank account on ${payoutDate}, before the stay: we pay out at the latest ${MAX_HOLD_DAYS} days after the guest's payment, because Stripe holds money for at most 90 days. If the guest cancels after that, the part of the refund that comes from your share is taken from your next payout.`
          : `Paid out to your bank account on ${payoutDate}, the day after check-in.`;
      const cancellationHtml =
        "If the guest cancels, they get the cancellation policy's percentage of your price back, and that amount is taken from your payout for this booking (or from your next payout, if this one has already been paid); the guest service fee is not refunded to them and never comes out of your share. " +
        "If you have to cancel, the guest gets everything back, you receive nothing for the booking and Stripe's card fee for the payment is deducted from a later payout.";
      const hostGreeting = shownName(hostProfile?.display_name, hostProfile?.full_name) ?? 'there';

      const hostEmailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>New Booking - Nordic Getaways</title>
          <style>
            body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
            .header { background: linear-gradient(135deg, #2D5F5D 0%, #1a3635 100%); color: white; padding: 40px 30px; text-align: center; }
            .content { padding: 40px 30px; }
            .info-box { background: #f8f9fa; border-left: 4px solid #2D5F5D; padding: 20px; margin: 15px 0; border-radius: 4px; }
            .info-row { margin: 10px 0; padding: 8px 0; border-bottom: 1px solid #e9ecef; }
            .payout { font-size: 22px; font-weight: 600; color: #2D5F5D; margin: 0; }
            .muted { color: #6c757d; font-size: 14px; }
            .cta-button { display: inline-block; background: #2D5F5D; color: white !important; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🏡 New Booking Received</h1>
            </div>
            <div class="content">
              <p>Hi ${escapeHtml(hostGreeting)},</p>
              <p>You have a new booking for <strong>${titleHtml}</strong>.</p>
              <div class="info-box">
                <p class="payout">You receive ${formatAmount(hostAmount)} ${currencyHtml}</p>
                <p class="muted">The guest paid ${formatAmount(booking.total_amount)} ${currencyHtml}${booking.service_fee ? `, including the ${formatAmount(booking.service_fee)} ${currencyHtml} guest service fee to Nordic Getaways` : ''}.</p>
                <p>${escapeHtml(payoutHtml)}</p>
                <p class="muted">${escapeHtml(cancellationHtml)}</p>
              </div>
              <div class="info-box">
                <div class="info-row"><strong>Guest:</strong> ${guestNameHtml}</div>
                <div class="info-row"><strong>Check-In:</strong> ${checkInDateTime}</div>
                <div class="info-row"><strong>Check-Out:</strong> ${checkOutDateTime}</div>
                <div class="info-row"><strong>Guests:</strong> ${booking.number_of_guests}</div>
                ${extrasText ? `<div class="info-row"><strong>Extras the guest added:</strong> ${escapeHtml(extrasText)} (part of your price)</div>` : ''}
                <div class="info-row"><strong>Booking reference:</strong> ${booking.id.slice(0, 8).toUpperCase()}</div>
              </div>
              <p style="text-align: center; margin: 30px 0;">
                <a href="${hostDashboardUrl}" class="cta-button">See the booking in your host dashboard</a>
              </p>
              <p class="muted">Questions? Reply to this e-mail or write to support@mojjo.se.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      console.log('Sending notification to host for booking:', bookingId);
      hostError = await send(hostEmail, `New Booking - ${property.title}`, hostEmailHtml);
      if (!hostError) {
        console.log('Host notification sent for booking:', bookingId);
        await record(HOST_EMAIL_TYPE, hostEmail, `${bookingId}-host-${Date.now()}`);
      }
    }
    if (hostError) {
      console.error('Failed to send host notification:', hostError);
      await alertAdminOnce(supabase, `notify-failed-host:${bookingId}`, 'Host not told about a new booking', [
        `${stay}`,
        `Host: ${hostName ?? '-'} <${hostEmail ?? 'no e-mail'}>`,
        `Booking: ${bookingId}`,
        `Error: ${hostError}`,
        'The booking is saved and confirmed. Tell the host about it.',
      ]).catch((alertError) => console.error('Alert failed:', alertError));
    }

    // A missing guest confirmation is an error for the caller too
    if (guestError) {
      return new Response(JSON.stringify({ error: `Guest e-mail failed: ${guestError}`, hostEmailSent: !hostError }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Booking notification sent successfully',
      trackingId: trackingId,
      hostEmailSent: !hostError,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error: any) {
    console.error('Error in send-booking-notifications:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Failed to send booking notifications'
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
