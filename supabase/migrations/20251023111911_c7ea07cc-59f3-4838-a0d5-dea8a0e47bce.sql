-- Fix shop_products RLS to allow anonymous users to view visible products
DROP POLICY IF EXISTS "Products are viewable by everyone when visible" ON shop_products;

CREATE POLICY "Products are viewable by everyone when visible"
ON shop_products
FOR SELECT
TO public
USING (visible = true);

-- Keep admin policy for managing products
-- (already exists, no change needed)