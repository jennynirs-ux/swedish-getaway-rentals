-- Schedule automatic iCal sync every 15 minutes
-- This ensures external platform bookings (Airbnb, VRBO, Booking.com)
-- are reflected in our availability within 15 minutes, preventing double bookings.
--
-- The auto-sync-ical function loops through all active ical_feeds and
-- calls sync-ical for each one. sync-ical now also cleans up stale dates
-- (dates that were previously blocked but are no longer in the external feed),
-- handling cancellations on external platforms automatically.

SELECT cron.schedule(
  'auto-sync-ical-every-15min',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://bbuutvozqfzbsnllsiai.supabase.co/functions/v1/auto-sync-ical',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJidXV0dm96cWZ6YnNubGxzaWFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0MTA3MzMsImV4cCI6MjA3MTk4NjczM30.ipT60g7Ezukgh9QWyHHBeXXc9FS-WczVm_vXo8eKtdw"}'::jsonb,
    body := '{}'::jsonb
  )
  $$
);

-- Also migrate any existing availability records that used the old reason
-- string format ("Blocked by <name>") to the canonical 'ical_sync' reason.
-- This ensures the AvailabilityCalendar UI correctly marks them as read-only.
UPDATE public.availability
SET reason = 'ical_sync'
WHERE reason LIKE 'Blocked by %'
  AND available = false;
