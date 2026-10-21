-- Owner decisions 21 Oct 2026:
-- * Hosts are paid the day after check-in. The host's share stays in the
--   host's own Stripe account (destination charge) with manual payouts, and a
--   daily job pays it out; Mojjo AB only ever holds its service fee.
-- * The guest service fee is not refunded when a guest cancels; it is when
--   the host or we cancel.
-- * When a host cancels, the host also pays the card fee (taken from a later
--   payout).
-- * Minimum service fee 4 % (card fees incl. non-EU cards and Connect fees).
-- * Every host, the owners included, rents out their own cabins; hosts accept
--   host terms before publishing.

-- Payout state per booking (amounts in öre)
alter table public.bookings
  add column if not exists host_payout_status text
    check (host_payout_status in ('held', 'paid_out', 'manual', 'reversed', 'platform')),
  add column if not exists host_payout_due_on date,
  add column if not exists stripe_transfer_id text,
  add column if not exists stripe_payout_id text,
  add column if not exists host_paid_out_at timestamptz,
  add column if not exists host_reversed_amount integer not null default 0,
  add column if not exists cancelled_by text check (cancelled_by in ('guest', 'host', 'platform')),
  add column if not exists cancel_requested_on date;

comment on column public.bookings.host_payout_status is
  'held: in the host''s Stripe balance until host_payout_due_on; paid_out: sent to the host''s bank; manual: the host''s account could not receive the transfer, pay by hand; reversed: fully taken back on cancellation; platform: no host account (legacy bookings)';

create index if not exists bookings_payout_due_idx
  on public.bookings (host_payout_due_on) where host_payout_status = 'held';

-- What a host owes the platform (e.g. the card fee when the host cancels),
-- settled from the host's next payout
create table if not exists public.host_charges (
  id uuid primary key default gen_random_uuid(),
  host_profile_id uuid not null references public.profiles(id) on delete restrict,
  booking_id uuid references public.bookings(id) on delete set null,
  amount integer not null check (amount > 0),
  currency text not null default 'sek',
  reason text not null,
  created_at timestamptz not null default now(),
  settled_at timestamptz,
  settled_by text
);
alter table public.host_charges enable row level security;
create policy "Hosts see their own charges" on public.host_charges
  for select to authenticated
  using (host_profile_id in (select id from public.profiles where user_id = auth.uid()));
create policy "Admins manage host charges" on public.host_charges
  for all to authenticated
  using (has_role(auth.uid(), 'admin'::app_role))
  with check (has_role(auth.uid(), 'admin'::app_role));

-- Host terms acceptance
alter table public.profiles
  add column if not exists host_terms_version text,
  add column if not exists host_terms_accepted_at timestamptz;

create or replace function public.accept_host_terms(_version text)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  if coalesce(btrim(_version), '') = '' then
    raise exception 'Terms version required';
  end if;
  perform set_config('app.trusted_host_change', 'on', true);
  update public.profiles
  set host_terms_version = left(btrim(_version), 40), host_terms_accepted_at = now()
  where user_id = auth.uid();
  perform set_config('app.trusted_host_change', 'off', true);
end;
$$;
revoke execute on function public.accept_host_terms(text) from public, anon;
grant execute on function public.accept_host_terms(text) to authenticated, service_role;

-- Hosts can't fake their acceptance date directly
create or replace function public.prevent_privilege_escalation()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if (tg_op = 'UPDATE') then
    -- Edge functions (service role), become_host() and accept_host_terms() are trusted
    if coalesce(auth.role(), '') = 'service_role'
       or current_setting('app.trusted_host_change', true) = 'on' then
      return new;
    end if;

    if (old.stripe_connect_account_id is distinct from new.stripe_connect_account_id
        or old.stripe_connect_ready is distinct from new.stripe_connect_ready) then
      if not has_role(auth.uid(), 'admin'::app_role) then
        raise exception 'Only administrators can modify Stripe account IDs';
      end if;
    end if;

    if (old.commission_rate is distinct from new.commission_rate
        or old.fee_offer_rate is distinct from new.fee_offer_rate
        or old.fee_offer_until is distinct from new.fee_offer_until) then
      if not has_role(auth.uid(), 'admin'::app_role) then
        raise exception 'Only administrators can modify commission rates';
      end if;
    end if;

    if (old.host_terms_version is distinct from new.host_terms_version
        or old.host_terms_accepted_at is distinct from new.host_terms_accepted_at) then
      if not has_role(auth.uid(), 'admin'::app_role) then
        raise exception 'Accept the host terms in the host dashboard';
      end if;
    end if;

    if (old.is_host is distinct from new.is_host or old.host_approved is distinct from new.host_approved) then
      if not has_role(auth.uid(), 'admin'::app_role) then
        raise exception 'Only administrators can modify host status';
      end if;
    end if;
  end if;

  return new;
end;
$$;

-- Publishing: payouts, map pin and county (as before), and accepted host terms
create or replace function public.prevent_self_publish()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if new.active is true
     and (tg_op = 'INSERT' or old.active is distinct from true)
     and coalesce(auth.role(), '') <> 'service_role'
     and not has_role(auth.uid(), 'admin'::app_role) then
    if not exists (select 1 from public.profiles where id = new.host_id and stripe_connect_ready) then
      raise exception 'Connect your bank account before publishing, so you can be paid for bookings';
    end if;
    if new.latitude is null or new.longitude is null or new.county is null then
      raise exception 'Pin your place on the map and choose its county before publishing';
    end if;
    if not exists (select 1 from public.profiles where id = new.host_id and host_terms_accepted_at is not null) then
      raise exception 'Accept the host terms before publishing';
    end if;
  end if;
  if new.active is true then
    new.pending_approval := false;
  end if;
  return new;
end;
$$;

-- Minimum 4 %: covers the card fee for non-EU and premium cards plus Stripe's payout fees
create or replace function public.set_host_commission_rate(_profile_id uuid, _rate numeric)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if not has_role(auth.uid(), 'admin'::app_role) then
    raise exception 'Only administrators can modify commission rates';
  end if;
  if _rate is null or _rate < 4 or _rate > 10 then
    raise exception 'The service fee must be between 4 %% (it covers the card fee) and 10 %%';
  end if;

  update public.profiles set commission_rate = _rate where id = _profile_id;
  if not found then
    raise exception 'Host not found';
  end if;
end;
$$;

-- Hosts see what they receive and when it is paid out (columns appended to the view)
create or replace view public.bookings_secure
with (security_invoker = true) as
 select b.id,
    b.property_id,
    b.user_id,
    b.guest_name,
        case
            when b.user_id = auth.uid() then b.guest_email
            when has_role(auth.uid(), 'admin'::app_role) then b.guest_email
            when b.check_in_date <= current_date and b.check_out_date >= current_date then b.guest_email
            when b.check_in_date > current_date and b.check_in_date <= (current_date + '3 days'::interval) then b.guest_email
            else ("substring"(b.guest_email, 1, 2) || '***@'::text) || split_part(b.guest_email, '@'::text, 2)
        end as guest_email,
        case
            when b.user_id = auth.uid() then b.guest_phone
            when has_role(auth.uid(), 'admin'::app_role) then b.guest_phone
            when b.check_in_date <= current_date and b.check_out_date >= current_date then b.guest_phone
            when b.check_in_date > current_date and b.check_in_date <= (current_date + '3 days'::interval) then b.guest_phone
            when b.guest_phone is null then null::text
            else '***'::text || "right"(b.guest_phone, 4)
        end as guest_phone,
    b.check_in_date,
    b.check_out_date,
    b.number_of_guests,
    b.total_amount,
    b.currency,
    b.status,
    b.special_requests,
    b.created_at,
    b.updated_at,
    b.stripe_payment_intent_id,
        case
            when b.user_id = auth.uid() then b.access_code
            when has_role(auth.uid(), 'admin'::app_role) then b.access_code
            else null::text
        end as access_code,
    b.access_code_expires_at,
    b.pre_checkin_reminder_sent_at,
    b.host_amount,
    b.service_fee,
    b.refunded_amount,
    b.cancelled_at,
    b.source,
    b.host_payout_status,
    b.host_payout_due_on,
    b.host_paid_out_at,
    b.host_reversed_amount,
    b.cancelled_by
   from bookings b;

-- Existing bookings: the owners' cabins were paid to the platform account
update public.bookings set host_payout_status = 'platform'
where host_payout_status is null and status in ('confirmed', 'completed', 'cancelled');
