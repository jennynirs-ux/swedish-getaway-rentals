-- Content fixes from the 29 September review, plus half bathrooms.

-- Villa Häcken has 2.5 bathrooms (2 full + a guest toilet); the column only
-- held whole numbers, so the site showed 3. properties_public depends on the
-- column and is recreated (now also without e-mail templates and the fee
-- rate; the site doesn't use it and visitors who aren't signed in can't read it).
DROP VIEW public.properties_public;
ALTER TABLE public.properties ALTER COLUMN bathrooms TYPE numeric(3,1);
CREATE VIEW public.properties_public WITH (security_invoker = true) AS
SELECT id,
    host_id,
    title,
    description,
    location,
    price_per_night,
    currency,
    bedrooms,
    bathrooms,
    max_guests,
    amenities,
    hero_image_url,
    active,
    review_rating,
    review_count,
    property_type,
    special_amenities,
    featured_amenities,
    amenities_data,
    amenities_descriptions,
    gallery_images,
    gallery_metadata,
    video_urls,
    video_metadata,
    guidebook_sections,
    special_highlights,
    pricing_table,
    footer_quick_links,
    tagline_line1,
    tagline_line2,
    availability_text,
    introduction_text,
    contact_response_time,
    what_makes_special,
    local_tips,
    check_in_time,
    check_out_time,
    latitude,
    longitude,
    city,
    country,
    weekly_discount_percentage,
    monthly_discount_percentage,
    preparation_days,
    pre_checkin_reminder_enabled,
    pre_checkin_send_time,
    property_timezone,
    cancellation_policy,
    pending_approval,
    created_at,
    updated_at,
        CASE
            WHEN ((get_in_touch_info ->> 'type'::text) = 'platform'::text) THEN get_in_touch_info
            ELSE jsonb_build_object('type', COALESCE((get_in_touch_info ->> 'type'::text), 'platform'::text))
        END AS get_in_touch_info
   FROM properties;
REVOKE ALL ON public.properties_public FROM anon, authenticated;
GRANT SELECT ON public.properties_public TO authenticated;

UPDATE public.properties SET bathrooms = 2.5 WHERE slug = 'lakefront-retreat';
-- Lakehouse has no indoor bathroom: a dry toilet and an outdoor shower
UPDATE public.properties SET bathrooms = 0 WHERE slug = 'lakehouse-getaway';

-- Typos and claims that weren't true
UPDATE public.properties
SET amenities_data = replace(amenities_data::text, 'Fully equipment kitchen', 'Fully equipped kitchen')::jsonb
WHERE slug = 'lakefront-retreat';

UPDATE public.properties
SET amenities_data = replace(replace(amenities_data::text,
      'Lake Acess', 'Lake Access'),
      'Stay connected with reliable internet access', 'WiFi is available, but the signal can be patchy by the lake')::jsonb,
    featured_amenities = replace(featured_amenities::text, 'Lake Acess', 'Lake Access')::jsonb,
    -- There is no sauna at either cabin
    special_highlights = (
      SELECT jsonb_agg(CASE WHEN h->>'title' = 'Nordic Sauna'
        THEN jsonb_build_object('title', 'Rowing Boat & SUP', 'description', 'Paddle out to the small islands on Stora Härsjön')
        ELSE h END)
      FROM jsonb_array_elements(special_highlights) h
    ),
    -- Weekdays are closed in the cold season (no running water)
    availability_text = 'Summer stays and winter weekends'
WHERE slug = 'lakehouse-getaway';
