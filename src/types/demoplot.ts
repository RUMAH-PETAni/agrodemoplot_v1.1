export interface Demoplot {
  id: string;
  user_id: string;
  petani_id: string;
  nama_demoplot: string;
  lokasi: string | null;
  luas_demoplot: number | null;
  latitude: number | null;
  longitude: number | null;
  altitude: number | null;
  polygon: any | null;
  luas_polygon: number | null;
  foto_udara: string | null;

  sistem_budidaya: string | null; // agroforestri, monokultur
  tanaman_utama: string | null; // kopi arabika, kopi robusta
  jumlah_tanaman_utama: number | null;
  pohon_penanung: string | null; 
  jumlah_pohon_penaung: number | null;
  jenis_tanaman_lainnya: string | null;

  status_plot: 'rencana' | 'aktif' | 'selesai' | null;
  catatan: string | null;
  created_at: string;
  updated_at: string;

  // Virtual fields from joins
  petani_nama?: string;
  petani_foto?: string;
}

export interface DemoplotInsert {
  user_id?: string;
  petani_id: string;
  nama_demoplot: string;
  lokasi?: string | null;
  luas_demoplot?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  altitude?: number | null;
  polygon?: any | null;
  luas_polygon?: number | null;
  foto_udara?: string | null;

  sistem_budidaya?: string | null;
  tanaman_utama?: string | null;
  jumlah_tanaman_utama?: number | null;
  pohon_penanung?: string | null;
  jumlah_pohon_penaung?: number | null;
  jenis_tanaman_lainnya?: string | null;

  status_plot?: 'rencana' | 'aktif' | 'selesai' | null;
  catatan?: string | null;
}

export interface DemoplotUpdate extends Partial<DemoplotInsert> {}

export interface DemoplotWithPetani extends Demoplot {
  petani: {
    nama_lengkap: string;
    no_telepon: string;
    desa: string;
  };
}
