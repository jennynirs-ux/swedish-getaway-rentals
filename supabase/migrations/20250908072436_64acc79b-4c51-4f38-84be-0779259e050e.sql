-- Create storage bucket for property images
INSERT INTO storage.buckets (id, name, public) VALUES ('property-images', 'property-images', true);

-- Create policies for property images bucket
CREATE POLICY "Property images are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'property-images');

CREATE POLICY "Admins can upload property images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'property-images' 
  AND (EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND is_admin = true
  ))
);

CREATE POLICY "Admins can update property images" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'property-images' 
  AND (EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND is_admin = true
  ))
);

CREATE POLICY "Admins can delete property images" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'property-images' 
  AND (EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND is_admin = true
  ))
);