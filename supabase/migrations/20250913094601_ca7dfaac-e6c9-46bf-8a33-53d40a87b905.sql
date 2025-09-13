-- Create iCal feeds table for Airbnb sync
CREATE TABLE IF NOT EXISTS public.ical_feeds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  last_sync TIMESTAMPTZ,
  sync_status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ical_feeds ENABLE ROW LEVEL SECURITY;

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_ical_feeds_updated_at ON public.ical_feeds;
CREATE TRIGGER set_ical_feeds_updated_at
BEFORE UPDATE ON public.ical_feeds
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Policies: Admin full access
CREATE POLICY "Admins manage ical_feeds"
ON public.ical_feeds
AS PERMISSIVE
FOR ALL
TO PUBLIC
USING (is_user_admin_safe(auth.uid()))
WITH CHECK (is_user_admin_safe(auth.uid()));

-- Policies: Hosts can manage feeds for their properties
CREATE POLICY "Hosts manage own property ical_feeds"
ON public.ical_feeds
AS PERMISSIVE
FOR SELECT, INSERT, UPDATE, DELETE
TO AUTHENTICATED
USING (
  EXISTS (
    SELECT 1 FROM public.properties p
    JOIN public.profiles pr ON p.host_id = pr.id
    WHERE p.id = ical_feeds.property_id AND pr.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.properties p
    JOIN public.profiles pr ON p.host_id = pr.id
    WHERE p.id = ical_feeds.property_id AND pr.user_id = auth.uid()
  )
);

-- Add export secret to properties for secure ICS URLs
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS ical_export_secret TEXT DEFAULT encode(gen_random_bytes(16), 'hex');

-- Realtime configuration for instant syncing
ALTER TABLE public.properties REPLICA IDENTITY FULL;
ALTER TABLE public.availability REPLICA IDENTITY FULL;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'properties'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.properties;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'availability'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.availability;
  END IF;
END $$;