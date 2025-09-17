-- Clean up any duplicate products based on printful_product_id
-- This will keep the most recently updated product for each Printful ID
WITH duplicates AS (
  SELECT 
    id,
    printful_product_id,
    ROW_NUMBER() OVER (
      PARTITION BY printful_product_id 
      ORDER BY updated_at DESC, created_at DESC
    ) as rn
  FROM public.shop_products
  WHERE printful_product_id IS NOT NULL
)
DELETE FROM public.shop_products 
WHERE id IN (
  SELECT id 
  FROM duplicates 
  WHERE rn > 1
);