-- Daily health check at 06:00 UTC (08:00 in Swedish summer time); it e-mails
-- support@mojjo.se only when something needs attention. Public anon key, as
-- in the other cron jobs.
SELECT cron.unschedule('daily-health-check')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'daily-health-check');

SELECT cron.schedule(
  'daily-health-check',
  '0 6 * * *',
  $$
  select net.http_post(
    url := 'https://bbuutvozqfzbsnllsiai.supabase.co/functions/v1/daily-health-check',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJidXV0dm96cWZ6YnNubGxzaWFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0MTA3MzMsImV4cCI6MjA3MTk4NjczM30.ipT60g7Ezukgh9QWyHHBeXXc9FS-WczVm_vXo8eKtdw"}'::jsonb,
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  )
  $$
);
