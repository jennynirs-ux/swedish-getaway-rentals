-- Listings in the guest's language. Hosts write in whatever language they
-- like; translate-content has Claude translate the text on each published
-- listing into English, Swedish and German, and saves one row per text and
-- language here. The guest site shows the translation for its language, or
-- the host's own words while there is none (or it is out of date: source_hash
-- no longer matches the host's text). Field ids: see
-- supabase/functions/_shared/listing-text.ts.

CREATE TABLE IF NOT EXISTS public.content_translations (
  entity_type text NOT NULL CHECK (entity_type IN ('property')),
  entity_id uuid NOT NULL,
  field text NOT NULL,
  lang text NOT NULL CHECK (lang IN ('en', 'sv', 'de')),
  -- The language the host wrote it in: en, sv, de or other
  source_lang text,
  source_hash text NOT NULL,
  -- null when Claude declined it (refused); the host's text is shown, and it
  -- is not tried again until the host changes it
  text text,
  refused boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (entity_type, entity_id, field, lang)
);

ALTER TABLE public.content_translations ENABLE ROW LEVEL SECURITY;

-- Published listings are public, and so are their translations; hosts also
-- see their own unpublished ones. Only translate-content (service role) writes.
DROP POLICY IF EXISTS "Translations of published listings are public" ON public.content_translations;
CREATE POLICY "Translations of published listings are public"
  ON public.content_translations FOR SELECT
  USING (
    entity_type = 'property'
    AND EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = content_translations.entity_id
        AND (p.active OR p.host_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role))
    )
  );

GRANT SELECT ON public.content_translations TO anon, authenticated;

-- When a published listing's text changes (or it is published), translate it
-- at once. translate-content compares fingerprints, so a save that changes
-- no text costs nothing. Anon key as in the cron jobs.
CREATE OR REPLACE FUNCTION public.request_listing_translation(_property_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://bbuutvozqfzbsnllsiai.supabase.co/functions/v1/translate-content',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJidXV0dm96cWZ6YnNubGxzaWFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0MTA3MzMsImV4cCI6MjA3MTk4NjczM30.ipT60g7Ezukgh9QWyHHBeXXc9FS-WczVm_vXo8eKtdw"}'::jsonb,
    body := jsonb_build_object('property_id', _property_id),
    timeout_milliseconds := 300000
  );
EXCEPTION WHEN OTHERS THEN
  -- Never stop a host's save; the hourly run catches up
  RAISE WARNING 'request_listing_translation(%): %', _property_id, SQLERRM;
END;
$$;

REVOKE ALL ON FUNCTION public.request_listing_translation(uuid) FROM PUBLIC, anon, authenticated;

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
  ) THEN
    PERFORM public.request_listing_translation(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS translate_listing_on_change ON public.properties;
CREATE TRIGGER translate_listing_on_change
  AFTER INSERT OR UPDATE ON public.properties
  FOR EACH ROW EXECUTE FUNCTION public.translate_listing_on_change();

-- Extras (pricing rules guests pick by name)
CREATE OR REPLACE FUNCTION public.translate_extra_on_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.rule_type = 'extra_service' AND NEW.is_active
     AND (TG_OP = 'INSERT' OR OLD.name IS DISTINCT FROM NEW.name OR OLD.is_active IS DISTINCT FROM NEW.is_active)
     AND EXISTS (SELECT 1 FROM public.properties p WHERE p.id = NEW.property_id AND p.active) THEN
    PERFORM public.request_listing_translation(NEW.property_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS translate_extra_on_change ON public.properties_pricing_rules;
CREATE TRIGGER translate_extra_on_change
  AFTER INSERT OR UPDATE ON public.properties_pricing_rules
  FOR EACH ROW EXECUTE FUNCTION public.translate_extra_on_change();

-- Hourly catch-up: anything a trigger call missed (a timeout, a save while a
-- run was busy with the same listing, the API key added later)
SELECT cron.unschedule(jobname) FROM cron.job WHERE jobname = 'translate-content';
SELECT cron.schedule(
  'translate-content',
  '40 * * * *',
  $$
  select net.http_post(
    url := 'https://bbuutvozqfzbsnllsiai.supabase.co/functions/v1/translate-content',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJidXV0dm96cWZ6YnNubGxzaWFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0MTA3MzMsImV4cCI6MjA3MTk4NjczM30.ipT60g7Ezukgh9QWyHHBeXXc9FS-WczVm_vXo8eKtdw"}'::jsonb,
    body := '{"all": true}'::jsonb,
    timeout_milliseconds := 300000
  )
  $$
);
