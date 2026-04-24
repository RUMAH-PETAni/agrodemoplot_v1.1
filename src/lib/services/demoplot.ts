import { supabase } from '$lib/supabase/client';
import type { Demoplot, DemoplotInsert, DemoplotUpdate } from '../../types/demoplot';

// ── Helper: trigger Edge Function fetch-soil-data (fire-and-forget) ───────────
function triggerSoilFetch(demoplotId: string): void {
  supabase.functions
    .invoke('fetch-soil-data', { body: { demoplot_id: demoplotId } })
    .then(({ error }) => {
      if (error) console.warn('[SoilFetch] Gagal trigger:', error.message);
      else console.info('[SoilFetch] Triggered untuk demoplot:', demoplotId);
    })
    .catch((err) => console.warn('[SoilFetch] Error:', err));
}

// ── Helper: trigger Edge Function fetch-climate-data (fire-and-forget) ──────
function triggerClimateFetch(demoplotId: string): void {
  supabase.functions
    .invoke('fetch-climate-data', { body: { demoplot_id: demoplotId } })
    .then(({ error }) => {
      if (error) console.warn('[ClimateFetch] Gagal trigger:', error.message);
      else console.info('[ClimateFetch] Triggered untuk demoplot:', demoplotId);
    })
    .catch((err) => console.warn('[ClimateFetch] Error:', err));
}

export async function getDemoplotList(): Promise<Demoplot[]> {
  const { data, error } = await supabase
    .from('demoplot')
    .select(`
      *,
      petani (
        nama_lengkap,
        no_telepon,
        desa,
        foto_profil
      )
    `)
    .order('nama_demoplot', { ascending: true });

  if (error) throw error;

  // Map the joined data
  return (data || []).map(item => ({
    ...item,
    petani_nama: item.petani?.nama_lengkap || '-',
    petani_foto: item.petani?.foto_profil
  }));
}

export async function getDemoplotById(id: string): Promise<Demoplot | null> {
  const { data, error } = await supabase
    .from('demoplot')
    .select(`
      *,
      petani (
        nama_lengkap,
        no_telepon,
        desa,
        foto_profil
      )
    `)
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return {
    ...data,
    petani_nama: data.petani?.nama_lengkap || '-',
    petani_foto: data.petani?.foto_profil
  };
}

export async function createDemoplot(demoplot: DemoplotInsert): Promise<Demoplot> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('demoplot')
    .insert({ ...demoplot, user_id: user.id })
    .select()
    .single();

  if (error) throw error;

  // Trigger fetch data tanah & iklim otomatis jika koordinat tersedia
  if (data.latitude && data.longitude) {
    triggerSoilFetch(data.id);
    triggerClimateFetch(data.id);
  }

  return data;
}

export async function updateDemoplot(id: string, updates: DemoplotUpdate): Promise<Demoplot> {
  const { data, error } = await supabase
    .from('demoplot')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  // Re-trigger fetch jika koordinat ikut diupdate
  const koordinatBerubah = updates.latitude !== undefined || updates.longitude !== undefined;
  if (koordinatBerubah && data.latitude && data.longitude) {
    triggerSoilFetch(data.id);
    triggerClimateFetch(data.id);
  }

  return data;
}

export async function deleteDemoplot(id: string): Promise<void> {
  const { error } = await supabase
    .from('demoplot')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function getDemoplotStats() {
  const { data, error } = await supabase
    .from('demoplot')
    .select('luas_demoplot, status_plot, jumlah_tanaman_utama');

  if (error) throw error;

  const stats = {
    totalArea: data?.reduce((sum, d) => sum + (d.luas_demoplot || 0), 0) || 0,
    aktifCount: data?.filter(d => d.status_plot === 'aktif').length || 0,
    rencanaCount: data?.filter(d => d.status_plot === 'rencana').length || 0,
    totalKopi: data?.reduce((sum, d) => sum + (d.jumlah_tanaman_utama || 0), 0) || 0,
    totalDemoplot: data?.length || 0
  };

  return stats;
}
export async function getDemoplotsByPetaniId(petaniId: string): Promise<Demoplot[]> {
  const { data, error } = await supabase
    .from('demoplot')
    .select('*')
    .eq('petani_id', petaniId)
    .order('nama_demoplot', { ascending: true });

  if (error) throw error;
  return data || [];
}
