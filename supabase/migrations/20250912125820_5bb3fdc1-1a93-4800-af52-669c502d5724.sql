-- Fix function search path security issue
CREATE OR REPLACE FUNCTION public.calculate_commission_split(
  total_amount_param INTEGER,
  commission_rate_param DECIMAL DEFAULT 10.00
)
RETURNS TABLE(host_amount INTEGER, platform_commission INTEGER)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY SELECT 
    FLOOR(total_amount_param * (100 - commission_rate_param) / 100)::INTEGER as host_amount,
    CEIL(total_amount_param * commission_rate_param / 100)::INTEGER as platform_commission;
END;
$$;