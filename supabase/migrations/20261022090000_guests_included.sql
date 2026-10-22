-- How many guests a listing's nightly price covers; the extra-guest fee is
-- charged for each guest beyond them (as on Airbnb). Rules saved before
-- covered 1 guest, which the default keeps. Read by the booking form, the
-- host's price calculator and create-booking-payment-connect (extraGuestFee
-- in supabase/functions/_shared/booking-price.ts).
alter table public.properties_pricing_rules
  add column if not exists guests_included integer not null default 1
  check (guests_included between 1 and 50);

-- A host typed "Sverige"; the site stores the country in English
update public.properties set country = 'Sweden' where country ~* '^\s*(sverige|se|swe)\s*$';
