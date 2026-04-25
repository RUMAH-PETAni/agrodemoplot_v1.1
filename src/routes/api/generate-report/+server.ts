import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createClient } from '@supabase/supabase-js';
import { VITE_SUPABASE_URL as supabaseUrl, VITE_SUPABASE_ANON_KEY as supabaseAnonKey } from '$env/static/private';
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

    // ── TEMPLATE ROUTING ────────────────────────────────────────

    if (template === 'Ringkasan Eksekutif') {
      await addFarmerSection('A');
      await addDemoplotSection('B');
      await addSoilClimateSection('C');
      await addVegetationSection('D');
      await addHpgSection('E');
      await addActivitySection('F');
      await addProductivitySection('G');
    } else if (template === 'Profil & Demoplot') {
      await addFarmerSection('1');
      await addDemoplotSection('2');
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
    doc.moveDown(3);
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
