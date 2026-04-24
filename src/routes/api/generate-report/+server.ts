import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createClient } from '@supabase/supabase-js';
import { VITE_SUPABASE_URL as supabaseUrl, VITE_SUPABASE_ANON_KEY as supabaseAnonKey } from '$env/static/private';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const PdfPrinter = require('pdfmake/js/printer').default;

// Font configuration
const fonts = {
  Roboto: {
    normal: 'Helvetica',
    bold: 'Helvetica-Bold',
    italics: 'Helvetica-Oblique',
    bolditalics: 'Helvetica-BoldOblique'
  }
};

const mockVirtualFs = {
  existsSync: () => false,
  readFileSync: () => { throw new Error('File not found'); }
};

const mockUrlResolver = {
  resolve: (url: string) => { console.log('Resolving URL:', url); },
  resolved: () => Promise.resolve()
};

const printer = new PdfPrinter(fonts, mockVirtualFs, mockUrlResolver);

export const POST: RequestHandler = async ({ request }) => {
  try {
    const payload = await request.json();
    const { template, startDate, endDate, demoplotIds } = payload;

    console.log('--- GENERATING REPORT:', template, '---');

    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.split(' ')[1];

    if (!token) return json({ message: 'Unauthorized' }, { status: 401 });

    const userSupabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } }
    });

    const { data: { user }, error: authError } = await userSupabase.auth.getUser();
    if (authError || !user) return json({ message: 'Invalid Session' }, { status: 401 });
    const userId = user.id;

    let docDefinition: any = {
      content: [
        { text: `LAPORAN: ${template.toUpperCase()}`, style: 'header' },
        { text: `Periode: ${startDate} s/d ${endDate}`, style: 'subheader' },
        { canvas: [{ type: 'line', x1: 0, y1: 5, x2: 515, y2: 5, lineWidth: 1, lineColor: '#059669' }] },
        { text: '\n' }
      ],
      styles: {
        header: { fontSize: 26, bold: true, color: '#059669', margin: [0, 0, 0, 8] },
        subheader: { fontSize: 13, italics: true, color: '#4b5563', margin: [0, 0, 0, 15] },
        sectionTitle: { fontSize: 16, bold: true, color: '#111827', margin: [0, 20, 0, 12] },
        tableHeader: { fontSize: 11, bold: true, fillColor: '#f9fafb', color: '#374151', margin: [0, 6, 0, 6] },
        tableCell: { fontSize: 11, color: '#1f2937', margin: [0, 5, 0, 5] },
        footer: { fontSize: 10, color: '#6b7280', alignment: 'center', margin: [0, 30, 0, 0] }
      },
      defaultStyle: { font: 'Roboto' }
    };

    // ── TEMPLATE LOGIC ─────────────�    // ── DATA FETCHING ───────────────────────────────────────────
    
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

    // ── SECTION BUILDERS ────────────────────────────────────────

    const addFarmerSection = (letter: string) => {
      docDefinition.content.push({ text: `${letter}. PROFIL PETANI`, style: 'sectionTitle' });
      const tableBody = [
        [{ text: 'Nama Lengkap', style: 'tableHeader' }, { text: 'NIK', style: 'tableHeader' }, { text: 'Alamat / Desa', style: 'tableHeader' }]
      ];
      demoplotData.forEach(d => {
        tableBody.push([
          { text: d.petani?.nama_lengkap || '-', style: 'tableCell' },
          { text: d.petani?.nik || '-', style: 'tableCell' },
          { text: d.petani?.alamat || '-', style: 'tableCell' }
        ]);
      });
      docDefinition.content.push({ table: { headerRows: 1, widths: ['*', 'auto', '*'], body: tableBody } });
    };

    const addDemoplotSection = (letter: string) => {
      docDefinition.content.push({ text: `${letter}. INFORMASI TEKNIS DEMOPLOT`, style: 'sectionTitle' });
      const tableBody = [
        [{ text: 'Nama Demoplot', style: 'tableHeader' }, { text: 'Komoditas', style: 'tableHeader' }, { text: 'Luas (Ha)', style: 'tableHeader' }, { text: 'Lokasi', style: 'tableHeader' }]
      ];
      demoplotData.forEach(d => {
        tableBody.push([
          { text: d.nama_demoplot, style: 'tableCell' },
          { text: d.komoditas || 'Kopi', style: 'tableCell' },
          { text: d.luas_lahan?.toString() || '-', style: 'tableCell' },
          { text: d.lokasi || '-', style: 'tableCell' }
        ]);
      });
      docDefinition.content.push({ table: { headerRows: 1, widths: ['*', 'auto', 'auto', '*'], body: tableBody } });
    };

    const addSoilClimateSection = (letter: string) => {
      docDefinition.content.push({ text: `${letter}. ANALISIS TANAH & IKLIM`, style: 'sectionTitle' });
      const tableBody = [
        [{ text: 'Demoplot', style: 'tableHeader' }, { text: 'pH Tanah', style: 'tableHeader' }, { text: 'Tekstur', style: 'tableHeader' }, { text: 'Suhu Rerata', style: 'tableHeader' }, { text: 'Curah Hujan', style: 'tableHeader' }]
      ];
      demoplotIds.forEach(id => {
        const soil = soilData?.find(s => s.demoplot_id === id);
        const climate = climateData?.find(c => c.demoplot_id === id);
        const name = demoplotData.find(d => d.id === id)?.nama_demoplot || 'Demoplot';
        tableBody.push([
          { text: name, style: 'tableCell' },
          { text: `${soil?.ph_rata_rata || '---'} pH`, style: 'tableCell' },
          { text: soil?.tekstur_tanah || '---', style: 'tableCell' },
          { text: `${climate?.suhu_tahunan || '---'} °C`, style: 'tableCell' },
          { text: `${climate?.curah_hujan_tahunan || '---'} mm`, style: 'tableCell' }
        ]);
      });
      docDefinition.content.push({ table: { headerRows: 1, widths: ['*', 'auto', 'auto', 'auto', 'auto'], body: tableBody } });
    };

    const addVegetationSection = (letter: string) => {
      docDefinition.content.push({ text: `${letter}. MONITORING TANAMAN`, style: 'sectionTitle' });
      if (!vegData?.length) { docDefinition.content.push({ text: '(Tidak ada data)', italics: true, color: '#999', fontSize: 10 }); return; }
      const tableBody = [
        [{ text: 'Tanggal', style: 'tableHeader' }, { text: 'Kode', style: 'tableHeader' }, { text: 'Tinggi (cm)', style: 'tableHeader' }, { text: 'Kondisi', style: 'tableHeader' }, { text: 'Lokasi', style: 'tableHeader' }]
      ];
      vegData.forEach(v => {
        const name = demoplotData.find(d => d.id === v.demoplot_id)?.nama_demoplot || '-';
        tableBody.push([
          { text: new Date(v.tanggal_monitoring).toLocaleDateString('id-ID'), style: 'tableCell' },
          { text: v.kode_tanaman || '-', style: 'tableCell' },
          { text: v.tinggi?.toString() || '-', style: 'tableCell' },
          { text: v.kondisi_pertumbuhan?.toUpperCase() || '-', style: 'tableCell' },
          { text: name, style: 'tableCell' }
        ]);
      });
      docDefinition.content.push({ table: { headerRows: 1, widths: ['auto', 'auto', 'auto', 'auto', '*'], body: tableBody } });
    };

    const addHpgSection = (letter: string) => {
      docDefinition.content.push({ text: `${letter}. MONITORING HAMA & PENYAKIT (HPG)`, style: 'sectionTitle' });
      if (!hpgData?.length) { docDefinition.content.push({ text: '(Tidak ada data)', italics: true, color: '#999', fontSize: 10 }); return; }
      const tableBody = [
        [{ text: 'Tanggal', style: 'tableHeader' }, { text: 'Jenis Gangguan', style: 'tableHeader' }, { text: 'Kategori', style: 'tableHeader' }, { text: 'Tingkat', style: 'tableHeader' }, { text: 'Lokasi', style: 'tableHeader' }]
      ];
      hpgData.forEach(h => {
        const name = demoplotData.find(d => d.id === h.demoplot_id)?.nama_demoplot || '-';
        tableBody.push([
          { text: new Date(h.tanggal_monitoring).toLocaleDateString('id-ID'), style: 'tableCell' },
          { text: h.nama_jenis || '-', style: 'tableCell' },
          { text: h.kategori_gangguan?.toUpperCase() || '-', style: 'tableCell' },
          { text: h.tingkat_serangan || '-', style: 'tableCell' },
          { text: name, style: 'tableCell' }
        ]);
      });
      docDefinition.content.push({ table: { headerRows: 1, widths: ['auto', '*', 'auto', 'auto', 'auto'], body: tableBody } });
    };

    const addActivitySection = (letter: string) => {
      docDefinition.content.push({ text: `${letter}. LOG AKTIVITAS OPERASIONAL`, style: 'sectionTitle' });
      if (!activityData?.length) { docDefinition.content.push({ text: '(Tidak ada data)', italics: true, color: '#999', fontSize: 10 }); return; }
      const tableBody = [
        [{ text: 'Tanggal', style: 'tableHeader' }, { text: 'Kategori', style: 'tableHeader' }, { text: 'Deskripsi / Output', style: 'tableHeader' }, { text: 'Lokasi', style: 'tableHeader' }]
      ];
      activityData.forEach(a => {
        const name = demoplotData.find(d => d.id === a.demoplot_id)?.nama_demoplot || '-';
        tableBody.push([
          { text: new Date(a.tanggal).toLocaleDateString('id-ID'), style: 'tableCell' },
          { text: a.kategori?.toUpperCase() || '-', style: 'tableCell' },
          { text: a.deskripsi || a.output || '-', style: 'tableCell' },
          { text: name, style: 'tableCell' }
        ]);
      });
      docDefinition.content.push({ table: { headerRows: 1, widths: ['auto', 'auto', '*', 'auto'], body: tableBody } });
    };

    const addProductivitySection = (letter: string) => {
      docDefinition.content.push({ text: `${letter}. PRODUKTIVITAS & BIAYA`, style: 'sectionTitle' });
      if (!prodData?.length) { docDefinition.content.push({ text: '(Tidak ada data)', italics: true, color: '#999', fontSize: 10 }); return; }
      const tableBody = [
        [{ text: 'Demoplot', style: 'tableHeader' }, { text: 'Total Biaya', style: 'tableHeader' }, { text: 'Total Panen', style: 'tableHeader' }, { text: 'HPP / Kg', style: 'tableHeader' }]
      ];
      demoplotIds.forEach(id => {
        const rows = prodData.filter(r => r.demoplot_id === id);
        if (!rows.length) return;
        const name = demoplotData.find(d => d.id === id)?.nama_demoplot || 'Unknown';
        const totalCost = rows.reduce((acc, r) => acc + (Number(r.biaya_total) || 0) + (Number(r.biaya_tenaga_kerja) || 0), 0);
        const totalYield = rows.reduce((acc, r) => acc + (Number(r.berat_basah_kg) || 0), 0);
        tableBody.push([
          { text: name, style: 'tableCell' },
          { text: `Rp ${totalCost.toLocaleString('id-ID')}`, style: 'tableCell' },
          { text: `${totalYield.toLocaleString('id-ID')} Kg`, style: 'tableCell' },
          { text: `Rp ${(totalCost / (totalYield || 1)).toLocaleString('id-ID', { maximumFractionDigits: 0 })}`, style: 'tableCell' }
        ]);
      });
      docDefinition.content.push({ table: { headerRows: 1, widths: ['*', 'auto', 'auto', 'auto'], body: tableBody } });
    };

    // ── TEMPLATE ROUTING ────────────────────────────────────────

    if (template === 'Ringkasan Eksekutif') {
      addFarmerSection('A');
      addDemoplotSection('B');
      addSoilClimateSection('C');
      addVegetationSection('D');
      addHpgSection('E');
      addActivitySection('F');
      addProductivitySection('G');
    } else if (template === 'Profil & Demoplot') {
      addFarmerSection('1');
      addDemoplotSection('2');
    } else if (template === 'Analisis Profitabilitas') {
      addProductivitySection('1');
    } else if (template === 'Monitoring HPG') {
      addHpgSection('1');
    } else if (template === 'Monitoring Tanaman') {
      addVegetationSection('1');
    } else if (template === 'Analisis Tanah & Iklim') {
      addSoilClimateSection('1');
    } else if (template === 'Log Aktivitas Umum') {
      addActivitySection('1');
    }

    // Footer
    docDefinition.content.push({
      text: `\n\n\nLaporan ini dibuat secara otomatis pada ${new Date().toLocaleString('id-ID')} WIB.\nDokumen ini merupakan arsip resmi Sistem Monitoring AgroDemoplot.`,
      style: 'footer'
    });

    // ── GENERATION & UPLOAD ─────────────────────────────────────

    const pdfDoc = await printer.createPdfKitDocument(docDefinition);
    let chunks: any[] = [];
    pdfDoc.on('data', (chunk: any) => chunks.push(chunk));

    const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
      pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
      pdfDoc.on('error', reject);
      pdfDoc.end();
    });

    // 5. Upload to Supabase Storage (Partitioned by User ID)
    const fileName = `${userId}/report-${Date.now()}.pdf`;
    console.log('Uploading PDF to storage:', fileName);
    const { data: uploadData, error: uploadError } = await userSupabase.storage
      .from('reports')
      .upload(fileName, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      throw uploadError;
    }
    console.log('Upload successful:', uploadData.path);

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
    console.error('--- REPORT CRASH ---', error);
    return json({ success: false, message: error.message }, { status: 500 });
  }
};
