-- Add review request tracking to bookings
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS review_request_sent_at TIMESTAMPTZ;

-- Schedule daily review request emails at 10:00 AM
SELECT cron.schedule(
  'send-review-requests-daily',
  '0 10 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/send-review-request',
    headers := json_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.supabase_anon_key')
    )::jsonb,
    body := '{}'::jsonb
  )
  $$
);
