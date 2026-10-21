-- Highest variant price in öre. sync-printful-products sets it, and price is
-- now the cheapest variant, so the shop can show "From <price>" for products
-- whose sizes cost different amounts.
alter table public.shop_products add column if not exists price_max integer;
