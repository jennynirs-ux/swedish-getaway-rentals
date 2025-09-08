-- Add gallery_metadata column to store title and description for each gallery image
ALTER TABLE public.properties 
ADD COLUMN gallery_metadata JSONB DEFAULT '[]'::jsonb;

-- Update the column to have proper structure for existing properties
UPDATE public.properties 
SET gallery_metadata = '[]'::jsonb 
WHERE gallery_metadata IS NULL;