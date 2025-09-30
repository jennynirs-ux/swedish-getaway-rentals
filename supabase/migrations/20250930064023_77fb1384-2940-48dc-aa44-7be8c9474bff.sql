-- Add property_type column to properties table
ALTER TABLE public.properties 
ADD COLUMN property_type TEXT DEFAULT 'property';

-- Add special_amenities column to properties table (array of featured amenity IDs)
ALTER TABLE public.properties 
ADD COLUMN special_amenities TEXT[] DEFAULT '{}';

-- Add tags column to shop_products for filtering
ALTER TABLE public.shop_products 
ADD COLUMN tags TEXT[] DEFAULT '{}';

-- Add product_type column to shop_products for filtering
ALTER TABLE public.shop_products 
ADD COLUMN product_type TEXT;

-- Add color column to shop_products for filtering
ALTER TABLE public.shop_products 
ADD COLUMN color TEXT;