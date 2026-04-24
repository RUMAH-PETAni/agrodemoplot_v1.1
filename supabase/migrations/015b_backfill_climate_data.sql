-- ============================================================
-- Backfill: Buat baris climate_data 'pending' untuk demoplot LAMA
-- Jalankan SEKALI di SQL Editor Supabase setelah migration 015
-- ============================================================

DO $$
DECLARE
  rec       RECORD;
  i         INT;
  tgl       DATE;
  thn       SMALLINT;
  bln       SMALLINT;
  inserted  INT := 0;
  skipped   INT := 0;
BEGIN
  FOR rec IN
    SELECT id, user_id, latitude, longitude
    FROM demoplot
    WHERE latitude IS NOT NULL
      AND longitude IS NOT NULL
  LOOP
    -- Buat 12 bulan terakhir
    FOR i IN 0..11 LOOP
      tgl := date_trunc('month', now()) - (i || ' month')::INTERVAL;
      thn := EXTRACT(YEAR  FROM tgl)::SMALLINT;
      bln := EXTRACT(MONTH FROM tgl)::SMALLINT;

      INSERT INTO climate_data (
        user_id, demoplot_id, latitude, longitude,
        tahun, bulan, fetch_status
      ) VALUES (
        rec.user_id, rec.id, rec.latitude, rec.longitude,
        thn, bln, 'pending'
      )
      ON CONFLICT (demoplot_id, tahun, bulan) DO NOTHING;

      IF FOUND THEN
        inserted := inserted + 1;
      ELSE
        skipped := skipped + 1;
      END IF;
    END LOOP;
  END LOOP;

  RAISE NOTICE 'Climate backfill selesai: % baris dibuat, % baris sudah ada (skip).', inserted, skipped;
END;
$$;
