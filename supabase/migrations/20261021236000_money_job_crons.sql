-- Scheduled money jobs (anon key, as in the other cron jobs; both functions
-- allow one public run per window and are safe to run twice).
--  - release-host-payouts: pays hosts their held shares when due (the day
--    after check-in, or 85 days after the guest paid if that comes first).
--    Daily at 05:00 UTC (06:00/07:00 in Sweden), before the 06:00 health check.
--  - reconcile-payments: saves paid checkouts that never became bookings.
--    Hourly.
SELECT cron.unschedule(jobname) FROM cron.job WHERE jobname IN ('release-host-payouts', 'reconcile-payments');

SELECT cron.schedule(
  'release-host-payouts',
  '0 5 * * *',
  $$
  select net.http_post(
    url := 'https://bbuutvozqfzbsnllsiai.supabase.co/functions/v1/release-host-payouts',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJidXV0dm96cWZ6YnNubGxzaWFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0MTA3MzMsImV4cCI6MjA3MTk4NjczM30.ipT60g7Ezukgh9QWyHHBeXXc9FS-WczVm_vXo8eKtdw"}'::jsonb,
    body := '{}'::jsonb,
    timeout_milliseconds := 150000
  )
  $$
);

SELECT cron.schedule(
  'reconcile-payments',
  '20 * * * *',
  $$
  select net.http_post(
    url := 'https://bbuutvozqfzbsnllsiai.supabase.co/functions/v1/reconcile-payments',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJidXV0dm96cWZ6YnNubGxzaWFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0MTA3MzMsImV4cCI6MjA3MTk4NjczM30.ipT60g7Ezukgh9QWyHHBeXXc9FS-WczVm_vXo8eKtdw"}'::jsonb,
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  )
  $$
);
