export interface KarakteristikLahan {
  id: string;
  user_id: string;
  demoplot_id: string;

  kelerengan: number | null;
  suhu: number | null;
  kelembapan_relatif: number | null;
  curah_hujan: number | null;

  kapasitas_tukar_kation: number | null;
  ph_air: number | null;
  kandungan_c_organic: number | null;
  kandungan_nitrogen: string | null; // sedang, rendah, sangat rendah
  tekstur_tanah: string | null; // Pasir sangat kasar, Pasir kasar, Pasir sedang, Pasir halus, Pasir sangat halus, Debu, Liat

  created_at: string;
  updated_at: string;
}

export type KarakteristikLahanInsert = Omit<KarakteristikLahan, 'id' | 'user_id' | 'created_at' | 'updated_at'>;
export type KarakteristikLahanUpdate = Partial<KarakteristikLahanInsert>;
