-- Create public bucket for tanaman photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('foto_tanaman', 'foto_tanaman', true)
ON CONFLICT (id) DO NOTHING;

-- Note: storage.objects already has RLS enabled by default in Supabase

-- RLS Policies for foto tanaman bucket
-- Allow public read access (bucket is public)
CREATE POLICY "Public can access foto tanaman bucket"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'foto_tanaman');

-- Allow authenticated users to upload to foto tanaman bucket
CREATE POLICY "Users can upload to foto tanaman bucket"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'foto_tanaman'
    AND auth.uid() IS NOT NULL
  );

-- Allow authenticated users to update their own photos
CREATE POLICY "Users can update their own photos in foto tanaman bucket"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'foto_tanaman'
    AND auth.uid() IS NOT NULL
  );

-- Allow authenticated users to delete their own photos
CREATE POLICY "Users can delete their own photos in foto tanaman bucket"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'foto_tanaman'
    AND auth.uid() IS NOT NULL
  );
