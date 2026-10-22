import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { CANCELLATION_POLICIES, POLICY_KEYS } from "../../supabase/functions/_shared/cancellation";

// scripts/prerender.mjs (plain Node) keeps its own copy of each policy's name
// and summary for llms.txt: they must say what the refunds do
it("llms.txt names each cancellation policy as the refunds follow it", () => {
  const script = readFileSync("scripts/prerender.mjs", "utf8");
  for (const key of POLICY_KEYS) {
    const { name, summary } = CANCELLATION_POLICIES[key];
    expect(script).toContain(`${key}: "${name} (${summary})"`);
  }
});
