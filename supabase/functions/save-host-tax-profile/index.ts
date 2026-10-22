import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { alertAdminOnce } from "../_shared/alert.ts";
import { stockholmToday } from "../_shared/format.ts";
import { encryptTaxId, taxIdHash } from "../_shared/tax-crypto.ts";
import { maskTail, parseForeignTin, parseOrgNumber, parsePersonnummer, parseVatNumber } from "../_shared/tax-ids.ts";

// A host's DAC7 tax details (see the migration 20261022180000_host_tax_profiles.sql).
// Checks them, encrypts the tax numbers, and writes host_tax_profiles with the
// service role; the host only ever gets the masked numbers back. Tax numbers
// never go into logs, alerts or error messages.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const fail = (error: string) => json({ error }, 400);

const text = (value: unknown, max = 200) => (typeof value === "string" ? value.trim().slice(0, max) : "");
// The whole value must be a two-letter code ("Germany" is not "GE")
const country = (value: unknown) => {
  const c = typeof value === "string" ? value.trim().toUpperCase() : "";
  return /^[A-Z]{2}$/.test(c) ? c : null;
};
// A real date ("1990-02-30" is not), from 1900 on
const isoDate = (value: unknown) => {
  const d = text(value, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d) || d < "1900-01-01") return null;
  const ms = Date.parse(`${d}T00:00:00Z`);
  return !Number.isNaN(ms) && new Date(ms).toISOString().slice(0, 10) === d ? d : null;
};
// The same foreign number however it is typed, for the duplicate check
const canonicalTin = (tin: string) => tin.toUpperCase().replace(/[^0-9A-Z]/g, "");

/** Columns the host may see (the same the database lets the browser read) */
const VISIBLE =
  "profile_id, seller_type, first_name, last_name, date_of_birth, birth_place, legal_name, street, postal_code, city, country_code, tin_country, tin_masked, other_tin_countries, vat_number, pe_eu, pe_countries, confirmed_at, dac7_complete, updated_at";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authClient = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_ANON_KEY") ?? "", {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) return json({ error: "Please sign in again." }, 401);

    const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, is_host")
      .eq("user_id", user.id)
      .maybeSingle();
    if (profileError) throw new Error(`Reading the profile failed: ${profileError.message}`);
    if (!profile?.is_host) return json({ error: "Only hosts give tax details." }, 403);

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") return fail("Fill in the form and try again.");
    if (body.confirm !== true) return fail("Confirm that the details are correct.");

    const today = stockholmToday();
    const sellerType = body.sellerType === "entity" ? "entity" : body.sellerType === "individual" ? "individual" : null;
    if (!sellerType) return fail("Choose whether you rent out as a private person or a company.");

    // Address: where a private person lives, a company's registered seat
    const street = text(body.street);
    const postalCode = text(body.postalCode, 20);
    const city = text(body.city, 100);
    const countryCode = country(body.countryCode);
    if (!street || !postalCode || !city || !countryCode) return fail("Fill in the whole address, including the country.");

    const vat = parseVatNumber(text(body.vatNumber, 30));
    if (!vat.ok) return fail(vat.error);

    // What is saved already: a host who changes their address keeps their
    // tax numbers without typing them again (the browser never has them)
    const { data: existing, error: existingError } = await supabase
      .from("host_tax_profiles")
      .select("seller_type, tin_country, tin_ciphertext, tin_hmac, tin_masked, date_of_birth, other_tins_ciphertext, other_tin_countries, verification_log")
      .eq("profile_id", profile.id)
      .maybeSingle();
    if (existingError) throw new Error(`Reading the saved tax details failed: ${existingError.message}`);

    // The tax number: Swedish ones are checked and give the date of birth
    const tinCountry = body.tinCountry === undefined || body.tinCountry === "SE" ? "SE" : country(body.tinCountry);
    if (!tinCountry) return fail("Choose the country of your tax number (a two-letter code, e.g. NO).");
    const keepTin = body.keepTin === true && !!existing?.tin_ciphertext && existing.tin_country === tinCountry &&
      existing.seller_type === sellerType;
    const checks: { check: string; result: string }[] = [];
    let tin: string | null = null;
    let tinMasked: string | null = null;
    let dateOfBirth: string | null = null;
    let birthPlace: string | null = null;

    if (keepTin) {
      tinMasked = existing!.tin_masked;
      // A Swedish number gave the date of birth; a foreign one came with it
      dateOfBirth = sellerType === "individual" ? (tinCountry === "SE" ? existing!.date_of_birth : isoDate(body.dateOfBirth)) : null;
      if (sellerType === "individual" && !dateOfBirth) return fail("Enter your date of birth.");
    } else if (sellerType === "individual") {
      if (tinCountry === "SE") {
        const pnr = parsePersonnummer(text(body.tin, 20), today);
        if (!pnr.ok) return fail(pnr.error);
        tin = pnr.value.normalized;
        tinMasked = pnr.value.masked;
        dateOfBirth = pnr.value.dateOfBirth;
        checks.push({ check: "personnummer checksum and date", result: pnr.value.samordningsnummer ? "ok (samordningsnummer)" : "ok" });
        const given = isoDate(body.dateOfBirth);
        if (given && given !== dateOfBirth) return fail("The date of birth does not match your personnummer.");
      } else {
        dateOfBirth = isoDate(body.dateOfBirth);
        if (!dateOfBirth || dateOfBirth > today) return fail("Enter your date of birth.");
        if (text(body.tin, 40)) {
          const foreign = parseForeignTin(text(body.tin, 40));
          if (!foreign.ok) return fail(foreign.error);
          tin = foreign.value;
          tinMasked = maskTail(foreign.value);
          checks.push({ check: `tax number format (${tinCountry})`, result: "ok" });
        } else {
          birthPlace = text(body.birthPlace, 100);
          if (!birthPlace) return fail("Without a tax number we need your place of birth.");
        }
      }
    } else if (tinCountry === "SE") {
      const org = parseOrgNumber(text(body.tin, 20));
      if (!org.ok) return fail(org.error);
      tin = org.value.normalized;
      tinMasked = org.value.formatted;
      checks.push({ check: "organisationsnummer checksum", result: "ok" });
    } else {
      const foreign = parseForeignTin(text(body.tin, 40));
      if (!foreign.ok) return fail(foreign.error);
      tin = foreign.value;
      tinMasked = maskTail(foreign.value);
    }

    const firstName = text(body.firstName, 100);
    const lastName = text(body.lastName, 100);
    const legalName = text(body.legalName, 200);
    if (sellerType === "individual" && (!firstName || !lastName)) return fail("Enter your first and last name as on your ID.");
    if (sellerType === "entity" && legalName.length < 2) return fail("Enter the company's full name, including AB or similar.");

    // Companies: a permanent establishment in another EU country used for the rentals
    let peEu: boolean | null = null;
    let peCountries: string[] = [];
    if (sellerType === "entity") {
      if (typeof body.peEu !== "boolean") return fail("Say whether the company rents out through a place of business in another EU country.");
      peEu = body.peEu;
      const listed: unknown[] = peEu && Array.isArray(body.peCountries) ? body.peCountries : [];
      peCountries = listed.map(country).filter((c): c is string => !!c);
      if (peEu && !peCountries.length) return fail("Which EU countries?");
    }

    // Tax numbers from other countries (all must be collected); kept as saved
    // unless the host enters new ones or removes them
    const keepOtherTins = body.keepOtherTins === true && !!existing?.other_tins_ciphertext;
    const otherTins: { country: string; number: string }[] = [];
    for (const item of keepOtherTins ? [] : Array.isArray(body.otherTins) ? body.otherTins.slice(0, 5) : []) {
      const c = country(item?.country);
      const n = parseForeignTin(text(item?.number, 40));
      if (!c || !n.ok) return fail("Check the other country's tax number and its country.");
      otherTins.push({ country: c, number: n.value });
    }

    const tinHmac = keepTin ? existing!.tin_hmac : tin ? await taxIdHash(tinCountry, canonicalTin(tin)) : null;
    const now = new Date().toISOString();
    const log = [...((existing?.verification_log as unknown[]) ?? []), ...checks.map((c) => ({ ...c, at: now }))].slice(-20);

    const row = {
      profile_id: profile.id,
      seller_type: sellerType,
      first_name: sellerType === "individual" ? firstName : null,
      last_name: sellerType === "individual" ? lastName : null,
      date_of_birth: sellerType === "individual" ? dateOfBirth : null,
      birth_place: birthPlace,
      legal_name: sellerType === "entity" ? legalName : null,
      street,
      postal_code: postalCode,
      city,
      country_code: countryCode,
      tin_country: keepTin || tin ? tinCountry : null,
      tin_ciphertext: keepTin ? existing!.tin_ciphertext : tin ? await encryptTaxId(tin) : null,
      tin_hmac: tinHmac,
      tin_masked: tinMasked,
      other_tins_ciphertext: keepOtherTins
        ? existing!.other_tins_ciphertext
        : otherTins.length ? await encryptTaxId(JSON.stringify(otherTins)) : null,
      other_tin_countries: keepOtherTins ? existing!.other_tin_countries : otherTins.map((t) => t.country),
      vat_number: vat.value,
      pe_eu: peEu,
      pe_countries: peCountries,
      confirmed_at: now,
      verification_log: log,
      // Every required field is there (the checks above returned otherwise)
      dac7_complete: true,
      updated_at: now,
    };
    const { data: saved, error: saveError } = await supabase
      .from("host_tax_profiles")
      .upsert(row, { onConflict: "profile_id" })
      .select(VISIBLE)
      .single();
    if (saveError) throw new Error(`Saving the tax details failed: ${saveError.message}`);

    // The same tax number on another host account: support looks (no number in the alert)
    if (tinHmac) {
      const { data: others } = await supabase
        .from("host_tax_profiles")
        .select("profile_id")
        .eq("tin_hmac", tinHmac)
        .neq("profile_id", profile.id);
      if (others?.length) {
        await alertAdminOnce(supabase, `tax-id-duplicate:${[profile.id, ...others.map((o) => o.profile_id)].sort().join(",")}`, "Same tax number on two host accounts", [
          `Host profile ${profile.id} gave a tax number that host profile(s) ${others.map((o) => o.profile_id).join(", ")} also use.`,
          "It may be the same person with two accounts, or a mistake. Check it before the yearly report to Skatteverket: each seller is reported once.",
        ]).catch((alertError) => console.error("[SAVE-HOST-TAX-PROFILE] Alert failed:", String(alertError)));
      }
    }

    return json({ ok: true, profile: saved });
  } catch (error) {
    // Never the request body: it holds tax numbers
    console.error("[SAVE-HOST-TAX-PROFILE]", error instanceof Error ? error.message : String(error));
    return json({ error: "Your tax details could not be saved. Please try again, or write to support@mojjo.se." }, 500);
  }
});
