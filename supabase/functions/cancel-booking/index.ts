import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { isAdminOrService } from "../_shared/auth.ts";
import { alertAdminOnce, sendEmail } from "../_shared/alert.ts";
import { daysBeforeArrival, loadCancellationPolicy, policySummary, refundPercentage } from "../_shared/cancellation.ts";
import { stockholmToday } from "../_shared/format.ts";
import { HOST_LOCK_BUSY_TEXT, HOST_LOCK_WAIT_MS, hostMoneyLock, type Lock, takeLock } from "../_shared/lock.ts";
import { hostShareAmount, planCancellation, shareTakenBack, stableUuid } from "../_shared/payout.ts";
import {
  ADMIN_SOURCE,
  describeBooking,
  effectiveDueOn,
  type HostSplit,
  loadStripeMoney,
  MONEY_BOOKING_COLUMNS,
  type MoneyBooking,
  openRefundRecoveries,
  planHostSplit,
  reconcileBookingMoney,
  recoveryChargedFor,
  type StripeMoney,
} from "../_shared/booking-money.ts";
import {
  type CancellationFacts,
  type CancelledBy,
  guestCancellationEmail,
  hostCancellationEmail,
  money,
  type PayoutBefore,
} from "../_shared/host-emails.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const CANCELLED_BY: CancelledBy[] = ["guest", "host", "platform"];
const CARD_FEE_REASON = "Card fee: booking cancelled by the host";

/** A real calendar date written "YYYY-MM-DD" ("2026-13-01" is not) */
const isIsoDate = (value: unknown): value is string => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const ms = Date.parse(`${value}T00:00:00Z`);
  return !Number.isNaN(ms) && new Date(ms).toISOString().slice(0, 10) === value;
};

/** The Swedish date a timestamp falls on, "YYYY-MM-DD" */
const stockholmDate = (timestamp: string) =>
  new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Stockholm" }).format(new Date(timestamp));

const errorText = (error: unknown) => (error instanceof Error ? error.message : String((error as { message?: string })?.message ?? error));

/**
 * Taken from the host's share so far: Stripe's reversals plus refunds after
 * payout recorded as host charges when there is a transfer, else our record
 */
async function takenBackSoFar(supabase: SupabaseClient, booking: MoneyBooking, payment: StripeMoney | null): Promise<number> {
  if (!payment?.state) return booking.host_reversed_amount ?? 0;
  const charged = payment.amountRefunded > 0 ? await recoveryChargedFor(supabase, booking.id) : 0;
  return Math.max(0, shareTakenBack(payment.state)) + charged;
}

interface EarlierAttempt {
  requestedOn: string | null;
  cancelledBy: CancelledBy | null;
  /** Refunded by earlier admin cancellations of this booking */
  refunded: number;
}

/**
 * Refunds an earlier "Avboka" made for this booking whose save then failed:
 * cancel-booking tags its refunds with the booking, who cancelled and the
 * request date, so a retry can use the same and the e-mails can tell them
 * apart from refunds made earlier in the Stripe dashboard.
 */
async function earlierAttempt(stripe: Stripe, payment: StripeMoney, bookingId: string): Promise<EarlierAttempt | null> {
  if (payment.amountRefunded <= 0) return null;
  const refunds = await stripe.refunds.list({ payment_intent: payment.paymentIntentId, limit: 100 }).autoPagingToArray({ limit: 1000 });
  const ours = refunds
    .filter((r) => r.metadata?.source === ADMIN_SOURCE && r.metadata?.bookingId === bookingId && r.status !== "failed" && r.status !== "canceled")
    .sort((a, b) => b.created - a.created);
  if (!ours.length) return null;
  const by = ours[0].metadata?.cancelledBy as CancelledBy | undefined;
  return {
    requestedOn: isIsoDate(ours[0].metadata?.requestedOn) ? ours[0].metadata!.requestedOn : null,
    cancelledBy: by && CANCELLED_BY.includes(by) ? by : null,
    refunded: ours.reduce((total, r) => total + r.amount, 0),
  };
}

/** Where the host's share was before this cancellation, for the host's e-mail */
function payoutBefore(status: string | null, transferId: string | null): PayoutBefore {
  if (status === "held" || status === "paid_out" || status === "manual") return status;
  return transferId ? "held" : "none";
}

// The host profile's e-mail, or the address they signed in with
async function hostContact(supabase: SupabaseClient, hostProfileId: string | undefined) {
  if (!hostProfileId) return null;
  const { data: host } = await supabase
    .from("profiles")
    .select("id, user_id, email, full_name, display_name, host_business_name")
    .eq("id", hostProfileId)
    .maybeSingle();
  if (!host) return null;
  let email: string | null = host.email ?? null;
  if (!email && host.user_id) {
    const { data } = await supabase.auth.admin.getUserById(host.user_id);
    email = data.user?.email ?? null;
  }
  return { id: host.id as string, email, name: host.full_name || host.display_name || host.host_business_name || "" };
}

// Admin "Avboka & återbetala". Body: { bookingId, cancelledBy: "guest" | "host"
// | "platform", requestedOn?: "YYYY-MM-DD" (the day the cancellation came in;
// default: an unfinished earlier attempt's date, else today), preview?: true }.
//
// Works with targets, never increments, so a retry or an earlier refund in the
// Stripe dashboard is safe: the guest's refund target (guest cancels: policy %
// of the host's price; host or we cancel: everything) minus what Stripe has
// already refunded is refunded now; then reconcileBookingMoney takes from the
// host's share whatever the refunds require (min(share, refunded)) and hasn't
// been taken yet: reversed from the booking's transfer while the share is in
// the host's Stripe balance, or, once it was paid out, recorded as a host
// charge that the payout job takes from the host's next payout. A cancelling
// host is charged the card fee once (also from a later payout). The booking is
// cancelled, which releases the dates, and the guest and the host are
// e-mailed. Preview reports the plan from Stripe's current figures without
// changing anything, including how the host's part would be taken (reversed
// now vs. recorded as a host charge), and any unfinished earlier attempt (its
// choice and date).
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );
  if (!(await isAdminOrService(req, supabase))) {
    return json({ error: "Forbidden" }, 403);
  }

  // The host's money lock, held from before the guest's refund until the
  // booking is saved, so a cancellation never runs half while the payout job
  // pays this host (or a refund webhook takes money back)
  let lock: Lock | null = null;
  try {
    const body = await req.json().catch(() => null);
    const bookingId = body?.bookingId;
    const preview = body?.preview === true;
    const cancelledBy = body?.cancelledBy as CancelledBy | undefined;
    if (typeof bookingId !== "string" || !bookingId) return json({ error: "bookingId is required" }, 400);
    if (cancelledBy !== undefined && !CANCELLED_BY.includes(cancelledBy)) {
      return json({ error: "cancelledBy must be guest, host or platform" }, 400);
    }
    if (!preview && !cancelledBy) return json({ error: "Choose who cancels: the guest, the host or us" }, 400);

    const readBooking = async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select(`${MONEY_BOOKING_COLUMNS}, guest_email`)
        .eq("id", bookingId)
        .maybeSingle();
      if (error) throw error;
      return data as (MoneyBooking & { guest_email: string }) | null;
    };
    let booking = await readBooking();
    if (!booking) return json({ error: "Booking not found" }, 404);
    if (!preview) {
      lock = await takeLock(supabase, hostMoneyLock(booking.properties?.host_id, booking.id), HOST_LOCK_WAIT_MS);
      if (!lock) {
        return json({ error: `${HOST_LOCK_BUSY_TEXT}. Nothing was refunded or changed: try again in a few minutes.` }, 409);
      }
      // Read again under the lock: the payout job may have paid it out meanwhile
      booking = await readBooking();
      if (!booking) return json({ error: "Booking not found" }, 404);
    }
    if (booking.status !== "confirmed") return json({ error: "Only confirmed bookings can be cancelled here" }, 400);

    const hasPayment = !!booking.stripe_payment_intent_id;
    const currency = (booking.currency || "SEK").toUpperCase();
    const hostAmount = hostShareAmount(booking);
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { apiVersion: "2025-08-27.basil" });

    // Stripe's figures. A preview falls back to the database's when Stripe
    // doesn't answer; a cancellation needs them.
    let payment: StripeMoney | null = null;
    if (hasPayment) {
      payment = preview
        ? await loadStripeMoney(stripe, booking).catch((stripeError) => {
          console.error("[CANCEL-BOOKING] Reading the payment failed:", errorText(stripeError));
          return null;
        })
        : await loadStripeMoney(stripe, booking);
    }
    const earlier = payment
      ? await earlierAttempt(stripe, payment, booking.id).catch((listError) => {
        if (!preview) throw listError;
        console.error("[CANCEL-BOOKING] Reading earlier refunds failed:", errorText(listError));
        return null;
      })
      : null;

    const today = stockholmToday();
    const requestedOn = body?.requestedOn ?? earlier?.requestedOn ?? today;
    if (!isIsoDate(requestedOn)) return json({ error: "The request date must be a date (YYYY-MM-DD)" }, 400);
    if (requestedOn > today) return json({ error: "The request date can't be in the future" }, 400);
    if (requestedOn < stockholmDate(booking.created_at)) {
      return json({ error: "The request date is before the booking was made" }, 400);
    }

    const policy = await loadCancellationPolicy(supabase);
    const days = daysBeforeArrival(booking.check_in_date, requestedOn);
    const policyPct = refundPercentage(policy, days);
    const alreadyRefunded = payment ? payment.amountRefunded : booking.refunded_amount ?? 0;
    const alreadyTakenBack = await takenBackSoFar(supabase, booking, payment);
    // Refunded before this cancellation (e.g. a goodwill refund in the
    // dashboard), as opposed to by an unfinished earlier attempt of it
    const refundedEarlier = Math.max(0, alreadyRefunded - (earlier?.refunded ?? 0));

    if (preview) {
      const plan = cancelledBy
        ? planCancellation({ cancelledBy, hostAmount, totalAmount: booking.total_amount, policyPct, alreadyRefunded, alreadyTakenBack, hasPayment })
        : null;
      // How the server will take it from the host: reversed from the transfer
      // now, or recorded as a host charge for the part already paid out (or
      // used for host charges). Left out if Stripe can't be read.
      const split: HostSplit | null = plan && payment
        ? await planHostSplit(stripe, supabase, booking, payment, plan.totalRefunded).catch((splitError) => {
          console.error("[CANCEL-BOOKING] Planning the host's split failed:", errorText(splitError));
          return null;
        })
        : null;
      return json({
        requestedOn,
        daysBeforeArrival: days,
        policyPercentage: policyPct,
        hasPayment,
        currency,
        cardFee: cancelledBy === "host" ? payment?.cardFee ?? null : null,
        ...(payment ? { alreadyRefunded, alreadyReversed: alreadyTakenBack } : {}),
        ...(earlier ? { earlierAttempt: earlier } : {}),
        ...(plan && cancelledBy
          ? {
              cancelledBy,
              refundPercentage: plan.refundPercentage,
              // Refunded now; totalRefunded is the guest's total afterwards
              refundAmount: plan.refundNow,
              totalRefunded: plan.totalRefunded,
              hostTakenBack: plan.hostTakenBack,
              hostTakenBackNow: plan.hostTakenBackNow,
              hostRemaining: plan.hostRemaining,
              serviceFeeKept: plan.serviceFeeKept,
            }
          : {}),
        ...(split
          ? { hostReverseNow: split.reverseNow, hostChargeNow: split.chargeNow, hostShareUsedForCharges: split.usedForCharges }
          : {}),
      });
    }

    const by = cancelledBy!;
    const plan = planCancellation({
      cancelledBy: by,
      hostAmount,
      totalAmount: booking.total_amount,
      policyPct,
      alreadyRefunded,
      alreadyTakenBack,
      hasPayment,
    });
    const notes: string[] = [];
    if (earlier && (earlier.cancelledBy !== by || (earlier.requestedOn && earlier.requestedOn !== requestedOn))) {
      notes.push(
        `An earlier attempt to cancel this booking (cancelled by ${earlier.cancelledBy ?? "?"}, request date ${earlier.requestedOn ?? "?"}) refunded ${money(earlier.refunded, currency)}; this one used cancelled by ${by}, request date ${requestedOn}. Check that the e-mails and the refund are right.`,
      );
    }

    // 1. Refund the guest up to the target. Stripe neither reverses the
    // transfer nor refunds our fee here: the host's part comes back through
    // the reconciliation below, so a guest cancellation leaves the fee with us.
    if (plan.refundNow > 0 && payment) {
      await stripe.refunds.create(
        {
          payment_intent: payment.paymentIntentId,
          amount: plan.refundNow,
          reason: "requested_by_customer",
          // The webhook recognises refunds made here and leaves the
          // cancellation to us; a retry reads who cancelled and when from them
          metadata: { source: ADMIN_SOURCE, bookingId: booking.id, cancelledBy: by, requestedOn },
          ...(payment.transfer ? { reverse_transfer: false, refund_application_fee: false } : {}),
        },
        // Same target, same key: a retry or a double click never refunds twice
        { idempotencyKey: `cancel-refund-${booking.id}-to-${plan.totalRefunded}` },
      );
    }

    // 2. Take from the host what the refunds require, write Stripe's figures
    // and cancel the booking in one update (the cancellation releases the
    // dates through a database trigger). A failed reversal leaves the payout
    // held with an alert: the payout job retries it every day and pays
    // nothing for the booking meanwhile.
    let reconciled;
    try {
      reconciled = await reconcileBookingMoney(stripe, supabase, booking, {
        context: `booking cancelled by the ${by}`,
        lockHeld: true,
        alert: false,
        requireBookingStatus: "confirmed",
        extraUpdate: {
          status: "cancelled",
          cancelled_at: new Date().toISOString(),
          cancelled_by: by,
          cancel_requested_on: requestedOn,
        },
      });
    } catch (saveError) {
      await alertAdminOnce(supabase, `cancel-save-failed:${booking.id}`, "Cancellation not finished", [
        describeBooking(booking),
        `Refunded to the guest by this attempt: ${money(plan.refundNow, currency)}. Then this failed: ${errorText(saveError)}`,
        `The booking is still confirmed. Cancel it again in admin with the same choice (cancelled by ${by}) and request date (${requestedOn}); the dialog fills them in. It refunds only what is missing and takes from the host only what hasn't been taken.`,
      ]).catch((alertError) => console.error("[CANCEL-BOOKING] Alert failed:", errorText(alertError)));
      throw new Error(`${errorText(saveError)} Cancel it again: nothing is refunded twice.`);
    }
    notes.push(...reconciled.notes);
    if (!reconciled.extraSaved) {
      // Someone else cancelled it while this ran (double click, two admins):
      // the money is in line with Stripe, and they send the e-mails
      return json({
        cancelled: true,
        alreadyCancelled: true,
        cancelledBy: by,
        refundAmount: plan.refundNow,
        hostPayoutStatus: reconciled.status,
        warnings: notes,
      });
    }

    // 3. A cancelling host pays the card fee once, settled from a later payout
    // by release-host-payouts. Not for the old bookings paid to the platform.
    const property = booking.properties;
    const host = await hostContact(supabase, property?.host_id).catch((lookupError) => {
      console.error("[CANCEL-BOOKING] Host lookup failed:", errorText(lookupError));
      return null;
    });
    let cardFeeCharge = 0;
    if (by === "host" && payment && booking.host_payout_status !== "platform") {
      const fee = payment.cardFee ?? 0;
      if (!host) {
        notes.push(`Card fee ${money(fee, currency)} could not be charged: the listing has no host profile.`);
      } else if (fee > 0) {
        try {
          const { error: chargeError } = await supabase.from("host_charges").insert({
            id: await stableUuid(`card-fee:${booking.id}`),
            host_profile_id: host.id,
            booking_id: booking.id,
            amount: fee,
            currency: currency.toLowerCase(),
            reason: CARD_FEE_REASON,
          });
          // 23505: already recorded by an earlier attempt
          if (chargeError && chargeError.code !== "23505") throw chargeError;
          cardFeeCharge = fee;
          if (!reconciled.transferId) {
            notes.push(
              `The host has no Stripe transfer to take the card fee (${money(fee, currency)}) from: deduct it when paying them by hand, then set the host_charges row's settled_at.`,
            );
          }
        } catch (chargeError) {
          notes.push(`Recording the host's card fee (${money(fee, currency)}) FAILED: ${errorText(chargeError)}. Add it to host_charges by hand.`);
        }
      } else {
        notes.push("Stripe's card fee for this payment could not be read, so the host was not charged it.");
      }
    }

    // The money is in line and saved: the payout job and webhooks may go on
    await lock?.release();

    if (hasPayment && !reconciled.transferId && plan.hostTakenBack > 0 && booking.host_payout_status === "manual") {
      notes.push(`No Stripe transfer exists (the host is paid by hand). The host is now owed ${money(reconciled.remainingShare, currency)} for this booking.`);
    }

    // Refunds after payout recorded as host charges for this booking: what is
    // still open comes from the next payout; the rest was taken already
    const recoveryOpen = hasPayment && reconciled.charged > 0
      ? await openRefundRecoveries(supabase, booking.id)
        .then(({ open }) => open.reduce((total, charge) => total + charge.amount, 0))
        .catch(() => reconciled.charged)
      : 0;

    // 4. E-mails, from the totals (not this call's part), so a retry still
    // tells the guest and the host what was refunded and taken back
    const facts: CancellationFacts = {
      propertyTitle: property?.title ?? "your cabin",
      checkIn: booking.check_in_date,
      checkOut: booking.check_out_date,
      guestName: booking.guest_name,
      cancelledBy: by,
      requestedOn,
      daysBeforeArrival: days,
      refundPercentage: plan.refundPercentage,
      refundTarget: plan.refundTarget,
      refundAmount: hasPayment ? reconciled.amountRefunded : 0,
      refundedEarlier: hasPayment ? refundedEarlier : 0,
      serviceFeeKept: plan.serviceFeeKept,
      hostTakenBack: hasPayment ? Math.max(reconciled.takenBack, reconciled.expectedReduction) : 0,
      // A refund after payout whose host charge failed is retried daily and becomes one
      hostFromNextPayout: hasPayment
        ? recoveryOpen + (booking.host_payout_status === "paid_out" ? reconciled.pendingReduction : 0)
        : 0,
      hostTakenEarlier: hasPayment ? Math.max(0, reconciled.charged - recoveryOpen) : 0,
      // Part of the transfer went to amounts the host owed us (host charges)
      shareUsedForCharges: hasPayment && reconciled.chargeSettled > 0,
      hostRemaining: hasPayment ? Math.min(reconciled.remainingShare, plan.hostRemaining) : plan.hostRemaining,
      cardFeeCharge,
      payoutBefore: payoutBefore(booking.host_payout_status, reconciled.transferId),
      // Only shown for a held share, which the payout job pays on this date
      payoutDueOn: booking.host_payout_status === "held"
        ? effectiveDueOn(booking, payment?.transfer ? payment.transfer.created * 1000 : null)
        : booking.host_payout_due_on,
      hasPayment,
      currency,
    };
    const guestEmail = guestCancellationEmail(facts, policySummary(policy));
    if (!(await sendEmail(booking.guest_email, guestEmail.subject, guestEmail.html))) {
      notes.push(`The cancellation e-mail to the guest (${booking.guest_email}) could not be sent.`);
    }
    if (host?.email) {
      const hostEmail = hostCancellationEmail(facts, host.name);
      if (!(await sendEmail(host.email, hostEmail.subject, hostEmail.html))) {
        notes.push(`The cancellation e-mail to the host (${host.email}) could not be sent: tell them the dates are free again.`);
      }
    } else {
      notes.push("The host has no e-mail address on file, so they were not told about the cancellation.");
    }

    if (notes.length) {
      await alertAdminOnce(supabase, `cancel:${booking.id}`, "Cancellation needs a look", [
        describeBooking(booking),
        `Cancelled by: ${by}. Refunded to the guest in total: ${money(facts.refundAmount, currency)} (now: ${money(plan.refundNow, currency)}). Taken from the host's share: ${money(reconciled.takenBack, currency)} of ${money(hostAmount, currency)}${reconciled.charged > 0 ? ` (${money(reconciled.charged, currency)} of it as a host charge, from their next payout)` : ""}.`,
        ...notes,
      ]).catch((alertError) => console.error("[CANCEL-BOOKING] Alert failed:", errorText(alertError)));
    }

    return json({
      cancelled: true,
      cancelledBy: by,
      requestedOn,
      refundPercentage: plan.refundPercentage,
      // Refunded by this call; totalRefunded is the guest's total
      refundAmount: plan.refundNow,
      totalRefunded: facts.refundAmount,
      hostTakenBack: reconciled.takenBack,
      hostTakenBackNow: reconciled.reversedNow,
      hostFromNextPayout: facts.hostFromNextPayout,
      hostRemaining: facts.hostRemaining,
      cardFeeCharged: cardFeeCharge,
      hostPayoutStatus: reconciled.status,
      warnings: notes,
    });
  } catch (error) {
    const message = errorText(error);
    console.error("[CANCEL-BOOKING]", message);
    return json({ error: message }, 500);
  } finally {
    await lock?.release();
  }
});
