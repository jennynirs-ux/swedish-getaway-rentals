-- Enable RLS on property_travel_cache table
ALTER TABLE public.property_travel_cache ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read the travel cache since it's just computed travel times
CREATE POLICY "Travel cache is viewable by everyone"
ON public.property_travel_cache
FOR SELECT
USING (true);

-- Only admins can update/insert into the cache
CREATE POLICY "Only admins can manage travel cache"
ON public.property_travel_cache
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));