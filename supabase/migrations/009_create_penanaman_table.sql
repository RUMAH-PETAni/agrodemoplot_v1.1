-- Create Monitoring Penanaman table
CREATE TABLE monitoring_penanaman (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  demoplot_id UUID NOT NULL REFERENCES demoplot(id),

  kode_tanaman text not null,
  periode_monitoring text CHECK (periode_monitoring IN ('P1','P2','P3')),
  tanggal_monitoring DATE NOT NULL DEFAULT CURRENT_DATE,
  waktu_tanam DATE,
  jarak_tanam TEXT CHECK (jarak_tanam IN ('2,5x2,5','3x3', '5x5', '10x10', 'tidak ada')), 
  
  jenis_tanaman text,
  nama_ilmiah text,
  sumber_bibit TEXT CHECK (sumber_bibit IN ('bibit sertifikat', 'non sertifikat')),
  usia_tanaman INT,
  kondisi_pertumbuhan TEXT CHECK (kondisi_pertumbuhan IN ('sehat', 'tidak sehat', 'mati')),
  tinggi NUMERIC,
  latitude double precision,
  longitude double precision,
  altitude double precision,
  foto_tanaman text,
  catatan text,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE monitoring_penanaman ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own monitoring penanaman data"
  ON monitoring_penanaman FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own monitoring penanaman data"
  ON monitoring_penanaman FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own monitoring penanaman data"
  ON monitoring_penanaman FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own monitoring penanaman data"
  ON monitoring_penanaman FOR DELETE
  USING (auth.uid() = user_id);

-- Allow admin to view all monitoring penanaman data (optional - if you have admin role)
CREATE POLICY "Admins can view all monitoring penanaman data"
  ON monitoring_penanaman FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- join ke demoplot
CREATE INDEX idx_monitoring_demoplot 
ON monitoring_penanaman(demoplot_id);

-- filter user
CREATE INDEX idx_monitoring_user 
ON monitoring_penanaman(user_id);

-- kombinasi (dashboard)
CREATE INDEX idx_monitoring_user_demoplot 
ON monitoring_penanaman(user_id, demoplot_id);

-- tambahan penting: filter waktu
CREATE INDEX idx_monitoring_tanggal 
ON monitoring_penanaman(tanggal_monitoring);


CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_monitoring_penanaman_updated_at
BEFORE UPDATE ON monitoring_penanaman
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();