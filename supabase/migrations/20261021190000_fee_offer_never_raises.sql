-- The founding-host offer only ever lowers the fee: a host an admin has given
-- a lower rate (e.g. 0 % for a partner) keeps it while the 5 % offer runs.
create or replace function public.service_fee_rate(p public.properties)
returns numeric
language sql
stable
security definer
set search_path to 'public'
as $$
  select case
    when pf.fee_offer_rate is not null and pf.fee_offer_until >= current_date
      then least(pf.fee_offer_rate, coalesce(pf.commission_rate, 10))
    else coalesce(pf.commission_rate, 10)
  end
  from public.profiles pf
  where pf.id = p.host_id
$$;
