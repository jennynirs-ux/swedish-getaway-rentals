-- V2 Phase 1: Enhanced dashboard stats RPC
-- Adds today widget data, occupancy, sync failures, and double-booking counts

CREATE OR REPLACE FUNCTION public.get_dashboard_stats()
RETURNS JSON
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT json_build_object(
    -- Existing stats
    'active_rentals', (SELECT COUNT(*) FROM properties WHERE active = true),
    'total_bookings', (SELECT COUNT(*) FROM bookings WHERE status = 'confirmed'),
    'upcoming_bookings', (
      SELECT COUNT(*) FROM bookings
      WHERE check_in_date >= CURRENT_DATE AND status = 'confirmed'
    ),
    'monthly_revenue', (
      SELECT COALESCE(SUM(total_amount), 0) FROM bookings
      WHERE status = 'confirmed'
        AND created_at >= date_trunc('month', CURRENT_DATE)
    ),

    -- Today widget
    'todays_checkins', (
      SELECT COUNT(*) FROM bookings
      WHERE check_in_date = CURRENT_DATE AND status = 'confirmed'
    ),
    'todays_checkouts', (
      SELECT COUNT(*) FROM bookings
      WHERE check_out_date = CURRENT_DATE AND status = 'confirmed'
    ),
    'pending_cleaning', (
      SELECT COUNT(*) FROM cleaning_tasks
      WHERE status IN ('pending', 'notified')
        AND scheduled_date <= CURRENT_DATE + INTERVAL '1 day'
    ),

    -- Occupancy this month
    'monthly_booked_nights', (
      SELECT COALESCE(SUM(
        LEAST(check_out_date::date, (date_trunc('month', CURRENT_DATE) + INTERVAL '1 month')::date)
        - GREATEST(check_in_date::date, date_trunc('month', CURRENT_DATE)::date)
      ), 0)
      FROM bookings
      WHERE status = 'confirmed'
        AND check_in_date::date < (date_trunc('month', CURRENT_DATE) + INTERVAL '1 month')::date
        AND check_out_date::date > date_trunc('month', CURRENT_DATE)::date
    ),
    'monthly_total_nights', (
      SELECT (COUNT(*) * EXTRACT(DAY FROM
        date_trunc('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day'
      ))::integer
      FROM properties WHERE active = true
    ),

    -- Alerts
    'sync_failures', (
      SELECT COUNT(*) FROM ical_feeds
      WHERE sync_status = 'error' AND active = true
    ),
    'double_bookings', (
      SELECT COUNT(*) FROM (
        SELECT a.id FROM bookings a
        JOIN bookings b ON a.property_id = b.property_id
          AND a.id < b.id
          AND a.check_in_date::date < b.check_out_date::date
          AND b.check_in_date::date < a.check_out_date::date
        WHERE a.status IN ('confirmed', 'pending')
          AND b.status IN ('confirmed', 'pending')
      ) conflicts
    ),

    -- Revenue by channel (this month)
    'revenue_by_source', (
      SELECT COALESCE(json_object_agg(source, rev), '{}'::json)
      FROM (
        SELECT source, SUM(total_amount) as rev
        FROM bookings
        WHERE status = 'confirmed'
          AND created_at >= date_trunc('month', CURRENT_DATE)
        GROUP BY source
      ) channel_rev
    ),

    -- Monthly expenses
    'monthly_expenses', (
      SELECT COALESCE(SUM(amount), 0) FROM expenses
      WHERE expense_date >= date_trunc('month', CURRENT_DATE)
    )
  );
$$;
