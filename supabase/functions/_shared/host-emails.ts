import { escapeHtml } from "./auth.ts";
import { longDate } from "./format.ts";
import type { CancelledBy } from "./payout.ts";

// The e-mails a cancellation sends: the guest's and (M8) the host's. Built as
// pure functions so vitest can check them (src/lib/hostEmails.test.ts);
// callers send them with alert.ts sendEmail. Every value from the database or
// the admin is escaped. Amounts are öre.

// Same address as alert.ts SUPPORT_EMAIL; alert.ts itself can't be imported in
// unit tests (it loads npm:resend)
const SUPPORT = "support@mojjo.se";
const SIGNATURE = "<p>Jenny &amp; Jon, Nordic Getaways</p>";

export type { CancelledBy };

/** Where the host's share was before the cancellation */
export type PayoutBefore = "held" | "paid_out" | "manual" | "none";

export interface CancellationFacts {
  propertyTitle: string;
  checkIn: string;
  checkOut: string;
  guestName: string;
  cancelledBy: CancelledBy;
  /** The day the guest (or host) asked to cancel, "YYYY-MM-DD" */
  requestedOn: string;
  daysBeforeArrival: number;
  /** Guest cancels: the policy % of the host's price. Host or we cancel: 100 */
  refundPercentage: number;
  /** What the policy gives the guest back in total (guest cancels: refundPercentage of the host's price) */
  refundTarget: number;
  /** Refunded to the guest in total (an unfinished earlier attempt and earlier refunds included) */
  refundAmount: number;
  /** Of refundAmount, refunded before this cancellation (e.g. a goodwill refund in the Stripe dashboard) */
  refundedEarlier: number;
  /** The guest service fee we keep (guest cancels only) */
  serviceFeeKept: number;
  /** Taken from the host's share in total */
  hostTakenBack: number;
  /**
   * Of hostTakenBack, the part whose money had already been paid out to the
   * host: recorded as a host charge and taken from their next payout
   */
  hostFromNextPayout: number;
  /**
   * Of hostTakenBack, refunds after payout on this booking that were already
   * taken (from a payout, or from its own money returned by a failed payout)
   */
  hostTakenEarlier?: number;
  /**
   * Part of this booking's transfer was used to settle amounts the host owed
   * us (card fees, refunds after payout), which is why some of the reduction
   * can't come from it and is taken from the next payout instead
   */
  shareUsedForCharges?: boolean;
  /** What the host still receives for this booking */
  hostRemaining: number;
  /** The card fee charged to the host (host cancellations only) */
  cardFeeCharge: number;
  payoutBefore: PayoutBefore;
  /** When the host's remaining share is paid out, "YYYY-MM-DD" */
  payoutDueOn: string | null;
  /** Whether the guest paid by card on the site (else nothing is refunded here) */
  hasPayment: boolean;
  currency: string;
}

export interface Email {
  subject: string;
  html: string;
}

/** 990000 öre -> "9 900 SEK", 16680 -> "166,80 SEK" (Swedish digit grouping) */
export function money(ore: number, currency = "SEK"): string {
  const whole = Math.round(Number(ore) || 0);
  const amount = (whole / 100).toLocaleString("sv-SE", {
    minimumFractionDigits: whole % 100 ? 2 : 0,
    maximumFractionDigits: 2,
  });
  return `${amount} ${(currency || "SEK").toUpperCase()}`;
}

const stay = (f: CancellationFacts) =>
  `${escapeHtml(f.propertyTitle)}, ${escapeHtml(longDate(f.checkIn))} to ${escapeHtml(longDate(f.checkOut))}`;

const amount = (f: CancellationFacts, ore: number) => escapeHtml(money(ore, f.currency));

const requestLine = (f: CancellationFacts) =>
  `${escapeHtml(longDate(f.requestedOn))}, ${escapeHtml(f.daysBeforeArrival)} day${f.daysBeforeArrival === 1 ? "" : "s"} before arrival`;

/** The guest's "your booking is cancelled" e-mail; policySummaryText from cancellation.ts policySummary */
export function guestCancellationEmail(f: CancellationFacts, policySummaryText: string): Email {
  const lines: string[] = [`<p>Hi ${escapeHtml(f.guestName)},</p>`];

  if (f.cancelledBy === "guest") {
    lines.push(`<p>Your booking of ${stay(f)} is cancelled, as you asked.</p>`);
    const refundedNow = Math.max(0, f.refundAmount - f.refundedEarlier);
    if (!f.hasPayment) {
      lines.push("<p>Nothing was paid through our website for this booking, so there is nothing to refund here.</p>");
    } else if (f.refundedEarlier > 0) {
      // The policy refund on its own, then what earlier refunds change
      lines.push(
        `<p>The booking's cancellation policy gives ${escapeHtml(f.refundPercentage)}% of the accommodation price (${amount(f, f.refundTarget)}) for a cancellation received ${requestLine(f)}. You had already been refunded ${amount(f, f.refundedEarlier)}, so ${
          refundedNow > 0 ? `we have now refunded the remaining ${amount(f, refundedNow)}` : "nothing more is refunded"
        }. In total you get ${amount(f, f.refundAmount)} back.${refundedNow > 0 ? " It usually shows on your card within 5–10 business days." : ""}</p>`,
      );
    } else if (f.refundAmount > 0) {
      lines.push(
        `<p>We have refunded ${amount(f, f.refundAmount)}: ${escapeHtml(f.refundPercentage)}% of the accommodation price, which the booking's cancellation policy gives for a cancellation received ${requestLine(f)}. It usually shows on your card within 5–10 business days.</p>`,
      );
    } else {
      lines.push(
        `<p>Under the booking's cancellation policy, a cancellation received ${requestLine(f)} is not refunded.</p>`,
      );
    }
    if (f.hasPayment && f.serviceFeeKept > 0) {
      lines.push(`<p>The service fee (${amount(f, f.serviceFeeKept)}) is not refunded when a guest cancels.</p>`);
    }
    lines.push(
      `<p>The booking's cancellation policy, ${escapeHtml(policySummaryText)}. Refunds are a share of the accommodation price; the service fee is not refundable.</p>`,
    );
  } else {
    lines.push(
      f.cancelledBy === "host"
        ? `<p>We're sorry: the host has had to cancel your booking of ${stay(f)}.</p>`
        : `<p>We're sorry: we have had to cancel your booking of ${stay(f)}.</p>`,
    );
    lines.push(
      !f.hasPayment
        ? "<p>Nothing was paid through our website for this booking, so there is nothing to refund here.</p>"
        : f.refundAmount > 0
          ? `<p>You get back everything you paid, service fee included: we have refunded ${amount(f, f.refundAmount)}. It usually shows on your card within 5–10 business days.</p>`
          : "<p>Everything you paid has already been refunded.</p>",
    );
    lines.push("<p>If you'd like help finding another cabin or other dates, just reply to this e-mail.</p>");
  }

  lines.push(`<p>Questions? Reply to this e-mail or write to ${SUPPORT}.</p>`, SIGNATURE);
  return { subject: `Your booking is cancelled – ${f.propertyTitle}`, html: lines.join("\n") };
}

/** The host's "a booking was cancelled" e-mail (M8): what the guest gets, what leaves their payout, the dates reopen */
export function hostCancellationEmail(f: CancellationFacts, hostName: string): Email {
  const lines: string[] = [`<p>Hi ${escapeHtml(hostName || "there")},</p>`];

  const by = f.cancelledBy === "guest" ? "by the guest" : f.cancelledBy === "host" ? "at your request" : "by us";
  lines.push(`<p>The booking of ${stay(f)} (guest: ${escapeHtml(f.guestName)}) is cancelled ${by}.</p>`);

  if (!f.hasPayment) {
    lines.push("<p>The guest did not pay through our website, so no money moves for this booking.</p>");
  } else {
    const earlier = f.refundedEarlier > 0
      ? ` The guest had already been refunded ${amount(f, f.refundedEarlier)} earlier; in total they get ${amount(f, f.refundAmount)} back.`
      : "";
    if (f.cancelledBy === "guest") {
      lines.push(
        `<p>The cancellation reached us ${requestLine(f)}. Under the cancellation policy the guest gets ${escapeHtml(f.refundPercentage)}% of your price back: ${amount(f, f.refundTarget)}.${earlier}</p>`,
      );
    } else if (f.cancelledBy === "host") {
      lines.push(
        `<p>When a host cancels, the guest gets everything back (${amount(f, f.refundAmount)} in total), as the host terms say.</p>`,
      );
    } else {
      lines.push(`<p>We had to cancel it, so the guest gets everything back (${amount(f, f.refundAmount)} in total).</p>`);
    }

    // What the refund takes from the host: from this booking's payout while
    // it is still to come, from the next payout for whatever was already paid
    const takenEarlier = f.hostTakenEarlier ?? 0;
    const fromThisPayout = Math.max(0, f.hostTakenBack - f.hostFromNextPayout - takenEarlier);
    if (fromThisPayout > 0) {
      lines.push(
        f.payoutBefore === "manual" || f.payoutBefore === "none"
          ? `<p>Your payout for this booking is reduced by ${amount(f, fromThisPayout)}.</p>`
          : f.payoutBefore === "paid_out"
            ? `<p>${amount(f, fromThisPayout)} was taken from your payout for this booking before it was paid.</p>`
            : `<p>${amount(f, fromThisPayout)} is taken back from your payout for this booking.</p>`,
      );
    }
    if (takenEarlier > 0) {
      lines.push(`<p>${amount(f, takenEarlier)} of it was already deducted earlier, after an earlier refund on this booking.</p>`);
    }
    if (f.hostFromNextPayout > 0) {
      lines.push(
        f.payoutBefore === "paid_out"
          ? f.shareUsedForCharges
            ? `<p>Your share of this booking had already been paid out or used for amounts you owed us, so ${amount(f, f.hostFromNextPayout)} is taken from your next payout instead.</p>`
            : `<p>Your payout for this booking had already been paid to your bank, so ${amount(f, f.hostFromNextPayout)} is taken from your next payout instead.</p>`
          : f.shareUsedForCharges
            ? `<p>Part of this booking had already been paid out or used for amounts you owed us, so ${amount(f, f.hostFromNextPayout)} of it is taken from your next payout instead.</p>`
            : `<p>Part of this booking had already been paid out to you, so ${amount(f, f.hostFromNextPayout)} of it is taken from your next payout instead.</p>`,
      );
    }

    if (f.hostRemaining > 0) {
      const when =
        f.payoutBefore === "held" && f.payoutDueOn
          ? `, paid out to your bank on ${escapeHtml(longDate(f.payoutDueOn))}`
          : f.payoutBefore === "manual"
            ? "; we pay it to you by hand, since your Stripe account could not receive it"
            : "";
      lines.push(`<p>You keep ${amount(f, f.hostRemaining)} for this booking${when}.</p>`);
    } else if (f.payoutBefore !== "none") {
      lines.push("<p>You receive nothing for this booking.</p>");
    }

    if (f.cardFeeCharge > 0) {
      lines.push(
        `<p>The card fee for the guest's payment, ${amount(f, f.cardFeeCharge)}, is charged to you and deducted from your next payout.</p>`,
      );
    } else if (f.cancelledBy === "platform") {
      lines.push("<p>We pay the card fee; nothing is charged to you.</p>");
    }
  }

  lines.push(
    "<p>The dates are open again: on Nordic Getaways right away, and in the calendar link your other channels (Airbnb, Booking.com…) read at their next sync.</p>",
    `<p>Questions? Reply to this e-mail or write to ${SUPPORT}.</p>`,
    SIGNATURE,
  );
  return {
    subject: `Booking cancelled – ${f.propertyTitle}, ${f.checkIn.slice(0, 10)} to ${f.checkOut.slice(0, 10)}`,
    html: lines.join("\n"),
  };
}
