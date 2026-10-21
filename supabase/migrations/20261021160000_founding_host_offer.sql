-- Founding-host offer (decision 21 Oct 2026): hosts who join by 31 December
-- 2026 get a 5 % guest service fee on their listings for their first 12
-- months, instead of 10 %. Hosts keep 100 % of their price either way.

alter table public.profiles
  add column if not exists fee_offer_rate numeric(5,2),
  add column if not exists fee_offer_until date;

comment on column public.profiles.fee_offer_rate is
  'Guest service fee in percent while fee_offer_until has not passed; replaces commission_rate meanwhile';

-- The guest service fee on a property's bookings, in percent. A computed
-- field: select it as service_fee_rate on properties. The booking form, the
-- listings and create-booking-payment-connect all use it.
create or replace function public.service_fee_rate(p public.properties)
returns numeric
language sql
stable
security definer
set search_path to 'public'
as $$
  select case
    when pf.fee_offer_rate is not null and pf.fee_offer_until >= current_date then pf.fee_offer_rate
    else coalesce(pf.commission_rate, 10)
  end
  from public.profiles pf
  where pf.id = p.host_id
$$;

create or replace function public.property_service_fee_rate(_property_id uuid)
returns numeric
language sql
stable
security definer
set search_path to 'public'
as $$
  select coalesce(public.service_fee_rate(p), 10) from public.properties p where p.id = _property_id
$$;

grant execute on function public.service_fee_rate(public.properties) to anon, authenticated, service_role;
grant execute on function public.property_service_fee_rate(uuid) to anon, authenticated, service_role;

-- New hosts get the offer when they sign up during the campaign
create or replace function public.become_host(_business_name text, _contact_phone text default null)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  _profile public.profiles%rowtype;
  _name text := left(btrim(coalesce(_business_name, '')), 200);
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  if _name = '' then
    raise exception 'A property or business name is required';
  end if;

  select * into _profile from public.profiles where user_id = auth.uid();
  if not found then
    raise exception 'Profile not found';
  end if;

  if _profile.is_host and _profile.host_approved then
    return _profile.id;
  end if;

  perform set_config('app.trusted_host_change', 'on', true);
  update public.profiles
  set is_host = true,
      host_approved = true,
      host_business_name = _name,
      host_onboarding_completed = coalesce(host_onboarding_completed, false),
      -- Founding-host offer: join by 31 Dec 2026, 5 % for 12 months
      fee_offer_rate = case when current_date <= date '2026-12-31' then 5 else fee_offer_rate end,
      fee_offer_until = case when current_date <= date '2026-12-31'
                             then (current_date + interval '1 year')::date else fee_offer_until end
  where id = _profile.id;
  perform set_config('app.trusted_host_change', 'off', true);

  insert into public.host_applications (user_id, business_name, description, contact_phone, status, reviewed_at)
  values (_profile.id, _name, 'Self-service host signup',
          nullif(btrim(coalesce(_contact_phone, '')), ''), 'approved', now());

  return _profile.id;
end;
$$;

-- Hosts can't change their own fee or offer
create or replace function public.prevent_privilege_escalation()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if (tg_op = 'UPDATE') then
    -- Edge functions (service role) and become_host() are trusted
    if coalesce(auth.role(), '') = 'service_role'
       or current_setting('app.trusted_host_change', true) = 'on' then
      return new;
    end if;

    -- Prevent users from modifying their own Stripe account via direct update
    if (old.stripe_connect_account_id is distinct from new.stripe_connect_account_id
        or old.stripe_connect_ready is distinct from new.stripe_connect_ready) then
      if not has_role(auth.uid(), 'admin'::app_role) then
        raise exception 'Only administrators can modify Stripe account IDs';
      end if;
    end if;

    -- The service fee rate is the platform's revenue: admins only
    if (old.commission_rate is distinct from new.commission_rate
        or old.fee_offer_rate is distinct from new.fee_offer_rate
        or old.fee_offer_until is distinct from new.fee_offer_until) then
      if not has_role(auth.uid(), 'admin'::app_role) then
        raise exception 'Only administrators can modify commission rates';
      end if;
    end if;

    -- Prevent users from granting themselves host privileges
    if (old.is_host is distinct from new.is_host or old.host_approved is distinct from new.host_approved) then
      if not has_role(auth.uid(), 'admin'::app_role) then
        raise exception 'Only administrators can modify host status';
      end if;
    end if;
  end if;

  return new;
end;
$$;

-- Hosts who joined since the offer started (the first one signed up today)
do $$
begin
  perform set_config('app.trusted_host_change', 'on', true);
  update public.profiles
  set fee_offer_rate = 5,
      fee_offer_until = (created_at::date + interval '1 year')::date
  where is_host and host_approved and fee_offer_rate is null
    and created_at >= date '2026-10-21';
end $$;
