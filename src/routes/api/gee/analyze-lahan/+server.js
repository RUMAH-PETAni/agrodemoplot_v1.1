import { json } from '@sveltejs/kit';
import { initializeGee } from '$lib/server/gee';
import ee from '@google/earthengine';

// Tidak lagi menggunakan Supabase Admin di sisi server sesuai permintaan.
// Data akan dikembalikan ke client, dan disave dari frontend.

export async function POST({ request }) {
    try {
        const { demoplot_id, polygon, periode } = await request.json();

        if (!demoplot_id || !polygon) {
            return json({ error: 'demoplot_id and polygon are required' }, { status: 400 });
        }

        // 1. Inisialisasi GEE
        await initializeGee();

        // 2. Tentukan rentang waktu (3 bulan terakhir untuk memastikan ketersediaan citra bebas awan)
        const targetDate = periode ? new Date(periode) : new Date();
        const endDate = targetDate;
        const startDate = new Date(targetDate.getTime());
        startDate.setMonth(startDate.getMonth() - 3); // Mundur 3 bulan

        const startStr = startDate.toISOString().split('T')[0];
        const endStr = endDate.toISOString().split('T')[0];

        // 3. Konversi polygon ke format GEE Geometry
        // Asumsi polygon formatnya GeoJSON dari Supabase
        let eePolygon;
        try {
            // Polygon biasanya berbentuk { type: 'Polygon', coordinates: [...] }
            eePolygon = ee.Geometry.Polygon(polygon.coordinates);
        } catch (err) {
            return json({ error: 'Format polygon tidak valid untuk GEE' }, { status: 400 });
        }

        // 4. Akses koleksi citra Sentinel-2 (Level-2A / Surface Reflectance)
        const collection = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
            .filterBounds(eePolygon)
            .filterDate(startStr, endStr)
            .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 60)); // Filter awan diperlonggar < 60%

        // Cek apakah koleksi kosong
        const imageCount = await new Promise((resolve, reject) => {
            collection.size().evaluate((count, err) => {
                if (err) reject(err);
                else resolve(count);
            });
        });

        if (imageCount === 0) {
            return json({ error: 'Tidak ada citra satelit yang memadai untuk area ini dalam 3 bulan terakhir (terhalang awan).' }, { status: 404 });
        }

        // Ambil citra median (untuk mengurangi noise awan)
        const medianImage = collection.median().clip(eePolygon);

        // --- MENGHITUNG INDEKS NDVI ---
        // NDVI = (NIR - RED) / (NIR + RED) -> Sentinel-2: (B8 - B4) / (B8 + B4)
        const ndvi = medianImage.normalizedDifference(['B8', 'B4']).rename('NDVI');
        
        // --- MENGHITUNG INDEKS NDWI ---
        // NDWI = (GREEN - NIR) / (GREEN + NIR) -> Sentinel-2: (B3 - B8) / (B3 + B8)
        const ndwi = medianImage.normalizedDifference(['B3', 'B8']).rename('NDWI');

        // Menghitung rata-rata NDVI & NDWI untuk keseluruhan polygon
        const combined = ndvi.addBands(ndwi);
        
        // Evaluasi asinkron untuk mengambil data dari GEE ke server Node.js
        const stats = await new Promise((resolve, reject) => {
            combined.reduceRegion({
                reducer: ee.Reducer.mean(),
                geometry: eePolygon,
                scale: 10,
                maxPixels: 1e9
            }).evaluate((result, err) => {
                if (err) reject(err);
                else resolve(result);
            });
        });

        // 5. Membuat URL Map ID untuk overlay (Heatmap NDVI)
        const visParams = {
            min: 0.0,
            max: 0.8,
            palette: ['FFFFFF', 'CE7E45', 'DF923D', 'F1B555', 'FCD163', '99B718', '74A901', '66A000', '529400', '3E8601', '207401', '056201', '004C00', '023B01', '012E01', '011D01', '011301']
        };

        const mapId = await new Promise((resolve, reject) => {
            ndvi.getMap(visParams, (mapInfo, err) => {
                if (err) reject(err);
                else resolve(mapInfo);
            });
        });

        // Strukturkan hasil akhir
        // Note: Ini contoh perhitungan sederhana. Untuk distribusi persentase (sehat/stres), 
        // akan butuh Reducer histogram atau kalkulasi thresholding di GEE.
        const avgNdvi = stats.NDVI || 0;
        const avgNdwi = stats.NDWI || 0;
        
        // Hitung skor sederhana (0-100) berdasarkan NDVI
        let skorKesehatan = Math.max(0, Math.min(100, Math.round(avgNdvi * 100 * 1.25)));

        const hasilAnalisis = {
            demoplot_id,
            periode_analisis: startStr,
            skor_kesehatan: skorKesehatan,
            avg_ndvi: avgNdvi.toFixed(3),
            avg_ndwi: avgNdwi.toFixed(3),
            raster_overlay_url: mapId.urlFormat, // URL raster tile
            sumber_citra: 'Sentinel-2'
        };

        // Penyimpanan dihapus dari sisi server.
        // Frontend yang akan bertanggung jawab untuk menyimpan data ini ke Supabase
        // dengan identitas user aktifnya (harus ber-role 'administrator').
        
        return json({
            success: true,
            data: hasilAnalisis
        });

    } catch (error) {
        console.error('GEE Processing Error:', error);
        return json({ error: error.message || 'Terjadi kesalahan saat memproses data Earth Engine' }, { status: 500 });
    }
}
