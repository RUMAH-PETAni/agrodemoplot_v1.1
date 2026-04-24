import { supabase } from '../supabase/client';

export interface Produktivitas {
  id: string;
  user_id: string;
  demoplot_id: string;
  tanggal_pencatatan: string;
  kategori_pencatatan: 'input' | 'tenaga kerja' | 'hasil panen';
  
  // Input
  jenis_input?: string | null;
  jumlah_pakai?: number | null;
  satuan?: string | null;
  biaya_total?: number | null;
  waktu_penggunaan?: string | null;

  // Tenaga Kerja
  jenis_pekerjaan?: string | null;
  biaya_tenaga_kerja?: number | null;
  jumlah_jam_kerja?: number | null;
  tanggal_pelaksanaan?: string | null;

  // Hasil Panen
  kategori_tanaman?: string | null;
  nama_jenis?: string | null;
  jumlah_tanaman?: number | null;
  berat_basah_kg?: number | null;
  putaran_panen?: number | null;
  catatan_kualitas?: string | null;
  tanggal_panen?: string | null;
  
  // Pasca Panen
  metode_pengolahan?: string | null;
  berat_kering_kg?: number | null;
  berat_terbuang_kg?: number | null;
  tanggal_selesai?: string | null;

  created_at: string;
  updated_at: string;

  // Joined fields
  demoplot?: {
    nama_demoplot: string;
    lokasi: string | null;
    petani?: {
      nama_lengkap: string;
      foto_profil: string | null;
    };
  };
}

export interface ProduktivitasSummary {
  demoplot_id: string;
  nama_demoplot: string;
  user_id: string;
  jumlah_catatan_input: number;
  total_biaya_input: number;
  jumlah_catatan_tk: number;
  total_biaya_tk: number;
  total_jam_kerja: number;
  jumlah_catatan_panen: number;
  total_panen_basah_kg: number;
  total_panen_kering_kg: number;
  total_pengeluaran: number;
  kg_per_jam_kerja: number;
  biaya_per_kg: number;
  tanggal_mulai: string;
  tanggal_terakhir: string;
}

export const getProduktivitas = async (demoplotId?: string) => {
  let query = supabase
    .from('produktivitas')
    .select(`
      *,
      demoplot:demoplot_id (
        nama_demoplot,
        lokasi,
        petani:petani_id (
          nama_lengkap,
          foto_profil
        )
      )
    `)
    .order('tanggal_pencatatan', { ascending: false });

  if (demoplotId) {
    query = query.eq('demoplot_id', demoplotId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as Produktivitas[];
};

export const getProduktivitasSummary = async (demoplotId?: string) => {
  let query = supabase
    .from('produktivitas_summary')
    .select('*');

  if (demoplotId) {
    query = query.eq('demoplot_id', demoplotId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as ProduktivitasSummary[];
};

export const createProduktivitas = async (record: Partial<Produktivitas>) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('produktivitas')
    .insert([{ ...record, user_id: user.id }])
    .select()
    .single();

  if (error) throw error;
  return data as Produktivitas;
};

export const updateProduktivitas = async (id: string, record: Partial<Produktivitas>) => {
  const { data, error } = await supabase
    .from('produktivitas')
    .update(record)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Produktivitas;
};

export const deleteProduktivitas = async (id: string) => {
  const { error } = await supabase
    .from('produktivitas')
    .delete()
    .eq('id', id);

  if (error) throw error;
};
