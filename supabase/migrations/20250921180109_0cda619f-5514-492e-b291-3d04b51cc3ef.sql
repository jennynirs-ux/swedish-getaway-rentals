-- Create properties pricing rules table
CREATE TABLE public.properties_pricing_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID NOT NULL,
  rule_type TEXT NOT NULL, -- 'extra_guest', 'cleaning_fee', 'extra_service'
  name TEXT NOT NULL,
  price INTEGER NOT NULL, -- price in cents
  currency TEXT NOT NULL DEFAULT 'SEK',
  is_per_night BOOLEAN NOT NULL DEFAULT false, -- true for per-night charges, false for one-time
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.properties_pricing_rules ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Pricing rules are viewable by everyone" 
ON public.properties_pricing_rules 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage pricing rules" 
ON public.properties_pricing_rules 
FOR ALL 
USING (is_user_admin_safe(auth.uid()));

CREATE POLICY "Approved hosts can manage their own property pricing rules" 
ON public.properties_pricing_rules 
FOR ALL 
USING (
  property_id IN (
    SELECT p.id 
    FROM properties p 
    JOIN profiles pr ON p.host_id = pr.id 
    WHERE pr.user_id = auth.uid() AND pr.is_host = true AND pr.host_approved = true
  )
);

-- Add foreign key constraint
ALTER TABLE public.properties_pricing_rules 
ADD CONSTRAINT properties_pricing_rules_property_id_fkey 
FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;

-- Add updated_at trigger
CREATE TRIGGER update_properties_pricing_rules_updated_at
  BEFORE UPDATE ON public.properties_pricing_rules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER TABLE public.properties_pricing_rules REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.properties_pricing_rules;