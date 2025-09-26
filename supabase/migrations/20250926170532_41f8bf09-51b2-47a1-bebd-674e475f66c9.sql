-- Enhanced profiles table with social auth and guest features
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS display_name TEXT,
ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'email',
ADD COLUMN IF NOT EXISTS provider_id TEXT,
ADD COLUMN IF NOT EXISTS date_of_birth DATE,
ADD COLUMN IF NOT EXISTS location TEXT,
ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS guest_rating NUMERIC(3,2) DEFAULT 5.0,
ADD COLUMN IF NOT EXISTS guest_review_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_stays INTEGER DEFAULT 0;

-- Create reviews table for double-blind review system
CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL,
  reviewer_id UUID NOT NULL,
  reviewee_id UUID NOT NULL,
  review_type TEXT NOT NULL CHECK (review_type IN ('guest_to_host', 'host_to_guest')),
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  is_published BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  moderation_status TEXT DEFAULT 'pending' CHECK (moderation_status IN ('pending', 'approved', 'rejected', 'flagged')),
  moderated_by UUID,
  moderated_at TIMESTAMP WITH TIME ZONE
);

-- Create coupons table
CREATE TABLE IF NOT EXISTS public.coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value NUMERIC NOT NULL CHECK (discount_value > 0),
  currency TEXT DEFAULT 'SEK',
  minimum_amount INTEGER,
  maximum_discount_amount INTEGER,
  valid_from TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  valid_until TIMESTAMP WITH TIME ZONE NOT NULL,
  usage_limit INTEGER,
  used_count INTEGER DEFAULT 0,
  property_id UUID, -- NULL for global coupons
  created_by UUID NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  usage_rules JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create coupon usages table to track usage
CREATE TABLE IF NOT EXISTS public.coupon_usages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id UUID NOT NULL,
  user_id UUID,
  booking_id UUID,
  order_id UUID,
  discount_amount INTEGER NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (coupon_id) REFERENCES public.coupons(id) ON DELETE CASCADE
);

-- Enable RLS on all new tables
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_usages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for reviews
CREATE POLICY "Users can view published reviews"
ON public.reviews FOR SELECT
USING (is_published = TRUE OR reviewer_id = auth.uid() OR reviewee_id = auth.uid() OR is_user_admin_safe(auth.uid()));

CREATE POLICY "Users can create reviews for their bookings"
ON public.reviews FOR INSERT
WITH CHECK (
  reviewer_id = auth.uid() AND
  booking_id IN (
    SELECT id FROM public.bookings 
    WHERE (user_id = auth.uid() OR guest_email = (SELECT email FROM auth.users WHERE id = auth.uid()))
  )
);

CREATE POLICY "Users can update their own reviews"
ON public.reviews FOR UPDATE
USING (reviewer_id = auth.uid() OR is_user_admin_safe(auth.uid()));

CREATE POLICY "Admins can manage all reviews"
ON public.reviews FOR ALL
USING (is_user_admin_safe(auth.uid()));

-- RLS Policies for coupons
CREATE POLICY "Active coupons are viewable by everyone"
ON public.coupons FOR SELECT
USING (is_active = TRUE AND valid_until > NOW());

CREATE POLICY "Hosts can manage their property coupons"
ON public.coupons FOR ALL
USING (
  property_id IN (
    SELECT p.id FROM properties p
    JOIN profiles pr ON p.host_id = pr.id
    WHERE pr.user_id = auth.uid()
  ) OR is_user_admin_safe(auth.uid())
);

CREATE POLICY "Admins can manage all coupons"
ON public.coupons FOR ALL
USING (is_user_admin_safe(auth.uid()));

-- RLS Policies for coupon usages
CREATE POLICY "Users can view their own coupon usages"
ON public.coupon_usages FOR SELECT
USING (user_id = auth.uid() OR is_user_admin_safe(auth.uid()));

CREATE POLICY "Users can create coupon usages"
ON public.coupon_usages FOR INSERT
WITH CHECK (user_id = auth.uid() OR auth.uid() IS NULL);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_reviews_booking_id ON public.reviews(booking_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewer_id ON public.reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewee_id ON public.reviews(reviewee_id);
CREATE INDEX IF NOT EXISTS idx_reviews_published ON public.reviews(is_published);
CREATE INDEX IF NOT EXISTS idx_coupons_code ON public.coupons(code);
CREATE INDEX IF NOT EXISTS idx_coupons_property_id ON public.coupons(property_id);
CREATE INDEX IF NOT EXISTS idx_coupons_active ON public.coupons(is_active);
CREATE INDEX IF NOT EXISTS idx_coupon_usages_coupon_id ON public.coupon_usages(coupon_id);
CREATE INDEX IF NOT EXISTS idx_coupon_usages_user_id ON public.coupon_usages(user_id);

-- Update triggers for timestamps
CREATE TRIGGER update_reviews_updated_at
  BEFORE UPDATE ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_coupons_updated_at
  BEFORE UPDATE ON public.coupons
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to validate coupon usage
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
) LANGUAGE plpgsql SECURITY DEFINER AS $$
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

-- Function to auto-publish reviews when both parties have reviewed
CREATE OR REPLACE FUNCTION public.auto_publish_reviews()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
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

-- Create trigger for auto-publishing reviews
CREATE TRIGGER auto_publish_reviews_trigger
  AFTER INSERT OR UPDATE ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_publish_reviews();