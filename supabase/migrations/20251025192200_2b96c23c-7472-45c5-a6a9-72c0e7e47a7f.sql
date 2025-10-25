-- Create host referrals table for tracking host invitations
CREATE TABLE IF NOT EXISTS public.host_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referee_email TEXT NOT NULL,
  referral_code TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'expired')),
  referee_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  referrer_reward_coupon_id UUID REFERENCES public.coupons(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '30 days')
);

-- Enable RLS
ALTER TABLE public.host_referrals ENABLE ROW LEVEL SECURITY;

-- Hosts can view their own referrals
CREATE POLICY "Hosts can view their own referrals"
ON public.host_referrals
FOR SELECT
TO authenticated
USING (
  referrer_id IN (
    SELECT id FROM public.profiles WHERE user_id = auth.uid()
  )
);

-- Hosts can create referrals
CREATE POLICY "Hosts can create referrals"
ON public.host_referrals
FOR INSERT
TO authenticated
WITH CHECK (
  referrer_id IN (
    SELECT id FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND is_host = true 
    AND host_approved = true
  )
);

-- Admins can manage all referrals
CREATE POLICY "Admins can manage all referrals"
ON public.host_referrals
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Create index for faster lookups
CREATE INDEX idx_host_referrals_code ON public.host_referrals(referral_code);
CREATE INDEX idx_host_referrals_status ON public.host_referrals(status);