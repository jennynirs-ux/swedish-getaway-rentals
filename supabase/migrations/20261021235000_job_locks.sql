-- Short locks for the money functions (supabase/functions/_shared/lock.ts):
-- one payout run at a time, and one function at a time moving a host's
-- Stripe money (the payout job, cancellations, refund webhooks). Only edge
-- functions use it, with the service role; no policies, so nobody else can.
create table if not exists public.job_locks (
  id text primary key,
  owner text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

alter table public.job_locks enable row level security;
revoke all on public.job_locks from anon, authenticated;
