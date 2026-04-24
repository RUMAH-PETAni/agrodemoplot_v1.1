-- Create public bucket for log activities photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('foto_aktifitas', 'foto_aktifitas', true)
ON CONFLICT (id) DO NOTHING;

-- Note: storage.objects already has RLS enabled by default in Supabase

-- RLS Policies for foto aktifitas bucket
-- Allow public read access (bucket is public)
CREATE POLICY "Public can access foto aktifitas bucket"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'foto_aktifitas');

-- Allow authenticated users to upload to foto aktifitas bucket
CREATE POLICY "Users can upload to foto aktifitas bucket"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'foto_aktifitas'
    AND auth.uid() IS NOT NULL
  );

-- Allow authenticated users to update their own photos
CREATE POLICY "Users can update their own photos in foto aktifitas bucket"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'foto_aktifitas'
    AND auth.uid() IS NOT NULL
  );

-- Allow authenticated users to delete their own photos
CREATE POLICY "Users can delete their own photos in foto aktifitas bucket"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'foto_aktifitas'
    AND auth.uid() IS NOT NULL
  );
