import { describe, expect, it } from "vitest";
// The e-mails cancel-booking sends to the guest and the host
import {
  type CancellationFacts,
  guestCancellationEmail,
  hostCancellationEmail,
  money,
} from "../../supabase/functions/_shared/host-emails";
import { longDate } from "../../supabase/functions/_shared/format";

// Host price 10 000 kr + 10 % fee: the guest paid 11 000 kr. Guest cancels 30
// days out: 90 % of the host's price back, the fee is kept.
const guestCancels: CancellationFacts = {
  propertyTitle: "Lakehouse",
  checkIn: "2026-12-20",
  checkOut: "2026-12-27",
  guestName: "Anna",
  cancelledBy: "guest",
  requestedOn: "2026-11-20",
  daysBeforeArrival: 30,
  refundPercentage: 90,
  refundTarget: 900_000,
  refundAmount: 900_000,
  refundedEarlier: 0,
  serviceFeeKept: 100_000,
  hostTakenBack: 900_000,
  hostFromNextPayout: 0,
  hostRemaining: 100_000,
  cardFeeCharge: 0,
  payoutBefore: "held",
  payoutDueOn: "2026-12-21",
  hasPayment: true,
  currency: "SEK",
};

const hostCancels: CancellationFacts = {
  ...guestCancels,
  cancelledBy: "host",
  refundPercentage: 100,
  refundTarget: 1_100_000,
  refundAmount: 1_100_000,
  serviceFeeKept: 0,
  hostTakenBack: 1_000_000,
  hostRemaining: 0,
  cardFeeCharge: 16_680,
};

const platformCancels: CancellationFacts = { ...hostCancels, cancelledBy: "platform", cardFeeCharge: 0 };

// Swedish digit grouping uses a no-break space; compare without it
const text = (html: string) => html.replace(/ /g, " ");

describe("money", () => {
  it("formats öre as kronor with the currency", () => {
    expect(text(money(990_000))).toBe("9 900 SEK");
    expect(text(money(16_680, "sek"))).toBe("166,80 SEK");
    expect(text(money(16_605))).toBe("166,05 SEK");
  });
});

describe("guest cancellation e-mail", () => {
  it("guest cancels: refund of the host's price, service fee kept", () => {
    const { subject, html } = guestCancellationEmail(guestCancels, "90% refund more than 21 days before arrival");
    expect(subject).toBe("Your booking is cancelled – Lakehouse");
    expect(text(html)).toContain("We have refunded 9 000 SEK: 90% of the accommodation price");
    expect(text(html)).toContain("The service fee (1 000 SEK) is not refunded when a guest cancels");
    // longDate's weekday comma depends on the ICU version
    expect(html).toContain(`${longDate("2026-11-20")}, 30 days before arrival`);
  });

  it("an earlier refund (e.g. goodwill in the dashboard) is stated apart from the policy refund", () => {
    // 2 000 refunded earlier, then the guest cancels at 90 %: 7 000 more
    const withEarlier = { ...guestCancels, refundedEarlier: 200_000 };
    const body = text(guestCancellationEmail(withEarlier, "").html);
    expect(body).toContain("Our cancellation policy gives 90% of the accommodation price (9 000 SEK)");
    expect(body).toContain("You had already been refunded 2 000 SEK, so we have now refunded the remaining 7 000 SEK. In total you get 9 000 SEK back.");
    expect(body).not.toContain("We have refunded 9 000 SEK: 90%");
  });

  it("an earlier refund larger than the policy refund: nothing more, and no wrong percentage", () => {
    const late = { ...guestCancels, daysBeforeArrival: 3, refundPercentage: 0, refundTarget: 0, refundAmount: 200_000, refundedEarlier: 200_000 };
    const body = text(guestCancellationEmail(late, "").html);
    expect(body).toContain("Our cancellation policy gives 0% of the accommodation price (0 SEK)");
    expect(body).toContain("You had already been refunded 2 000 SEK, so nothing more is refunded. In total you get 2 000 SEK back.");
    expect(body).not.toContain("We have refunded 2 000 SEK: 0%");
  });

  it("guest cancels late: no refund", () => {
    const late = { ...guestCancels, daysBeforeArrival: 5, refundPercentage: 0, refundAmount: 0, hostTakenBack: 0, hostRemaining: 1_000_000 };
    const { html } = guestCancellationEmail(late, "no refund 7 days or less before arrival");
    expect(html).toContain("is not refunded");
    expect(html).not.toContain("We have refunded");
  });

  it("host or we cancel: everything back, service fee included", () => {
    expect(text(guestCancellationEmail(hostCancels, "").html)).toContain(
      "the host has had to cancel your booking",
    );
    expect(text(guestCancellationEmail(hostCancels, "").html)).toContain("service fee included: we have refunded 11 000 SEK");
    expect(guestCancellationEmail(platformCancels, "").html).toContain("we have had to cancel your booking");
  });

  it("says nothing is refunded when the guest didn't pay on the site", () => {
    const { html } = guestCancellationEmail({ ...guestCancels, hasPayment: false, refundAmount: 0 }, "");
    expect(html).toContain("nothing to refund here");
    expect(html).not.toContain("service fee (");
  });

  it("escapes every value", () => {
    const { html } = guestCancellationEmail(
      { ...guestCancels, guestName: "<script>x</script>", propertyTitle: "Sjö & <b>stuga</b>" },
      "<i>policy</i>",
    );
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("Sjö &amp; &lt;b&gt;stuga&lt;/b&gt;");
    expect(html).toContain("&lt;i&gt;policy&lt;/i&gt;");
  });
});

describe("host cancellation e-mail (M8)", () => {
  it("guest cancels: refund %, amount taken back, what is left and when", () => {
    const { subject, html } = hostCancellationEmail(guestCancels, "Jon");
    expect(subject).toBe("Booking cancelled – Lakehouse, 2026-12-20 to 2026-12-27");
    const body = text(html);
    expect(body).toContain("Hi Jon,");
    expect(body).toContain("is cancelled by the guest");
    expect(body).toContain("the guest gets 90% of your price back: 9 000 SEK");
    expect(body).toContain("9 000 SEK is taken back from your payout");
    expect(body).toContain(`You keep 1 000 SEK for this booking, paid out to your bank on ${longDate("2026-12-21")}`);
    expect(body).toContain("The dates are open again");
    expect(body).not.toContain("card fee");
  });

  it("host cancels: whole payout taken back and the card fee charged", () => {
    const body = text(hostCancellationEmail(hostCancels, "Jon").html);
    expect(body).toContain("cancelled at your request");
    expect(body).toContain("10 000 SEK is taken back from your payout");
    expect(body).toContain("You receive nothing for this booking");
    expect(body).toContain("The card fee for the guest's payment, 166,80 SEK, is charged to you");
  });

  it("we cancel: we pay the card fee", () => {
    const body = text(hostCancellationEmail(platformCancels, "Jon").html);
    expect(body).toContain("cancelled by us");
    expect(body).toContain("We pay the card fee");
  });

  it("a refund after the payout reached the host's bank is taken from their next payout", () => {
    const body = text(hostCancellationEmail({ ...guestCancels, payoutBefore: "paid_out", hostFromNextPayout: 900_000 }, "Jon").html);
    expect(body).toContain("Your payout for this booking had already been paid to your bank, so 9 000 SEK is taken from your next payout instead.");
    expect(body).not.toContain("is taken back from your payout for this booking");
    expect(body).not.toContain("paid out to your bank on");
    expect(body).not.toContain("negative");
    expect(body).not.toContain("contact you");
  });

  it("held but partly paid out: the rest of the reduction comes from the next payout", () => {
    const partly = { ...guestCancels, refundPercentage: 50, refundTarget: 500_000, refundAmount: 500_000, hostTakenBack: 500_000, hostFromNextPayout: 100_000, hostRemaining: 500_000 };
    const body = text(hostCancellationEmail(partly, "Jon").html);
    expect(body).toContain("4 000 SEK is taken back from your payout for this booking.");
    expect(body).toContain("Part of this booking had already been paid out to you, so 1 000 SEK of it is taken from your next payout instead.");
  });

  it("part of the booking went to amounts the host owed us: says so, not just 'paid out'", () => {
    const usedHeld = { ...guestCancels, hostTakenBack: 900_000, hostFromNextPayout: 400_000, hostRemaining: 100_000, shareUsedForCharges: true };
    let body = text(hostCancellationEmail(usedHeld, "Jon").html);
    expect(body).toContain("5 000 SEK is taken back from your payout for this booking.");
    expect(body).toContain(
      "Part of this booking had already been paid out or used for amounts you owed us, so 4 000 SEK of it is taken from your next payout instead.",
    );
    expect(body).not.toContain("paid out to you,");
    body = text(hostCancellationEmail({ ...guestCancels, payoutBefore: "paid_out", hostFromNextPayout: 500_000, shareUsedForCharges: true }, "Jon").html);
    expect(body).toContain(
      "Your share of this booking had already been paid out or used for amounts you owed us, so 5 000 SEK is taken from your next payout instead.",
    );
  });

  it("states an earlier refund apart from the policy percentage", () => {
    const body = text(hostCancellationEmail({ ...guestCancels, refundedEarlier: 200_000 }, "Jon").html);
    expect(body).toContain("the guest gets 90% of your price back: 9 000 SEK. The guest had already been refunded 2 000 SEK earlier; in total they get 9 000 SEK back.");
  });

  it("manual payouts: reduced, paid by hand", () => {
    const body = text(hostCancellationEmail({ ...guestCancels, payoutBefore: "manual" }, "Jon").html);
    expect(body).toContain("Your payout for this booking is reduced by 9 000 SEK");
    expect(body).toContain("we pay it to you by hand");
  });

  it("escapes every value and greets someone without a name", () => {
    const { html } = hostCancellationEmail({ ...guestCancels, guestName: "<img src=x onerror=alert(1)>" }, "");
    expect(html).toContain("Hi there,");
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;img src=x onerror=alert(1)&gt;");
  });
});
