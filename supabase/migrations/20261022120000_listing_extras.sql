-- Extras a host offers with a listing (properties_pricing_rules, rule_type
-- extra_service). Each is either included in the price (shown to guests,
-- never charged) or something guests can add when they book, charged per
-- stay, per night, per guest or per guest per night (is_per_night, per_guest).
-- Worked out by extraServiceFee in supabase/functions/_shared/booking-price.ts
-- for the booking form and create-booking-payment-connect alike.
alter table public.properties_pricing_rules
  add column if not exists included boolean not null default false,
  add column if not exists per_guest boolean not null default false;

-- The extras the guest added, as charged: [{ "id", "name", "amount" (öre) }]
alter table public.bookings add column if not exists extras jsonb;

-- Hosts see a booking's extras in their dashboard (column appended)
create or replace view public.bookings_secure
with (security_invoker = true) as
SELECT id,
    property_id,
    user_id,
    guest_name,
        CASE
            WHEN user_id = auth.uid() THEN guest_email
            WHEN has_role(auth.uid(), 'admin'::app_role) THEN guest_email
            WHEN check_in_date <= CURRENT_DATE AND check_out_date >= CURRENT_DATE THEN guest_email
            WHEN check_in_date > CURRENT_DATE AND check_in_date <= (CURRENT_DATE + '3 days'::interval) THEN guest_email
            ELSE ("substring"(guest_email, 1, 2) || '***@'::text) || split_part(guest_email, '@'::text, 2)
        END AS guest_email,
        CASE
            WHEN user_id = auth.uid() THEN guest_phone
            WHEN has_role(auth.uid(), 'admin'::app_role) THEN guest_phone
            WHEN check_in_date <= CURRENT_DATE AND check_out_date >= CURRENT_DATE THEN guest_phone
            WHEN check_in_date > CURRENT_DATE AND check_in_date <= (CURRENT_DATE + '3 days'::interval) THEN guest_phone
            WHEN guest_phone IS NULL THEN NULL::text
            ELSE '***'::text || "right"(guest_phone, 4)
        END AS guest_phone,
    check_in_date,
    check_out_date,
    number_of_guests,
    total_amount,
    currency,
    status,
    special_requests,
    created_at,
    updated_at,
    stripe_payment_intent_id,
        CASE
            WHEN user_id = auth.uid() THEN access_code
            WHEN has_role(auth.uid(), 'admin'::app_role) THEN access_code
            ELSE NULL::text
        END AS access_code,
    access_code_expires_at,
    pre_checkin_reminder_sent_at,
    host_amount,
    service_fee,
    refunded_amount,
    cancelled_at,
    source,
    host_payout_status,
    host_payout_due_on,
    host_paid_out_at,
    host_reversed_amount,
    cancelled_by,
    extras
   FROM bookings b;

-- The owners' two cabins include bed linen and towels for every guest; the
-- booking form said so from a hard-coded list of their ids until now
insert into public.properties_pricing_rules (property_id, rule_type, name, price, currency, is_per_night, is_active, included, per_guest)
select p.id, 'extra_service', 'Bed linen and towels for every guest', 0, 'SEK', false, true, true, false
from public.properties p
where p.id in ('6618e8ae-e1ff-4a3b-8f6b-b3287c881d12', '3f0002c9-7564-46f3-af63-8c1c0aa9a162')
  and not exists (
    select 1 from public.properties_pricing_rules r
    where r.property_id = p.id and r.rule_type = 'extra_service' and r.included and r.is_active
  );
