-- Allow public read access to the cancellation_policy setting
CREATE POLICY "Cancellation policy is publicly readable"
ON platform_settings
FOR SELECT
USING (setting_key = 'cancellation_policy');