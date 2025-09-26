-- Fix security warnings by updating function search paths
CREATE OR REPLACE FUNCTION public.validate_coupon(
  coupon_code TEXT,
  user_id_param UUID DEFAULT NULL,
  property_id_param UUID DEFAULT NULL,
  booking_amount INTEGER DEFAULT NULL
)
RETURNS TABLE(
  valid BOOLEAN,
  coupon_id UUID,
  discount_amount INTEGER,
  message TEXT
) LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
DECLARE
  coupon_record RECORD;
  calculated_discount INTEGER;
BEGIN
  -- Find the coupon
  SELECT * INTO coupon_record
  FROM public.coupons
  WHERE code = coupon_code AND is_active = TRUE;
  
  -- Check if coupon exists
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, 0, 'Invalid coupon code';
    RETURN;
  END IF;
  
  -- Check validity dates
  IF NOW() < coupon_record.valid_from OR NOW() > coupon_record.valid_until THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, 0, 'Coupon has expired or is not yet valid';
    RETURN;
  END IF;
  
  -- Check usage limit
  IF coupon_record.usage_limit IS NOT NULL AND coupon_record.used_count >= coupon_record.usage_limit THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, 0, 'Coupon usage limit reached';
    RETURN;
  END IF;
  
  -- Check property restriction
  IF coupon_record.property_id IS NOT NULL AND coupon_record.property_id != property_id_param THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, 0, 'Coupon not valid for this property';
    RETURN;
  END IF;
  
  -- Check minimum amount
  IF coupon_record.minimum_amount IS NOT NULL AND booking_amount < coupon_record.minimum_amount THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, 0, 'Minimum amount not met for this coupon';
    RETURN;
  END IF;
  
  -- Calculate discount
  IF coupon_record.discount_type = 'percentage' THEN
    calculated_discount := FLOOR(booking_amount * coupon_record.discount_value / 100);
  ELSE
    calculated_discount := coupon_record.discount_value::INTEGER;
  END IF;
  
  -- Apply maximum discount limit
  IF coupon_record.maximum_discount_amount IS NOT NULL AND calculated_discount > coupon_record.maximum_discount_amount THEN
    calculated_discount := coupon_record.maximum_discount_amount;
  END IF;
  
  RETURN QUERY SELECT TRUE, coupon_record.id, calculated_discount, 'Coupon is valid';
END;
$$;

-- Fix the auto-publish reviews function
CREATE OR REPLACE FUNCTION public.auto_publish_reviews()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  -- Check if both guest and host have now reviewed each other for this booking
  IF (
    SELECT COUNT(*) 
    FROM public.reviews 
    WHERE booking_id = NEW.booking_id 
    AND moderation_status = 'approved'
  ) >= 2 THEN
    -- Publish both reviews
    UPDATE public.reviews 
    SET is_published = TRUE 
    WHERE booking_id = NEW.booking_id 
    AND moderation_status = 'approved';
  END IF;
  
  RETURN NEW;
END;
$$;