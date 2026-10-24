import { describe, expect, it } from "vitest";
// The rules the cancel-booking edge function applies
import {
  CANCELLATION_POLICIES,
  daysBeforeArrival,
  policyFor,
  policySummary,
  policyText,
  POLICY_FOOTER,
  POLICY_KEYS,
  refundPercentage,
  tierLabel,
  tierRefund,
} from "../../supabase/functions/_shared/cancellation";

// The owners' cabins, and every booking made before hosts chose a policy
const policy = CANCELLATION_POLICIES.standard;

describe("cancellation policy Standard (90/50/0)", () => {
  it.each([
    [30, 90],
    [22, 90],
    [21, 50],
    [8, 50],
    [7, 0],
    [0, 0],
  ])("%i days before arrival refunds %i%%", (days, pct) => {
    expect(refundPercentage(policy, days)).toBe(pct);
  });

  it("counts whole days from the Swedish date", () => {
    expect(daysBeforeArrival("2026-10-30", "2026-10-08")).toBe(22);
    expect(daysBeforeArrival("2026-10-30", "2026-10-29")).toBe(1);
  });

  it("describes the policy for e-mails", () => {
    expect(policySummary(policy)).toBe(
      "90% refund more than 21 days before arrival; 50% refund 21–8 days before arrival; no refund 7 days or less before arrival",
    );
  });
});

describe("the other policies", () => {
  it.each([
    ["flexible", 30, 100],
    ["flexible", 1, 100],
    ["flexible", 0, 0],
    ["moderate", 5, 100],
    ["moderate", 4, 50],
    ["moderate", 1, 50],
    ["moderate", 0, 0],
    ["strict", 60, 50],
    ["strict", 14, 50],
    ["strict", 13, 0],
  ] as const)("%s, %i days before arrival: %i%%", (key, days, pct) => {
    expect(refundPercentage(CANCELLATION_POLICIES[key], days)).toBe(pct);
  });

  it("covers every day from arrival onwards, with no gaps or overlaps", () => {
    for (const key of POLICY_KEYS) {
      for (let days = 0; days <= 400; days++) {
        const matching = CANCELLATION_POLICIES[key].tiers.filter(
          (t) => days >= t.min_days && (t.max_days === undefined || days <= t.max_days),
        );
        expect(matching, `${key} ${days}`).toHaveLength(1);
      }
    }
  });

  it("has a Swedish name and summary for the host panel", () => {
    for (const key of POLICY_KEYS) {
      expect(CANCELLATION_POLICIES[key].nameSv.trim(), key).not.toBe("");
      expect(CANCELLATION_POLICIES[key].summarySv.trim(), key).not.toBe("");
    }
  });

  it("falls back to Standard for a missing or unknown key", () => {
    expect(policyFor(null).key).toBe("standard");
    expect(policyFor("lenient").key).toBe("standard");
    expect(policyFor("strict").key).toBe("strict");
  });
});

describe("the policies in the guest's language", () => {
  it("is the policy itself in English", () => {
    for (const key of POLICY_KEYS) {
      const policy = CANCELLATION_POLICIES[key];
      expect(policyText(key)).toEqual({
        name: policy.name,
        summary: policy.summary,
        tiers: policy.tiers.map((t) => t.label),
        footer: POLICY_FOOTER,
      });
      expect(policyText(key, "en")).toEqual(policyText(key));
    }
  });

  it("has every text, and a label per tier, in Swedish and German", () => {
    for (const lang of ["sv", "de"] as const) {
      for (const key of POLICY_KEYS) {
        const text = policyText(key, lang);
        expect(text.name.trim(), `${lang} ${key}`).not.toBe("");
        expect(text.summary.trim(), `${lang} ${key}`).not.toBe("");
        expect(text.footer).not.toBe(POLICY_FOOTER);
        expect(text.tiers).toHaveLength(CANCELLATION_POLICIES[key].tiers.length);
        CANCELLATION_POLICIES[key].tiers.forEach((tier, i) => {
          expect(tierLabel(tier, lang)).toBe(text.tiers[i]);
          expect(tierLabel(tier, lang)).not.toBe(tier.label);
        });
      }
    }
  });

  it("names the policies", () => {
    expect(POLICY_KEYS.map((key) => policyText(key, "sv").name)).toEqual(["Flexibel", "Måttlig", "Standard", "Strikt"]);
    expect(POLICY_KEYS.map((key) => policyText(key, "de").name)).toEqual(["Flexibel", "Moderat", "Standard", "Streng"]);
  });

  it("states each tier's refund", () => {
    const [first, , last] = policy.tiers;
    expect(tierRefund(first)).toBe("90% refund");
    expect(tierRefund(last)).toBe("No refund");
    expect(tierRefund(first, "sv")).toBe("90 % återbetalning");
    expect(tierRefund(last, "de")).toBe("Keine Rückerstattung");
  });

  it("describes the policy in Swedish and German", () => {
    expect(policySummary(policy, "sv")).toBe(
      "Mer än 21 dagar före ankomst: 90 % återbetalning; 21–8 dagar före ankomst: 50 % återbetalning; 7 dagar eller mindre före ankomst: ingen återbetalning",
    );
    expect(policySummary(CANCELLATION_POLICIES.flexible, "de")).toBe(
      "1 Tag oder mehr vor Anreise: 100 % Rückerstattung; am Anreisetag: keine Rückerstattung",
    );
  });
});
