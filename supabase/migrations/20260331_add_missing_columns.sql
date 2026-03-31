-- Add columns that the code references but don't exist in the database yet.
-- These were defined in earlier migration files but may not have been applied.

-- Properties: transport_distances (used by HostLocationTab for nearby locations)
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS transport_distances JSONB;

-- Properties: registration_number (EU Rental Registration, used by HostBasicTab + TaxReport)
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS registration_number TEXT;

-- Properties: slug (used for SEO-friendly URLs)
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS slug TEXT;

-- Create unique index on slug (only for non-null values)
CREATE UNIQUE INDEX IF NOT EXISTS idx_properties_slug
  ON public.properties(slug) WHERE slug IS NOT NULL;

-- Backfill slugs from property IDs (hosts can customize later)
UPDATE public.properties
SET slug = id::text
WHERE slug IS NULL;
