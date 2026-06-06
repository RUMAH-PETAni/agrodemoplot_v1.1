/**
 * Edge Function: fetch-soil-data
 *
 * Tujuan:
 *   Mengambil data tanah dari SoilGrids REST API berdasarkan koordinat demoplot,
 *   lalu menyimpan hasilnya ke tabel `soil_data`.
 *
 * Cara panggil:
 *   1. Otomatis via pg_net / cron (diatur di Supabase Dashboard)
 *   2. Manual dari frontend: POST /functions/v1/fetch-soil-data
 *      Body (opsional): { "demoplot_id": "uuid" }  → fetch satu demoplot
 *      Body kosong → fetch semua demoplot yang status-nya 'pending'
 *
 * Env vars yang dibutuhkan (set di Supabase Dashboard > Edge Functions > Secrets):
 *   SUPABASE_URL          → URL project Supabase
 *   SUPABASE_SERVICE_ROLE_KEY → service role key (bypass RLS)
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ── Konstanta SoilGrids ────────────────────────────────────────────────────────
const SOILGRIDS_BASE_URL =
  "https://rest.isric.org/soilgrids/v2.0/properties/query";

/** Properties yang diambil dari SoilGrids */
const PROPERTIES = [
  "bdod",      // Bulk Density          → cg/cm³  ÷ 100 = kg/dm³
  "cec",       // Cation Exchange Cap.  → mmol(c)/kg ÷ 10 = cmol(c)/kg
  "clay",      // Liat                  → g/kg ÷ 10 = %
  "sand",      // Pasir                 → g/kg ÷ 10 = %
  "silt",      // Debu                  → g/kg ÷ 10 = %
  "soc",       // Soil Organic Carbon   → dg/kg ÷ 10 = g/kg
  "nitrogen",  // Nitrogen Total        → cg/kg ÷ 100 = g/kg
  "phh2o",     // pH (H₂O)              → pH*10 ÷ 10 = pH
];

/** Kedalaman yang diambil — harus cocok dengan migration SQL */
const DEPTHS = ["0-5cm", "5-15cm", "15-30cm"];

/** Mapping depth label → top_depth & bottom_depth (dalam cm) */
const DEPTH_META: Record<string, { top: number; bottom: number }> = {
  "0-5cm":   { top: 0,  bottom: 5  },
  "5-15cm":  { top: 5,  bottom: 15 },
  "15-30cm": { top: 15, bottom: 30 },
};

/** d_factor per property untuk konversi ke satuan target */
const D_FACTOR: Record<string, number> = {
  bdod: 100,
  cec: 10,
  clay: 10,
  sand: 10,
  silt: 10,
  soc: 10,
  nitrogen: 100,
  phh2o: 10,
};

// ── Tipe data ──────────────────────────────────────────────────────────────────
interface SoilLayer {
  name: string;
  unit_measure: { d_factor: number };
  depths: Array<{
    label: string;
    values: { mean: number | null };
  }>;
}

interface SoilGridsResponse {
  properties: { layers: SoilLayer[] };
}

interface SoilDataRow {
  user_id: string;       // ← NOT NULL
  demoplot_id: string;
  depth_label: string;
  top_depth: number;     // ← NOT NULL
  bottom_depth: number;  // ← NOT NULL
  latitude: number;      // ← NOT NULL
  longitude: number;     // ← NOT NULL
  bdod_mean?: number | null;
  cec_mean?: number | null;
  clay_mean?: number | null;
  sand_mean?: number | null;
  silt_mean?: number | null;
  soc_mean?: number | null;
  nitrogen_mean?: number | null;
  phh2o_mean?: number | null;
  fetch_status: "success" | "failed";
  fetch_error?: string | null;
  fetched_at: string;
}

// ── Helper: fetch dari SoilGrids ───────────────────────────────────────────────
async function fetchSoilGrids(
  lat: number,
  lon: number
): Promise<SoilGridsResponse> {
  const params = new URLSearchParams();
  params.set("lon", lon.toString());
  params.set("lat", lat.toString());
  params.set("value", "mean");
  PROPERTIES.forEach((p) => params.append("property", p));
  DEPTHS.forEach((d) => params.append("depth", d));

  const url = `${SOILGRIDS_BASE_URL}?${params.toString()}`;

  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    // Timeout 30 detik — SoilGrids kadang lambat
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    throw new Error(
      `SoilGrids API error: ${res.status} ${res.statusText}`
    );
  }

  return res.json() as Promise<SoilGridsResponse>;
}

// ── Helper: parse respons SoilGrids → array baris DB ─────────────────────────
function parseSoilGridsResponse(
  userId: string,
  demoplotId: string,
  lat: number,
  lon: number,
  data: SoilGridsResponse
): SoilDataRow[] {
  const layers = data.properties.layers;
  const now = new Date().toISOString();

  // Buat map: { [depth]: { [property]: value_converted } }
  const depthMap: Record<string, Record<string, number | null>> = {};

  for (const depth of DEPTHS) {
    depthMap[depth] = {};
  }

  for (const layer of layers) {
    const factor = D_FACTOR[layer.name] ?? layer.unit_measure.d_factor ?? 1;
    for (const depthEntry of layer.depths) {
      const depthLabel = depthEntry.label;
      if (!depthMap[depthLabel]) continue;
      const rawValue = depthEntry.values.mean;
      depthMap[depthLabel][layer.name] =
        rawValue !== null && rawValue !== undefined
          ? parseFloat((rawValue / factor).toFixed(4))
          : null;
    }
  }

  return DEPTHS.map((depth) => {
    const vals = depthMap[depth];
    const meta = DEPTH_META[depth];  // top_depth & bottom_depth
    return {
      user_id: userId,
      demoplot_id: demoplotId,
      depth_label: depth,
      top_depth: meta.top,           // ← NOT NULL
      bottom_depth: meta.bottom,     // ← NOT NULL
      latitude: lat,                 // ← NOT NULL
      longitude: lon,                // ← NOT NULL
      bdod_mean: vals["bdod"] ?? null,
      cec_mean: vals["cec"] ?? null,
      clay_mean: vals["clay"] ?? null,
      sand_mean: vals["sand"] ?? null,
      silt_mean: vals["silt"] ?? null,
      soc_mean: vals["soc"] ?? null,
      nitrogen_mean: vals["nitrogen"] ?? null,
      phh2o_mean: vals["phh2o"] ?? null,
      fetch_status: "success",
      fetch_error: null,
      fetched_at: now,
    };
  });
}

// ── Main Handler ──────────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  // CORS preflight
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
    // Inisialisasi Supabase client dengan service role (bypass RLS)
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    // Parse body opsional
    let demoplotId: string | null = null;
    try {
      const body = await req.json();
      demoplotId = body?.demoplot_id ?? null;
    } catch {
      // body kosong → fetch semua pending
    }

    // ── Query demoplot yang perlu di-fetch ─────────────────────────────────
    let pendingQuery = supabase
      .from("soil_data")
      .select("user_id, demoplot_id, depth_label, latitude, longitude")  // ← tambah user_id
      .eq("fetch_status", "pending")
      .not("latitude", "is", null)
      .not("longitude", "is", null);

    if (demoplotId) {
      pendingQuery = pendingQuery.eq("demoplot_id", demoplotId);
    }

    const { data: pendingRows, error: queryError } = await pendingQuery;

    if (queryError) throw queryError;
    if (!pendingRows || pendingRows.length === 0) {
      return new Response(
        JSON.stringify({ message: "Tidak ada data pending untuk di-fetch." }),
        { status: 200, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
      );
    }

    // Kelompokkan per demoplot_id (hindari request ganda ke SoilGrids)
    const grouped = new Map<
      string,
      { userId: string; lat: number; lon: number }  // ← tambah userId
    >();

    for (const row of pendingRows) {
      if (!grouped.has(row.demoplot_id)) {
        grouped.set(row.demoplot_id, {
          userId: row.user_id,   // ← simpan user_id
          lat: row.latitude,
          lon: row.longitude,
        });
      }
    }

    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    // ── Proses tiap demoplot secara sekuensial ─────────────────────────────
    //    (hindari rate-limit SoilGrids kalau banyak demoplot)
    for (const [dplotId, coords] of grouped.entries()) {
      let upsertRows: SoilDataRow[];

      try {
        const sgData = await fetchSoilGrids(coords.lat, coords.lon);
        upsertRows = parseSoilGridsResponse(coords.userId, dplotId, coords.lat, coords.lon, sgData);
        results.success++;
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        results.failed++;
        results.errors.push(`demoplot ${dplotId}: ${errMsg}`);

        // Tandai semua kedalaman sebagai failed (sertakan semua NOT NULL)
        upsertRows = DEPTHS.map((depth) => ({
          user_id: coords.userId,
          demoplot_id: dplotId,
          depth_label: depth,
          top_depth: DEPTH_META[depth].top,       // ← NOT NULL
          bottom_depth: DEPTH_META[depth].bottom, // ← NOT NULL
          latitude: coords.lat,
          longitude: coords.lon,
          fetch_status: "failed" as const,
          fetch_error: errMsg,
          fetched_at: new Date().toISOString(),
        }));
      }

      // Upsert ke tabel soil_data
      const { error: upsertError } = await supabase
        .from("soil_data")
        .upsert(upsertRows, {
          onConflict: "demoplot_id,depth_label",
          ignoreDuplicates: false,
        });

      if (upsertError) {
        results.errors.push(
          `upsert error demoplot ${dplotId}: ${upsertError.message}`
        );
      }

      // Delay kecil agar tidak spam SoilGrids (rate limit friendly)
      if (grouped.size > 1) {
        await new Promise((r) => setTimeout(r, 500));
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
