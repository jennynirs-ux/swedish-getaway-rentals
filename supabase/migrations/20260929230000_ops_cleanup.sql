-- Operations clean-up from the 29 September review (block 3).

-- 1. One rule for bookings.source. Two CHECK constraints disagreed, so only
--    airbnb, booking_com and manual could be stored and web bookings were
--    recorded as "manual" (skewing revenue per channel).
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_source_check;
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS chk_booking_source;
ALTER TABLE public.bookings ADD CONSTRAINT bookings_source_check CHECK (
  source = ANY (ARRAY['direct', 'manual', 'ical', 'airbnb', 'booking_com', 'vrbo', 'landfolk', 'blocked', 'other'])
);
UPDATE public.bookings SET source = 'direct'
WHERE source = 'manual' AND stripe_payment_intent_id IS NOT NULL;

-- 2. One trigger keeps the calendar in step with bookings. Four triggers did
--    overlapping work, and the cleaning-day ones overwrote other bookings'
--    and channels' blocks. Their functions are left in place, unused.
CREATE OR REPLACE FUNCTION public.sync_booking_availability()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  prep_days integer;
BEGIN
  SELECT coalesce(preparation_days, 0) INTO prep_days FROM properties WHERE id = NEW.property_id;

  IF NEW.status = 'confirmed' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'confirmed') THEN
    -- The nights of the stay
    INSERT INTO availability (property_id, date, available, reason)
    SELECT NEW.property_id, d::date, false, 'booked'
    FROM generate_series(NEW.check_in_date, NEW.check_out_date - 1, interval '1 day') d
    ON CONFLICT (property_id, date) DO UPDATE SET available = false, reason = 'booked';

    -- Cleaning days before and after, only on dates that are still open
    IF prep_days > 0 THEN
      INSERT INTO availability (property_id, date, available, reason)
      SELECT NEW.property_id, d::date, false, 'preparation'
      FROM (
        SELECT generate_series(NEW.check_in_date - prep_days, NEW.check_in_date - 1, interval '1 day') AS d
        UNION ALL
        SELECT generate_series(NEW.check_out_date, NEW.check_out_date + prep_days - 1, interval '1 day')
      ) days
      ON CONFLICT (property_id, date) DO UPDATE SET available = false, reason = 'preparation'
      WHERE availability.available;
    END IF;

  ELSIF TG_OP = 'UPDATE' AND OLD.status = 'confirmed' AND NEW.status = 'cancelled' THEN
    DELETE FROM availability
    WHERE property_id = NEW.property_id AND reason = 'booked'
      AND date >= NEW.check_in_date AND date < NEW.check_out_date;
    IF prep_days > 0 THEN
      DELETE FROM availability
      WHERE property_id = NEW.property_id AND reason = 'preparation'
        AND ((date >= NEW.check_in_date - prep_days AND date < NEW.check_in_date)
          OR (date >= NEW.check_out_date AND date < NEW.check_out_date + prep_days));
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS auto_update_availability_trigger ON public.bookings;
DROP TRIGGER IF EXISTS trigger_block_preparation_days ON public.bookings;
DROP TRIGGER IF EXISTS update_availability_on_booking_change ON public.bookings;
DROP TRIGGER IF EXISTS update_availability_on_booking_trigger ON public.bookings;
CREATE TRIGGER sync_booking_availability
  AFTER INSERT OR UPDATE OF status ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.sync_booking_availability();

-- 3. Coupons: count each use, so usage_limit is enforced (used_count was
--    never incremented and coupon_usages never written).
CREATE OR REPLACE FUNCTION public.record_coupon_use(_coupon_id uuid, _booking_id uuid, _discount_amount integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO coupon_usages (coupon_id, booking_id, discount_amount, used_at)
  VALUES (_coupon_id, _booking_id, _discount_amount, now());
  UPDATE coupons SET used_count = coalesce(used_count, 0) + 1 WHERE id = _coupon_id;
END;
$function$;
REVOKE ALL ON FUNCTION public.record_coupon_use(uuid, uuid, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_coupon_use(uuid, uuid, integer) TO service_role;

-- 4. What the daily health check (edge function daily-health-check) reports.
CREATE OR REPLACE FUNCTION public.health_issues()
RETURNS text[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  issues text[] := '{}';
  r record;
BEGIN
  FOR r IN
    SELECT p.title, f.name, f.sync_status, f.last_sync, f.error_message
    FROM ical_feeds f JOIN properties p ON p.id = f.property_id
    WHERE f.active AND (f.sync_status = 'error' OR f.last_sync IS NULL OR f.last_sync < now() - interval '2 hours')
  LOOP
    issues := issues || format('Calendar sync: %s from %s – %s (last success %s)',
      r.title, r.name, coalesce(r.error_message, r.sync_status), coalesce(to_char(r.last_sync, 'YYYY-MM-DD HH24:MI'), 'never'));
  END LOOP;

  FOR r IN
    SELECT j.jobname, count(*) AS failures, max(d.return_message) AS message
    FROM cron.job_run_details d JOIN cron.job j USING (jobid)
    WHERE d.status = 'failed' AND d.start_time > now() - interval '24 hours'
    GROUP BY j.jobname
  LOOP
    issues := issues || format('Scheduled job %s failed %s times in 24 h: %s', r.jobname, r.failures, left(r.message, 200));
  END LOOP;

  FOR r IN
    SELECT count(*) AS n FROM bookings
    WHERE status = 'payment_pending' AND created_at < now() - interval '1 hour' AND created_at > now() - interval '30 days'
  LOOP
    IF r.n > 0 THEN
      issues := issues || format('%s booking(s) stuck in payment_pending', r.n);
    END IF;
  END LOOP;

  RETURN issues;
END;
$function$;
REVOKE ALL ON FUNCTION public.health_issues() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.health_issues() TO service_role;

-- 5. Trigger functions run whatever the caller's rights; nobody needs to call
--    them directly (Supabase's advisor flagged 36 of them as callable by anon).
DO $$
DECLARE
  f record;
BEGIN
  FOR f IN
    SELECT p.oid::regprocedure AS signature
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prorettype = 'trigger'::regtype
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', f.signature);
  END LOOP;
END $$;

-- 6. Scheduled job history had grown to 52 000 rows; keep a week.
DELETE FROM cron.job_run_details WHERE end_time < now() - interval '7 days';
SELECT cron.unschedule('purge-cron-history') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'purge-cron-history');
SELECT cron.schedule('purge-cron-history', '15 3 * * *',
  $$DELETE FROM cron.job_run_details WHERE end_time < now() - interval '7 days'$$);
