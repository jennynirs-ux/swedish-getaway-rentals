-- E-mails in the guest's language. The language the guest booked in (the
-- site's /sv or /de, from the checkout's metadata) is saved on the booking,
-- and the e-mails to the guest use it. Bookings made any other way (admin,
-- calendar imports) are English.
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS guest_lang text NOT NULL DEFAULT 'en';
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_guest_lang_check;
ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_guest_lang_check CHECK (guest_lang IN ('en', 'sv', 'de'));

-- What hosts write only for booked guests (check-in instructions, parking,
-- their e-mail templates) is translated too, as entity 'property_private'.
-- The select policy only covers 'property', so these rows are readable by
-- the service role (the e-mail functions) alone.
ALTER TABLE public.content_translations DROP CONSTRAINT IF EXISTS content_translations_entity_type_check;
ALTER TABLE public.content_translations
  ADD CONSTRAINT content_translations_entity_type_check CHECK (entity_type IN ('property', 'property_private'));

-- Translate when those change as well
CREATE OR REPLACE FUNCTION public.translate_listing_on_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.active AND (
    TG_OP = 'INSERT'
    OR OLD.active IS DISTINCT FROM NEW.active
    OR OLD.title IS DISTINCT FROM NEW.title
    OR OLD.tagline_line1 IS DISTINCT FROM NEW.tagline_line1
    OR OLD.tagline_line2 IS DISTINCT FROM NEW.tagline_line2
    OR OLD.introduction_text IS DISTINCT FROM NEW.introduction_text
    OR OLD.description IS DISTINCT FROM NEW.description
    OR OLD.availability_text IS DISTINCT FROM NEW.availability_text
    OR OLD.contact_response_time IS DISTINCT FROM NEW.contact_response_time
    OR OLD.what_makes_special IS DISTINCT FROM NEW.what_makes_special
    OR OLD.local_tips IS DISTINCT FROM NEW.local_tips
    OR OLD.parking_info IS DISTINCT FROM NEW.parking_info
    OR OLD.amenities IS DISTINCT FROM NEW.amenities
    OR OLD.amenities_data IS DISTINCT FROM NEW.amenities_data
    OR OLD.featured_amenities IS DISTINCT FROM NEW.featured_amenities
    OR OLD.special_highlights IS DISTINCT FROM NEW.special_highlights
    OR OLD.gallery_metadata IS DISTINCT FROM NEW.gallery_metadata
    OR OLD.guidebook_sections IS DISTINCT FROM NEW.guidebook_sections
    OR OLD.email_templates IS DISTINCT FROM NEW.email_templates
  ) THEN
    PERFORM public.request_listing_translation(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.translate_private_details_on_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'INSERT'
      OR OLD.check_in_instructions IS DISTINCT FROM NEW.check_in_instructions
      OR OLD.parking_info IS DISTINCT FROM NEW.parking_info)
     AND EXISTS (SELECT 1 FROM public.properties p WHERE p.id = NEW.property_id AND p.active) THEN
    PERFORM public.request_listing_translation(NEW.property_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS translate_private_details_on_change ON public.property_private_details;
CREATE TRIGGER translate_private_details_on_change
  AFTER INSERT OR UPDATE ON public.property_private_details
  FOR EACH ROW EXECUTE FUNCTION public.translate_private_details_on_change();
