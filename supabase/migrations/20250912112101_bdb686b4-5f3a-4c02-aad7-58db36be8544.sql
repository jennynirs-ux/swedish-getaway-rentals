-- Add new fields to properties table for enhanced admin management

-- Add amenities descriptions field
ALTER TABLE public.properties 
ADD COLUMN IF NOT EXISTS amenities_descriptions JSONB DEFAULT '{}';

-- Add guidebook sections field  
ALTER TABLE public.properties 
ADD COLUMN IF NOT EXISTS guidebook_sections JSONB DEFAULT '[]';

-- Update existing properties to have empty values for new fields
UPDATE public.properties 
SET amenities_descriptions = '{}', guidebook_sections = '[]' 
WHERE amenities_descriptions IS NULL OR guidebook_sections IS NULL;