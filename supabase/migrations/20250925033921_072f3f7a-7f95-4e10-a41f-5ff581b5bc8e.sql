-- Add RLS policy for hosts to view messages for their own properties
CREATE POLICY "Hosts can view messages for their properties" 
ON public.guest_messages 
FOR SELECT 
USING (
  property_id IS NOT NULL AND 
  property_id IN (
    SELECT p.id 
    FROM properties p 
    JOIN profiles pr ON p.host_id = pr.id 
    WHERE pr.user_id = auth.uid() 
    AND pr.is_host = true 
    AND pr.host_approved = true
  )
);