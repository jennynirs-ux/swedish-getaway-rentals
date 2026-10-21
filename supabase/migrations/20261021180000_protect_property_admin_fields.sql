-- Hosts manage their own listings, but the host UPDATE policy has no column
-- limits: through the API a host could set their own rating and review count,
-- take another listing's URL slug or hand the listing to another account.
create or replace function public.protect_property_admin_fields()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if coalesce(auth.role(), '') = 'service_role' or has_role(auth.uid(), 'admin'::app_role) then
    return new;
  end if;

  if tg_op = 'INSERT' then
    -- Ratings come from reviews, not from the host
    new.review_rating := null;
    new.review_count := 0;
    new.slug := null;
    return new;
  end if;

  if new.review_rating is distinct from old.review_rating
     or new.review_count is distinct from old.review_count
     or new.slug is distinct from old.slug
     or new.host_id is distinct from old.host_id then
    raise exception 'Ratings, the URL and the owner of a listing can only be changed by Nordic Getaways';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_property_admin_fields on public.properties;
create trigger protect_property_admin_fields
  before insert or update on public.properties
  for each row execute function public.protect_property_admin_fields();

-- Anyone could list every active coupon code, hosts' and referral codes
-- included. Guests check a code with validate_coupon() and the payment
-- functions read coupons with the service role, so nobody needs this.
drop policy if exists "Active coupons are viewable by everyone" on public.coupons;
