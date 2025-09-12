-- Add new fields to properties table for unified template
ALTER TABLE public.properties 
ADD COLUMN review_rating NUMERIC(2,1) DEFAULT 5.0,
ADD COLUMN review_count INTEGER DEFAULT 0,
ADD COLUMN tagline_line1 TEXT DEFAULT 'Experience luxury in the heart of Swedish nature.',
ADD COLUMN tagline_line2 TEXT DEFAULT 'Your perfect escape awaits.',
ADD COLUMN availability_text TEXT DEFAULT 'Available year-round',
ADD COLUMN introduction_text TEXT DEFAULT 'Every corner has been thoughtfully designed to provide the ultimate combination of luxury, comfort, and connection with nature.',
ADD COLUMN special_highlights JSONB DEFAULT '[]'::jsonb,
ADD COLUMN pricing_table JSONB DEFAULT '{
  "off_season": {"price": 2500, "currency": "SEK"},
  "peak_season": {"price": 3500, "currency": "SEK"},
  "holiday_periods": {"price": 4500, "currency": "SEK"},
  "cleaning_fee": {"price": 500, "currency": "SEK"},
  "minimum_stay": 2,
  "weekly_discount": "Contact for weekly rates"
}'::jsonb,
ADD COLUMN contact_response_time TEXT DEFAULT 'We typically respond to inquiries within 2 hours.',
ADD COLUMN footer_quick_links JSONB DEFAULT '["Photo Gallery", "Amenities", "Book Now", "Contact"]'::jsonb;

-- Update sample properties with template data
UPDATE public.properties 
SET 
  tagline_line1 = 'Experience luxury in the heart of Swedish nature.',
  tagline_line2 = 'Your perfect escape awaits.',
  review_rating = 5.0,
  review_count = 41,
  availability_text = 'Available year-round',
  introduction_text = 'Every corner of Villa Häcken has been thoughtfully designed to provide the ultimate combination of luxury, comfort, and connection with nature.',
  special_highlights = '[
    {"title": "Nature Immersion", "description": "Surrounded by pristine forest"},
    {"title": "Authentic Swedish", "description": "Traditional hot tub experience"},
    {"title": "Luxury Comfort", "description": "Modern amenities in a stunning natural setting"}
  ]'::jsonb,
  pricing_table = '{
    "off_season": {"price": 2500, "currency": "SEK"},
    "peak_season": {"price": 3500, "currency": "SEK"},
    "holiday_periods": {"price": 4500, "currency": "SEK"},
    "cleaning_fee": {"price": 500, "currency": "SEK"},
    "minimum_stay": 2,
    "weekly_discount": "Contact for weekly rates"
  }'::jsonb,
  contact_response_time = 'We typically respond to inquiries within 2 hours.'
WHERE title ILIKE '%Villa Häcken%';

UPDATE public.properties 
SET 
  tagline_line1 = 'Escape to tranquil lakeside luxury.',
  tagline_line2 = 'Where water meets wilderness.',
  review_rating = 4.9,
  review_count = 28,
  availability_text = 'Available spring through fall',
  introduction_text = 'Our lakehouse getaway offers the perfect blend of waterfront serenity and modern comfort, designed for those seeking peace and natural beauty.',
  special_highlights = '[
    {"title": "Lakefront Access", "description": "Private dock and swimming area"},
    {"title": "Nordic Sauna", "description": "Traditional sauna with lake views"},
    {"title": "Peaceful Retreat", "description": "Secluded location for ultimate relaxation"}
  ]'::jsonb,
  pricing_table = '{
    "off_season": {"price": 2200, "currency": "SEK"},
    "peak_season": {"price": 3200, "currency": "SEK"},
    "holiday_periods": {"price": 4200, "currency": "SEK"},
    "cleaning_fee": {"price": 450, "currency": "SEK"},
    "minimum_stay": 3,
    "weekly_discount": "15% discount for 7+ nights"
  }'::jsonb,
  contact_response_time = 'We typically respond to inquiries within 1 hour.'
WHERE title ILIKE '%Lakehouse%';