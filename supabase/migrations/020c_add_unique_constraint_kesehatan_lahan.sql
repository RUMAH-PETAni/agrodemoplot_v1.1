-- Tambahkan UNIQUE constraint agar UPSERT dari Supabase Client berfungsi dengan baik
-- ketika menggunakan parameter { onConflict: 'demoplot_id, periode_analisis' }

ALTER TABLE public.analisis_kesehatan_lahan
ADD CONSTRAINT unique_demoplot_periode UNIQUE (demoplot_id, periode_analisis);
