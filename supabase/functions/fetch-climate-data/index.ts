/**
 * Edge Function: fetch-climate-data
 *
 * Mengambil data historis cuaca bulanan dari Open-Meteo Historical Weather API
 * dan menyimpannya ke tabel `climate_data`.
 *
 * API: https://archive-api.open-meteo.com/v1/archive
 * Gratis, tanpa API key.
 *
 * Cara panggil:
 *   POST /functions/v1/fetch-climate-data
 *   Body (opsional): { "demoplot_id": "uuid" }  → fetch satu demoplot
 *   Body kosong                                  → fetch semua pending
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ── Konstanta ─────────────────────────────────────────────────────────────────
const ARCHIVE_BASE_URL = "https://archive-api.open-meteo.com/v1/archive";

/** Variabel harian yang diambil dari Open-Meteo */
const DAILY_VARS = [
  "temperature_2m_max",
  "temperature_2m_min",
  "temperature_2m_mean",
  "precipitation_sum",
  "rain_sum",
  "relative_humidity_2m_max",
  "relative_humidity_2m_min",
  "windspeed_10m_max",
  "windspeed_10m_mean",
  "et0_fao_evapotranspiration",
  "shortwave_radiation_sum",
].join(",");

// ── Tipe data ─────────────────────────────────────────────────────────────────
interface OpenMeteoResponse {
  latitude: number;
  longitude: number;
  daily: {
    time: string[];                     // "YYYY-MM-DD"
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    temperature_2m_mean: number[];
    precipitation_sum: number[];
    rain_sum: number[];
    relative_humidity_2m_max: number[];
    relative_humidity_2m_min: number[];
    windspeed_10m_max: number[];
    windspeed_10m_mean: number[];
    et0_fao_evapotranspiration: number[];
    shortwave_radiation_sum: number[];
  };
}

interface ClimateRow {
  user_id: string;
  demoplot_id: string;
  latitude: number;
  longitude: number;
  tahun: number;
  bulan: number;
  suhu_maks_rata: number | null;
  suhu_min_rata: number | null;
  suhu_rata_rata: number | null;
  curah_hujan_total: number | null;
  hari_hujan: number | null;
  kelembapan_maks_rata: number | null;
  kelembapan_min_rata: number | null;
  kelembapan_rata_rata: number | null;
  kecepatan_angin_maks: number | null;
  kecepatan_angin_rata: number | null;
  et0_total: number | null;
  radiasi_total: number | null;
  fetch_status: "success" | "failed";
  fetch_error: string | null;
  fetched_at: string;
}

// ── Helper: rata-rata array (skip null/undefined) ─────────────────────────────
function mean(arr: (number | null | undefined)[]): number | null {
  const valid = arr.filter((v): v is number => v !== null && v !== undefined && !isNaN(v));
  if (valid.length === 0) return null;
  return parseFloat((valid.reduce((a, b) => a + b, 0) / valid.length).toFixed(2));
}

function sum(arr: (number | null | undefined)[]): number | null {
  const valid = arr.filter((v): v is number => v !== null && v !== undefined && !isNaN(v));
  if (valid.length === 0) return null;
  return parseFloat(valid.reduce((a, b) => a + b, 0).toFixed(2));
}

// ── Helper: fetch dari Open-Meteo Archive API ─────────────────────────────────
async function fetchOpenMeteo(
  lat: number,
  lon: number,
  startDate: string,   // "YYYY-MM-DD"
  endDate: string
): Promise<OpenMeteoResponse> {
  const params = new URLSearchParams({
    latitude:  lat.toString(),
    longitude: lon.toString(),
    daily:     DAILY_VARS,
    timezone:  "auto",
    start_date: startDate,
    end_date:   endDate,
  });

  const res = await fetch(`${ARCHIVE_BASE_URL}?${params}`, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(45_000),  // Open-Meteo bisa lambat untuk range panjang
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => res.statusText);
    throw new Error(`Open-Meteo API error ${res.status}: ${errText}`);
  }

  return res.json() as Promise<OpenMeteoResponse>;
}

// ── Helper: agregasi daily → monthly ─────────────────────────────────────────
function aggregateToMonthly(
  userId: string,
  demoplotId: string,
  lat: number,
  lon: number,
  data: OpenMeteoResponse,
  targetMonths: Array<{ tahun: number; bulan: number }>
): ClimateRow[] {
  const now = new Date().toISOString();
  const d = data.daily;

  // Kelompokkan indeks per "YYYY-MM"
  const monthMap = new Map<string, number[]>();
  for (let i = 0; i < d.time.length; i++) {
    const key = d.time[i].substring(0, 7); // "YYYY-MM"
    if (!monthMap.has(key)) monthMap.set(key, []);
    monthMap.get(key)!.push(i);
  }

  return targetMonths.map(({ tahun, bulan }) => {
    const key = `${tahun}-${String(bulan).padStart(2, "0")}`;
    const indices = monthMap.get(key) ?? [];

    if (indices.length === 0) {
      return {
        user_id: userId, demoplot_id: demoplotId,
        latitude: lat, longitude: lon,
        tahun, bulan,
        suhu_maks_rata: null, suhu_min_rata: null, suhu_rata_rata: null,
        curah_hujan_total: null, hari_hujan: null,
        kelembapan_maks_rata: null, kelembapan_min_rata: null, kelembapan_rata_rata: null,
        kecepatan_angin_maks: null, kecepatan_angin_rata: null,
        et0_total: null, radiasi_total: null,
        fetch_status: "failed",
        fetch_error: `Tidak ada data untuk bulan ${key}`,
        fetched_at: now,
      };
    }

    const pick = <K extends keyof typeof d>(key: K) =>
      indices.map((i) => (d[key] as number[])[i]);

    const precip = pick("precipitation_sum");
    const hariHujan = precip.filter((v) => v !== null && v > 1.0).length;

    // Kelembapan: Open-Meteo mungkin tidak punya mean RH → hitung dari max+min
    const rhMax  = pick("relative_humidity_2m_max");
    const rhMin  = pick("relative_humidity_2m_min");
    const rhMean = rhMax.map((mx, i) =>
      mx !== null && rhMin[i] !== null ? (mx + rhMin[i]) / 2 : null
    );

    return {
      user_id: userId,
      demoplot_id: demoplotId,
      latitude: lat,
      longitude: lon,
      tahun,
      bulan,
      suhu_maks_rata:       mean(pick("temperature_2m_max")),
      suhu_min_rata:        mean(pick("temperature_2m_min")),
      suhu_rata_rata:       mean(pick("temperature_2m_mean")),
      curah_hujan_total:    sum(precip),
      hari_hujan:           hariHujan,
      kelembapan_maks_rata: mean(rhMax),
      kelembapan_min_rata:  mean(rhMin),
      kelembapan_rata_rata: mean(rhMean),
      kecepatan_angin_maks: mean(pick("windspeed_10m_max")),
      kecepatan_angin_rata: mean(pick("windspeed_10m_mean")),
      et0_total:            sum(pick("et0_fao_evapotranspiration")),
      radiasi_total:        sum(pick("shortwave_radiation_sum")),
      fetch_status:         "success",
      fetch_error:          null,
      fetched_at:           now,
    };
  });
}

// ── Main Handler ──────────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers":
          "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  try {
    const supabaseUrl      = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey   = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    // Parse body
    let filterDemoplotId: string | null = null;
    try {
      const body = await req.json();
      filterDemoplotId = body?.demoplot_id ?? null;
    } catch { /* body kosong → fetch semua pending */ }

    // ── Query semua baris pending ─────────────────────────────────────────
    let q = supabase
      .from("climate_data")
      .select("user_id, demoplot_id, latitude, longitude, tahun, bulan")
      .eq("fetch_status", "pending")
      .not("latitude",  "is", null)
      .not("longitude", "is", null);

    if (filterDemoplotId) q = q.eq("demoplot_id", filterDemoplotId);

    const { data: pendingRows, error: queryError } = await q;
    if (queryError) throw queryError;

    if (!pendingRows || pendingRows.length === 0) {
      return new Response(
        JSON.stringify({ message: "Tidak ada data klimatologi pending." }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // Kelompokkan per demoplot → { userId, lat, lon, months[] }
    const grouped = new Map<string, {
      userId: string;
      lat: number;
      lon: number;
      months: Array<{ tahun: number; bulan: number }>;
    }>();

    for (const row of pendingRows) {
      if (!grouped.has(row.demoplot_id)) {
        grouped.set(row.demoplot_id, {
          userId: row.user_id,
          lat:    row.latitude,
          lon:    row.longitude,
          months: [],
        });
      }
      grouped.get(row.demoplot_id)!.months.push({
        tahun: row.tahun,
        bulan: row.bulan,
      });
    }

    const results = { success: 0, failed: 0, errors: [] as string[] };

    // Tanggal maksimum yang boleh diminta = kemarin (API tidak punya data hari ini)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const MAX_DATE = yesterday.toISOString().split("T")[0]; // "YYYY-MM-DD"

    // ── Proses tiap demoplot ──────────────────────────────────────────────
    for (const [dplotId, info] of grouped.entries()) {
      let upsertRows: ClimateRow[];

      try {
        // Hitung rentang tanggal, cap end ke MAX_DATE
        const allDates = info.months.flatMap(({ tahun, bulan }) => {
          const y = tahun, m = bulan;
          const start  = `${y}-${String(m).padStart(2, "0")}-01`;
          const lastDay = new Date(y, m, 0).getDate();
          const nomEnd  = `${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
          const end     = nomEnd > MAX_DATE ? MAX_DATE : nomEnd;
          return [start, end];
        });

        const startDate  = [...allDates].sort()[0];
        const rawEndDate = [...allDates].sort().reverse()[0];
        const endDate    = rawEndDate > MAX_DATE ? MAX_DATE : rawEndDate;

        // Satu request Open-Meteo untuk semua bulan pending demoplot ini
        const omData = await fetchOpenMeteo(info.lat, info.lon, startDate, endDate);
        upsertRows   = aggregateToMonthly(info.userId, dplotId, info.lat, info.lon, omData, info.months);
        results.success++;
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        results.failed++;
        results.errors.push(`demoplot ${dplotId}: ${errMsg}`);

        // Tandai semua bulan sebagai failed
        const now = new Date().toISOString();
        upsertRows = info.months.map(({ tahun, bulan }) => ({
          user_id: info.userId,
          demoplot_id: dplotId,
          latitude: info.lat,
          longitude: info.lon,
          tahun, bulan,
          suhu_maks_rata: null, suhu_min_rata: null, suhu_rata_rata: null,
          curah_hujan_total: null, hari_hujan: null,
          kelembapan_maks_rata: null, kelembapan_min_rata: null, kelembapan_rata_rata: null,
          kecepatan_angin_maks: null, kecepatan_angin_rata: null,
          et0_total: null, radiasi_total: null,
          fetch_status: "failed" as const,
          fetch_error: errMsg,
          fetched_at: now,
        }));
      }

      const { error: upsertError } = await supabase
        .from("climate_data")
        .upsert(upsertRows, {
          onConflict: "demoplot_id,tahun,bulan",
          ignoreDuplicates: false,
        });

      if (upsertError) {
        results.errors.push(`upsert error ${dplotId}: ${upsertError.message}`);
      }

      // Jangan spam Open-Meteo kalau banyak demoplot
      if (grouped.size > 1) {
        await new Promise((r) => setTimeout(r, 300));
      }
    }

    return new Response(
      JSON.stringify({
        message: `Selesai. Berhasil: ${results.success}, Gagal: ${results.failed}.`,
        ...results,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(
      JSON.stringify({ error: message }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
});
