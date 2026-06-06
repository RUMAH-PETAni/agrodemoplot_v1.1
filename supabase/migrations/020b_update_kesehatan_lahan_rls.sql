-- Hapus policy yang menggunakan service_role
DROP POLICY IF EXISTS "Allow service role full access" ON public.analisis_kesehatan_lahan;

-- Buat policy baru: Hanya user dengan role 'administrator' yang bisa insert/update/delete
CREATE POLICY "Administrator can manage analisis_kesehatan_lahan"
  ON public.analisis_kesehatan_lahan
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'administrator'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'administrator'
    )
  );
