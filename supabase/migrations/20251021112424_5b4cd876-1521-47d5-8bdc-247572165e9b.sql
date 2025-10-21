-- Add DELETE policy for properties table
CREATE POLICY "Admins and hosts can delete their properties"
ON public.properties
FOR DELETE
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR 
  (host_id IN (
    SELECT profiles.id
    FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.is_host = true
    AND profiles.host_approved = true
  ))
);