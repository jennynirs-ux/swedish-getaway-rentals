-- Hosts publish without their DAC7 tax details (owner decision 31 Oct 2026:
-- five new listings sat unpublished at that step). The details are needed
-- before the first payout instead: release-host-payouts holds a host's
-- payouts until host_tax_profiles.dac7_complete, and send-host-reminders asks
-- for them (the request and two reminders DAC7 requires within 60 days).
-- Payouts, the map pin and the terms are still needed to publish.

-- When a listing first went live: send-host-reminders only reminds about
-- listings never published (one unpublished after being live was unpublished
-- on purpose, by the host or an admin). Set by prevent_self_publish below.
alter table public.properties add column if not exists first_published_at timestamptz;
-- Listings from before this column: live now, or with bookings, were
-- published (when is unknown; their creation date stands in)
update public.properties p
set first_published_at = p.created_at
where p.first_published_at is null
  and (p.active is true or exists (select 1 from public.bookings b where b.property_id = p.id));

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
  end if;
  if new.active is true then
    new.pending_approval := false;
    new.first_published_at := coalesce(new.first_published_at, now());
  end if;
  return new;
end;
$function$;

-- What we have e-mailed hosts and when: reminders to finish an unpublished
-- listing, the DAC7 request and reminders for tax details (the trail the law
-- asks for), and notices that a payout waits for tax details. Written by the
-- edge functions (service role); admins can read it.
create table if not exists public.host_notices (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('listing_unpublished', 'dac7_request', 'dac7_reminder', 'payout_held_tax')),
  property_id uuid references public.properties(id) on delete set null,
  booking_id uuid references public.bookings(id) on delete set null,
  sent_at timestamptz not null default now(),
  -- What the e-mail said was missing (step ids), for support
  details jsonb
);

create index if not exists host_notices_profile_kind_idx on public.host_notices (profile_id, kind, sent_at desc);

alter table public.host_notices enable row level security;

drop policy if exists "Admins read host notices" on public.host_notices;
create policy "Admins read host notices"
  on public.host_notices for select
  using (public.has_role(auth.uid(), 'admin'::public.app_role));

grant select on public.host_notices to authenticated;
