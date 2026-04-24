export interface MonitoringPenanaman {
  id?: string;
  user_id?: string;
  demoplot_id: string;
  tanggal_monitoring: string;
  waktu_tanam: string | null;
  jarak_tanam: '2,5x2,5' | '3x3' | '5x5' | '10x10' | 'tidak ada' | null;
  latitude: number | null;
  longitude: number | null;
  altitude: number | null;
  jenis_tanaman: string | null;
  nama_ilmiah: string | null;
  sumber_bibit: 'bibit sertifikat' | 'non sertifikat' | null;
  kondisi_pertumbuhan: 'sehat' | 'tidak sehat' | 'mati' | null;
  tinggi: number | null;
  foto_tanaman: string | null;
  catatan: string | null;
  created_at?: string;
  updated_at?: string;
  demoplot?: {
    nama_demoplot: string;
    petani_id: string;
  };
}

