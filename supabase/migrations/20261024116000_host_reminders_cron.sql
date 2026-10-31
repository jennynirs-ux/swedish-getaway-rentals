-- Daily e-mails to hosts about what is missing (owner approved the texts on
-- 31 Oct 2026): unpublished listings, and the DAC7 request and reminders.
-- send-host-reminders allows one public run per 20 hours and only runs for
-- every host while the HOST_REMINDERS_ENABLED function secret is "true".
-- 08:00 UTC is 09:00 or 10:00 in Sweden. Anon key, as in the other cron jobs.
SELECT cron.unschedule(jobname) FROM cron.job WHERE jobname = 'send-host-reminders';

SELECT cron.schedule(
  'send-host-reminders',
  '0 8 * * *',
  $$
  select net.http_post(
    url := 'https://bbuutvozqfzbsnllsiai.supabase.co/functions/v1/send-host-reminders',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJidXV0dm96cWZ6YnNubGxzaWFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0MTA3MzMsImV4cCI6MjA3MTk4NjczM30.ipT60g7Ezukgh9QWyHHBeXXc9FS-WczVm_vXo8eKtdw"}'::jsonb,
    body := '{}'::jsonb,
    timeout_milliseconds := 150000
  )
  $$
);
