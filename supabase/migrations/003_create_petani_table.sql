-- Create petani (farmers) table
CREATE TABLE petani (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  nama_lengkap TEXT NOT NULL,
  nik TEXT,
  tanggal_lahir DATE,
  jenis_kelamin TEXT CHECK (jenis_kelamin IN ('laki-laki', 'perempuan')),
  pendidikan TEXT,
  no_telepon TEXT,
  email TEXT,
  alamat TEXT,
  provinsi TEXT,
  kabupaten TEXT,
  kecamatan TEXT,
  desa TEXT,
  luas_lahan DECIMAL(10,2),
  tanaman_komoditas TEXT,
  kelompok_tani TEXT,
  foto_profil TEXT,
  avatar TEXT,
  catatan TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_petani_user_id ON petani(user_id);
CREATE INDEX idx_petani_nama ON petani(nama_lengkap);
CREATE INDEX idx_petani_desa ON petani(desa);
CREATE INDEX idx_petani_tanaman_komoditas ON petani(tanaman_komoditas);

-- Enable Row Level Security
ALTER TABLE petani ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own petani data"
  ON petani FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own petani data"
  ON petani FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own petani data"
  ON petani FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own petani data"
  ON petani FOR DELETE
  USING (auth.uid() = user_id);

-- Allow admin to view all petani data (optional - if you have admin role)
CREATE POLICY "Admins can view all petani data"
  ON petani FOR SELECT
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
CREATE TRIGGER update_petani_updated_at
  BEFORE UPDATE ON petani
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
