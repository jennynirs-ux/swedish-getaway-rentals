-- Cabins can be anywhere in Sweden now (21 Oct 2026): each listing gets its
-- county (ISO 3166-2:SE code), so guests can browse by region later and hosts
-- pick it once while there are only a few listings.
alter table public.properties
  add column if not exists county text
  check (county is null or county in (
    'SE-AB','SE-AC','SE-BD','SE-C','SE-D','SE-E','SE-F','SE-G','SE-H','SE-I','SE-K',
    'SE-M','SE-N','SE-O','SE-S','SE-T','SE-U','SE-W','SE-X','SE-Y','SE-Z'
  ));

-- Visitors only have column grants on properties (20260929180000), so a new
-- column must be granted or every logged-out page that selects it fails
grant select (county) on public.properties to anon;

-- The two original cabins are in Lerum, Västra Götaland
update public.properties set county = 'SE-O' where county is null and lower(city) = 'lerum';

create index if not exists properties_county_active_idx on public.properties (county) where active;

-- Publishing: payouts must work (as before), and the listing needs its map pin
-- and county so it shows up in the right place
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
  end if;
  -- Publishing closes any open review
  if new.active is true then
    new.pending_approval := false;
  end if;
  return new;
end;
$$;

-- The site promises guests a service fee of 10 % or less; 3 % covers the card fee
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
  if _rate is null or _rate < 3 or _rate > 10 then
    raise exception 'The service fee must be between 3 %% (it covers the card fee) and 10 %%';
  end if;

  update public.profiles set commission_rate = _rate where id = _profile_id;
  if not found then
    raise exception 'Host not found';
  end if;
end;
$$;
