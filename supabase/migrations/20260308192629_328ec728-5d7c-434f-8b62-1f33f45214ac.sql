
-- 1. Create a public-safe view for properties that hides ical_export_secret
CREATE OR REPLACE VIEW public.properties_public AS
SELECT 
  id, host_id, title, description, location, price_per_night, currency,
  bedrooms, bathrooms, max_guests, amenities, hero_image_url, active,
  review_rating, review_count, property_type, special_amenities,
  featured_amenities, amenities_data, amenities_descriptions,
  gallery_images, gallery_metadata, video_urls, video_metadata,
  guidebook_sections, special_highlights, pricing_table,
  footer_quick_links, tagline_line1, tagline_line2,
  availability_text, introduction_text, contact_response_time,
  what_makes_special, local_tips, parking_info, check_in_instructions,
  check_in_time, check_out_time, latitude, longitude, city, country,
  street, postal_code, weekly_discount_percentage, monthly_discount_percentage,
  preparation_days, pre_checkin_reminder_enabled, pre_checkin_send_time,
  email_templates, property_timezone, cancellation_policy, commission_rate,
  pending_approval, created_at, updated_at,
  -- Sanitize get_in_touch_info to only expose type, not personal details
  CASE 
    WHEN get_in_touch_info->>'type' = 'platform' THEN get_in_touch_info
    ELSE jsonb_build_object('type', COALESCE(get_in_touch_info->>'type', 'platform'))
  END AS get_in_touch_info
FROM public.properties;

-- 2. Create a public-safe view for guestbook that hides guest_email
CREATE OR REPLACE VIEW public.guestbook_entries_public AS
SELECT 
  id, property_id, booking_id, guest_name, message, rating,
  image_url, status, stay_date, created_at, updated_at,
  moderated_at, moderated_by
FROM public.guestbook_entries;

-- 3. Enable RLS on bookings_secure view (it's a view, so we need to handle differently)
-- The bookings_secure view already exists. Let's add security by revoking direct access
-- and only allowing access through proper channels
REVOKE ALL ON public.bookings_secure FROM anon;
REVOKE ALL ON public.bookings_secure FROM authenticated;

-- Grant read access back but only to authenticated users  
GRANT SELECT ON public.bookings_secure TO authenticated;

-- Add RLS-like protection via a security definer wrapper
CREATE OR REPLACE FUNCTION public.get_bookings_secure_for_user()
RETURNS SETOF public.bookings_secure
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM public.bookings_secure bs
  WHERE 
    -- Admin can see all
    has_role(auth.uid(), 'admin'::app_role)
    -- Users can see their own bookings
    OR bs.user_id = auth.uid()
    -- Hosts can see bookings for their properties
    OR bs.property_id IN (
      SELECT p.id FROM properties p
      JOIN profiles pr ON p.host_id = pr.id
      WHERE pr.user_id = auth.uid()
    );
END;
$$;

-- 4. Revoke direct access to ical_export_secret column
-- We can't do column-level REVOKE on views easily, so instead revoke from the column directly
REVOKE SELECT (ical_export_secret) ON public.properties FROM anon;
REVOKE SELECT (ical_export_secret) ON public.properties FROM authenticated;

-- Only service_role (edge functions) can read ical_export_secret
-- This is already granted by default to service_role

-- 5. Fix email tracking RLS - tighten the overly permissive policies
DROP POLICY IF EXISTS "System can insert email tracking" ON public.booking_email_tracking;
DROP POLICY IF EXISTS "System can update email tracking" ON public.booking_email_tracking;

-- Only service_role (via edge functions) should insert/update email tracking
-- No new policies needed since service_role bypasses RLS
