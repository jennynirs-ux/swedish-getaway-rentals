-- Visitors could read only the cancellation policy, so the cart showed free
-- shipping to everyone (and the contact page fell back to its defaults).
-- Shipping rates and contact details are public information.
DROP POLICY IF EXISTS "Shipping and contact settings are publicly readable" ON public.platform_settings;
CREATE POLICY "Shipping and contact settings are publicly readable"
  ON public.platform_settings FOR SELECT
  USING (setting_key IN ('shipping_settings', 'contact_content'));
