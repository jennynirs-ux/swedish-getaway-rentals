// Swedish counties (län), stored on properties.county as ISO 3166-2:SE codes.
// The database only accepts these 21 codes (20261021210000_property_county.sql),
// so keep the two lists in step. The slug is the future /cabins/<slug> URL; the
// hint is muted text under the region name, left empty until it is written.

export type CountyCode =
  | "SE-AB" | "SE-AC" | "SE-BD" | "SE-C" | "SE-D" | "SE-E" | "SE-F"
  | "SE-G" | "SE-H" | "SE-I" | "SE-K" | "SE-M" | "SE-N" | "SE-O"
  | "SE-S" | "SE-T" | "SE-U" | "SE-W" | "SE-X" | "SE-Y" | "SE-Z";

export interface Region {
  code: CountyCode;
  slug: string;
  name: string;
  hint: string;
}

export const REGIONS: readonly Region[] = [
  { code: "SE-AB", slug: "stockholm", name: "Stockholm", hint: "Stockholm & the archipelago" },
  { code: "SE-AC", slug: "vasterbotten", name: "Västerbotten", hint: "" },
  { code: "SE-BD", slug: "norrbotten", name: "Norrbotten", hint: "Swedish Lapland" },
  { code: "SE-C", slug: "uppsala", name: "Uppsala", hint: "" },
  { code: "SE-D", slug: "sodermanland", name: "Södermanland", hint: "" },
  { code: "SE-E", slug: "ostergotland", name: "Östergötland", hint: "" },
  { code: "SE-F", slug: "jonkoping", name: "Jönköping", hint: "" },
  { code: "SE-G", slug: "kronoberg", name: "Kronoberg", hint: "Småland lakes & forests" },
  { code: "SE-H", slug: "kalmar", name: "Kalmar", hint: "Småland coast & Öland" },
  { code: "SE-I", slug: "gotland", name: "Gotland", hint: "Visby & the island" },
  { code: "SE-K", slug: "blekinge", name: "Blekinge", hint: "" },
  { code: "SE-M", slug: "skane", name: "Skåne", hint: "Malmö & the south coast" },
  { code: "SE-N", slug: "halland", name: "Halland", hint: "West Coast beaches" },
  { code: "SE-O", slug: "vastra-gotaland", name: "Västra Götaland", hint: "Gothenburg & the West Coast" },
  { code: "SE-S", slug: "varmland", name: "Värmland", hint: "Lakes & forests" },
  { code: "SE-T", slug: "orebro", name: "Örebro", hint: "" },
  { code: "SE-U", slug: "vastmanland", name: "Västmanland", hint: "" },
  { code: "SE-W", slug: "dalarna", name: "Dalarna", hint: "Lakes, fells & Midsummer" },
  { code: "SE-X", slug: "gavleborg", name: "Gävleborg", hint: "" },
  { code: "SE-Y", slug: "vasternorrland", name: "Västernorrland", hint: "The High Coast" },
  { code: "SE-Z", slug: "jamtland", name: "Jämtland", hint: "Åre & the mountains" },
];

/** For pickers: hosts look for their county by name, not by code */
export const REGIONS_BY_NAME: readonly Region[] = [...REGIONS].sort((a, b) => a.name.localeCompare(b.name, "sv"));

export const regionByCode = (code: string | null | undefined): Region | undefined =>
  REGIONS.find((r) => r.code === code);
