-- Add location fields to properties table
ALTER TABLE public.properties 
ADD COLUMN IF NOT EXISTS latitude NUMERIC(10, 7),
ADD COLUMN IF NOT EXISTS longitude NUMERIC(10, 7),
ADD COLUMN IF NOT EXISTS street TEXT,
ADD COLUMN IF NOT EXISTS postal_code TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'Sweden';

-- Add index for location-based queries
CREATE INDEX IF NOT EXISTS idx_properties_coordinates ON public.properties(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_properties_city ON public.properties(lower(city));

-- Add comment
COMMENT ON COLUMN public.properties.latitude IS 'Property latitude for map display';
COMMENT ON COLUMN public.properties.longitude IS 'Property longitude for map display';
COMMENT ON COLUMN public.properties.city IS 'City name (normalized to lowercase for search)';
COMMENT ON COLUMN public.properties.street IS 'Street address';
COMMENT ON COLUMN public.properties.postal_code IS 'Postal/ZIP code';
COMMENT ON COLUMN public.properties.country IS 'Country name';