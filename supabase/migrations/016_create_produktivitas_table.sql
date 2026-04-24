-- ============================================================
-- Migration 016: Produktivitas Kebun
-- Melacak input pertanian, tenaga kerja, dan hasil panen
-- per demoplot. Satu baris = satu catatan per kategori.
-- ============================================================

-- ------------------------------------------------------------
-- 1. TABEL UTAMA: produktivitas
-- ------------------------------------------------------------
CREATE TABLE produktivitas (
  id                  UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id             UUID          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- FIX #7: tambah ON DELETE CASCADE agar baris tidak orphan saat demoplot dihapus
  demoplot_id         UUID          NOT NULL REFERENCES demoplot(id) ON DELETE CASCADE,

  tanggal_pencatatan  DATE          NOT NULL DEFAULT CURRENT_DATE,
  -- FIX #5: NOT NULL karena ini driver utama semua logika kondisional
  kategori_pencatatan TEXT          NOT NULL CHECK (kategori_pencatatan IN ('input', 'tenaga kerja', 'hasil panen')),

  -- ----------------------------------------------------------
  -- KATEGORI: input
  -- Mencatat kapan pupuk/obat dipakai dan berapa biayanya.
  -- ----------------------------------------------------------
  jenis_input         TEXT,         -- 'pupuk', 'pestisida', 'herbisida', 'benih'
  jumlah_pakai        DECIMAL(10,2),
  -- FIX #4: hapus NOT NULL — satuan hanya relevan untuk kategori 'input'
  satuan              TEXT,         -- 'Kg', 'Liter', 'Karung'
  biaya_total         DECIMAL(12,2),
  waktu_penggunaan    DATE          DEFAULT CURRENT_DATE,

  -- ----------------------------------------------------------
  -- KATEGORI: tenaga kerja
  -- Mencatat tenaga kerja dan jenis perawatan lahan.
  -- ----------------------------------------------------------
  -- FIX #6: typo 'jenis_pekerjaaan' → 'jenis_pekerjaan'
  jenis_pekerjaan     TEXT,         -- 'persiapan lahan', 'pembibitan', 'penanaman',
                                    -- 'pemupukan', 'pemangkasan', 'pengendalian hama',
                                    -- 'panen', 'pasca panen'
  biaya_tenaga_kerja  DECIMAL(12,2) DEFAULT 0,
  jumlah_jam_kerja    DECIMAL(5,2),  -- untuk hitung efisiensi
  tanggal_pelaksanaan DATE          DEFAULT CURRENT_DATE,

  -- ----------------------------------------------------------
  -- KATEGORI: hasil panen
  -- Mencatat hasil mentah (ceri/buah) dari tiap jenis tanaman.
  -- ----------------------------------------------------------
  kategori_tanaman    TEXT,         -- 'tanaman utama', 'pohon penaung', 'tanaman lainnya'
  nama_jenis          TEXT,         -- nama jenis tanaman
  jumlah_tanaman      INTEGER,
  berat_basah_kg      DECIMAL(10,2),
  putaran_panen       INTEGER       DEFAULT 1, -- panen ke-1, ke-2 dalam satu musim
  catatan_kualitas    TEXT,         -- misal: "Banyak buah hijau" atau "Super Merah"
  tanggal_panen       DATE          DEFAULT CURRENT_DATE,
  -- FIX #2: tambah koma setelah tanggal_panen (sebelumnya kolom berikut tidak terbaca)

  -- Pasca-panen: Transformasi dari buah mentah ke produk siap jual.
  metode_pengolahan   TEXT,
  berat_kering_kg     DECIMAL(10,2), -- hasil akhir (gabah/green bean)
  berat_terbuang_kg   DECIMAL(10,2), -- kulit/buah busuk
  tanggal_selesai     DATE,

  -- ----------------------------------------------------------
  -- METADATA
  -- ----------------------------------------------------------
  -- FIX #1: created_at & updated_at dipindah ke DALAM tabel (sebelumnya di luar blok)
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ   NOT NULL DEFAULT now(),

  -- ----------------------------------------------------------
  -- CHECK CONSTRAINTS per kategori
  -- Memastikan field wajib per kategori selalu terisi
  -- ----------------------------------------------------------
  CONSTRAINT chk_input_fields
    CHECK (
      kategori_pencatatan <> 'input'
      OR (jenis_input IS NOT NULL AND jumlah_pakai IS NOT NULL AND satuan IS NOT NULL)
    ),
  CONSTRAINT chk_tenagakerja_fields
    CHECK (
      kategori_pencatatan <> 'tenaga kerja'
      OR (jenis_pekerjaan IS NOT NULL)
    ),
  CONSTRAINT chk_hasilpanen_fields
    CHECK (
      kategori_pencatatan <> 'hasil panen'
      OR (berat_basah_kg IS NOT NULL AND tanggal_panen IS NOT NULL)
    )
);

-- ------------------------------------------------------------
-- 2. INDEX untuk performa query
-- ------------------------------------------------------------
-- join ke demoplot
CREATE INDEX idx_produktivitas_demoplot
  ON produktivitas(demoplot_id);

-- filter user
CREATE INDEX idx_produktivitas_user
  ON produktivitas(user_id);

-- kombinasi (dashboard)
CREATE INDEX idx_produktivitas_user_demoplot
  ON produktivitas(user_id, demoplot_id);

-- FIX #3: nama kolom yang benar adalah tanggal_pencatatan (bukan tanggal_monitoring)
CREATE INDEX idx_produktivitas_tanggal
  ON produktivitas(tanggal_pencatatan);

-- filter per kategori (berguna untuk tab-based view di UI)
CREATE INDEX idx_produktivitas_kategori
  ON produktivitas(demoplot_id, kategori_pencatatan);

-- ------------------------------------------------------------
-- 3. ROW LEVEL SECURITY (RLS)
-- ------------------------------------------------------------
ALTER TABLE produktivitas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own produktivitas data"
  ON produktivitas FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own produktivitas data"
  ON produktivitas FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own produktivitas data"
  ON produktivitas FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own produktivitas data"
  ON produktivitas FOR DELETE
  USING (auth.uid() = user_id);

-- Admin: bisa lihat, update, dan delete semua data
CREATE POLICY "Admins can view all produktivitas data"
  ON produktivitas FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update all produktivitas data"
  ON produktivitas FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete all produktivitas data"
  ON produktivitas FOR DELETE
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
-- Fungsi sudah ada dari migration sebelumnya, pakai CREATE OR REPLACE aman.
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- FIX #8: DROP IF EXISTS agar migration aman dijalankan ulang
DROP TRIGGER IF EXISTS update_produktivitas_updated_at ON produktivitas;

CREATE TRIGGER update_produktivitas_updated_at
  BEFORE UPDATE ON produktivitas
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ------------------------------------------------------------
-- 5. VIEW AGREGAT: produktivitas_summary
--    Menggabungkan input, tenaga kerja, dan hasil panen
--    menjadi satu baris ringkasan per demoplot.
--    Digunakan untuk dashboard laporan insight.
-- ------------------------------------------------------------
CREATE OR REPLACE VIEW produktivitas_summary AS
SELECT
  p.demoplot_id,
  d.nama_demoplot,
  p.user_id,

  -- ── Ringkasan Input ───────────────────────────────────────
  COUNT(*)         FILTER (WHERE p.kategori_pencatatan = 'input')
                                                          AS jumlah_catatan_input,
  SUM(p.biaya_total)
    FILTER (WHERE p.kategori_pencatatan = 'input')        AS total_biaya_input,

  -- ── Ringkasan Tenaga Kerja ────────────────────────────────
  COUNT(*)         FILTER (WHERE p.kategori_pencatatan = 'tenaga kerja')
                                                          AS jumlah_catatan_tk,
  SUM(p.biaya_tenaga_kerja)
    FILTER (WHERE p.kategori_pencatatan = 'tenaga kerja') AS total_biaya_tk,
  SUM(p.jumlah_jam_kerja)
    FILTER (WHERE p.kategori_pencatatan = 'tenaga kerja') AS total_jam_kerja,

  -- ── Ringkasan Hasil Panen ─────────────────────────────────
  COUNT(*)         FILTER (WHERE p.kategori_pencatatan = 'hasil panen')
                                                          AS jumlah_catatan_panen,
  SUM(p.berat_basah_kg)
    FILTER (WHERE p.kategori_pencatatan = 'hasil panen')  AS total_panen_basah_kg,
  SUM(p.berat_kering_kg)
    FILTER (WHERE p.kategori_pencatatan = 'hasil panen')  AS total_panen_kering_kg,

  -- ── Kalkulasi Insight ─────────────────────────────────────
  -- Total pengeluaran = biaya input + biaya tenaga kerja
  ROUND(
    COALESCE(SUM(p.biaya_total)
      FILTER (WHERE p.kategori_pencatatan = 'input'), 0)
    +
    COALESCE(SUM(p.biaya_tenaga_kerja)
      FILTER (WHERE p.kategori_pencatatan = 'tenaga kerja'), 0)
  , 0) AS total_pengeluaran,

  -- Efisiensi: kg panen basah per jam kerja
  ROUND(
    COALESCE(SUM(p.berat_basah_kg)
      FILTER (WHERE p.kategori_pencatatan = 'hasil panen'), 0)
    /
    NULLIF(SUM(p.jumlah_jam_kerja)
      FILTER (WHERE p.kategori_pencatatan = 'tenaga kerja'), 0)
  , 2) AS kg_per_jam_kerja,

  -- Biaya per kg panen basah
  ROUND(
    (
      COALESCE(SUM(p.biaya_total)
        FILTER (WHERE p.kategori_pencatatan = 'input'), 0)
      +
      COALESCE(SUM(p.biaya_tenaga_kerja)
        FILTER (WHERE p.kategori_pencatatan = 'tenaga kerja'), 0)
    )
    /
    NULLIF(SUM(p.berat_basah_kg)
      FILTER (WHERE p.kategori_pencatatan = 'hasil panen'), 0)
  , 0) AS biaya_per_kg,

  -- ── Metadata ──────────────────────────────────────────────
  MIN(p.tanggal_pencatatan) AS tanggal_mulai,
  MAX(p.tanggal_pencatatan) AS tanggal_terakhir

FROM produktivitas p
JOIN demoplot d ON d.id = p.demoplot_id
GROUP BY p.demoplot_id, d.nama_demoplot, p.user_id;

-- Grant akses ke authenticated user (RLS dari tabel produktivitas & demoplot tetap berlaku)
GRANT SELECT ON produktivitas_summary TO authenticated;