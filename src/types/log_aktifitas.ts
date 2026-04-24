export interface LogAktifitas {
  id: string;
  user_id: string;
  demoplot_id: string;
  tanggal: string;
  kategori: 'sekolah lapangan' | 'persiapan lahan' | 'pembibitan' | 'penanaman' | 'pemupukan' | 'pemangkasan' | 'pengendalian hama' | 'panen' | 'pasca panen';
  deskripsi: string | null;
  durasi: string | null;
  output: string | null;
  foto_dokumentasi: string | null;
  created_at: string;
  updated_at: string;
}
