-- ============================================================
-- Migration 017: Riwayat Laporan (Report Archives)
-- Menyimpan metadata laporan yang telah di-generate.
-- ============================================================

-- 1. Tabel report_archives
CREATE TABLE report_archives (
    id                  UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id             UUID          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title               TEXT          NOT NULL,
    category            TEXT          NOT NULL,
    format              TEXT          NOT NULL, -- 'PDF', 'Excel'
    file_url            TEXT          NOT NULL,
    file_size_bytes     INTEGER       DEFAULT 0,
    status              TEXT          NOT NULL DEFAULT 'Selesai', -- 'Diproses', 'Selesai', 'Gagal'
    created_at          TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- 2. Indexing
CREATE INDEX idx_report_archives_user ON report_archives(user_id);
CREATE INDEX idx_report_archives_category ON report_archives(category);

-- 3. RLS (Row Level Security)
ALTER TABLE report_archives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own reports"
    ON report_archives FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own reports"
    ON report_archives FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reports"
    ON report_archives FOR DELETE
    USING (auth.uid() = user_id);

-- 4. Storage Bucket Policy (Mock/Instructional)
-- Note: Supabase storage buckets are usually managed via UI or Storage API.
-- This SQL attempts to enable the bucket if possible in some environments.
-- INSERT INTO storage.buckets (id, name, public) 
-- VALUES ('reports', 'reports', true)
-- ON CONFLICT (id) DO NOTHING;
