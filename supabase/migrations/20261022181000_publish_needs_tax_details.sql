-- Publishing needs the host's DAC7 tax details (host_tax_profiles.dac7_complete,
-- set by save-host-tax-profile), as it needs payouts, the map pin and the
-- terms. Applied once the host dashboard can collect them.
create or replace function public.prevent_self_publish()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
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
    if not exists (select 1 from public.host_tax_profiles where profile_id = new.host_id and dac7_complete) then
      raise exception 'Add your tax details before publishing (Swedish law requires them)';
    end if;
  end if;
  if new.active is true then
    new.pending_approval := false;
  end if;
  return new;
end;
$function$;
