-- Migration 021: Tabel Rekomendasi Teknis (AI & Expert)
CREATE TABLE rekomendasi_teknis (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  demoplot_id UUID NOT NULL REFERENCES demoplot(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- AI Generated Content
  ai_recommendations JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of {type, title, desc}
  
  -- Expert Feedback Content
  expert_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  expert_feedback TEXT,
  
  -- Metadata
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'validated')),
  periode_analisis TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast retrieval
CREATE INDEX idx_rekomendasi_demoplot ON rekomendasi_teknis(demoplot_id);
CREATE INDEX idx_rekomendasi_user ON rekomendasi_teknis(user_id);

-- RLS
ALTER TABLE rekomendasi_teknis ENABLE ROW LEVEL SECURITY;

-- 1. User can view their own recommendations, OR if they are an expert/admin they can view all
CREATE POLICY "View rekomendasi_teknis"
  ON rekomendasi_teknis FOR SELECT
  USING (
    auth.uid() = user_id
    OR 
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('administrator', 'expert')
    )
  );

-- 2. User can insert for their own demoplot
CREATE POLICY "Insert rekomendasi_teknis"
  ON rekomendasi_teknis FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 3. Expert/Admin can update (provide feedback/validation)
CREATE POLICY "Update rekomendasi_teknis"
  ON rekomendasi_teknis FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('administrator', 'expert')
    )
  );

-- 4. User can delete their own
CREATE POLICY "Delete rekomendasi_teknis"
  ON rekomendasi_teknis FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger auto-update
CREATE TRIGGER update_rekomendasi_teknis_updated_at
  BEFORE UPDATE ON rekomendasi_teknis
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
