-- The amenity lists mixed Swedish duplicates of English entries ("Båt" and
-- "Rowing boat"); the site and its structured data are in English.
UPDATE public.properties
SET amenities = array_replace(array_replace(
      array_remove(array_remove(array_remove(amenities,
        'Brädspel'), 'Böcker och läsmaterial'), 'Brödrost'),
      'Båt', 'Boats'),
      'Brandvarnare', 'Smoke Alarm')
WHERE slug = 'lakefront-retreat';

UPDATE public.properties
SET amenities = array_remove(array_remove(array_remove(array_remove(array_remove(array_remove(array_remove(amenities,
      'Terrass'), 'Utegrill'), 'Parkering'), 'Båt'), 'Skog'), 'Eldstad'), 'Vandring')
WHERE slug = 'lakehouse-getaway';
