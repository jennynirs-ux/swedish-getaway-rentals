import { describe, expect, it } from "vitest";
import { pickQuotes } from "@/components/home/GuestQuotes";

const villa = { id: "1", slug: "lakefront-retreat", title: "Villa", city: "lerum" };
const lakehouse = { id: "2", slug: "lakehouse-getaway", title: "Lakehouse", city: "lerum" };
const newHost = { id: "3", slug: "someone-elses-cabin", title: "New cabin", city: "åre" };

describe("pickQuotes", () => {
  it("takes one quote from each cabin in turn", () => {
    const picked = pickQuotes([villa, lakehouse]);
    expect(picked.map((q) => q.nickname)).toEqual(["Villa Häcken", "Lakehouse Getaway", "Villa Häcken"]);
    expect(new Set(picked.map((q) => q.text)).size).toBe(3);
  });

  it("skips cabins without written content", () => {
    expect(pickQuotes([newHost, lakehouse]).every((q) => q.nickname === "Lakehouse Getaway")).toBe(true);
    expect(pickQuotes([newHost])).toEqual([]);
  });

  it("carries the cabin's town and the review source for the caption", () => {
    const [first] = pickQuotes([villa]);
    expect(first.property.city).toBe("lerum");
    expect(first.source).toBe("Airbnb review");
  });
});
