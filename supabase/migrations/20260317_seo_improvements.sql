-- SEO: Add slug column for SEO-friendly URLs
ALTER TABLE properties ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;

-- Generate slugs for existing properties based on title
-- Format: lowercase, hyphens, no special chars
UPDATE properties
SET slug = LOWER(
  REGEXP_REPLACE(
    REGEXP_REPLACE(
      REPLACE(REPLACE(REPLACE(title, 'å', 'a'), 'ä', 'a'), 'ö', 'o'),
      '[^a-zA-Z0-9\s-]', '', 'g'
    ),
    '\s+', '-', 'g'
  )
)
WHERE slug IS NULL;

-- Ensure slug is unique by appending ID suffix for duplicates
UPDATE properties p1
SET slug = p1.slug || '-' || LEFT(p1.id::text, 8)
WHERE EXISTS (
  SELECT 1 FROM properties p2
  WHERE p2.slug = p1.slug AND p2.id != p1.id
);

CREATE INDEX IF NOT EXISTS idx_properties_slug ON properties(slug);
