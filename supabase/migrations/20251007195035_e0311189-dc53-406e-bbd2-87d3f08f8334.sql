-- Enable required extensions for scheduling HTTP calls
create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

-- Add pre-check-in reminder tracking on bookings
alter table public.bookings
  add column if not exists pre_checkin_reminder_sent_at timestamp with time zone;

-- Add notification settings and timezone on properties
alter table public.properties
  add column if not exists pre_checkin_reminder_enabled boolean not null default true,
  add column if not exists pre_checkin_send_time time without time zone not null default '09:00:00',
  add column if not exists property_timezone text not null default 'Europe/Stockholm';

-- Optional cache table for travel metrics (24h cache)
create table if not exists public.property_travel_cache (
  property_id uuid primary key,
  nearest_city_name text,
  drive_distance_km numeric,
  drive_time_min integer,
  computed_at timestamp with time zone not null default now()
);

-- Schedule the pre-check-in reminder function every 15 minutes
-- The function will decide whether to send based on each property's local time
select
  cron.schedule(
    'send-precheckin-reminders-every-15min',
    '*/15 * * * *',
    $$
    select net.http_post(
      url := 'https://bbuutvozqfzbsnllsiai.supabase.co/functions/v1/send-precheckin-reminders',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJidXV0dm96cWZ6YnNubGxzaWFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0MTA3MzMsImV4cCI6MjA3MTk4NjczM30.ipT60g7Ezukgh9QWyHHBeXXc9FS-WczVm_vXo8eKtdw"}'::jsonb,
      body := '{}'::jsonb
    )
    $$
  );