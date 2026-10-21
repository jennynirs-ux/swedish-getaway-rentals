-- Visitors may only read some columns of properties, so service_fee_rate can't
-- be selected as a computed field (it takes the whole row). Listings fetch the
-- rates of all live properties with this instead.
create or replace function public.property_service_fee_rates()
returns table (property_id uuid, service_fee_rate numeric)
language sql
stable
security definer
set search_path to 'public'
as $$
  select p.id, coalesce(public.service_fee_rate(p), 10)
  from public.properties p
  where p.active
$$;

grant execute on function public.property_service_fee_rates() to anon, authenticated, service_role;
