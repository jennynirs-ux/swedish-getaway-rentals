import { beforeAll, describe, expect, it } from "vitest";

// The edge functions read the key from Deno.env; a test key here
beforeAll(() => {
  const key = Buffer.from(Array.from({ length: 32 }, (_, i) => i)).toString("base64");
  (globalThis as { Deno?: unknown }).Deno = { env: { get: (name: string) => (name === "TAX_ID_KEY" ? key : undefined) } };
});

describe("tax number encryption", () => {
  it("decrypts what it encrypted, with a new IV each time", async () => {
    const { decryptTaxId, encryptTaxId } = await import("../../supabase/functions/_shared/tax-crypto");
    const a = await encryptTaxId("198503121231");
    const b = await encryptTaxId("198503121231");
    expect(a).toMatch(/^v1:[^:]+:[^:]+$/);
    expect(a).not.toBe(b);
    expect(a).not.toContain("198503121231");
    expect(await decryptTaxId(a)).toBe("198503121231");
    await expect(decryptTaxId(a.replace(/.$/, (c) => (c === "A" ? "B" : "A")))).rejects.toThrow();
  });

  it("hashes the same country and number the same way", async () => {
    const { taxIdHash } = await import("../../supabase/functions/_shared/tax-crypto");
    expect(await taxIdHash("SE", "198503121231")).toBe(await taxIdHash("SE", "198503121231"));
    expect(await taxIdHash("SE", "198503121231")).not.toBe(await taxIdHash("NO", "198503121231"));
  });
});
