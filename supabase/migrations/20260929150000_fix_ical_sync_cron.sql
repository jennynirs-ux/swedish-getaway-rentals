-- The calendar sync job never ran: it posted to
-- current_setting('app.settings.service_url') || '/api/sync-ical', a setting
-- that was never created, so every run failed and channel bookings (Airbnb,
-- Booking, Landfolk) only reached the site when a host pressed "Sync now".
-- Call the edge function directly; an empty body syncs every active feed.
-- The token is the public anon key, as in the pre-check-in reminder job.

SELECT cron.unschedule('sync-ical-every-15-min')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'sync-ical-every-15-min');

SELECT cron.schedule(
  'sync-ical-every-15-min',
  '*/15 * * * *',
  $$
  select net.http_post(
    url := 'https://bbuutvozqfzbsnllsiai.supabase.co/functions/v1/sync-ical',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJidXV0dm96cWZ6YnNubGxzaWFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0MTA3MzMsImV4cCI6MjA3MTk4NjczM30.ipT60g7Ezukgh9QWyHHBeXXc9FS-WczVm_vXo8eKtdw"}'::jsonb,
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  )
  $$
);
