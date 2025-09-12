-- Create sample properties with proper UUIDs
-- Generate consistent UUIDs for the sample properties

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
  what_makes_special,
  get_in_touch_info,
  guidebook_sections
)
SELECT 
  '550e8400-e29b-41d4-a716-446655440001'::uuid,
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
  'Villa Häcken offers a unique combination of luxury and nature. Nestled in the pristine Swedish forests, this villa features a traditional wood-fired sauna, floor-to-ceiling windows with stunning forest views, and a beautifully designed interior that seamlessly blends modern amenities with classic Scandinavian style.',
  '{"type": "platform", "contact_email": null, "contact_phone": null}'::jsonb,
  '[
    {
      "title": "Getting There",
      "content": "Villa Häcken is easily accessible by car from Gothenburg (1 hour) or Stockholm (3.5 hours). We provide detailed GPS coordinates and driving directions upon booking confirmation."
    },
    {
      "title": "Local Attractions", 
      "content": "Explore the beautiful Tiveden National Park, visit the historic town of Mariestad, or take a boat trip on Lake Vänern. The area offers excellent hiking, fishing, and opportunities to experience authentic Swedish nature."
    },
    {
      "title": "Villa Amenities",
      "content": "Enjoy our private wood-fired sauna, relax on the spacious outdoor deck, and make use of the fully equipped modern kitchen. The villa features high-speed WiFi, a cozy fireplace, and stunning forest views from every room."
    },
    {
      "title": "House Rules",
      "content": "Check-in: 3:00 PM | Check-out: 11:00 AM | No smoking inside | Pets welcome | Please respect our neighbors and the pristine forest environment. Quiet hours: 10 PM - 8 AM."
    }
  ]'::jsonb
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
  what_makes_special,
  get_in_touch_info,
  guidebook_sections
)
SELECT 
  '550e8400-e29b-41d4-a716-446655440002'::uuid,
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
  'The Lakehouse Getaway provides an unparalleled connection to Swedish nature. Wake up to breathtaking lake views, enjoy complimentary kayaks, relax in the traditional sauna, and spend evenings around the fire pit on your private dock. This property embodies the essence of Swedish summer living.',
  '{"type": "platform", "contact_email": null, "contact_phone": null}'::jsonb,
  '[
    {
      "title": "Getting to the Lake",
      "content": "Located in the heart of Småland, our lakehouse is 2 hours from Stockholm and 1.5 hours from Gothenburg. The final approach is via a scenic forest road that leads directly to your private paradise."
    },
    {
      "title": "Water Activities", 
      "content": "Enjoy complimentary kayaks, swim in the pristine lake waters, or fish for perch and pike (fishing license required). The private dock is perfect for sunbathing and evening relaxation."
    },
    {
      "title": "Lakehouse Features",
      "content": "Traditional Swedish sauna with lake views, fully equipped kitchen, spacious living areas, and a large outdoor deck. BBQ facilities and fire pit area available for memorable evenings under the stars."
    },
    {
      "title": "Seasonal Information",
      "content": "Best visited May-September for water activities. Winter bookings offer ice fishing and cross-country skiing. Aurora borealis visible on clear winter nights. Check-in: 4:00 PM | Check-out: 11:00 AM"
    }
  ]'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM public.properties WHERE title = 'Lakehouse Getaway'
);