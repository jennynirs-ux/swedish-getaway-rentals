-- Create sample properties for testing if they don't exist
-- This will populate the database with Villa Häcken and Lakehouse Getaway if they don't already exist

-- Create a sample host profile if it doesn't exist
INSERT INTO public.profiles (
  user_id, 
  email, 
  full_name, 
  is_host, 
  host_approved, 
  commission_rate
) 
SELECT 
  '00000000-0000-0000-0000-000000000001'::uuid,
  'host@nordicgetaways.com',
  'Nordic Getaways',
  true,
  true,
  10.00
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles WHERE email = 'host@nordicgetaways.com'
);

-- Insert Villa Häcken if it doesn't exist
INSERT INTO public.properties (
  id,
  title,
  description,
  location,
  price_per_night,
  currency,
  bedrooms,
  bathrooms,
  max_guests,
  amenities,
  hero_image_url,
  gallery_images,
  active,
  host_id,
  what_makes_special,
  get_in_touch_info
)
SELECT 
  'villa-hacken'::uuid,
  'Villa Häcken',
  'Experience luxury in the heart of Swedish nature at Villa Häcken. This stunning villa combines modern comfort with traditional Scandinavian design, offering the perfect retreat for families and groups.',
  'Västergötland, Sweden',
  250000, -- 2500 SEK in öre
  'SEK',
  4,
  3,
  8,
  ARRAY['Private Sauna', 'Forest Views', 'WiFi', 'Full Kitchen', 'Fireplace', 'Outdoor Deck', 'Parking', 'Pet Friendly'],
  '/src/assets/villa-hero.jpg',
  ARRAY['/src/assets/villa-hero.jpg', '/src/assets/villa-interior.jpg', '/src/assets/villa-bedroom.jpg', '/src/assets/villa-sauna.jpg'],
  true,
  (SELECT id FROM public.profiles WHERE email = 'host@nordicgetaways.com' LIMIT 1),
  'Villa Häcken offers a unique combination of luxury and nature. Nestled in the pristine Swedish forests, this villa features a traditional wood-fired sauna, floor-to-ceiling windows with stunning forest views, and a beautifully designed interior that seamlessly blends modern amenities with classic Scandinavian style.',
  '{"type": "platform", "contact_email": null, "contact_phone": null}'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM public.properties WHERE title = 'Villa Häcken'
);

-- Insert Lakehouse Getaway if it doesn't exist
INSERT INTO public.properties (
  id,
  title,
  description,
  location,
  price_per_night,
  currency,
  bedrooms,
  bathrooms,
  max_guests,
  amenities,
  hero_image_url,
  gallery_images,
  active,
  host_id,
  what_makes_special,
  get_in_touch_info
)
SELECT 
  'lakehouse-getaway'::uuid,
  'Lakehouse Getaway',
  'Discover tranquility at our beautiful lakehouse retreat. With stunning lake views, private dock access, and luxurious amenities, this property offers the perfect escape into Swedish nature.',
  'Småland, Sweden',
  320000, -- 3200 SEK in öre
  'SEK',
  3,
  2,
  6,
  ARRAY['Lake Access', 'Private Dock', 'Kayaks Included', 'WiFi', 'Full Kitchen', 'Sauna', 'BBQ Area', 'Parking'],
  '/src/assets/lakehouse-hero.jpg',
  ARRAY['/src/assets/lakehouse-hero.jpg', '/src/assets/lakehouse-interior.jpg', '/src/assets/lakehouse-bedroom.jpg', '/src/assets/lakehouse-lake.jpg'],
  true,
  (SELECT id FROM public.profiles WHERE email = 'host@nordicgetaways.com' LIMIT 1),
  'The Lakehouse Getaway provides an unparalleled connection to Swedish nature. Wake up to breathtaking lake views, enjoy complimentary kayaks, relax in the traditional sauna, and spend evenings around the fire pit on your private dock. This property embodies the essence of Swedish summer living.',
  '{"type": "platform", "contact_email": null, "contact_phone": null}'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM public.properties WHERE title = 'Lakehouse Getaway'
);

-- Update properties table to add guidebook sections for better content
UPDATE public.properties 
SET guidebook_sections = '[
  {
    "title": "Getting There",
    "content": "The property is easily accessible by car from major Swedish cities. Detailed directions will be provided upon booking confirmation."
  },
  {
    "title": "Local Attractions", 
    "content": "Explore nearby hiking trails, visit local markets, and experience authentic Swedish culture in charming nearby villages."
  },
  {
    "title": "House Rules",
    "content": "Please respect our neighbors and the natural environment. Check-in is after 3 PM, check-out before 11 AM. No smoking inside the property."
  }
]'::jsonb
WHERE guidebook_sections IS NULL OR guidebook_sections = '[]'::jsonb;