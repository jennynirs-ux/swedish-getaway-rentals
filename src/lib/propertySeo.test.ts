import { describe, expect, it } from "vitest";
import { PROPERTY_CONTENT } from "@/content/propertyContent";
import {
  META_DESCRIPTION_MAX,
  buildPropertyJsonLd,
  propertyMetaDescription,
  type SeoProperty,
} from "@/lib/propertySeo";

// Villa Häcken as the database holds it
const villaHacken: SeoProperty = {
  id: "6618e8ae-e1ff-4a3b-8f6b-b3287c881d12",
  slug: "lakefront-retreat",
  title: "Peaceful lakefront retreat surrounded by nature",
  description:
    "Villa Häcken: a light-filled lake house on Stora Härsjön with private jetty, sandy beach and hot tub, 30 minutes from Gothenburg. Sleeps 8: three bedrooms plus four beds in the living room.",
  location: "Lerum, Sweden",
  city: "lerum",
  country: "Sverige",
  price_per_night: 8000,
  currency: "SEK",
  bedrooms: 3,
  bathrooms: 2,
  max_guests: 8,
  amenities: ["Hot tub"],
  hero_image_url: "hero.jpg",
  gallery_images: [],
  review_rating: 4.98,
  review_count: 51,
  latitude: 57.7712,
  longitude: 12.3456,
  service_fee_rate: 10,
  check_in_time: "16:00:00",
  check_out_time: "11:00:00",
};

const newHost: SeoProperty = {
  ...villaHacken,
  id: "00000000-0000-0000-0000-000000000001",
  slug: "fjallstuga-are",
  title: "Fjällstuga with sauna",
  description:
    "A timber cabin at the foot of Åreskutan with a wood-fired sauna, ski-in from the slope and a view over the lake. Four beds, a drying room for gear and fast wifi.",
  location: "Åre, Sweden",
  city: "åre",
  review_rating: undefined,
  review_count: undefined,
};

const rentalOf = (p: SeoProperty, content = PROPERTY_CONTENT[p.slug ?? ""]) => {
  const ld = buildPropertyJsonLd(p, content);
  return (Array.isArray(ld) ? ld[0] : ld) as Record<string, unknown> & {
    address: { addressLocality?: string; addressCountry: string };
  };
};

describe("buildPropertyJsonLd", () => {
  it("gives Villa Häcken its check-in and check-out times and SE", () => {
    const rental = rentalOf(villaHacken);
    expect(rental.checkinTime).toBe("16:00");
    expect(rental.checkoutTime).toBe("11:00");
    expect(rental.address.addressCountry).toBe("SE");
    expect(rental.address.addressLocality).toBe("Lerum");
  });

  it.each(["Sverige", "Sweden", "SE", "se", "", "  "])("reads country %j as SE", (country) => {
    expect(rentalOf({ ...newHost, country }).address.addressCountry).toBe("SE");
  });

  it("falls back to the country in the location when the column is empty", () => {
    expect(rentalOf({ ...newHost, country: null }).address.addressCountry).toBe("SE");
    expect(rentalOf({ ...newHost, country: null, location: "Tromsø, Norway" }).address.addressCountry).toBe("Norway");
  });

  it("capitalises the lower-case city", () => {
    expect(rentalOf({ ...newHost, city: "åre" }).address.addressLocality).toBe("Åre");
    expect(rentalOf({ ...newHost, city: "upplands-bro" }).address.addressLocality).toBe("Upplands-Bro");
    expect(rentalOf({ ...newHost, city: "lilla edet" }).address.addressLocality).toBe("Lilla Edet");
  });

  it("uses the town in the location when there is no city", () => {
    expect(rentalOf({ ...newHost, city: null, location: "Åre, Sweden" }).address.addressLocality).toBe("Åre");
    expect(rentalOf({ ...newHost, city: "  ", location: "Åre, Sweden" }).address.addressLocality).toBe("Åre");
  });

  it("leaves the times out when the listing has none", () => {
    const rental = rentalOf({ ...newHost, check_in_time: null, check_out_time: undefined });
    expect(rental).not.toHaveProperty("checkinTime");
    expect(rental).not.toHaveProperty("checkoutTime");
  });

  it("shortens database times to HH:MM", () => {
    const rental = rentalOf({ ...newHost, check_in_time: "15:30:00", check_out_time: "10:00:00" });
    expect(rental.checkinTime).toBe("15:30");
    expect(rental.checkoutTime).toBe("10:00");
  });
});

describe("propertyMetaDescription", () => {
  const ownerContent = PROPERTY_CONTENT["lakefront-retreat"];

  it("names Airbnb as the rating source for an owner cabin, within the limit", () => {
    const text = propertyMetaDescription(villaHacken, ownerContent);
    expect(text.length).toBeLessThanOrEqual(META_DESCRIPTION_MAX);
    expect(text).toContain("Airbnb rating 4.98/5 from 51 guests.");
    expect(text.startsWith("Villa Häcken in Lerum, Sweden. Sleeps 8, 3 bedrooms, from 8800 SEK/night")).toBe(true);
  });

  it("does not credit Airbnb for other listings' ratings", () => {
    const text = propertyMetaDescription({ ...newHost, review_rating: 4.9, review_count: 12 });
    expect(text).toContain("Rated 4.9/5 by 12 guests.");
    expect(text).not.toContain("Airbnb");
  });

  it("keeps some of the host's text when it fits", () => {
    const text = propertyMetaDescription(newHost);
    expect(text.length).toBeLessThanOrEqual(META_DESCRIPTION_MAX);
    expect(text).toContain("A timber cabin at the foot of Åreskutan");
    expect(text.endsWith("…")).toBe(true);
  });

  it("stays within the limit with a very long title", () => {
    const text = propertyMetaDescription({ ...newHost, title: "Cosy ".repeat(40).trim(), review_rating: 4.9, review_count: 12 });
    expect(text.length).toBeLessThanOrEqual(META_DESCRIPTION_MAX);
  });

  it("stays within the limit for both owner cabins", () => {
    for (const slug of Object.keys(PROPERTY_CONTENT)) {
      const text = propertyMetaDescription({ ...villaHacken, slug, review_count: 251 }, PROPERTY_CONTENT[slug]);
      expect(text.length).toBeLessThanOrEqual(META_DESCRIPTION_MAX);
      expect(text).toContain("Airbnb rating");
    }
  });
});
