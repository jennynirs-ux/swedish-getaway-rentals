-- Move guest-only property data out of the publicly readable properties table.
--
-- properties is readable by anyone when active = true, and properties_public
-- (security_invoker) exposes the same rows to anon. The exact street address,
-- postal code, check-in instructions (key box codes, wifi, ...) and parking
-- info must only be visible to the property's host, admins and the system
-- (service role, used by the edge functions that email booked guests).
--
-- The old columns on properties are kept (nulled, not dropped) so the change is
-- reversible and the generated types keep compiling. A trigger moves anything
-- that is still written to them into the private table.
-- local_tips stays public on properties (shown in marketing copy / guides).

CREATE TABLE IF NOT EXISTS public.property_private_details (
  property_id UUID PRIMARY KEY REFERENCES public.properties(id) ON DELETE CASCADE,
  street TEXT,
  postal_code TEXT,
  check_in_instructions TEXT,
  parking_info TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.property_private_details IS
'Guest-only property data (exact address, check-in instructions, parking). Readable only by the property host, admins and the service role; guests receive it by email after booking.';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_property_private_details_updated_at'
  ) THEN
    CREATE TRIGGER update_property_private_details_updated_at
      BEFORE UPDATE ON public.property_private_details
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- Is the given user an admin, or the approved host that owns the property?
-- SECURITY DEFINER so the check does not depend on the RLS of properties/profiles.
CREATE OR REPLACE FUNCTION public.can_manage_property_private_details(_property_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_admin_secure_new(_user_id)
    OR EXISTS (
      SELECT 1
      FROM public.properties p
      JOIN public.profiles pr ON pr.id = p.host_id
      WHERE p.id = _property_id
        AND pr.user_id = _user_id
        AND pr.is_host = true
        AND pr.host_approved = true
    );
$$;

REVOKE ALL ON FUNCTION public.can_manage_property_private_details(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_manage_property_private_details(UUID, UUID) TO authenticated, service_role;

-- RLS: host of the property and admins only. No policy for anon; the service
-- role bypasses RLS.
ALTER TABLE public.property_private_details ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.property_private_details FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.property_private_details TO authenticated;
GRANT ALL ON public.property_private_details TO service_role;

DROP POLICY IF EXISTS "Property private details: host or admin can view" ON public.property_private_details;
CREATE POLICY "Property private details: host or admin can view"
  ON public.property_private_details FOR SELECT
  TO authenticated
  USING (public.can_manage_property_private_details(property_id, auth.uid()));

DROP POLICY IF EXISTS "Property private details: host or admin can insert" ON public.property_private_details;
CREATE POLICY "Property private details: host or admin can insert"
  ON public.property_private_details FOR INSERT
  TO authenticated
  WITH CHECK (public.can_manage_property_private_details(property_id, auth.uid()));

DROP POLICY IF EXISTS "Property private details: host or admin can update" ON public.property_private_details;
CREATE POLICY "Property private details: host or admin can update"
  ON public.property_private_details FOR UPDATE
  TO authenticated
  USING (public.can_manage_property_private_details(property_id, auth.uid()))
  WITH CHECK (public.can_manage_property_private_details(property_id, auth.uid()));

DROP POLICY IF EXISTS "Property private details: admin can delete" ON public.property_private_details;
CREATE POLICY "Property private details: admin can delete"
  ON public.property_private_details FOR DELETE
  TO authenticated
  USING (public.is_admin_secure_new(auth.uid()));

-- Copy existing data, then clear it from the public table.
INSERT INTO public.property_private_details (property_id, street, postal_code, check_in_instructions, parking_info)
SELECT id, street, postal_code, check_in_instructions, parking_info
FROM public.properties
WHERE street IS NOT NULL
   OR postal_code IS NOT NULL
   OR check_in_instructions IS NOT NULL
   OR parking_info IS NOT NULL
ON CONFLICT (property_id) DO UPDATE SET
  street = COALESCE(EXCLUDED.street, property_private_details.street),
  postal_code = COALESCE(EXCLUDED.postal_code, property_private_details.postal_code),
  check_in_instructions = COALESCE(EXCLUDED.check_in_instructions, property_private_details.check_in_instructions),
  parking_info = COALESCE(EXCLUDED.parking_info, property_private_details.parking_info);

UPDATE public.properties
SET street = NULL, postal_code = NULL, check_in_instructions = NULL, parking_info = NULL
WHERE street IS NOT NULL
   OR postal_code IS NOT NULL
   OR check_in_instructions IS NOT NULL
   OR parking_info IS NOT NULL;

COMMENT ON COLUMN public.properties.street IS 'DEPRECATED: moved to property_private_details (always NULL here).';
COMMENT ON COLUMN public.properties.postal_code IS 'DEPRECATED: moved to property_private_details (always NULL here).';
COMMENT ON COLUMN public.properties.check_in_instructions IS 'DEPRECATED: moved to property_private_details (always NULL here).';
COMMENT ON COLUMN public.properties.parking_info IS 'DEPRECATED: moved to property_private_details (always NULL here).';

-- Safety net: if old code (or a regenerated Lovable component) still writes the
-- legacy columns on properties, move the values to the private table instead of
-- leaving them publicly readable. Non-NULL values overwrite, NULLs are ignored.
CREATE OR REPLACE FUNCTION public.upsert_property_private_details_from_row(
  _property_id UUID, _street TEXT, _postal_code TEXT, _check_in_instructions TEXT, _parking_info TEXT
)
RETURNS VOID
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.property_private_details AS d (property_id, street, postal_code, check_in_instructions, parking_info)
  VALUES (_property_id, _street, _postal_code, _check_in_instructions, _parking_info)
  ON CONFLICT (property_id) DO UPDATE SET
    street = COALESCE(EXCLUDED.street, d.street),
    postal_code = COALESCE(EXCLUDED.postal_code, d.postal_code),
    check_in_instructions = COALESCE(EXCLUDED.check_in_instructions, d.check_in_instructions),
    parking_info = COALESCE(EXCLUDED.parking_info, d.parking_info);
$$;

REVOKE ALL ON FUNCTION public.upsert_property_private_details_from_row(UUID, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;

-- UPDATE: the property row exists, so move the values and clear them in place.
CREATE OR REPLACE FUNCTION public.properties_move_private_columns_on_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.street IS NULL AND NEW.postal_code IS NULL
     AND NEW.check_in_instructions IS NULL AND NEW.parking_info IS NULL THEN
    RETURN NEW;
  END IF;

  PERFORM public.upsert_property_private_details_from_row(
    NEW.id, NEW.street, NEW.postal_code, NEW.check_in_instructions, NEW.parking_info
  );

  NEW.street := NULL;
  NEW.postal_code := NULL;
  NEW.check_in_instructions := NULL;
  NEW.parking_info := NULL;
  RETURN NEW;
END;
$$;

-- INSERT: the FK needs the property row first, so move the values afterwards.
-- The follow-up UPDATE only sets NULLs, so the UPDATE trigger is a no-op.
CREATE OR REPLACE FUNCTION public.properties_move_private_columns_after_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.street IS NULL AND NEW.postal_code IS NULL
     AND NEW.check_in_instructions IS NULL AND NEW.parking_info IS NULL THEN
    RETURN NULL;
  END IF;

  PERFORM public.upsert_property_private_details_from_row(
    NEW.id, NEW.street, NEW.postal_code, NEW.check_in_instructions, NEW.parking_info
  );

  UPDATE public.properties
  SET street = NULL, postal_code = NULL, check_in_instructions = NULL, parking_info = NULL
  WHERE id = NEW.id;
  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.properties_move_private_columns_on_update() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.properties_move_private_columns_after_insert() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS properties_move_private_columns_on_update ON public.properties;
CREATE TRIGGER properties_move_private_columns_on_update
  BEFORE UPDATE OF street, postal_code, check_in_instructions, parking_info ON public.properties
  FOR EACH ROW
  EXECUTE FUNCTION public.properties_move_private_columns_on_update();

DROP TRIGGER IF EXISTS properties_move_private_columns_after_insert ON public.properties;
CREATE TRIGGER properties_move_private_columns_after_insert
  AFTER INSERT ON public.properties
  FOR EACH ROW
  EXECUTE FUNCTION public.properties_move_private_columns_after_insert();

-- properties_public: same as 20260928_properties_review_rating_two_decimals.sql
-- minus street, postal_code, check_in_instructions and parking_info.
DROP VIEW IF EXISTS public.properties_public;
CREATE VIEW public.properties_public WITH (security_invoker = true) AS
 SELECT id, host_id, title, description, location, price_per_night, currency, bedrooms, bathrooms, max_guests, amenities, hero_image_url, active, review_rating, review_count, property_type, special_amenities, featured_amenities, amenities_data, amenities_descriptions, gallery_images, gallery_metadata, video_urls, video_metadata, guidebook_sections, special_highlights, pricing_table, footer_quick_links, tagline_line1, tagline_line2, availability_text, introduction_text, contact_response_time, what_makes_special, local_tips, check_in_time, check_out_time, latitude, longitude, city, country, weekly_discount_percentage, monthly_discount_percentage, preparation_days, pre_checkin_reminder_enabled, pre_checkin_send_time, email_templates, property_timezone, cancellation_policy, commission_rate, pending_approval, created_at, updated_at,
        CASE
            WHEN (get_in_touch_info ->> 'type'::text) = 'platform'::text THEN get_in_touch_info
            ELSE jsonb_build_object('type', COALESCE(get_in_touch_info ->> 'type'::text, 'platform'::text))
        END AS get_in_touch_info
   FROM properties;
GRANT ALL ON public.properties_public TO anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- iCal export secret: also guest-/host-only. It was readable by anon through
-- "Active properties are publicly viewable", which exposed the booking
-- calendar. Values are kept as-is because they are embedded in the export URLs
-- already configured on Airbnb/Booking.com.
-- ---------------------------------------------------------------------------
ALTER TABLE public.property_private_details
  ADD COLUMN IF NOT EXISTS ical_export_secret TEXT NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex');

INSERT INTO public.property_private_details AS d (property_id, ical_export_secret)
SELECT id, ical_export_secret FROM public.properties WHERE ical_export_secret IS NOT NULL
ON CONFLICT (property_id) DO UPDATE SET ical_export_secret = EXCLUDED.ical_export_secret;

-- Every property gets a private row (and so an export secret)
INSERT INTO public.property_private_details (property_id)
SELECT id FROM public.properties
ON CONFLICT (property_id) DO NOTHING;

ALTER TABLE public.properties ALTER COLUMN ical_export_secret DROP DEFAULT;
UPDATE public.properties SET ical_export_secret = NULL WHERE ical_export_secret IS NOT NULL;
COMMENT ON COLUMN public.properties.ical_export_secret IS 'DEPRECATED: moved to property_private_details (always NULL here).';

CREATE OR REPLACE FUNCTION public.properties_move_private_columns_on_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.street IS NULL AND NEW.postal_code IS NULL AND NEW.check_in_instructions IS NULL
     AND NEW.parking_info IS NULL AND NEW.ical_export_secret IS NULL THEN
    RETURN NEW;
  END IF;

  PERFORM public.upsert_property_private_details_from_row(
    NEW.id, NEW.street, NEW.postal_code, NEW.check_in_instructions, NEW.parking_info
  );
  IF NEW.ical_export_secret IS NOT NULL THEN
    UPDATE public.property_private_details SET ical_export_secret = NEW.ical_export_secret
    WHERE property_id = NEW.id;
  END IF;

  NEW.street := NULL;
  NEW.postal_code := NULL;
  NEW.check_in_instructions := NULL;
  NEW.parking_info := NULL;
  NEW.ical_export_secret := NULL;
  RETURN NEW;
END;
$$;

-- Always create the private row for a new property (it carries the iCal secret)
CREATE OR REPLACE FUNCTION public.properties_move_private_columns_after_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.upsert_property_private_details_from_row(
    NEW.id, NEW.street, NEW.postal_code, NEW.check_in_instructions, NEW.parking_info
  );
  IF NEW.ical_export_secret IS NOT NULL THEN
    UPDATE public.property_private_details SET ical_export_secret = NEW.ical_export_secret
    WHERE property_id = NEW.id;
  END IF;

  IF NEW.street IS NOT NULL OR NEW.postal_code IS NOT NULL OR NEW.check_in_instructions IS NOT NULL
     OR NEW.parking_info IS NOT NULL OR NEW.ical_export_secret IS NOT NULL THEN
    UPDATE public.properties
    SET street = NULL, postal_code = NULL, check_in_instructions = NULL, parking_info = NULL, ical_export_secret = NULL
    WHERE id = NEW.id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS properties_move_private_columns_on_update ON public.properties;
CREATE TRIGGER properties_move_private_columns_on_update
  BEFORE UPDATE OF street, postal_code, check_in_instructions, parking_info, ical_export_secret ON public.properties
  FOR EACH ROW
  EXECUTE FUNCTION public.properties_move_private_columns_on_update();

-- ---------------------------------------------------------------------------
-- Public coordinates: round to 2 decimals (~1 km) so the public map, JSON-LD
-- and API show the area, not the house. Guests get the exact address by email.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.properties_round_public_coordinates()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.latitude := round(NEW.latitude::numeric, 2);
  NEW.longitude := round(NEW.longitude::numeric, 2);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS properties_round_public_coordinates ON public.properties;
CREATE TRIGGER properties_round_public_coordinates
  BEFORE INSERT OR UPDATE OF latitude, longitude ON public.properties
  FOR EACH ROW
  EXECUTE FUNCTION public.properties_round_public_coordinates();

UPDATE public.properties
SET latitude = round(latitude::numeric, 2), longitude = round(longitude::numeric, 2)
WHERE latitude IS NOT NULL OR longitude IS NOT NULL;
