import { describe, expect, it } from "vitest";
import { isLocalizedPath, langOfPath, localizedPath, stripLang } from "./index";

describe("localizedPath", () => {
  it("prefixes guest pages outside English", () => {
    expect(localizedPath("/cabins", "sv")).toBe("/sv/cabins");
    expect(localizedPath("/", "de")).toBe("/de");
    expect(localizedPath("/property/x/guide", "de")).toBe("/de/property/x/guide");
    expect(localizedPath("/cabins", "en")).toBe("/cabins");
  });

  it("keeps query strings and fragments", () => {
    expect(localizedPath("/?checkIn=2026-12-01", "sv")).toBe("/sv?checkIn=2026-12-01");
    expect(localizedPath("/#cabins", "sv")).toBe("/sv#cabins");
    expect(localizedPath("/cabins?guests=2", "de")).toBe("/de/cabins?guests=2");
  });

  it("moves a path from one language to another", () => {
    expect(localizedPath("/sv/cabins", "de")).toBe("/de/cabins");
    expect(localizedPath("/sv/cabins", "en")).toBe("/cabins");
    expect(localizedPath("/sv", "en")).toBe("/");
  });

  it("leaves single-language pages and other links alone", () => {
    expect(localizedPath("/host-dashboard", "sv")).toBe("/host-dashboard");
    expect(localizedPath("/auth?mode=signup", "de")).toBe("/auth?mode=signup");
    expect(localizedPath("/admin", "sv")).toBe("/admin");
    expect(localizedPath("/pricing-guide", "sv")).toBe("/pricing-guide");
    expect(localizedPath("https://example.com", "sv")).toBe("https://example.com");
    expect(localizedPath("#top", "sv")).toBe("#top");
    expect(localizedPath("//cdn.example.com/x", "sv")).toBe("//cdn.example.com/x");
  });

  it("sends Swedish guests to /bli-vard and everyone else to /become-host", () => {
    expect(localizedPath("/become-host", "sv")).toBe("/bli-vard");
    expect(localizedPath("/become-host", "de")).toBe("/become-host");
    expect(localizedPath("/bli-vard", "en")).toBe("/become-host");
    expect(localizedPath("/become-host#how", "sv")).toBe("/bli-vard#how");
  });

  it("doesn't take a page that starts like a language for one", () => {
    expect(stripLang("/svenska")).toBe("/svenska");
    expect(langOfPath("/delivery")).toBe("en");
    expect(localizedPath("/shop", "sv")).toBe("/sv/shop");
  });
});

describe("stripLang and isLocalizedPath", () => {
  it("strips the prefix", () => {
    expect(stripLang("/sv/cabins")).toBe("/cabins");
    expect(stripLang("/de")).toBe("/");
    expect(stripLang("/sv?x=1")).toBe("/?x=1");
    expect(stripLang("/cabins")).toBe("/cabins");
    expect(langOfPath("/de/cabins")).toBe("de");
  });

  it("knows which pages exist in every language", () => {
    expect(isLocalizedPath("/sv/cabins")).toBe(true);
    expect(isLocalizedPath("/")).toBe(true);
    expect(isLocalizedPath("/host-dashboard")).toBe(false);
    expect(isLocalizedPath("/bli-vard")).toBe(false);
  });
});
