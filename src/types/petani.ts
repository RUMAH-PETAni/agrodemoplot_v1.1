export interface Petani {

  id: string;
  user_id: string;
  nama_lengkap: string;
  nik?: string | null;
  no_ktp?: string | null;
  tanggal_lahir?: string | null;
  jenis_kelamin?: 'laki-laki' | 'perempuan' | null;
  pendidikan?: string | null;
  no_telepon?: string | null;
  email?: string | null;
  alamat?: string | null;
  provinsi?: string | null;
  kabupaten?: string | null;
  kecamatan?: string | null;
  desa?: string | null;
  kode_pos?: string | null;
  luas_lahan?: number | null;
  tanaman_komoditas?: string | null;
  kelompok_tani?: string | null;
  sertifikat_tani?: string | null;
  foto_profil?: string | null;
  catatan?: string | null;
  created_at: string;
  updated_at: string;
}

export type PetaniInsert = Omit<Petani, 'id' | 'created_at' | 'updated_at'>;
export type PetaniUpdate = Partial<Omit<Petani, 'id' | 'user_id' | 'created_at' | 'updated_at'>>;
