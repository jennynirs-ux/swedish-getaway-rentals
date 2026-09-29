-- Security fixes from the 29 September review.

-- 1. No direct booking inserts from the browser. Bookings are created only by
--    the payment flow (service role). These let any signed-in user insert a
--    "confirmed" booking that blocked dates and was exported to Airbnb.
DROP POLICY IF EXISTS "Authenticated users can create bookings" ON public.bookings;
DROP POLICY IF EXISTS "Secure booking creation" ON public.bookings;

-- 2. Shop orders are created by create-cart-payment (service role) only.
DROP POLICY IF EXISTS "Valid customers can create orders" ON public.orders;

-- 3. Revenue statistics: admins only. The admin dashboard calls the
--    no-argument version; the dated version and the double-booking report
--    have no caller in the app.
CREATE OR REPLACE FUNCTION public.get_dashboard_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only administrators can view dashboard statistics';
  END IF;
  RETURN json_build_object(
    'active_rentals', (SELECT COUNT(*) FROM properties WHERE active = true),
    'total_bookings', (SELECT COUNT(*) FROM bookings),
    'upcoming_bookings', (SELECT COUNT(*) FROM bookings WHERE check_in_date >= CURRENT_DATE AND status = 'confirmed'),
    'unread_messages', (SELECT COUNT(*) FROM guest_messages WHERE read = false),
    'monthly_revenue', (
      SELECT COALESCE(SUM(total_amount), 0)
      FROM bookings
      WHERE status = 'confirmed'
      AND created_at >= date_trunc('month', CURRENT_DATE)
    )
  );
END;
$function$;
REVOKE ALL ON FUNCTION public.get_dashboard_stats() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_dashboard_stats() TO authenticated;

-- The dated overload (from the v2-features branch, unused here) has only
-- default parameters, so every no-argument call was ambiguous and the
-- admin dashboard's statistics never loaded. It is dropped; its
-- definition, to restore if v2 needs it (without the defaults):
--   CREATE OR REPLACE FUNCTION public.get_dashboard_stats(p_start_date date DEFAULT (date_trunc('month'::text, (CURRENT_DATE)::timestamp with time zone))::date, p_end_date date DEFAULT (((date_trunc('month'::text, (CURRENT_DATE)::timestamp with time zone) + '1 mon'::interval) - '1 day'::interval))::date, p_property_id uuid DEFAULT NULL::uuid)
--    RETURNS json
--    LANGUAGE plpgsql
--    SECURITY DEFINER
--   AS $function$
--   declare
--     result json;
--   begin
--     select json_build_object(
--       'total_bookings', (
--         select count(*) from public.bookings
--         where check_in_date >= p_start_date and check_in_date <= p_end_date
--           and status != 'cancelled'
--           and (p_property_id is null or property_id = p_property_id)
--       ),
--       'total_revenue', (
--         select coalesce(sum(total_amount), 0) from public.bookings
--         where check_in_date >= p_start_date and check_in_date <= p_end_date
--           and status != 'cancelled'
--           and (p_property_id is null or property_id = p_property_id)
--       ),
--       'total_expenses', (
--         select coalesce(sum(amount), 0) from public.expenses
--         where expense_date >= p_start_date and expense_date <= p_end_date
--           and (p_property_id is null or property_id = p_property_id)
--       ),
--       'net_income', (
--         select coalesce(sum(total_amount), 0) from public.bookings
--         where check_in_date >= p_start_date and check_in_date <= p_end_date
--           and status != 'cancelled'
--           and (p_property_id is null or property_id = p_property_id)
--       ) - (
--         select coalesce(sum(amount), 0) from public.expenses
--         where expense_date >= p_start_date and expense_date <= p_end_date
--           and (p_property_id is null or property_id = p_property_id)
--       ),
--       'occupancy_rate', (
--         select round(
--           coalesce(
--             sum(least(check_out_date, p_end_date + 1) - greatest(check_in_date, p_start_date))::numeric /
--             nullif((p_end_date - p_start_date + 1), 0) * 100
--           , 0), 1
--         )
--         from public.bookings
--         where check_out_date > p_start_date and check_in_date <= p_end_date
--           and status != 'cancelled'
--           and (p_property_id is null or property_id = p_property_id)
--       ),
--       'pending_cleaning_tasks', (
--         select count(*) from public.cleaning_tasks
--         where status in ('pending', 'in_progress')
--           and scheduled_date >= p_start_date and scheduled_date <= p_end_date
--           and (p_property_id is null or property_id = p_property_id)
--       ),
--       'bookings_by_source', (
--         select coalesce(json_agg(row_to_json(s)), '[]'::json)
--         from (
--           select source, count(*) as count
--           from public.bookings
--           where check_in_date >= p_start_date and check_in_date <= p_end_date
--             and status != 'cancelled'
--             and (p_property_id is null or property_id = p_property_id)
--           group by source
--           order by count desc
--         ) s
--       ),
--       'expenses_by_category', (
--         select coalesce(json_agg(row_to_json(e)), '[]'::json)
--         from (
--           select category, sum(amount) as total
--           from public.expenses
--           where expense_date >= p_start_date and expense_date <= p_end_date
--             and (p_property_id is null or property_id = p_property_id)
--           group by category
--           order by total desc
--         ) e
--       ),
--       'double_bookings', (
--         select count(*) from public.detect_double_bookings()
--         where (p_property_id is null or property_id = p_property_id)
--       )
--     ) into result;
--     
--     return result;
--   end;
--   $function$
DROP FUNCTION IF EXISTS public.get_dashboard_stats(date, date, uuid);
REVOKE ALL ON FUNCTION public.detect_double_bookings() FROM PUBLIC, anon, authenticated;

-- 4. Visitors who are not signed in may read every public property column,
--    but not e-mail templates, the fee rate or the (emptied) private columns
--    that moved to property_private_details. properties_public is unused by
--    the site and exposed the same columns.
REVOKE SELECT ON public.properties FROM anon;
GRANT SELECT (
  id,
  title,
  description,
  location,
  max_guests,
  bedrooms,
  bathrooms,
  price_per_night,
  currency,
  amenities,
  hero_image_url,
  gallery_images,
  created_at,
  updated_at,
  active,
  host_id,
  pending_approval,
  gallery_metadata,
  video_urls,
  video_metadata,
  amenities_descriptions,
  guidebook_sections,
  what_makes_special,
  get_in_touch_info,
  review_rating,
  review_count,
  tagline_line1,
  tagline_line2,
  availability_text,
  introduction_text,
  special_highlights,
  pricing_table,
  contact_response_time,
  footer_quick_links,
  amenities_data,
  featured_amenities,
  property_type,
  special_amenities,
  weekly_discount_percentage,
  monthly_discount_percentage,
  cancellation_policy,
  preparation_days,
  check_in_time,
  check_out_time,
  latitude,
  longitude,
  city,
  country,
  pre_checkin_reminder_enabled,
  pre_checkin_send_time,
  property_timezone,
  local_tips,
  transport_distances,
  registration_number,
  slug
) ON public.properties TO anon;
REVOKE SELECT ON public.properties_public FROM anon;
