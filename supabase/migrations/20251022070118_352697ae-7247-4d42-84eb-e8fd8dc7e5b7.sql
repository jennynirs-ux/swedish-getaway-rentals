-- Drop existing restrictive policies and create public-friendly ones
DROP POLICY IF EXISTS "Properties are viewable by everyone" ON properties;
DROP POLICY IF EXISTS "Approved hosts can view their own properties" ON properties;

-- Allow everyone (including anonymous) to view active properties
CREATE POLICY "Active properties are publicly viewable"
ON properties
FOR SELECT
TO public
USING (active = true);

-- Allow authenticated hosts to view their own properties (including inactive)
CREATE POLICY "Hosts can view their own properties"
ON properties
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  host_id IN (
    SELECT id FROM profiles 
    WHERE user_id = auth.uid() 
    AND is_host = true 
    AND host_approved = true
  )
);

-- Ensure pricing rules are publicly viewable
DROP POLICY IF EXISTS "Pricing rules are viewable by everyone" ON properties_pricing_rules;

CREATE POLICY "Pricing rules are publicly viewable"
ON properties_pricing_rules
FOR SELECT
TO public
USING (true);

-- Ensure availability is publicly viewable
DROP POLICY IF EXISTS "Availability is viewable by everyone" ON availability;

CREATE POLICY "Availability is publicly viewable"
ON availability
FOR SELECT
TO public
USING (true);