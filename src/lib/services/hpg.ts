import { supabase } from '../supabase/client';

export interface MonitoringHPG {
  id: string;
  user_id: string;
  demoplot_id: string;
  tanggal_monitoring: string;
  kategori_gangguan: 'hama' | 'penyakit' | 'gulma' | null;
  nama_jenis: string | null;
  nama_ilmiah: string | null;
  tingkat_serangan: string | null;
  bagian_terserang: string | null;
  cara_pengendalian: string | null;
  latitude: number | null;
  longitude: number | null;
  altitude: number | null;
  foto: string | null;
  catatan: string | null;
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

export const getMonitoringHPG = async (demoplotId?: string) => {
  let query = supabase
    .from('monitoring_hpg')
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
    .order('tanggal_monitoring', { ascending: false });

  if (demoplotId) {
    query = query.eq('demoplot_id', demoplotId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as MonitoringHPG[];
};

export const createMonitoringHPG = async (record: Partial<MonitoringHPG>) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('monitoring_hpg')
    .insert([{ ...record, user_id: user.id }])
    .select()
    .single();

  if (error) throw error;
  return data as MonitoringHPG;
};

export const updateMonitoringHPG = async (id: string, record: Partial<MonitoringHPG>) => {
  const { data, error } = await supabase
    .from('monitoring_hpg')
    .update(record)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as MonitoringHPG;
};

export const deleteMonitoringHPG = async (id: string) => {
  const { error } = await supabase
    .from('monitoring_hpg')
    .delete()
    .eq('id', id);

  if (error) throw error;
};

export const uploadFotoHPG = async (file: File, recordId: string) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('recordId', recordId);
  formData.append('folder', 'hpg');

  const response = await fetch('/api/upload-cloudinary', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || 'Gagal mengupload foto ke Cloudinary');
  }

  const { secure_url } = await response.json();
  return secure_url;
};
