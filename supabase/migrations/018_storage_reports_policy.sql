-- ============================================================
-- Migration 018: Storage Policies untuk Bucket 'reports'
-- Mengatur hak akses file laporan di Supabase Storage
-- ============================================================

-- 1. Pastikan bucket 'reports' terdaftar
INSERT INTO storage.buckets (id, name, public)
VALUES ('reports', 'reports', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Policy: Izinkan pengguna melihat file laporan mereka sendiri
CREATE POLICY "Users can view their own report files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'reports' AND 
  (storage.foldername(name))[1] = auth.uid()::text
);

-- 3. Policy: Izinkan pengguna mengunggah laporan (melalui server/client)
-- Catatan: Jika upload dilakukan via Server API dengan service_role, policy ini tidak wajib,
-- namun baik untuk keamanan jika dilakukan via client side.
CREATE POLICY "Users can upload their own report files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'reports' AND 
  (storage.foldername(name))[1] = auth.uid()::text
);

-- 4. Policy: Izinkan pengguna menghapus laporan mereka sendiri
CREATE POLICY "Users can delete their own report files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'reports' AND 
  (storage.foldername(name))[1] = auth.uid()::text
);
