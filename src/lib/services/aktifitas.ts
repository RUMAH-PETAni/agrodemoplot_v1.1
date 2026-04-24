import { supabase } from '../supabase/client';

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
  // Joined fields
  demoplot?: {
    nama_demoplot: string;
    lokasi: string | null;
    petani?: {
      nama_lengkap: string;
      foto_profil: string | null;
      desa: string | null;
    };
  };
}

export const getLogAktifitas = async (demoplotId?: string) => {
  let query = supabase
    .from('log_aktifitas')
    .select(`
      *,
      demoplot:demoplot_id (
        nama_demoplot,
        lokasi,
        petani:petani_id (
          nama_lengkap,
          foto_profil,
          desa
        )
      )
    `)
    .order('tanggal', { ascending: false });


  if (demoplotId) {
    query = query.eq('demoplot_id', demoplotId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as LogAktifitas[];
};

export const createLogAktifitas = async (log: Partial<LogAktifitas>) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('log_aktifitas')
    .insert([{ ...log, user_id: user.id }])
    .select()
    .single();

  if (error) throw error;
  return data as LogAktifitas;
};

export const updateLogAktifitas = async (id: string, log: Partial<LogAktifitas>) => {
  const { data, error } = await supabase
    .from('log_aktifitas')
    .update(log)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as LogAktifitas;
};

export const deleteLogAktifitas = async (id: string) => {
  const { error } = await supabase
    .from('log_aktifitas')
    .delete()
    .eq('id', id);

  if (error) throw error;
};

export const uploadFotoAktifitas = async (file: File, logId: string) => {
  const fileExt = file.name.split('.').pop();
  const fileName = `aktifitas/${logId}-${Math.random()}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from('foto_aktifitas')
    .upload(fileName, file);

  if (uploadError) throw uploadError;

  const { data: { publicUrl } } = supabase.storage
    .from('foto_aktifitas')
    .getPublicUrl(fileName);

  return publicUrl;
};

