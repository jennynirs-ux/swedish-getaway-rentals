
-- Fix security definer views - recreate as security invoker (default for views)
-- Drop and recreate with explicit security invoker

DROP VIEW IF EXISTS public.properties_public;
CREATE VIEW public.properties_public 
WITH (security_invoker = true)
AS
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
  CASE 
    WHEN get_in_touch_info->>'type' = 'platform' THEN get_in_touch_info
    ELSE jsonb_build_object('type', COALESCE(get_in_touch_info->>'type', 'platform'))
  END AS get_in_touch_info
FROM public.properties;

DROP VIEW IF EXISTS public.guestbook_entries_public;
CREATE VIEW public.guestbook_entries_public
WITH (security_invoker = true)
AS
SELECT 
  id, property_id, booking_id, guest_name, message, rating,
  image_url, status, stay_date, created_at, updated_at,
  moderated_at, moderated_by
FROM public.guestbook_entries;

-- Grant access to these views
GRANT SELECT ON public.properties_public TO anon, authenticated;
GRANT SELECT ON public.guestbook_entries_public TO anon, authenticated;
