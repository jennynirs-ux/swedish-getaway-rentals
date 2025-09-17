-- Add unique constraint to prevent duplicate products per Printful ID
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_namespace n ON t.relnamespace = n.oid
    WHERE c.conname = 'uq_shop_products_printful_product_id'
  ) THEN
    ALTER TABLE public.shop_products
    ADD CONSTRAINT uq_shop_products_printful_product_id UNIQUE (printful_product_id);
  END IF;
END $$;
