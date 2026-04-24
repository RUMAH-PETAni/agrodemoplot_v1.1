-- Create log aktifitas table
CREATE TABLE log_aktifitas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  demoplot_id UUID NOT NULL REFERENCES demoplot(id),

  tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
  kategori TEXT NOT NULL CHECK (kategori IN ('sekolah lapangan','persiapan lahan', 'pembibitan', 'penanaman', 'pemupukan','pemangkasan','pengendalian hama', 'panen', 'pasca panen')),
  deskripsi TEXT,
  durasi TEXT,
  output text,
  foto_dokumentasi text,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE log_aktifitas ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own log aktifitas data"
  ON log_aktifitas FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own log aktifitas data"
  ON log_aktifitas FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own log aktifitas data"
  ON log_aktifitas FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own log aktifitas data"
  ON log_aktifitas FOR DELETE
  USING (auth.uid() = user_id);

-- Allow admin to view all log aktifitas data (optional - if you have admin role)
CREATE POLICY "Admins can view all log aktifitas data"
  ON log_aktifitas FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- join ke demoplot
CREATE INDEX idx_log_demoplot 
ON log_aktifitas(demoplot_id);

-- filter user
CREATE INDEX idx_log_user 
ON log_aktifitas(user_id);

-- kombinasi (dashboard)
CREATE INDEX idx_log_user_demoplot 
ON log_aktifitas(user_id, demoplot_id);

-- tambahan penting: filter waktu
CREATE INDEX idx_log_tanggal 
ON log_aktifitas(tanggal);


CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_log_aktifitas_updated_at
BEFORE UPDATE ON log_aktifitas
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();