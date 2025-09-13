-- Update properties table to support enhanced amenities structure
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS amenities_data jsonb DEFAULT '[]'::jsonb;

-- Add comment to explain the new structure
COMMENT ON COLUMN public.properties.amenities_data IS 'Enhanced amenities with icon, title, tagline, description, image, and features. Format: [{"icon": "wifi", "title": "High-Speed WiFi", "tagline": "Stay connected", "description": "Full description...", "image_url": "...", "features": ["feature1", "feature2"]}]';

-- Update guidebook_sections to support pre-filled sections
COMMENT ON COLUMN public.properties.guidebook_sections IS 'Guest guide sections with pre-filled and custom content. Format: [{"id": "wifi", "title": "WiFi Information", "content": "...", "icon": "wifi", "image_url": "...", "is_prefilled": true, "data": {"ssid": "...", "password": "..."}}]';