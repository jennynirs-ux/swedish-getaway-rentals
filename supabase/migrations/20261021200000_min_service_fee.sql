-- Decision 21 Oct 2026: the guest service fee always covers the card fee
-- (Stripe takes about 1.5-3.3 % plus 1.80 kr), partners included, so an admin
-- can't set a host below 3 %.
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
  if _rate is null or _rate < 3 or _rate > 100 then
    raise exception 'The service fee must be between 3 %% (it covers the card fee) and 100 %%';
  end if;

  update public.profiles set commission_rate = _rate where id = _profile_id;
  if not found then
    raise exception 'Host not found';
  end if;
end;
$$;
