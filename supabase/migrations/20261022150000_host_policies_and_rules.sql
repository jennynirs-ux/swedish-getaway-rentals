-- Each host chooses their listing's cancellation policy and house rules
-- (owner decision 21 Oct 2026). The policies are fixed presets defined in
-- supabase/functions/_shared/cancellation.ts; the rules are checked by
-- supabase/functions/_shared/stay-rules.ts in the booking form and the
-- payment function.

-- 1. Cancellation policy: flexible, moderate, standard (90/50/0) or strict.
-- The old column (flexible/moderate/strict) was never used for refunds:
-- every booking followed 90/50/0, so every listing starts on Standard.
do $$
declare c text;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.properties'::regclass and pg_get_constraintdef(oid) ilike '%cancellation_policy%'
  loop
    execute format('alter table public.properties drop constraint %I', c);
  end loop;
end $$;

update public.properties set cancellation_policy = 'standard';
alter table public.properties
  alter column cancellation_policy set default 'standard',
  alter column cancellation_policy set not null,
  add constraint properties_cancellation_policy_check
    check (cancellation_policy in ('flexible', 'moderate', 'standard', 'strict'));

-- 2. House rules
alter table public.properties
  add column if not exists min_nights integer not null default 1 check (min_nights between 1 and 30),
  -- Longer minimum over Valborg, Midsummer Eve and New Year's Eve (null: none)
  add column if not exists holiday_min_nights integer check (holiday_min_nights is null or holiday_min_nights between 2 and 30),
  add column if not exists pets_allowed boolean not null default false,
  add column if not exists smoking_allowed boolean not null default false,
  add column if not exists events_allowed boolean not null default false,
  -- Of the person booking, who must stay at the place
  add column if not exists min_guest_age integer not null default 18 check (min_guest_age between 18 and 30);

-- The owners' two cabins keep the rules every booking had until now
update public.properties
set min_nights = 2, holiday_min_nights = 3, min_guest_age = 25,
    pets_allowed = false, smoking_allowed = false, events_allowed = false
where slug in ('lakefront-retreat', 'lakehouse-getaway');

-- Guests read them before booking (anon has column grants on properties)
grant select (cancellation_policy, min_nights, holiday_min_nights, pets_allowed, smoking_allowed, events_allowed, min_guest_age)
  on public.properties to anon;

-- 3. The policy shown when the guest booked decides their refund, even if
-- the host changes it later. Bookings from before have none: they were all
-- booked on Standard, which is what cancel-booking falls back to.
alter table public.bookings
  add column if not exists cancellation_policy text
  check (cancellation_policy is null or cancellation_policy in ('flexible', 'moderate', 'standard', 'strict'));
