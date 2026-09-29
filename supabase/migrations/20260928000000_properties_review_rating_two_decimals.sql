-- Airbnb ratings have two decimals (4.85, 4.98); numeric(2,1) rounded them.
-- properties_public depends on the column, so it is recreated unchanged.
drop view public.properties_public;
alter table public.properties alter column review_rating type numeric(3,2);
create view public.properties_public with (security_invoker = true) as
 SELECT id, host_id, title, description, location, price_per_night, currency, bedrooms, bathrooms, max_guests, amenities, hero_image_url, active, review_rating, review_count, property_type, special_amenities, featured_amenities, amenities_data, amenities_descriptions, gallery_images, gallery_metadata, video_urls, video_metadata, guidebook_sections, special_highlights, pricing_table, footer_quick_links, tagline_line1, tagline_line2, availability_text, introduction_text, contact_response_time, what_makes_special, local_tips, parking_info, check_in_instructions, check_in_time, check_out_time, latitude, longitude, city, country, street, postal_code, weekly_discount_percentage, monthly_discount_percentage, preparation_days, pre_checkin_reminder_enabled, pre_checkin_send_time, email_templates, property_timezone, cancellation_policy, commission_rate, pending_approval, created_at, updated_at,
        CASE
            WHEN (get_in_touch_info ->> 'type'::text) = 'platform'::text THEN get_in_touch_info
            ELSE jsonb_build_object('type', COALESCE(get_in_touch_info ->> 'type'::text, 'platform'::text))
        END AS get_in_touch_info
   FROM properties;
grant all on public.properties_public to anon, authenticated, service_role;
