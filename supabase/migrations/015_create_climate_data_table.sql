-- ============================================================
-- Migration 015: Climate Data from Open-Meteo Historical Weather API
-- Endpoint: https://archive-api.open-meteo.com/v1/archive
-- Granularitas: Bulanan (agregat dari data harian)
-- Periode: 12 bulan terakhir, di-refresh setiap bulan
-- ============================================================

-- ------------------------------------------------------------
-- 1. TABEL UTAMA: climate_data
--    Satu baris = satu demoplot + satu bulan kalender
-- ------------------------------------------------------------
CREATE TABLE climate_data (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  demoplot_id     UUID NOT NULL REFERENCES demoplot(id)  ON DELETE CASCADE,

  -- Koordinat saat fetch
  latitude        DOUBLE PRECISION NOT NULL,
  longitude       DOUBLE PRECISION NOT NULL,

  -- Periode bulan
  tahun           SMALLINT NOT NULL,  -- e.g. 2024
  bulan           SMALLINT NOT NULL   -- 1–12
    CHECK (bulan BETWEEN 1 AND 12),

  -- ---- Suhu (°C) ----
  suhu_maks_rata       NUMERIC(5,2),  -- rata-rata daily max selama bulan
  suhu_min_rata        NUMERIC(5,2),  -- rata-rata daily min selama bulan
  suhu_rata_rata       NUMERIC(5,2),  -- rata-rata suhu harian

  -- ---- Curah Hujan (mm) ----
  curah_hujan_total    NUMERIC(7,2),  -- total mm dalam sebulan
  hari_hujan           SMALLINT,      -- jumlah hari dengan hujan > 1mm

  -- ---- Kelembapan Relatif (%) ----
  kelembapan_maks_rata NUMERIC(5,2),  -- rata-rata daily max
  kelembapan_min_rata  NUMERIC(5,2),  -- rata-rata daily min
  kelembapan_rata_rata NUMERIC(5,2),  -- rata-rata kelembapan harian

  -- ---- Angin ----
  kecepatan_angin_maks NUMERIC(5,2),  -- rata-rata daily max (km/h)
  kecepatan_angin_rata NUMERIC(5,2),  -- rata-rata kecepatan angin (km/h)

  -- ---- Evapotranspirasi Referensi (mm) ----
  et0_total            NUMERIC(7,2),  -- total ET0 FAO dalam sebulan

  -- ---- Radiasi Matahari ----
  radiasi_total        NUMERIC(8,2),  -- total MJ/m² dalam sebulan

  -- ---- Metadata ----
  fetch_status    TEXT NOT NULL DEFAULT 'pending'
                  CHECK (fetch_status IN ('pending', 'success', 'failed')),
  fetch_error     TEXT,
  fetched_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Unik: satu demoplot satu baris per bulan
  UNIQUE (demoplot_id, tahun, bulan)
);

-- ------------------------------------------------------------
-- 2. INDEX
-- ------------------------------------------------------------
CREATE INDEX idx_climate_demoplot_id    ON climate_data(demoplot_id);
CREATE INDEX idx_climate_user_id        ON climate_data(user_id);
CREATE INDEX idx_climate_tahun_bulan    ON climate_data(tahun, bulan);
CREATE INDEX idx_climate_fetch_status   ON climate_data(fetch_status);

-- ------------------------------------------------------------
-- 3. ROW LEVEL SECURITY
-- ------------------------------------------------------------
ALTER TABLE climate_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own climate data"
  ON climate_data FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own climate data"
  ON climate_data FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own climate data"
  ON climate_data FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own climate data"
  ON climate_data FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all climate data"
  ON climate_data FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- ------------------------------------------------------------
-- 4. TRIGGER: auto-update updated_at
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_climate_data_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_climate_data_updated_at
  BEFORE UPDATE ON climate_data
  FOR EACH ROW
  EXECUTE FUNCTION update_climate_data_updated_at();

-- ------------------------------------------------------------
-- 5. TRIGGER: auto-insert 12 baris "pending" saat demoplot dibuat
--    (12 bulan terakhir)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_init_climate_data_on_demoplot_insert()
RETURNS TRIGGER AS $$
DECLARE
  i         INT;
  tgl       DATE;
  thn       SMALLINT;
  bln       SMALLINT;
BEGIN
  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
    -- Buat 12 baris: bulan ini sampai 11 bulan lalu
    FOR i IN 0..11 LOOP
      tgl := date_trunc('month', now()) - (i || ' month')::INTERVAL;
      thn := EXTRACT(YEAR  FROM tgl)::SMALLINT;
      bln := EXTRACT(MONTH FROM tgl)::SMALLINT;

      INSERT INTO climate_data (
        user_id, demoplot_id, latitude, longitude,
        tahun, bulan, fetch_status
      ) VALUES (
        NEW.user_id, NEW.id, NEW.latitude, NEW.longitude,
        thn, bln, 'pending'
      )
      ON CONFLICT (demoplot_id, tahun, bulan) DO NOTHING;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_init_climate_data_on_demoplot
  AFTER INSERT ON demoplot
  FOR EACH ROW
  EXECUTE FUNCTION fn_init_climate_data_on_demoplot_insert();

-- ------------------------------------------------------------
-- 6. TRIGGER: reset saat koordinat demoplot berubah
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_reset_climate_data_on_coordinate_change()
RETURNS TRIGGER AS $$
DECLARE
  i   INT;
  tgl DATE;
  thn SMALLINT;
  bln SMALLINT;
BEGIN
  IF (OLD.latitude IS DISTINCT FROM NEW.latitude)
  OR (OLD.longitude IS DISTINCT FROM NEW.longitude) THEN
    IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
      FOR i IN 0..11 LOOP
        tgl := date_trunc('month', now()) - (i || ' month')::INTERVAL;
        thn := EXTRACT(YEAR  FROM tgl)::SMALLINT;
        bln := EXTRACT(MONTH FROM tgl)::SMALLINT;

        INSERT INTO climate_data (
          user_id, demoplot_id, latitude, longitude,
          tahun, bulan, fetch_status
        ) VALUES (
          NEW.user_id, NEW.id, NEW.latitude, NEW.longitude,
          thn, bln, 'pending'
        )
        ON CONFLICT (demoplot_id, tahun, bulan) DO UPDATE SET
          latitude             = EXCLUDED.latitude,
          longitude            = EXCLUDED.longitude,
          fetch_status         = 'pending',
          fetch_error          = NULL,
          fetched_at           = NULL,
          suhu_maks_rata       = NULL,
          suhu_min_rata        = NULL,
          suhu_rata_rata       = NULL,
          curah_hujan_total    = NULL,
          hari_hujan           = NULL,
          kelembapan_maks_rata = NULL,
          kelembapan_min_rata  = NULL,
          kelembapan_rata_rata = NULL,
          kecepatan_angin_maks = NULL,
          kecepatan_angin_rata = NULL,
          et0_total            = NULL,
          radiasi_total        = NULL,
          updated_at           = now();
      END LOOP;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_reset_climate_on_coordinate_change
  AFTER UPDATE ON demoplot
  FOR EACH ROW
  EXECUTE FUNCTION fn_reset_climate_data_on_coordinate_change();

-- ------------------------------------------------------------
-- 7. VIEW: climate_data_summary
--    Ringkasan iklim 12 bulan terakhir per demoplot
-- ------------------------------------------------------------
CREATE OR REPLACE VIEW climate_data_summary AS
SELECT
  d.id            AS demoplot_id,
  d.nama_demoplot,
  d.petani_id,
  d.user_id,
  -- Rata-rata tahunan
  ROUND(AVG(c.suhu_rata_rata)::NUMERIC, 1)       AS suhu_tahunan,
  ROUND(AVG(c.suhu_maks_rata)::NUMERIC, 1)       AS suhu_maks_tahunan,
  ROUND(AVG(c.suhu_min_rata)::NUMERIC, 1)        AS suhu_min_tahunan,
  ROUND(SUM(c.curah_hujan_total)::NUMERIC, 1)    AS curah_hujan_tahunan,   -- mm/tahun
  ROUND(AVG(c.kelembapan_rata_rata)::NUMERIC, 1) AS kelembapan_tahunan,
  ROUND(AVG(c.kecepatan_angin_rata)::NUMERIC, 1) AS angin_tahunan,
  ROUND(SUM(c.et0_total)::NUMERIC, 1)            AS et0_tahunan,
  ROUND(SUM(c.radiasi_total)::NUMERIC, 1)        AS radiasi_tahunan,
  -- Bulan terbasah & terkering
  (SELECT bulan FROM climate_data c2
   WHERE c2.demoplot_id = d.id AND c2.curah_hujan_total IS NOT NULL
   ORDER BY c2.curah_hujan_total DESC LIMIT 1)   AS bulan_terbasah,
  (SELECT bulan FROM climate_data c2
   WHERE c2.demoplot_id = d.id AND c2.curah_hujan_total IS NOT NULL
   ORDER BY c2.curah_hujan_total ASC  LIMIT 1)   AS bulan_terkering,
  -- Status fetch
  CASE
    WHEN COUNT(*) FILTER (WHERE c.fetch_status = 'failed')  > 0 THEN 'failed'
    WHEN COUNT(*) FILTER (WHERE c.fetch_status = 'pending') > 0 THEN 'pending'
    ELSE 'success'
  END AS status_fetch,
  MAX(c.fetched_at) AS terakhir_fetch
FROM demoplot d
LEFT JOIN climate_data c ON c.demoplot_id = d.id
GROUP BY d.id, d.nama_demoplot, d.petani_id, d.user_id;

GRANT SELECT ON climate_data_summary TO authenticated;
