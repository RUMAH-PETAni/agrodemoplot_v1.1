import { supabase } from '$lib/supabase/client';

// ── Types ──────────────────────────────────────────────────────────────
export interface SoilDataDetail {
  id: string;
  depth_label: string;
  top_depth: number;
  bottom_depth: number;
  phh2o_mean: number | null;
  soc_mean: number | null;
  nitrogen_mean: number | null;
  clay_mean: number | null;
  sand_mean: number | null;
  silt_mean: number | null;
  bdod_mean: number | null;
  cec_mean: number | null;
  fetch_status: 'pending' | 'success' | 'failed';
}

export interface SoilDataSummary {
  ph_rata_rata: number;
  c_organik_rata_rata: number;
  nitrogen_rata_rata: number;
  bdod_rata_rata: number;
  ktk_rata_rata: number;
  tekstur_tanah: string;
  liat_rata_rata: number;
  debu_rata_rata: number;
  pasir_rata_rata: number;
}

// ── Queries ────────────────────────────────────────────────────────────

/** Mengambil data detail tanah per lapisan kedalaman */
export async function getSoilDetail(demoplotId: string): Promise<SoilDataDetail[]> {
  const { data, error } = await supabase
    .from('soil_data')
    .select('*')
    .eq('demoplot_id', demoplotId)
    .order('top_depth', { ascending: true });

  if (error) throw error;
  return data || [];
}

/** Mengambil ringkasan data tanah (agregat) */
export async function getSoilSummary(demoplotId: string): Promise<SoilDataSummary | null> {
  const { data, error } = await supabase
    .from('soil_data_summary')
    .select('*')
    .eq('demoplot_id', demoplotId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw error;
  }

  // Map database view columns to UI expectations (with fallbacks for different view schemas)
  return {
    ...data,
    ph_rata_rata: data.ph_rata_rata ?? data.ph_mean ?? 0,
    c_organik_rata_rata: data.c_organik_rata_rata ?? data.soc_mean ?? 0,
    nitrogen_rata_rata: data.nitrogen_rata_rata ?? data.nitrogen_mean ?? 0,
    bdod_rata_rata: data.bdod_rata_rata ?? data.bd_rata_rata ?? data.bdod_mean ?? 0,
    ktk_rata_rata: data.ktk_rata_rata ?? data.cec_mean ?? 0,
    tekstur_tanah: data.tekstur_tanah ?? data.tekstur_dominan ?? '---',
    liat_rata_rata: data.liat_rata_rata ?? data.clay_rata_rata ?? data.clay_mean ?? 0,
    debu_rata_rata: data.debu_rata_rata ?? data.silt_rata_rata ?? data.silt_mean ?? 0,
    pasir_rata_rata: data.pasir_rata_rata ?? data.sand_rata_rata ?? data.sand_mean ?? 0
  };
}

/** Cek status fetch data tanah */
export async function getSoilFetchStatus(demoplotId: string) {
  const { data, error } = await supabase
    .from('soil_data')
    .select('fetch_status, fetch_error')
    .eq('demoplot_id', demoplotId)
    .limit(1)
    .single();

  if (error) return { status: 'none' };
  return { status: data.fetch_status, error: data.fetch_error };
}

/** Trigger manual fetch data tanah via Edge Function */
export async function triggerSoilFetch(demoplotId: string) {
  const { data, error } = await supabase.functions.invoke('fetch-soil-data', {
    body: { demoplot_id: demoplotId }
  });
  if (error) throw error;
  return data;
}

// ── UI Helpers ─────────────────────────────────────────────────────────

export function phLabel(ph: number | null) {
  if (ph === null) return 'N/A';
  if (ph < 4.5) return 'Sangat Masam';
  if (ph < 5.5) return 'Masam';
  if (ph < 6.5) return 'Agak Masam';
  if (ph < 7.5) return 'Netral';
  if (ph < 8.5) return 'Agak Alkalis';
  return 'Alkalis';
}

export function cOrganikLabel(soc: number | null) {
  if (soc === null) return 'N/A';
  const val = soc / 10; // Convert g/kg to %
  if (val < 1) return 'Sangat Rendah';
  if (val < 2) return 'Rendah';
  if (val < 3) return 'Sedang';
  if (val < 5) return 'Tinggi';
  return 'Sangat Tinggi';
}

export function nitrogenLabel(n: number | null) {
  if (n === null) return 'N/A';
  const val = n / 100; // Convert cg/kg to %
  if (val < 0.1) return 'Sangat Rendah';
  if (val < 0.2) return 'Rendah';
  if (val < 0.5) return 'Sedang';
  if (val < 0.75) return 'Tinggi';
  return 'Sangat Tinggi';
}
