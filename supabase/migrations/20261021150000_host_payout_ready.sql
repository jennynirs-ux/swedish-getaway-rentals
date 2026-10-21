-- New hosts: payouts must work before a listing goes live, and deleting a
-- listing must not delete its bookings.

-- Set by create-connect-account (service role) from Stripe: the host's Connect
-- account has finished onboarding and can receive transfers
alter table public.profiles
  add column if not exists stripe_connect_ready boolean not null default false;

-- Hosts can't mark their own payouts as ready
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
    if (old.commission_rate is distinct from new.commission_rate) then
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

-- Hosts publish their own listings, but only once they can be paid: otherwise
-- the platform would keep the whole payment for their bookings
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
     and not has_role(auth.uid(), 'admin'::app_role)
     and not exists (
       select 1 from public.profiles
       where id = new.host_id and stripe_connect_ready
     ) then
    raise exception 'Connect your bank account before publishing, so you can be paid for bookings';
  end if;
  -- Publishing closes any open review
  if new.active is true then
    new.pending_approval := false;
  end if;
  return new;
end;
$$;

-- Deleting a property used to delete its bookings, paid ones included
alter table public.bookings
  drop constraint bookings_property_id_fkey,
  add constraint bookings_property_id_fkey
    foreign key (property_id) references public.properties(id) on delete restrict;
