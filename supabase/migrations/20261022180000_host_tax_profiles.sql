-- DAC7: the details Mojjo AB must collect from every host and report to
-- Skatteverket once a year (lag 2022:1681, SFL 22 c kap.). Research and
-- design: the session's dac7_report.md, section 4. Hosts fill them in on
-- their dashboard; the save-host-tax-profile edge function checks them,
-- encrypts the tax numbers (key in the TAX_ID_KEY function secret, never in
-- the database) and writes this table with the service role. Hosts and
-- admins can read every column except the encrypted ones. Keep rows at least
-- 7 years after the last reporting year they were used for (POL 6 kap. 14 §).

create table if not exists public.host_tax_profiles (
  profile_id uuid primary key references public.profiles(id) on delete restrict,
  seller_type text not null check (seller_type in ('individual', 'entity')),
  -- Private persons
  first_name text,
  last_name text,
  date_of_birth date,
  -- Only when the host has no tax number
  birth_place text,
  -- Companies: full legal name including company form, e.g. "Exempel AB"
  legal_name text,
  -- Primary address (private persons: where they live; companies: registered seat)
  street text not null,
  postal_code text not null,
  city text not null,
  country_code text not null default 'SE' check (country_code ~ '^[A-Z]{2}$'),
  -- Tax number (personnummer/samordningsnummer or organisationsnummer):
  -- AES-GCM ciphertext, a keyed hash for spotting duplicates, and a masked
  -- form for showing ("19850312-••••")
  tin_country text check (tin_country is null or tin_country ~ '^[A-Z]{2}$'),
  tin_ciphertext text,
  tin_hmac text,
  tin_masked text,
  -- Other countries' tax numbers, encrypted JSON [{ country, number }]
  other_tins_ciphertext text,
  other_tin_countries text[] not null default '{}',
  vat_number text,
  -- Companies: renting out through a permanent establishment in another EU country
  pe_eu boolean,
  pe_countries text[] not null default '{}',
  -- The host confirmed the details are correct, and what was checked (no tax numbers in it)
  confirmed_at timestamptz,
  verification_log jsonb not null default '[]'::jsonb,
  -- Set by save-host-tax-profile when every required field is there; publishing needs it
  dac7_complete boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint host_tax_profiles_individual check (
    seller_type <> 'individual' or (first_name is not null and last_name is not null and date_of_birth is not null)
  ),
  constraint host_tax_profiles_entity check (seller_type <> 'entity' or legal_name is not null)
);

-- Two host accounts with the same tax number: save-host-tax-profile alerts support
create index if not exists host_tax_profiles_tin_hmac on public.host_tax_profiles (tin_hmac) where tin_hmac is not null;

alter table public.host_tax_profiles enable row level security;

drop policy if exists "Hosts read their own tax details" on public.host_tax_profiles;
create policy "Hosts read their own tax details" on public.host_tax_profiles
  for select to authenticated
  using (profile_id in (select id from public.profiles where user_id = auth.uid()));

drop policy if exists "Admins read hosts' tax details" on public.host_tax_profiles;
create policy "Admins read hosts' tax details" on public.host_tax_profiles
  for select to authenticated
  using (has_role(auth.uid(), 'admin'::app_role));

-- Writes only through save-host-tax-profile (service role); the encrypted
-- columns and the hash are never readable from the browser
revoke all on public.host_tax_profiles from anon, authenticated;
grant select (
  profile_id, seller_type, first_name, last_name, date_of_birth, birth_place, legal_name,
  street, postal_code, city, country_code, tin_country, tin_masked, other_tin_countries,
  vat_number, pe_eu, pe_countries, confirmed_at, dac7_complete, created_at, updated_at
) on public.host_tax_profiles to authenticated;

-- Per listing (private: host and admin only, like the street address)
alter table public.property_private_details
  -- e.g. "Lerum Exempel 1:23"; a flat's number, or a cabin's number in a cabin village
  add column if not exists fastighetsbeteckning text,
  add column if not exists designation_kind text
    check (designation_kind is null or designation_kind in ('fastighet', 'lagenhet', 'stuga', 'none')),
  -- Skatteverket's property type for KU93 (1-10; 4 = hus)
  add column if not exists ku_property_type smallint check (ku_property_type is null or ku_property_type between 1 and 10);
