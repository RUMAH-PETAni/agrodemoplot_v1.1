import { supabase } from '../supabase/client';

export interface DirektoriHPG {
  id: number;
  kategori_gangguan: 'hama' | 'penyakit' | 'gulma';
  nama_jenis: string;
  nama_ilmiah: string | null;
  deskripsi: string | null;
  cara_pengendalian: string | null;
  image_url: string | null;
  created_at: string;
  updated_at: string;
}

export const getDirektoriHPG = async () => {
  const { data, error } = await supabase
    .from('direktori_hpg')
    .select('*')
    .order('nama_jenis', { ascending: true });

  if (error) throw error;
  return data as DirektoriHPG[];
};
