import { supabase } from '$lib/supabase/client';

// ── Types ──────────────────────────────────────────────────────────────
export interface ClimateDataDetail {
  id: string;
  tahun: number;
  bulan: number;
  suhu_rata_rata: number | null;
  suhu_maks: number | null;
  suhu_min: number | null;
  curah_hujan_total: number | null;
  hari_hujan: number | null;
  kelembapan_rata_rata: number | null;
  kecepatan_angin_rata_rata: number | null;
  fetch_status: 'pending' | 'success' | 'failed';
}

export interface ClimateDataSummary {
  suhu_tahunan: number;
  curah_hujan_tahunan: number;
  kelembapan_tahunan: number;
  angin_tahunan: number;
  bulan_terbasah?: number;
  bulan_terkering?: number;
}

export const NAMA_BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

// ── Queries ────────────────────────────────────────────────────────────

/** Mengambil data iklim bulanan (12 bulan terakhir) */
export async function getClimateMonthly(demoplotId: string): Promise<ClimateDataDetail[]> {
  const { data, error } = await supabase
    .from('climate_data')
    .select('*')
    .eq('demoplot_id', demoplotId)
    .order('tahun', { ascending: false })
    .order('bulan', { ascending: false })
    .limit(12);

  if (error) throw error;
  
  // Map database columns to UI expectations
  const mapped = (data || []).map(m => ({
    ...m,
    suhu_maks: m.suhu_maks ?? m.suhu_maks_rata,
    suhu_min: m.suhu_min ?? m.suhu_min_rata,
  }));

  // Return in chronological order
  return mapped.reverse();
}

/** Mengambil ringkasan data iklim (rata-rata tahunan) */
export async function getClimateSummary(demoplotId: string): Promise<ClimateDataSummary | null> {
  // 1. Get aggregate summary from view
  const { data: summary, error: summaryError } = await supabase
    .from('climate_data_summary')
    .select('*')
    .eq('demoplot_id', demoplotId)
    .single();

  if (summaryError && summaryError.code !== 'PGRST116') throw summaryError;

  // 2. Get monthly data to calculate wettest/driest month
  const { data: monthly, error: monthlyError } = await supabase
    .from('climate_data')
    .select('bulan, curah_hujan_total')
    .eq('demoplot_id', demoplotId);

  if (monthlyError) throw monthlyError;

  if (!summary) return null;

  // Calculate wettest/driest
  let bulanTerbasah = 0;
  let bulanTerkering = 0;
  if (monthly && monthly.length > 0) {
    const sorted = [...monthly].sort((a, b) => (b.curah_hujan_total || 0) - (a.curah_hujan_total || 0));
    bulanTerbasah = sorted[0]?.bulan || 1;
    bulanTerkering = sorted[sorted.length - 1]?.bulan || 1;
  }

  return {
    ...summary,
    suhu_tahunan: summary.suhu_tahunan ?? summary.suhu_rata_rata_tahunan ?? 0,
    curah_hujan_tahunan: summary.curah_hujan_tahunan ?? summary.hujan_tahunan ?? 0,
    kelembapan_tahunan: summary.kelembapan_tahunan ?? summary.kelembapan_rata_rata_tahunan ?? 0,
    angin_tahunan: summary.angin_tahunan ?? summary.kecepatan_angin_rata_rata_tahunan ?? 0,
    bulan_terbasah: bulanTerbasah,
    bulan_terkering: bulanTerkering
  };
}

/** Trigger manual fetch data iklim via Edge Function */
export async function triggerClimateFetch(demoplotId: string) {
  const { data, error } = await supabase.functions.invoke('fetch-climate-data', {
    body: { demoplot_id: demoplotId }
  });
  if (error) throw error;
  return data;
}

// ── UI Helpers ─────────────────────────────────────────────────────────

export function curahHujanLabel(mm: number | null) {
  if (mm === null) return 'N/A';
  if (mm < 100) return 'Rendah';
  if (mm < 300) return 'Sedang';
  if (mm < 500) return 'Tinggi';
  return 'Sangat Tinggi';
}

export function suhuKopiLabel(temp: number | null) {
  if (temp === null) return 'N/A';
  if (temp < 15) return 'Terlalu Dingin';
  if (temp <= 24) return 'Optimal (Arabika)';
  if (temp <= 30) return 'Optimal (Robusta)';
  return 'Terlalu Panas';
}
