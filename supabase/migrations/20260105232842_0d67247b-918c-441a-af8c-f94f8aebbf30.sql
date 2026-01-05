-- Create storage bucket for protocol materials
INSERT INTO storage.buckets (id, name, public)
VALUES ('protocol-materials', 'protocol-materials', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to view protocol materials
CREATE POLICY "Anyone can view protocol materials"
ON storage.objects FOR SELECT
USING (bucket_id = 'protocol-materials');

-- Allow authenticated users to upload protocol materials
CREATE POLICY "Authenticated users can upload protocol materials"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'protocol-materials' 
  AND auth.uid() IS NOT NULL
);

-- Allow admins to update protocol materials
CREATE POLICY "Admins can update protocol materials"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'protocol-materials' 
  AND public.has_role(auth.uid(), 'admin')
);

-- Allow admins to delete protocol materials
CREATE POLICY "Admins can delete protocol materials"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'protocol-materials' 
  AND public.has_role(auth.uid(), 'admin')
);