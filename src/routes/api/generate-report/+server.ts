import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createClient } from '@supabase/supabase-js';
import { env } from '$env/dynamic/private';
import PDFDocument from 'pdfkit-table';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const payload = await request.json();
    const { template, startDate, endDate, demoplotIds }: { 
      template: string, 
      startDate: string, 
      endDate: string, 
      demoplotIds: string[] 
    } = payload;

    console.log('--- GENERATING REPORT (PDFKIT):', template, '---');

    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.split(' ')[1];

    if (!token) return json({ message: 'Unauthorized' }, { status: 401 });

    const supabaseUrl = env.VITE_SUPABASE_URL || '';
    const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY || '';

    const userSupabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } }
    });

    const { data: { user }, error: authError } = await userSupabase.auth.getUser();
    if (authError || !user) return json({ message: 'Invalid Session' }, { status: 401 });
    const userId = user.id;

    // ── DATA FETCHING ───────────────────────────────────────────
    
    // 1. Fetch Demoplot & Petani Data
    const { data: demoplotData, error: dError } = await userSupabase
      .from('demoplot')
      .select('*, petani(*)')
      .in('id', demoplotIds);
    if (dError) throw dError;

    // 2. Fetch Soil Summary
    const { data: soilData } = await userSupabase
      .from('soil_data_summary')
      .select('*')
      .in('demoplot_id', demoplotIds);

    // 3. Fetch Climate Summary
    const { data: climateData } = await userSupabase
      .from('climate_data_summary')
      .select('*')
      .in('demoplot_id', demoplotIds);

    // 4. Fetch Plant Monitoring
    const { data: vegData } = await userSupabase
      .from('monitoring_penanaman')
      .select('*')
      .in('demoplot_id', demoplotIds)
      .gte('tanggal_monitoring', startDate)
      .lte('tanggal_monitoring', endDate)
      .order('tanggal_monitoring', { ascending: false });

    // 5. Fetch HPG Monitoring
    const { data: hpgData } = await userSupabase
      .from('monitoring_hpg')
      .select('*')
      .in('demoplot_id', demoplotIds)
      .gte('tanggal_monitoring', startDate)
      .lte('tanggal_monitoring', endDate)
      .order('tanggal_monitoring', { ascending: false });

    // 6. Fetch General Activity Logs
    const { data: activityData } = await userSupabase
      .from('log_aktifitas')
      .select('*')
      .in('demoplot_id', demoplotIds)
      .gte('tanggal', startDate)
      .lte('tanggal', endDate)
      .order('tanggal', { ascending: false });

    // 7. Fetch Productivity
    const { data: prodData } = await userSupabase
      .from('produktivitas')
      .select('*')
      .in('demoplot_id', demoplotIds)
      .gte('tanggal_pencatatan', startDate)
      .lte('tanggal_pencatatan', endDate);

    // ── PDF GENERATION ──────────────────────────────────────────

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    let chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));

    const pdfBufferPromise = new Promise<Buffer>((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
    });

    // Styles & Helpers
    const colors = {
      primary: '#059669',
      secondary: '#4b5563',
      text: '#1f2937',
      light: '#f9fafb',
      muted: '#6b7280'
    };

    // Header
    doc.fillColor(colors.primary).fontSize(24).text(`LAPORAN: ${template.toUpperCase()}`, { bold: true } as any);
    doc.fillColor(colors.secondary).fontSize(12).text(`Periode: ${startDate} s/d ${endDate}`, { oblique: true } as any);
    doc.moveDown(0.5);
    doc.strokeColor(colors.primary).lineWidth(1).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(1.5);

    const tableOptions = {
      prepareHeader: () => doc.font('Helvetica-Bold').fontSize(10).fillColor(colors.text),
      prepareRow: (row: any, index: any) => doc.font('Helvetica').fontSize(10).fillColor(colors.text),
      padding: 5,
      divider: {
        header: { disabled: false, width: 0.5, opacity: 0.5 },
        horizontal: { disabled: false, width: 0.5, opacity: 0.3 }
      }
    };

    // ── SECTION BUILDERS ────────────────────────────────────────

    const addSectionTitle = (title: string) => {
      doc.moveDown(1.5);
      doc.fillColor('#111827').fontSize(14).text(title, { bold: true } as any);
      doc.moveDown(0.5);
    };

    const addFarmerSection = async (letter: string) => {
      addSectionTitle(`${letter}. PROFIL PETANI`);
      const table = {
        headers: ['Nama Lengkap', 'NIK', 'Alamat / Desa'],
        rows: demoplotData.map(d => [
          d.petani?.nama_lengkap || '-',
          d.petani?.nik || '-',
          d.petani?.alamat || '-'
        ])
      };
      await doc.table(table, { ...tableOptions } as any);
    };

    const addDemoplotSection = async (letter: string) => {
      addSectionTitle(`${letter}. INFORMASI TEKNIS DEMOPLOT`);
      const table = {
        headers: ['Nama Demoplot', 'Komoditas', 'Luas (Ha)', 'Lokasi'],
        rows: demoplotData.map(d => [
          d.nama_demoplot,
          d.komoditas || 'Kopi',
          d.luas_lahan?.toString() || '-',
          d.lokasi || '-'
        ])
      };
      await doc.table(table, { ...tableOptions } as any);
    };

    const addSoilClimateSection = async (letter: string) => {
      addSectionTitle(`${letter}. ANALISIS TANAH & IKLIM`);
      const table = {
        headers: ['Demoplot', 'pH Tanah', 'Tekstur', 'Suhu Rerata', 'Curah Hujan'],
        rows: demoplotIds.map((id: string) => {
          const soil = soilData?.find(s => s.demoplot_id === id);
          const climate = climateData?.find(c => c.demoplot_id === id);
          const name = demoplotData.find(d => d.id === id)?.nama_demoplot || 'Demoplot';
          return [
            name,
            `${soil?.ph_rata_rata || '---'} pH`,
            soil?.tekstur_tanah || '---',
            `${climate?.suhu_tahunan || '---'} °C`,
            `${climate?.curah_hujan_tahunan || '---'} mm`
          ];
        })
      };
      await doc.table(table, { ...tableOptions } as any);
    };

    const addVegetationSection = async (letter: string) => {
      addSectionTitle(`${letter}. MONITORING TANAMAN`);
      if (!vegData?.length) {
        doc.fillColor(colors.muted).fontSize(10).text('(Tidak ada data)', { oblique: true } as any);
        return;
      }
      const table = {
        headers: ['Tanggal', 'Kode', 'Tinggi (cm)', 'Kondisi', 'Lokasi'],
        rows: vegData.map(v => {
          const name = demoplotData.find(d => d.id === v.demoplot_id)?.nama_demoplot || '-';
          return [
            new Date(v.tanggal_monitoring).toLocaleDateString('id-ID'),
            v.kode_tanaman || '-',
            v.tinggi?.toString() || '-',
            v.kondisi_pertumbuhan?.toUpperCase() || '-',
            name
          ];
        })
      };
      await doc.table(table, { ...tableOptions } as any);
    };

    const addHpgSection = async (letter: string) => {
      addSectionTitle(`${letter}. MONITORING HAMA & PENYAKIT (HPG)`);
      if (!hpgData?.length) {
        doc.fillColor(colors.muted).fontSize(10).text('(Tidak ada data)', { oblique: true } as any);
        return;
      }
      const table = {
        headers: ['Tanggal', 'Jenis Gangguan', 'Kategori', 'Tingkat', 'Lokasi'],
        rows: hpgData.map(h => {
          const name = demoplotData.find(d => d.id === h.demoplot_id)?.nama_demoplot || '-';
          return [
            new Date(h.tanggal_monitoring).toLocaleDateString('id-ID'),
            h.nama_jenis || '-',
            h.kategori_gangguan?.toUpperCase() || '-',
            h.tingkat_serangan || '-',
            name
          ];
        })
      };
      await doc.table(table, { ...tableOptions } as any);
    };

    const addActivitySection = async (letter: string) => {
      addSectionTitle(`${letter}. LOG AKTIVITAS OPERASIONAL`);
      if (!activityData?.length) {
        doc.fillColor(colors.muted).fontSize(10).text('(Tidak ada data)', { oblique: true } as any);
        return;
      }
      const table = {
        headers: ['Tanggal', 'Kategori', 'Deskripsi / Output', 'Lokasi'],
        rows: activityData.map(a => {
          const name = demoplotData.find(d => d.id === a.demoplot_id)?.nama_demoplot || '-';
          return [
            new Date(a.tanggal).toLocaleDateString('id-ID'),
            a.kategori?.toUpperCase() || '-',
            a.deskripsi || a.output || '-',
            name
          ];
        })
      };
      await doc.table(table, { ...tableOptions } as any);
    };

    const addProductivitySection = async (letter: string) => {
      addSectionTitle(`${letter}. PRODUKTIVITAS & BIAYA`);
      if (!prodData?.length) {
        doc.fillColor(colors.muted).fontSize(10).text('(Tidak ada data)', { oblique: true } as any);
        return;
      }
      const table = {
        headers: ['Demoplot', 'Total Biaya', 'Total Panen', 'HPP / Kg'],
        rows: demoplotIds.map((id: string) => {
          const rows = prodData.filter(r => r.demoplot_id === id);
          if (!rows.length) return null;
          const name = demoplotData.find(d => d.id === id)?.nama_demoplot || 'Unknown';
          const totalCost = rows.reduce((acc, r) => acc + (Number(r.biaya_total) || 0) + (Number(r.biaya_tenaga_kerja) || 0), 0);
          const totalYield = rows.reduce((acc, r) => acc + (Number(r.berat_basah_kg) || 0), 0);
          return [
            name,
            `Rp ${totalCost.toLocaleString('id-ID')}`,
            `${totalYield.toLocaleString('id-ID')} Kg`,
            `Rp ${(totalCost / (totalYield || 1)).toLocaleString('id-ID', { maximumFractionDigits: 0 })}`
          ];
        }).filter(Boolean) as string[][]
      };
      await doc.table(table, { ...tableOptions } as any);
    };

    const toMercator = (lng: number, lat: number) => {
      const r = 6378137;
      const x = lng * Math.PI / 180 * r;
      const y = Math.log(Math.tan((90 + lat) * Math.PI / 360)) * r;
      return [x, y];
    };

    const invMercator = (x: number, y: number) => {
      const r = 6378137;
      const lng = x / r * 180 / Math.PI;
      const lat = (2 * Math.atan(Math.exp(y / r)) - Math.PI / 2) * 180 / Math.PI;
      return [lng, lat];
    };

    const addMapSection = async (letter: string) => {
      addSectionTitle(`${letter}. LOKASI & PEMETAAN`);
      for (const d of demoplotData) {
        try {
          let hasPolygon = false;
          let coords: [number, number][] = [];
          let droneUrl = d.foto_udara;
          let isTile = droneUrl?.includes('{z}');

          if (d.polygon) {
            try {
              const geojson = typeof d.polygon === 'string' ? JSON.parse(d.polygon) : d.polygon;
              let rawCoords = geojson.type === 'FeatureCollection' ? geojson.features[0]?.geometry?.coordinates[0] : 
                              (geojson.type === 'Feature' ? geojson.geometry?.coordinates[0] : geojson.coordinates?.[0]);
              if (rawCoords?.length > 2) {
                coords = rawCoords.map((c: any) => [c[0], c[1]]);
                hasPolygon = true;
              }
            } catch (e) { }
          }

          let mXmin, mYmin, mXmax, mYmax;
          let dXmin: number, dXmax: number, dYmin: number, dYmax: number;

          if (isTile && d.latitude && d.longitude) {
            const z = 19; const n = Math.pow(2, z);
            const tx = Math.floor((d.longitude + 180) / 360 * n);
            const ty = Math.floor((1 - Math.log(Math.tan(d.latitude * Math.PI / 180) + 1 / Math.cos(d.latitude * Math.PI / 180)) / Math.PI) / 2 * n);
            droneUrl = droneUrl!.replace('{z}', z.toString()).replace('{x}', tx.toString()).replace('{y}', ty.toString());
            const [x0, y0] = toMercator(tx/n*360-180, Math.atan(Math.sinh(Math.PI*(1-2*(ty+1)/n)))*180/Math.PI);
            const [x1, y1] = toMercator((tx+1)/n*360-180, Math.atan(Math.sinh(Math.PI*(1-2*ty/n)))*180/Math.PI);
            mXmin = x0; mXmax = x1; mYmin = y0; mYmax = y1;
            dXmin = x0; dXmax = x1; dYmin = y0; dYmax = y1;
          } else if (hasPolygon) {
            const mCoords = coords.map(c => toMercator(c[0], c[1]));
            mXmin = Math.min(...mCoords.map(c => c[0])); mXmax = Math.max(...mCoords.map(c => c[0]));
            mYmin = Math.min(...mCoords.map(c => c[1])); mYmax = Math.max(...mCoords.map(c => c[1]));
            dXmin = mXmin; dXmax = mXmax; dYmin = mYmin; dYmax = mYmax;
          } else if (d.latitude && d.longitude) {
            const [cx, cy] = toMercator(d.longitude, d.latitude);
            mXmin = cx - 100; mXmax = cx + 100; mYmin = cy - 100; mYmax = cy + 100;
            dXmin = mXmin; dXmax = mXmax; dYmin = mYmin; dYmax = mYmax;
          } else {
            doc.fillColor(colors.muted).fontSize(10).text(`(Peta tidak tersedia: Koordinat belum diatur)`, { oblique: true } as any);
            doc.moveDown(2);
            continue;
          }

          // Fine-tune for even tighter zoom (20% padding)
          const minSpread = 180; 
          if (mXmax - mXmin < minSpread) { const d = (minSpread - (mXmax - mXmin)) / 2; mXmin -= d; mXmax += d; }
          if (mYmax - mYmin < minSpread) { const d = (minSpread - (mYmax - mYmin)) / 2; mYmin -= d; mYmax += d; }
          
          const pad = (mXmax - mXmin) * 0.20; 
          mXmin -= pad; mXmax += pad; mYmin -= pad; mYmax += pad;

          const targetRatio = 800 / 400;
          let mW = mXmax - mXmin; let mH = mYmax - mYmin;
          if (mW / mH > targetRatio) { const th = mW / targetRatio; mYmin -= (th - mH) / 2; mYmax += (th - mH) / 2; }
          else { const tw = mH * targetRatio; mXmin -= (tw - mW) / 2; mXmax += (tw - mW) / 2; }

          const [lonMin, latMin] = invMercator(mXmin, mYmin);
          const [lonMax, latMax] = invMercator(mXmax, mYmax);

          const [dLonMin, dLatMin] = invMercator(dXmin!, dYmin!);
          const [dLonMax, dLatMax] = invMercator(dXmax!, dYmax!);

          let esriBuffer: Buffer | null = null;
          let finalProvider = 'Esri World Imagery';
          const eps = [`https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export`, `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export` ];

          for (const ep of eps) {
            try {
              const url = `${ep}?bbox=${mXmin},${mYmin},${mXmax},${mYmax}&bboxSR=3857&imageSR=3857&size=800,400&f=image&format=jpg`;
              const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
              if (res.ok) { esriBuffer = Buffer.from(await res.arrayBuffer()); if (esriBuffer.length > 1000) break; }
            } catch (e) { }
          }

          // Add safety margin before map
          if (!esriBuffer) {
            try {
              // Pre-calculate CartoDB range
              const z = 17; const n = Math.pow(2, z);
              const tx0 = Math.floor((lonMin + 180) / 360 * n);
              const tx1 = Math.floor((lonMax + 180) / 360 * n);
              const ty0 = Math.floor((1 - Math.log(Math.tan(latMax * Math.PI / 180) + 1 / Math.cos(latMax * Math.PI / 180)) / Math.PI) / 2 * n);
              const ty1 = Math.floor((1 - Math.log(Math.tan(latMin * Math.PI / 180) + 1 / Math.cos(latMin * Math.PI / 180)) / Math.PI) / 2 * n);
              
              // We'll draw OSM tiles later inside the final drawing block
              finalProvider = 'CartoDB Voyager (OSM)';
            } catch (e) { }
          }

          let droneTiles: { buf: Buffer, x0: number, y0: number, x1: number, y1: number }[] = [];
          let droneBuffer: Buffer | null = null;
          let droneProvider = '';

          if (droneUrl) {
            try {
              if (isTile) {
                let z = 19;
                const getTiles = (zz: number) => {
                  const n = Math.pow(2, zz);
                  const tx0 = Math.floor((dLonMin + 180) / 360 * n) - 1;
                  const tx1 = Math.floor((dLonMax + 180) / 360 * n) + 1;
                  const ty0 = Math.floor((1 - Math.log(Math.tan(dLatMax * Math.PI / 180) + 1 / Math.cos(dLatMax * Math.PI / 180)) / Math.PI) / 2 * n) - 1;
                  const ty1 = Math.floor((1 - Math.log(Math.tan(dLatMin * Math.PI / 180) + 1 / Math.cos(dLatMin * Math.PI / 180)) / Math.PI) / 2 * n) + 1;
                  return { tx0, tx1, ty0, ty1 };
                };
                let t = getTiles(z);
                if ((t.tx1 - t.tx0 + 1) * (t.ty1 - t.ty0 + 1) > 16) { z = 18; t = getTiles(z); }

                for (let tx = t.tx0; tx <= t.tx1; tx++) {
                  for (let ty = t.ty0; ty <= t.ty1; ty++) {
                    try {
                      const tUrl = d.foto_udara!.replace('{z}', z.toString()).replace('{x}', tx.toString()).replace('{y}', ty.toString());
                      const tRes = await fetch(tUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
                      if (tRes.ok) {
                        const tBuf = Buffer.from(await tRes.arrayBuffer());
                        const n = Math.pow(2, z);
                        const [x0, y0] = toMercator(tx / n * 360 - 180, Math.atan(Math.sinh(Math.PI * (1 - 2 * (ty + 1) / n))) * 180 / Math.PI);
                        const [x1, y1] = toMercator((tx + 1) / n * 360 - 180, Math.atan(Math.sinh(Math.PI * (1 - 2 * ty / n))) * 180 / Math.PI);
                        droneTiles.push({ buf: tBuf, x0, y0, x1, y1 });
                      }
                    } catch (e) {}
                  }
                }
                if (droneTiles.length > 0) droneProvider = ' + Foto Udara';
              } else {
                const dr = await fetch(droneUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
                if (dr.ok) {
                  droneBuffer = Buffer.from(await dr.arrayBuffer());
                  droneProvider = ' + Foto Udara';
                }
              }
            } catch (e) { }
          }

          if (esriBuffer || finalProvider.includes('CartoDB')) {
            // Write metadata BEFORE the map
            doc.fontSize(9).fillColor(colors.text).text(`Koordinat: ${d.latitude?.toFixed(6)}, ${d.longitude?.toFixed(6)} | Elevasi: ${d.altitude || '-'} m dpl`, { align: 'center' });
            doc.fontSize(8).fillColor(colors.muted).text(`Sumber: ${finalProvider}${droneProvider} | Plot: ${d.nama_demoplot}`, { align: 'center' });
            doc.moveDown(0.8);

            const startY = doc.y;
            const pdfW = 480; const pdfH = 240;
            const startX = (doc.page.width - pdfW) / 2;

            // 2. Draw Background
            if (esriBuffer && finalProvider !== 'CartoDB Voyager (OSM)') {
              doc.image(esriBuffer, startX, startY, { width: pdfW, height: pdfH });
            } else {
              // Draw CartoDB tiles
              const z = 17; const n = Math.pow(2, z);
              const tx0 = Math.floor((lonMin + 180) / 360 * n);
              const tx1 = Math.floor((lonMax + 180) / 360 * n);
              const ty0 = Math.floor((1 - Math.log(Math.tan(latMax * Math.PI / 180) + 1 / Math.cos(latMax * Math.PI / 180)) / Math.PI) / 2 * n);
              const ty1 = Math.floor((1 - Math.log(Math.tan(latMin * Math.PI / 180) + 1 / Math.cos(latMin * Math.PI / 180)) / Math.PI) / 2 * n);
              for (let tx = tx0; tx <= tx1; tx++) {
                for (let ty = ty0; ty <= ty1; ty++) {
                  try {
                    const osmUrl = `https://basemaps.cartocdn.com/rastertiles/voyager/${z}/${tx}/${ty}.png`;
                    const oRes = await fetch(osmUrl, { headers: { 'User-Agent': 'Agrodemoplot-Reporting-System/1.1' } });
                    if (oRes.ok) {
                      const oBuf = Buffer.from(await oRes.arrayBuffer());
                      const [x0, y0] = toMercator(tx / n * 360 - 180, Math.atan(Math.sinh(Math.PI * (1 - 2 * (ty + 1) / n))) * 180 / Math.PI);
                      const [x1, y1] = toMercator((tx + 1) / n * 360 - 180, Math.atan(Math.sinh(Math.PI * (1 - 2 * ty / n))) * 180 / Math.PI);
                      const ix = ((x0 - mXmin) / (mXmax - mXmin)) * pdfW;
                      const iy = (1 - (y1 - mYmin) / (mYmax - mYmin)) * pdfH;
                      const iw = ((x1 - x0) / (mXmax - mXmin)) * pdfW;
                      const ih = ((y1 - y0) / (mYmax - mYmin)) * pdfH;
                      doc.image(oBuf, startX + ix, startY + iy, { width: iw + 0.3, height: ih + 0.3 });
                    }
                  } catch (e) {}
                }
              }
            }

            // 3. Draw Drone Overlay
            if (droneTiles.length > 0 || droneBuffer) {
              doc.save().opacity(0.95).translate(startX, startY);
              if (droneTiles.length > 0) {
                for (const t of droneTiles) {
                  const ix = ((t.x0 - mXmin) / (mXmax - mXmin)) * pdfW;
                  const iy = (1 - (t.y1 - mYmin) / (mYmax - mYmin)) * pdfH;
                  const iw = ((t.x1 - t.x0) / (mXmax - mXmin)) * pdfW;
                  const ih = ((t.y1 - t.y0) / (mYmax - mYmin)) * pdfH;
                  doc.image(t.buf, ix, iy, { width: iw + 0.3, height: ih + 0.3 });
                }
              } else if (droneBuffer) {
                const ix = ((dXmin! - mXmin) / (mXmax - mXmin)) * pdfW;
                const iy = (1 - (dYmax! - mYmin) / (mYmax - mYmin)) * pdfH;
                const iw = ((dXmax! - dXmin!) / (mXmax - mXmin)) * pdfW;
                const ih = ((dYmax! - dYmin!) / (mYmax - mYmin)) * pdfH;
                doc.image(droneBuffer, ix, iy, { width: iw, height: ih });
              }
              doc.restore();
            }

            // 4. Draw Polygons/Markers
            if (hasPolygon) {
              doc.save().translate(startX, startY);
              doc.lineWidth(2).strokeColor('#10b981').fillColor('#10b981').opacity(0.4);
              coords.forEach((c, i) => {
                const [mx, my] = toMercator(c[0], c[1]);
                const px = ((mx - mXmin) / (mXmax - mXmin)) * pdfW;
                const py = (1 - (my - mYmin) / (mYmax - mYmin)) * pdfH;
                if (i === 0) doc.moveTo(px, py); else doc.lineTo(px, py);
              });
              doc.closePath().fillAndStroke();
              doc.restore();
            } else if (d.latitude && d.longitude) {
              doc.save().translate(startX, startY);
              const [mx, my] = toMercator(d.longitude, d.latitude);
              const px = ((mx - mXmin) / (mXmax - mXmin)) * pdfW;
              const py = (1 - (my - mYmin) / (mYmax - mYmin)) * pdfH;
              doc.circle(px, py, 6).fillColor('#ef4444').fill();
              doc.restore();
            }

            doc.y = startY + pdfH;
            doc.moveDown(2);
          } else {
            doc.fillColor('#ef4444').fontSize(10).text(`(Gagal memuat peta: Layanan satelit tidak merespon)`);
            doc.moveDown(2);
          }
        } catch (err) { console.error('Map error:', err); }
      }
    };

    // ── TEMPLATE ROUTING ────────────────────────────────────────

    if (template === 'Ringkasan Eksekutif') {
      await addFarmerSection('A');
      await addDemoplotSection('B');
      await addMapSection('C');
      await addSoilClimateSection('D');
      await addVegetationSection('E');
      await addHpgSection('F');
      await addActivitySection('G');
      await addProductivitySection('H');
    } else if (template === 'Profil & Demoplot') {
      await addFarmerSection('1');
      await addDemoplotSection('2');
      await addMapSection('3');
    } else if (template === 'Analisis Profitabilitas') {
      await addProductivitySection('1');
    } else if (template === 'Monitoring HPG') {
      await addHpgSection('1');
    } else if (template === 'Monitoring Tanaman') {
      await addVegetationSection('1');
    } else if (template === 'Analisis Tanah & Iklim') {
      await addSoilClimateSection('1');
    } else if (template === 'Log Aktivitas Umum') {
      await addActivitySection('1');
    }

    // Footer
    doc.moveDown(5);
    doc.fillColor(colors.muted).fontSize(10).text(
      `Laporan ini dibuat secara otomatis pada ${new Date().toLocaleString('id-ID')} WIB.\nDokumen ini merupakan arsip resmi Sistem Monitoring AgroDemoplot.`,
      { align: 'center' }
    );

    // Finalize
    doc.end();
    const pdfBuffer = await pdfBufferPromise;

    // ── UPLOAD ──────────────────────────────────────────────────

    const fileName = `${userId}/report-${Date.now()}.pdf`;
    console.log('Uploading PDF to storage:', fileName);
    const { data: uploadData, error: uploadError } = await userSupabase.storage
      .from('reports')
      .upload(fileName, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true
      });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = userSupabase.storage.from('reports').getPublicUrl(fileName);

    const { data: archiveData, error: archiveError } = await userSupabase
      .from('report_archives')
      .insert({
        user_id: userId,
        title: `${template} - ${new Date().toLocaleDateString('id-ID')}`,
        category: template.includes('HPG') ? 'Hama & Penyakit' :
          (template.includes('Tanah') || template.includes('Tanaman') ? 'Kesehatan Tanaman' :
            (template.includes('Aktivitas') ? 'Produktivitas' : 'Produktivitas')),
        format: 'PDF',
        file_url: publicUrl,
        file_size_bytes: pdfBuffer.length,
        status: 'Selesai'
      })
      .select()
      .single();

    if (archiveError) throw archiveError;

    return json({ success: true, report: archiveData });

  } catch (error: any) {
    console.error('--- REPORT CRASH (PDFKIT) ---', error);
    return json({ success: false, message: error.message }, { status: 500 });
  }
};
