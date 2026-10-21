import { describe, expect, it } from "vitest";
import { stockholmDate } from "@/lib/constants";
import {
  financialYears,
  functionErrorMessage,
  hostNetAmount,
  leadDays,
  nightsBetween,
  stockholmYear,
  summarizeIncome,
  yearBounds,
} from "./reporting";

describe("financial year list", () => {
  it("is never a fixed list: it starts at the current year and goes back to the first stay", () => {
    expect(financialYears(2027, 2025, 2026)).toEqual([2027, 2026, 2025]);
    expect(financialYears(2027)).toEqual([2027]);
  });

  it("includes future check-in years and never drops the current year", () => {
    expect(financialYears(2026, 2025, 2027)).toEqual([2027, 2026, 2025]);
    expect(financialYears(2026, 2028, 2028)).toEqual([2028, 2027, 2026]);
    expect(financialYears(2026, null, null)).toEqual([2026]);
    expect(financialYears(2026, Number.NaN, Number.NaN)).toEqual([2026]);
  });

  it("uses Swedish time at the turn of the year", () => {
    expect(stockholmYear(new Date("2026-12-31T22:59:00Z"))).toBe(2026);
    expect(stockholmYear(new Date("2026-12-31T23:00:00Z"))).toBe(2027);
    expect(stockholmDate("2026-06-30T22:30:00Z")).toBe("2026-07-01");
  });

  it("includes 31 December on the date-column bounds", () => {
    expect(yearBounds(2026)).toEqual({ from: "2026-01-01", to: "2026-12-31" });
  });
});

describe("stay dates", () => {
  it("counts nights between dates, at least one, across DST", () => {
    expect(nightsBetween("2026-03-28", "2026-03-30")).toBe(2);
    expect(nightsBetween("2026-10-24", "2026-10-26")).toBe(2);
    expect(nightsBetween("2026-07-01", "2026-07-01")).toBe(1);
  });

  it("measures lead time from the Swedish booking date", () => {
    // Booked 00:30 on 1 July in Sweden for 3 July
    expect(leadDays("2026-06-30T22:30:00Z", "2026-07-03")).toBe(2);
    expect(leadDays("2026-07-05T10:00:00Z", "2026-07-03")).toBe(0);
  });
});

describe("host income (hostNetAmount from _shared/payout.ts, as the financial views use it)", () => {
  const paid = { stripe_payment_intent_id: "pi_1", total_amount: 1_100_000, service_fee: 100_000, host_amount: 1_000_000 };

  it("is the host's share, not the guest total", () => {
    expect(hostNetAmount({ ...paid, status: "confirmed" })).toBe(1_000_000);
    // Older bookings without host_amount: total minus service fee
    expect(hostNetAmount({ ...paid, host_amount: null, status: "completed" })).toBe(1_000_000);
  });

  it("subtracts what was taken back from the host", () => {
    // Guest cancelled 15 days out: 50% of the host amount refunded, the service fee kept by the platform
    const lateCancel = { ...paid, status: "cancelled", refunded_amount: 500_000, host_reversed_amount: 500_000 };
    expect(hostNetAmount(lateCancel)).toBe(500_000);
    // A partial refund on a stay
    expect(hostNetAmount({ ...paid, status: "confirmed", refunded_amount: 200_000, host_reversed_amount: 200_000 })).toBe(800_000);
  });

  it("counts a 0% refund cancellation in full and a full refund as nothing", () => {
    expect(hostNetAmount({ ...paid, status: "cancelled" })).toBe(1_000_000);
    // Host or platform cancelled: everything back to the guest, even if host_reversed_amount was not recorded
    expect(hostNetAmount({ ...paid, status: "cancelled", refunded_amount: 1_100_000 })).toBe(0);
    expect(hostNetAmount({ ...paid, status: "cancelled", refunded_amount: 1_100_000, host_reversed_amount: 1_000_000 })).toBe(0);
  });

  it("ignores unpaid bookings", () => {
    expect(hostNetAmount({ ...paid, stripe_payment_intent_id: null, status: "cancelled" })).toBe(0);
    expect(hostNetAmount({ ...paid, status: "payment_pending" })).toBe(0);
    expect(hostNetAmount({ ...paid, status: "pending" })).toBe(0);
  });

  it("counts cancellation income as revenue but not as nights or stays", () => {
    const s = summarizeIncome([
      { ...paid, status: "confirmed", check_in_date: "2026-07-01", check_out_date: "2026-07-04" },
      {
        ...paid,
        status: "cancelled",
        refunded_amount: 500_000,
        host_reversed_amount: 500_000,
        check_in_date: "2026-08-01",
        check_out_date: "2026-08-08",
      },
      { ...paid, status: "cancelled", refunded_amount: 1_100_000, check_in_date: "2026-09-01", check_out_date: "2026-09-02" },
    ]);
    expect(s).toEqual({
      stays: 1,
      nights: 3,
      stayIncomeOre: 1_000_000,
      cancellations: 1,
      cancellationIncomeOre: 500_000,
      incomeOre: 1_500_000,
    });
  });
});

describe("edge function errors", () => {
  const httpError = (body: string, status: number) =>
    Object.assign(new Error("Edge Function returned a non-2xx status code"), {
      context: new Response(body, { status, headers: { "Content-Type": "application/json" } }),
    });

  it("shows the function's own message", async () => {
    expect(await functionErrorMessage(httpError(JSON.stringify({ error: "No properties found" }), 404), "x")).toBe(
      "No properties found"
    );
  });

  it("falls back with the status when the body is not JSON", async () => {
    expect(await functionErrorMessage(httpError("<html>Bad gateway</html>", 502), "Could not generate")).toBe(
      "Could not generate (HTTP 502)"
    );
  });

  it("keeps network errors' own message", async () => {
    expect(await functionErrorMessage(new Error("Failed to send a request to the Edge Function"), "x")).toBe(
      "Failed to send a request to the Edge Function"
    );
    expect(await functionErrorMessage(null, "fallback")).toBe("fallback");
  });
});
