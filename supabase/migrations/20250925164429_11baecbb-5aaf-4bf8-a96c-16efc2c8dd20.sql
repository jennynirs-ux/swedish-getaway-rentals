-- Add featured_amenities column to properties table to store selected amenities for special highlights
ALTER TABLE public.properties 
ADD COLUMN featured_amenities jsonb DEFAULT '[]'::jsonb;