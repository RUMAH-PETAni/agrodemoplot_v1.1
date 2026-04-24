-- Create identifikasi hpg table
CREATE TABLE monitoring_hpg (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  demoplot_id UUID NOT NULL REFERENCES demoplot(id),

  tanggal_monitoring DATE NOT NULL DEFAULT CURRENT_DATE,
  kategori_gangguan text CHECK (kategori_gangguan IN ('hama', 'penyakit', 'gulma')),
  nama_jenis text,
  nama_ilmiah text,
  tingkat_serangan text, -- %
  bagian_terserang text, -- akar, batang, ranting, daun, buah, permukaan tanah
  cara_pengendalian text, --  pengendalian manual/fisik, pemanfaatan musuh alami, penggunaan bahan organik, penggunaan bahan kimia 
 
  latitude double precision,
  longitude double precision,
  altitude double precision,
  foto text,
  catatan text,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);



-- Enable Row Level Security
ALTER TABLE monitoring_hpg ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own monitoring hpg data"
  ON monitoring_hpg FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own monitoring hpg data"
  ON monitoring_hpg FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own monitoring hpg data"
  ON monitoring_hpg FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own monitoring hpg data"
  ON monitoring_hpg FOR DELETE
  USING (auth.uid() = user_id);

-- Allow admin to view all monitoring hpg data (optional - if you have admin role)
CREATE POLICY "Admins can view all monitoring hpg data"
  ON monitoring_hpg FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- join ke demoplot
CREATE INDEX idx_monitoring_hpg_demoplot 
ON monitoring_hpg(demoplot_id);

-- filter user
CREATE INDEX idx_monitoring_hpg_user 
ON monitoring_hpg(user_id);

-- kombinasi (dashboard)
CREATE INDEX idx_monitoring_hpg_user_demoplot 
ON monitoring_hpg(user_id, demoplot_id);

-- tambahan penting: filter waktu
CREATE INDEX idx_monitoring_hpg_tanggal 
ON monitoring_hpg(tanggal_monitoring);


CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_monitoring_hpg_updated_at
BEFORE UPDATE ON monitoring_hpg
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();