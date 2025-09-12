-- Update shop_products table with new fields for enhanced product management
ALTER TABLE shop_products 
ADD COLUMN IF NOT EXISTS title_override TEXT,
ADD COLUMN IF NOT EXISTS description_override TEXT,
ADD COLUMN IF NOT EXISTS price_override INTEGER,
ADD COLUMN IF NOT EXISTS main_image_override TEXT,
ADD COLUMN IF NOT EXISTS additional_images_override TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS is_visible_shop BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS is_visible_home BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS sort_order INTEGER,
ADD COLUMN IF NOT EXISTS printful_sync_variant_id TEXT;

-- Update existing visible column to map to is_visible_shop
UPDATE shop_products SET is_visible_shop = visible WHERE is_visible_shop IS NULL;

-- Create index for better performance on sorting and visibility queries
CREATE INDEX IF NOT EXISTS idx_shop_products_visibility ON shop_products(is_visible_shop, is_visible_home);
CREATE INDEX IF NOT EXISTS idx_shop_products_sort ON shop_products(sort_order, created_at);

-- Update updated_at trigger to include new columns
DROP TRIGGER IF EXISTS update_shop_products_updated_at ON shop_products;
CREATE TRIGGER update_shop_products_updated_at
  BEFORE UPDATE ON shop_products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();