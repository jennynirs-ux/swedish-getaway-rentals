-- Insert default cancellation policy settings into platform_settings
INSERT INTO public.platform_settings (setting_key, setting_value)
VALUES (
  'cancellation_policy',
  '{
    "tiers": [
      {"min_days": 22, "refund_percentage": 90, "label": "More than 21 days before arrival"},
      {"min_days": 8, "max_days": 21, "refund_percentage": 50, "label": "21–8 days before arrival"},
      {"min_days": 0, "max_days": 7, "refund_percentage": 0, "label": "7 days or less before arrival"}
    ],
    "footer_note": "Cancellations must be made through the same channel as the booking. We recommend purchasing travel insurance to cover unforeseen circumstances."
  }'::jsonb
)
ON CONFLICT (setting_key) DO UPDATE SET 
  setting_value = EXCLUDED.setting_value,
  updated_at = now();