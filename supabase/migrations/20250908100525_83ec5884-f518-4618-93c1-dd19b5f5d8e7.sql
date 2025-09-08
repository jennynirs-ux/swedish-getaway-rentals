-- Add video support to properties table
ALTER TABLE public.properties 
ADD COLUMN video_urls text[] DEFAULT '{}',
ADD COLUMN video_metadata jsonb DEFAULT '[]';

-- Create video storage bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('property-videos', 'property-videos', true);

-- Create policies for video uploads
CREATE POLICY "Video files are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'property-videos');

CREATE POLICY "Admins can upload videos" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'property-videos' AND 
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND is_admin = true
  )
);

CREATE POLICY "Admins can update videos" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'property-videos' AND 
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND is_admin = true
  )
);

CREATE POLICY "Admins can delete videos" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'property-videos' AND 
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND is_admin = true
  )
);