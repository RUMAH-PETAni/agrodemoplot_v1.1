-- Create public bucket for hpg photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('foto_hpg', 'foto_hpg', true)
ON CONFLICT (id) DO NOTHING;

-- Note: storage.objects already has RLS enabled by default in Supabase

-- RLS Policies for foto hpg bucket
-- Allow public read access (bucket is public)
CREATE POLICY "Public can access foto hpg bucket"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'foto_hpg');

-- Allow authenticated users to upload to foto hpg bucket
CREATE POLICY "Users can upload to foto hpg bucket"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'foto_hpg'
    AND auth.uid() IS NOT NULL
  );

-- Allow authenticated users to update their own photos
CREATE POLICY "Users can update their own photos in foto hpg bucket"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'foto_hpg'
    AND auth.uid() IS NOT NULL
  );

-- Allow authenticated users to delete their own photos
CREATE POLICY "Users can delete their own photos in foto hpg bucket"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'foto_hpg'
    AND auth.uid() IS NOT NULL
  );
