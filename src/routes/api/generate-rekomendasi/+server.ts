import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';

const SYSTEM_PROMPT = `Anda adalah AI-Gronomist, seorang pakar agronomis berbasis AI yang menganalisa data pertanian secara mendalam.
Berdasarkan data lapangan lengkap (lahan, tanah, iklim, produktivitas, kesehatan lahan, populasi tanaman, dan riwayat HPG) yang diberikan, berikan rekomendasi teknis yang SPESIFIK, BERBASIS DATA, dan ACTIONABLE.
Harap kembalikan HANYA array JSON (tanpa format markdown, tanpa awalan/akhiran teks) dengan struktur:
[
  { "type": "warning" | "success" | "info", "title": "Judul Singkat", "desc": "Penjelasan teknis yang spesifik, sebutkan angka dari data jika relevan" }
]
Panduan type: "warning" = masalah kritis yang perlu segera ditangani, "success" = kondisi baik yang perlu dipertahankan, "info" = saran pengembangan.
Berikan 5-6 rekomendasi paling relevan berdasarkan semua data. Prioritaskan masalah HPG aktif dan kondisi tanah/iklim ekstrem jika ada. Jangan ada teks tambahan di luar JSON array.`;

function buildUserMessage(ctx: any): string {
  const d = ctx;
  const prod = ctx.produktivitas;
  const health = ctx.kesehatan_lahan;
  const soil = ctx.tanah;
  const climate = ctx.iklim;
  const penanaman: any[] = ctx.penanaman || [];
  const hpg: any[] = ctx.hpg || [];

  // --- Profil Lahan ---
  let msg = `=== DATA PROFIL LAHAN ===
Nama Lahan     : ${d.nama_demoplot}
Luas Lahan     : ${d.luas_demoplot ?? 'Tidak diketahui'} Ha
Sistem Budidaya: ${d.sistem_budidaya || 'Tidak disebutkan'}
Tanaman Utama  : ${d.tanaman_utama || 'Tidak disebutkan'}
`;

  // --- Produktivitas ---
  if (prod) {
    msg += `
=== DATA PRODUKTIVITAS (Kumulatif) ===
Total Panen Basah  : ${prod.total_panen_basah_kg ?? 0} Kg
Total Panen Kering : ${prod.total_panen_kering_kg ?? 0} Kg
Total Jam Kerja    : ${prod.total_jam_kerja ?? 0} jam
Efisiensi Kerja    : ${prod.kg_per_jam_kerja ?? 'N/A'} Kg/jam kerja
Total Pengeluaran  : Rp ${Number(prod.total_pengeluaran ?? 0).toLocaleString('id-ID')}
Biaya per Kg Panen : Rp ${Number(prod.biaya_per_kg ?? 0).toLocaleString('id-ID')}/Kg
Biaya Input Total  : Rp ${Number(prod.total_biaya_input ?? 0).toLocaleString('id-ID')}
Biaya Tenaga Kerja : Rp ${Number(prod.total_biaya_tk ?? 0).toLocaleString('id-ID')}
Periode Data       : ${prod.tanggal_mulai ?? '-'} s/d ${prod.tanggal_terakhir ?? '-'}
`;
  } else {
    msg += `\n=== DATA PRODUKTIVITAS ===\nBelum ada data produktivitas.\n`;
  }

  // --- Kesehatan Lahan (NDVI/NDWI) ---
  if (health) {
    msg += `
=== DATA KESEHATAN LAHAN SATELIT (Periode: ${health.periode_analisis ?? '-'}) ===
Skor Kesehatan : ${health.skor_kesehatan ?? 'N/A'} / 100
Indeks NDVI    : ${health.avg_ndvi ?? 'N/A'} (ideal kopi: 0.4–0.8)
Indeks NDWI    : ${health.avg_ndwi ?? 'N/A'} (kelembapan vegetasi)
Area Sehat     : ${health.pct_sehat ?? 0}%
Area Normal    : ${health.pct_normal ?? 0}%
Area Stres     : ${health.pct_stres ?? 0}%
Area Terbuka   : ${health.pct_terbuka ?? 0}%
`;
  } else {
    msg += `\n=== DATA KESEHATAN LAHAN ===\nBelum ada data NDVI/NDWI.\n`;
  }

  // --- Data Tanah (SoilGrids) ---
  if (soil && soil.status_fetch === 'success') {
    msg += `
=== DATA TANAH (SoilGrids API, rata-rata 0-30cm) ===
pH Tanah       : ${soil.ph_rata_rata ?? 'N/A'} (ideal kopi: 5.5–6.5)
C-Organik      : ${soil.c_organik_rata_rata ?? 'N/A'} g/kg (ideal: >20 g/kg)
Nitrogen Total : ${soil.nitrogen_rata_rata ?? 'N/A'} g/kg
KTK (CEC)      : ${soil.ktk_rata_rata ?? 'N/A'} cmol/kg (ideal: >16)
Tekstur Tanah  : ${soil.tekstur_tanah ?? 'N/A'}
% Liat         : ${soil.liat_rata_rata ?? 'N/A'}%
% Pasir        : ${soil.pasir_rata_rata ?? 'N/A'}%
% Debu         : ${soil.debu_rata_rata ?? 'N/A'}%
`;
  } else {
    msg += `\n=== DATA TANAH ===\nBelum ada data tanah dari SoilGrids.\n`;
  }

  // --- Data Iklim ---
  if (climate && climate.status_fetch === 'success') {
    const namaBulan = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
    const bTerbasah = climate.bulan_terbasah ? namaBulan[climate.bulan_terbasah - 1] : 'N/A';
    const bTerkering = climate.bulan_terkering ? namaBulan[climate.bulan_terkering - 1] : 'N/A';
    msg += `
=== DATA IKLIM (Rata-rata 12 Bulan Terakhir) ===
Suhu Rata-rata   : ${climate.suhu_tahunan ?? 'N/A'}°C (maks: ${climate.suhu_maks_tahunan ?? 'N/A'}°C, min: ${climate.suhu_min_tahunan ?? 'N/A'}°C)
Curah Hujan      : ${climate.curah_hujan_tahunan ?? 'N/A'} mm/tahun
Kelembapan       : ${climate.kelembapan_tahunan ?? 'N/A'}%
ET0 (Evapotranspirasi): ${climate.et0_tahunan ?? 'N/A'} mm/tahun
Radiasi Matahari : ${climate.radiasi_tahunan ?? 'N/A'} MJ/m²
Bulan Terbasah   : ${bTerbasah} | Bulan Terkering: ${bTerkering}
`;
  } else {
    msg += `\n=== DATA IKLIM ===\nBelum ada data iklim.\n`;
  }

  // --- Monitoring Penanaman ---
  if (penanaman.length > 0) {
    const sehat = penanaman.filter(p => p.kondisi_pertumbuhan === 'sehat').length;
    const tidakSehat = penanaman.filter(p => p.kondisi_pertumbuhan === 'tidak sehat').length;
    const mati = penanaman.filter(p => p.kondisi_pertumbuhan === 'mati').length;
    const totalTanaman = penanaman.length;
    const avgTinggi = penanaman.reduce((s, p) => s + (p.tinggi || 0), 0) / totalTanaman;
    const avgDbh = penanaman.filter(p => p.dbh).reduce((s, p) => s + (p.dbh || 0), 0) / (penanaman.filter(p => p.dbh).length || 1);

    // Species breakdown
    const speciesCount: Record<string, number> = {};
    penanaman.forEach(p => {
      if (p.jenis_tanaman) speciesCount[p.jenis_tanaman] = (speciesCount[p.jenis_tanaman] || 0) + 1;
    });
    const speciesList = Object.entries(speciesCount).map(([k, v]) => `${k} (${v})`).join(', ');

    msg += `
=== DATA MONITORING POPULASI TANAMAN (${totalTanaman} sampel terbaru) ===
Kondisi Sehat      : ${sehat} tanaman (${Math.round(sehat/totalTanaman*100)}%)
Kondisi Tidak Sehat: ${tidakSehat} tanaman (${Math.round(tidakSehat/totalTanaman*100)}%)
Kondisi Mati       : ${mati} tanaman (${Math.round(mati/totalTanaman*100)}%)
Rata-rata Tinggi   : ${avgTinggi.toFixed(1)} cm
Rata-rata DBH      : ${avgDbh.toFixed(1)} cm
Jenis Tanaman      : ${speciesList || 'Tidak tersedia'}
`;
  } else {
    msg += `\n=== DATA MONITORING PENANAMAN ===\nBelum ada data monitoring penanaman.\n`;
  }

  // --- Monitoring HPG ---
  if (hpg.length > 0) {
    const hama = hpg.filter(h => h.kategori_gangguan === 'hama');
    const penyakit = hpg.filter(h => h.kategori_gangguan === 'penyakit');
    const gulma = hpg.filter(h => h.kategori_gangguan === 'gulma');

    msg += `
=== DATA MONITORING HAMA, PENYAKIT & GULMA (${hpg.length} kejadian terbaru) ===
Kejadian Hama    : ${hama.length} kasus${hama.length > 0 ? ` — ${hama.map(h => `${h.nama_jenis ?? 'tidak diketahui'} (serangan: ${h.tingkat_serangan ?? 'N/A'}, bagian: ${h.bagian_terserang ?? 'N/A'})`).join('; ')}` : ''}
Kejadian Penyakit: ${penyakit.length} kasus${penyakit.length > 0 ? ` — ${penyakit.map(p => `${p.nama_jenis ?? 'tidak diketahui'} (serangan: ${p.tingkat_serangan ?? 'N/A'})`).join('; ')}` : ''}
Kejadian Gulma   : ${gulma.length} kasus
`;
  } else {
    msg += `\n=== DATA HPG ===\nBelum ada data monitoring hama/penyakit/gulma.\n`;
  }

  msg += `\nAnalisa semua data di atas secara holistik dan berikan rekomendasi teknis yang SPESIFIK, PRIORITAS TERTINGGI DAHULU. Sebutkan angka dari data jika relevan. Kembalikan dalam format JSON array yang valid.`;
  return msg;
}


export const POST: RequestHandler = async ({ request }) => {
  try {
    const { contextData } = await request.json();

    if (!contextData) {
      return json({ error: 'Data konteks tidak valid.' }, { status: 400 });
    }

    const userMessage = buildUserMessage(contextData);
    const messages = [{ role: 'user', content: userMessage }];


    // Fallback to Gemini using multiple REST configurations
    const geminiKey = env.GEMINI_API_KEY || env.VITE_GEMINI_API_KEY || env.GOOGLE_GEMINI_API_KEY || env.GOOGLE_API_KEY;
    
    if (!geminiKey && !env.OPENROUTER_API_KEY) {
      return json({ error: 'Kunci API Gemini / OpenRouter tidak ditemukan. Harap konfigurasi API key di .env Anda.' }, { status: 500 });
    }

    let lastError = '';
    
    if (geminiKey) {
      const configs = [
        {
          url: `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
          sys: true
        },
        {
          url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
          sys: true
        }
      ];

      for (const config of configs) {
        try {
          const body: any = {};
          if (config.sys) {
            body.contents = messages.map((msg: any) => ({
              role: msg.role === 'assistant' ? 'model' : 'user',
              parts: [{ text: msg.content }],
            }));
            body.systemInstruction = {
              parts: [{ text: SYSTEM_PROMPT }]
            };
            // Force JSON output on Gemini 2.5
            body.generationConfig = {
              responseMimeType: "application/json"
            };
          }

          const geminiResponse = await fetch(config.url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
          });

          if (!geminiResponse.ok) {
            const errData = await geminiResponse.json().catch(() => ({}));
            const errMsg = errData?.error?.message || `HTTP ${geminiResponse.status}`;
            throw new Error(errMsg);
          }

          const geminiData = await geminiResponse.json();
          let geminiContent = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

          if (geminiContent) {
            // Strip markdown formatting if somehow it exists despite the MIME type constraint
            geminiContent = geminiContent.replace(/```json/g, '').replace(/```/g, '').trim();
            try {
              const parsed = JSON.parse(geminiContent);
              return json({ recommendations: parsed });
            } catch(e) {
               console.warn("Gagal memparsing JSON dari Gemini", geminiContent);
               throw new Error("Invalid JSON output from Gemini");
            }
          }
        } catch (err: any) {
          lastError = err?.message || String(err);
          console.warn(`Gemini configuration failed (${config.url}):`, lastError);
        }
      }
    }

    // If Gemini fails or missing, try OpenRouter fallback system
    if (env.OPENROUTER_API_KEY) {
      console.warn(`Gemini failed. Initiating OpenRouter fallback...`);
      const openrouterModels = [
        "google/gemini-2.5-flash:free",
        "deepseek/deepseek-chat:free",
        "meta-llama/llama-3-8b-instruct:free"
      ];
      
      for (const model of openrouterModels) {
        try {
          const openrouterResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${env.OPENROUTER_API_KEY}`,
              "Content-Type": "application/json",
              "HTTP-Referer": "https://agrodemoplot.id",
              "X-Title": "Agrodemoplot AI-Gronomis"
            },
            body: JSON.stringify({
              model: model,
              messages: [
                { role: "system", content: SYSTEM_PROMPT },
                ...messages.map((msg: any) => ({
                  role: msg.role === 'assistant' ? 'assistant' : 'user',
                  content: msg.content
                }))
              ],
              response_format: { type: "json_object" }
            })
          });

          if (!openrouterResponse.ok) {
            const errData = await openrouterResponse.json().catch(() => ({}));
            const errMsg = errData?.error?.message || `HTTP ${openrouterResponse.status}`;
            throw new Error(errMsg);
          }

          const openrouterData = await openrouterResponse.json();
          let openrouterContent = openrouterData?.choices?.[0]?.message?.content ?? '';
          if (openrouterContent) {
            openrouterContent = openrouterContent.replace(/```json/g, '').replace(/```/g, '').trim();
            try {
               const parsed = JSON.parse(openrouterContent);
               console.log(`OpenRouter fallback succeeded using model: ${model}`);
               return json({ recommendations: Array.isArray(parsed) ? parsed : (parsed.recommendations || parsed) });
            } catch(e) {
               console.warn(`Gagal memparsing JSON dari OpenRouter (${model})`, openrouterContent);
               throw new Error(`Invalid JSON output from OpenRouter ${model}`);
            }
          }
        } catch (err: any) {
          lastError = err?.message || String(err);
          console.warn(`OpenRouter fallback model ${model} failed:`, lastError);
        }
      }
    }

    throw new Error(`Semua sistem AI gagal memproses data. Error: ${lastError}`);
  } catch (error: any) {
    const message = error?.message ?? String(error);
    console.error('Error in AI recommendation API:', message);
    return json({ error: message }, { status: 500 });
  }
};
