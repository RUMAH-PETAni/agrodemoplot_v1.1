import { supabase } from '../supabase/client';

export interface MonitoringPenanaman {
  id: string;
  user_id: string;
  demoplot_id: string;
  kode_tanaman: string;
  periode_monitoring: 'P1' | 'P2' | 'P3' | null;
  tanggal_monitoring: string;
  waktu_tanam: string | null;
  jarak_tanam: '2,5x2,5' | '3x3' | '5x5' | '10x10' | 'tidak ada' | null;
  jenis_tanaman: string | null;
  nama_ilmiah: string | null;
  sumber_bibit: 'bibit sertifikat' | 'non sertifikat' | null;
  usia_tanaman: number | null;
  kondisi_pertumbuhan: 'sehat' | 'tidak sehat' | 'mati' | null;
  tinggi: number | null;
  latitude: number | null;
  longitude: number | null;
  altitude: number | null;
  foto_tanaman: string | null;
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

export const getMonitoringPenanaman = async (demoplotId?: string) => {
  let query = supabase
    .from('monitoring_penanaman')
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
  return data as MonitoringPenanaman[];
};

export const createMonitoringPenanaman = async (record: Partial<MonitoringPenanaman>) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('monitoring_penanaman')
    .insert([{ ...record, user_id: user.id }])
    .select()
    .single();

  if (error) throw error;
  return data as MonitoringPenanaman;
};

export const updateMonitoringPenanaman = async (id: string, record: Partial<MonitoringPenanaman>) => {
  const { data, error } = await supabase
    .from('monitoring_penanaman')
    .update(record)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as MonitoringPenanaman;
};

export const deleteMonitoringPenanaman = async (id: string) => {
  const { error } = await supabase
    .from('monitoring_penanaman')
    .delete()
    .eq('id', id);

  if (error) throw error;
};

export const uploadFotoTanaman = async (file: File, recordId: string) => {
  const fileExt = file.name.split('.').pop();
  const fileName = `tanaman/${recordId}-${Math.random()}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from('foto_tanaman')
    .upload(fileName, file);

  if (uploadError) throw uploadError;

  const { data: { publicUrl } } = supabase.storage
    .from('foto_tanaman')
    .getPublicUrl(fileName);

  return publicUrl;
};
