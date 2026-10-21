import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { clientIpFrom, processCheckoutSession } from "../_shared/process-checkout-session.ts";
import { alertAdminOnce } from "../_shared/alert.ts";
import {
  ADMIN_SOURCE,
  describeBooking,
  MONEY_BOOKING_COLUMNS,
  type MoneyBooking,
  reconcileBookingMoney,
  reverseUnsavedPayment,
} from "../_shared/booking-money.ts";

const errorText = (error: unknown) => (error instanceof Error ? error.message : String(error));

// Stripe calls this after Checkout, so bookings/orders are recorded even if the
// guest never returns to /booking-success (closed tab, lost connection, ...).
// Configure in Stripe: endpoint .../functions/v1/stripe-webhook with events
// checkout.session.completed, checkout.session.async_payment_succeeded and
// charge.refunded, and store its signing secret as STRIPE_WEBHOOK_SECRET.

const HANDLED_EVENTS = new Set([
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
  "charge.refunded",
]);

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
    status,
  });

serve(async (req) => {
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!webhookSecret) {
    console.error("[STRIPE-WEBHOOK] STRIPE_WEBHOOK_SECRET is not configured");
    // 500 makes Stripe retry, so no events are lost while the secret is being set up
    return json({ error: "Webhook not configured" }, 500);
  }

  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
    apiVersion: "2025-08-27.basil",
  });

  const signature = req.headers.get("stripe-signature");
  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      rawBody,
      signature ?? "",
      webhookSecret,
      undefined,
      Stripe.createSubtleCryptoProvider(),
    );
  } catch (error) {
    console.error("[STRIPE-WEBHOOK] Signature verification failed:", error instanceof Error ? error.message : error);
    return json({ error: "Invalid signature" }, 400);
  }

  if (!HANDLED_EVENTS.has(event.type)) {
    return json({ received: true, ignored: event.type });
  }

  if (event.type === "charge.refunded") {
    return handleRefund(stripe, event.data.object as Stripe.Charge);
  }

  const session = event.data.object as Stripe.Checkout.Session;
  console.log(`[STRIPE-WEBHOOK] ${event.type} for session ${session.id} (${session.payment_status})`);

  // Delayed payment methods complete later and send async_payment_succeeded
  if (session.payment_status !== "paid") {
    return json({ received: true, pending: session.payment_status });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  try {
    const result = await processCheckoutSession(stripe, supabase, session.id, {
      ip: clientIpFrom(req),
      userAgent: req.headers.get("user-agent") || "stripe-webhook",
    });
    console.log("[STRIPE-WEBHOOK] Processed", result);
    // Another call (usually the guest's redirect) holds the claim but has not
    // saved the booking yet. Answer non-2xx so Stripe retries later: if that
    // call dies midway, the retry takes over its stale claim and saves it.
    if (result.message === "processing") {
      return json({ received: true, ...result }, 409);
    }
    return json({ received: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[STRIPE-WEBHOOK] Processing failed:", { sessionId: session.id, message });
    // The guest has paid but nothing was saved: a person must look (once per
    // session). The shared save path alerts with the same key; this one also
    // covers failures before it, e.g. Stripe being unreachable.
    await alertAdminOnce(supabase, `payment-failed:${session.id}`, "Paid checkout could not be saved", [
      `Stripe session: ${session.id} (${session.metadata?.type ?? "unknown"})`,
      `Property: ${session.metadata?.propertyTitle ?? "-"}, ${session.metadata?.checkInDate ?? ""} to ${session.metadata?.checkOutDate ?? ""}`,
      `Error: ${message}`,
      "Stripe keeps retrying for 3 days. Fix the cause, or refund the payment in Stripe (the host's transfer is then taken back automatically). Do not enter the booking by hand: a retry would see its dates as taken and refund the guest.",
    ]).catch((alertError) => console.error("[STRIPE-WEBHOOK] Alert failed:", alertError));
    // Non-2xx so Stripe retries with backoff
    return json({ error: "Processing failed" }, 500);
  }
});

// A refund on a booking payment, from anywhere: cancel-booking (tagged
// metadata.source) or the Stripe dashboard. reconcileBookingMoney brings the
// booking in line with Stripe: it takes back from the host's transfer what the
// refunds require (whether or not "Reverse transfer" was ticked), or records it
// as a host charge taken from the host's next payout if their share was
// already paid out, and writes refunded_amount and host_reversed_amount. A
// dashboard refund of the whole payment also cancels the booking so its dates
// open up; support is told what was done. A refunded checkout that never
// became a booking has its transfer taken back.
async function handleRefund(stripe: Stripe, charge: Stripe.Charge) {
  const paymentIntentId = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
  if (!paymentIntentId) return json({ received: true, ignored: "no payment intent" });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );
  const { data, error: bookingError } = await supabase
    .from("bookings")
    .select(MONEY_BOOKING_COLUMNS)
    .eq("stripe_payment_intent_id", paymentIntentId)
    .maybeSingle();
  if (bookingError) {
    console.error("[STRIPE-WEBHOOK] Reading the booking failed:", bookingError.message);
    return json({ error: "Could not read booking" }, 500);
  }
  const booking = data as MoneyBooking | null;
  if (!booking) return handleUnsavedRefund(stripe, supabase, charge, paymentIntentId);

  // Who made the refunds: cancel-booking tags its own. Without the list we
  // can't tell, so answer non-2xx and let Stripe retry rather than guess.
  let refunds: Stripe.Refund[];
  try {
    refunds = await stripe.refunds.list({ charge: charge.id, limit: 100 }).autoPagingToArray({ limit: 1000 });
  } catch (listError) {
    console.error("[STRIPE-WEBHOOK] Listing refunds failed:", errorText(listError));
    return json({ error: "Could not read refunds" }, 500);
  }
  const fromAdmin = (r: Stripe.Refund) => r.metadata?.source === ADMIN_SOURCE;
  const dashboardRefunds = refunds.filter((r) => !fromAdmin(r) && r.status !== "failed" && r.status !== "canceled");

  // A dashboard refund of everything cancels the booking. Not if
  // cancel-booking refunded this payment: it cancels the booking itself, with
  // who cancelled, the card fee and the e-mails, even when its own refund's
  // event arrives first.
  const cancel = charge.refunded === true && booking.status === "confirmed" && !refunds.some(fromAdmin);
  let result;
  try {
    result = await reconcileBookingMoney(stripe, supabase, booking, {
      context: dashboardRefunds.length ? "refund made in the Stripe dashboard" : "refund from the admin cancellation",
      ...(cancel
        ? { extraUpdate: { status: "cancelled", cancelled_at: new Date().toISOString() }, requireBookingStatus: "confirmed" }
        : {}),
    });
  } catch (reconcileError) {
    // Non-2xx: Stripe retries, and the reconciliation is safe to repeat
    console.error("[STRIPE-WEBHOOK] Reconciling the refund failed:", errorText(reconcileError));
    return json({ error: "Could not record refund" }, 500);
  }

  if (dashboardRefunds.length) {
    const currency = charge.currency.toUpperCase();
    const amount = (ore: number) => `${(ore / 100).toLocaleString("sv-SE")} ${currency}`;
    const cancelled = cancel && result.extraSaved;
    // Once per set of dashboard refunds, whichever event brings it
    const key = `refund:${charge.id}:${dashboardRefunds.map((r) => r.id).sort().join(",")}`;
    await alertAdminOnce(supabase, key, "Refund made in Stripe", [
      describeBooking(booking),
      `Refunded in the Stripe dashboard: ${dashboardRefunds.map((r) => `${amount(r.amount)} (${r.id})`).join(", ")}. Refunded to the guest in total: ${amount(result.amountRefunded)} of ${amount(charge.amount)}.`,
      result.reversedNow > 0
        ? `Taken back from the host's transfer now: ${amount(result.reversedNow)}. Taken from the host's share in total: ${amount(result.takenBack)} of ${amount(result.hostAmount)}, so the host bears the refund up to their whole share.`
        : `Taken from the host's share in total: ${amount(result.takenBack)} of ${amount(result.hostAmount)}.`,
      result.chargedNow > 0
        ? `The host's share was already paid out, so ${amount(result.chargedNow)} is recorded as a host charge and taken from the host's next payout.`
        : "",
      result.pendingReduction > 0
        ? `NOT yet taken from the host: ${amount(result.pendingReduction)}. The payout job retries every day and pays nothing for this booking meanwhile.`
        : `The host now gets ${amount(result.remainingShare)} for this booking (payout status: ${result.status ?? "none"}).`,
      cancelled
        ? "The whole payment is refunded, so the booking is now cancelled and its dates are open. Neither the guest nor the host has been told: e-mail them both. Set cancelled_by on the booking; if the host cancelled, add the card fee to host_charges."
        : charge.refunded
          ? booking.status === "confirmed" && !cancel
            ? "The whole payment is refunded, but the booking is still confirmed because a cancellation was started in admin: finish it there (Avboka), which refunds nothing more and e-mails the guest and the host."
            : "The whole payment is refunded."
          : "Partial refund: the booking is still active. Cancel it in admin if the guest isn't coming.",
      result.notes.length ? "See also the separate \"Booking money needs a look\" e-mail." : "",
    ].filter(Boolean)).catch((alertError) => console.error("[STRIPE-WEBHOOK] Alert failed:", errorText(alertError)));
  }

  return json({ received: true, refundRecorded: true, cancelled: cancel && result.extraSaved, reversed: result.reversedNow });
}

// A refunded payment with no booking: either the checkout was refunded because
// the dates were taken (the transfer is already reversed in full), or it was
// refunded by hand before it could be saved. In the second case the host must
// not keep the transfer.
async function handleUnsavedRefund(stripe: Stripe, supabase: SupabaseClient, charge: Stripe.Charge, paymentIntentId: string) {
  if (!charge.refunded || !charge.transfer) return json({ received: true, ignored: "no booking for this payment" });
  try {
    const sessions = await stripe.checkout.sessions.list({ payment_intent: paymentIntentId, limit: 1 });
    const session = sessions.data[0];
    if (session?.metadata?.type !== "booking") return json({ received: true, ignored: "not a booking payment" });
    const reversed = await reverseUnsavedPayment(stripe, supabase, charge, session.id, [
      `Stripe session: ${session.id}`,
      `Property: ${session.metadata?.propertyTitle ?? "-"}, ${session.metadata?.checkInDate ?? ""} to ${session.metadata?.checkOutDate ?? ""}`,
      `Guest: ${session.metadata?.guestName ?? "-"} <${session.metadata?.guestEmail ?? "-"}>`,
    ]);
    return json({ received: true, unsavedRefund: true, reversed });
  } catch (error) {
    console.error("[STRIPE-WEBHOOK] Handling a refund without a booking failed:", errorText(error));
    return json({ error: "Could not handle refund" }, 500);
  }
}
