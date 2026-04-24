-- Create karakteristik lahan table
CREATE TABLE karakteristik_lahan (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  demoplot_id UUID NOT NULL REFERENCES demoplot(id),

  kelerengan double precision,
  suhu double precision,
  kelembapan_relatif double precision,
  curah_hujan double precision,

  kapasitas_tukar_kation NUMERIC(5,2),
  ph_air NUMERIC(3,2),
  kandungan_c_organic NUMERIC(4,2),
  kandungan_nitrogen TEXT, -- sedang, rendah, sangat rendah,
  tekstur_tanah TEXT, --Pasir sangat kasar, Pasir kasar, Pasir sedang, Pasir halus, Pasir sangat halus, Debu, Liat

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE karakteristik_lahan ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own karakteristik lahan data"
  ON karakteristik_lahan FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own karakteristik lahan data"
  ON karakteristik_lahan FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own karakteristik lahan data"
  ON karakteristik_lahan FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own karakteristik lahan data"
  ON karakteristik_lahan FOR DELETE
  USING (auth.uid() = user_id);

-- Allow admin to view all karakteristik lahant data (optional - if you have admin role)
CREATE POLICY "Admins can view all karakteristik lahan data"
  ON karakteristik_lahan FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- untuk join ke demoplot (ini paling penting)
CREATE INDEX idx_karakteristik_demoplot_id 
ON karakteristik_lahan(demoplot_id);

-- kalau sering query kombinasi (best practice)
CREATE INDEX idx_karakteristik_user_demoplot 
ON karakteristik_lahan(user_id, demoplot_id);


CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_karakteristik_lahan_updated_at
BEFORE UPDATE ON karakteristik_lahan
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();