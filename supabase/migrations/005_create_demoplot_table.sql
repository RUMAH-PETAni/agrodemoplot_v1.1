-- Create demoplot table
CREATE TABLE demoplot (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  petani_id UUID REFERENCES petani(id) NOT NULL,
  nama_demoplot text not null,
  lokasi text,
  luas_demoplot NUMERIC(3,2),
  latitude double precision,
  longitude double precision,
  altitude double precision,
  polygon jsonb,
  luas_polygon double precision,
  foto_udara text,

  sistem_budidaya text, -- agroforestri, monokultur
  tanaman_utama text, -- kopi arabika, kopi robusta
  jumlah_tanaman_utama int,
  pohon_penanung text, -- 
  jumlah_pohon_penaung int,
  jenis_tanaman_lainnya text,

  status_plot TEXT CHECK (status_plot IN ('rencana', 'aktif', 'selesai')),
  catatan text,
  created_at timestamp with time zone not null default timezone ('utc'::text, now()),
  updated_at timestamp with time zone not null default timezone ('utc'::text, now())
);

-- Create indexes for better query performance
CREATE INDEX idx_demoplot_id ON demoplot(petani_id);
CREATE INDEX idx_demoplot_nama ON demoplot(nama_demoplot);

-- Enable Row Level Security
ALTER TABLE demoplot ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own demoplot data"
  ON demoplot FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own demoplot data"
  ON demoplot FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own demoplot data"
  ON demoplot FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own demoplot data"
  ON demoplot FOR DELETE
  USING (auth.uid() = user_id);

-- Allow admin to view all demoplot data (optional - if you have admin role)
CREATE POLICY "Admins can view all demoplot data"
  ON demoplot FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on row changes
CREATE TRIGGER update_demoplot_updated_at
  BEFORE UPDATE ON demoplot
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
