-- The public guest guide showed Lakehouse Getaway's street address on the
-- route map pin. Guests now get the exact address in the booking
-- confirmation and the pre-arrival e-mail, so the pin keeps only the town.
UPDATE public.properties
SET guidebook_sections = jsonb_set(
  guidebook_sections,
  '{1,blocks,2,mapPins,0,address}',
  '"Lerum"'
)
WHERE slug = 'lakehouse-getaway'
  AND guidebook_sections->1->>'title' = 'Directions'
  AND guidebook_sections->1->'blocks'->2->>'type' = 'map';
