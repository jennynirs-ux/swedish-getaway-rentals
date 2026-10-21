import { describe, expect, it } from "vitest";
import { isNewListing, rankForHome, sortForHome, type HomeListing } from "@/lib/homeListings";

const gallery = ["1", "2", "3", "4", "5"];

const listing = (id: string, host_id: string, created_at: string, complete = true): HomeListing => ({
  id,
  host_id,
  created_at,
  hero_image_url: complete ? `${id}.jpg` : null,
  gallery_images: complete ? gallery : [],
});

describe("sortForHome", () => {
  it("puts complete listings first, then the newest", () => {
    const sorted = sortForHome([
      listing("old", "a", "2026-01-01T00:00:00Z"),
      listing("bare", "b", "2026-10-01T00:00:00Z", false),
      listing("new", "c", "2026-09-01T00:00:00Z"),
    ]);
    expect(sorted.map((p) => p.id)).toEqual(["new", "old", "bare"]);
  });

  it("needs a hero photo and 5 gallery photos to count as complete", () => {
    const fewPhotos = { ...listing("few", "a", "2026-10-01T00:00:00Z"), gallery_images: ["1", "2", "3", "4"] };
    const sorted = sortForHome([fewPhotos, listing("full", "b", "2026-01-01T00:00:00Z")]);
    expect(sorted.map((p) => p.id)).toEqual(["full", "few"]);
  });

  it("breaks a created_at tie by id, whatever the input order", () => {
    const a = listing("6618e8ae", "owners", "2025-09-29T12:00:00Z");
    const b = listing("3f0002c9", "owners", "2025-09-29T12:00:00Z");
    expect(sortForHome([a, b]).map((p) => p.id)).toEqual(["3f0002c9", "6618e8ae"]);
    expect(sortForHome([b, a]).map((p) => p.id)).toEqual(["3f0002c9", "6618e8ae"]);
  });
});

describe("rankForHome", () => {
  const day = (d: number) => `2026-10-${String(d).padStart(2, "0")}T00:00:00Z`;

  it("does not cap hosts while every cabin fits", () => {
    const six = [1, 2, 3, 4, 5, 6].map((d) => listing(`a${d}`, "a", day(d)));
    expect(rankForHome(six)).toHaveLength(6);
  });

  it("shows at most 2 cabins per host once there are more than 6", () => {
    const big = [1, 2, 3, 4, 5].map((d) => listing(`big${d}`, "big", day(20 + d)));
    const others = ["b", "c", "d"].map((h, i) => listing(`${h}1`, h, day(1 + i)));
    const ranked = rankForHome([...big, ...others]);
    expect(ranked.map((p) => p.id)).toEqual(["big5", "big4", "d1", "c1", "b1", "big3"]);
  });

  it("fills the shelf from skipped cabins when there are too few hosts", () => {
    const a = [1, 2, 3, 4].map((d) => listing(`a${d}`, "a", day(d)));
    const b = [5, 6, 7, 8].map((d) => listing(`b${d}`, "b", day(d)));
    const ranked = rankForHome([...a, ...b]);
    expect(ranked).toHaveLength(6);
    expect(ranked.slice(0, 4).map((p) => p.id)).toEqual(["b8", "b7", "a4", "a3"]);
    expect(ranked.slice(4).map((p) => p.id)).toEqual(["b6", "b5"]);
  });
});

describe("isNewListing", () => {
  const now = new Date("2026-10-21T12:00:00Z");

  it("is new for 30 days without reviews", () => {
    expect(isNewListing({ id: "1", host_id: "h", created_at: "2026-10-01T00:00:00Z" }, now)).toBe(true);
    expect(isNewListing({ id: "1", host_id: "h", created_at: "2026-10-01T00:00:00Z", review_count: 0 }, now)).toBe(true);
  });

  it("is not new once older than 30 days, reviewed or without a date", () => {
    expect(isNewListing({ id: "1", host_id: "h", created_at: "2026-09-01T00:00:00Z" }, now)).toBe(false);
    expect(isNewListing({ id: "1", host_id: "h", created_at: "2026-10-01T00:00:00Z", review_count: 3 }, now)).toBe(false);
    expect(isNewListing({ id: "1", host_id: "h" }, now)).toBe(false);
  });
});
