# Perencanaan Teknis: Implementasi Fitur Laporan & Dokumentasi

Dokumen ini disusun sebagai panduan arsitektur dan implementasi teknis untuk mengembangkan fitur Laporan pada proyek SvelteKit + Supabase ini. Tugas Anda adalah mengimplementasikan logika backend dan mengintegrasikannya dengan UI Frontend yang sudah ada di `src/routes/report/+page.svelte`.

## 1. Analisis Skema Database (Supabase)

Proyek ini telah memiliki beberapa tabel dan view yang mencatat data operasional lahan:
1.  **`demoplot` & `petani`**: Menyimpan data master lahan dan profil petani.
2.  **`produktivitas` & `produktivitas_summary` (Migration 016)**: Mencatat biaya input, jam tenaga kerja, dan hasil panen. View ini sudah sangat siap digunakan untuk "Laporan Produktivitas" dan "Analisis Profitabilitas".
3.  **`penanaman` (Migration 009)**: Data perkembangan vegetasi (tinggi tanaman, diameter batang).
4.  **`hpg` (Migration 011)**: Data Hama, Penyakit, dan Gulma.
5.  **`log_aktifitas` (Migration 007)**: Jurnal aktivitas harian.

### Kebutuhan Backend Baru: Tabel Riwayat Laporan
Agar laporan yang pernah di-*generate* dapat dilihat kembali, kita membutuhkan:
- **Migration SQL Baru (`017_create_report_archives_table.sql`)**:
  Tabel ini akan menyimpan metadata laporan yang sudah di-generate.
  Kolom: `id` (UUID), `user_id` (UUID - relasi auth.users), `title` (Text), `category` (Text), `format` (Text, misal: 'PDF', 'Excel'), `file_url` (Text - link ke Storage), `file_size_bytes` (Integer), `status` (Text: 'Selesai', 'Diproses', 'Gagal'), `created_at` (Timestamptz).
- **Supabase Storage Bucket**: Buat bucket bernama `reports` untuk menyimpan file PDF/Excel hasil generate.

---

## 2. Arsitektur Backend (SvelteKit API Routes)

Fitur utama adalah menghasilkan (generate) dokumen PDF. Ini akan dilakukan di sisi Server SvelteKit agar lebih aman dan performanya tidak membebani browser (client).

### Endpoint API: `/api/generate-report/+server.ts`
1.  **Menerima Request (POST)**:
    Menerima payload JSON dari Frontend: `template` (tipe laporan), `startDate`, `endDate`, dan `demoplotIds` (array ID lahan).
2.  **Validasi Otentikasi**:
    Gunakan `locals.supabase` untuk memastikan user sudah login. Ekstrak `user_id`.
3.  **Memasukkan ke Antrean (Opsional / Mock)**:
    Jika pemrosesan sinkronous, langsung buat record di tabel `report_archives` dengan status 'Diproses'.
4.  **Pengambilan Data (Data Fetching)**:
    Query data dari Supabase berdasarkan parameter.
    - *Jika Laporan Produktivitas*: Ambil dari `produktivitas_summary`.
    - *Jika Laporan HPG*: Ambil dari tabel `hpg` yang di-join dengan `demoplot`.
5.  **PDF Generation**:
    Gunakan library server-side PDF generator (Disarankan: `pdfmake` atau `jspdf` via Node.js).
    Format data JSON menjadi struktur dokumen (tabel, paragraf teks).
6.  **Penyimpanan Dokumen**:
    Upload buffer file PDF ke Supabase Storage (`reports` bucket).
7.  **Update Database**:
    Update record `report_archives` menjadi status 'Selesai' beserta dengan ukuran file dan `file_url`.

### Data Service Layer: `src/lib/services/report.ts`
Buat fungsi-fungsi abstraction untuk Frontend:
```typescript
export async function getReportArchives() { /* select dari report_archives */ }
export async function deleteReport(id) { /* delete record dan hapus file dari bucket */ }
export async function generateReportRequest(payload) { /* fetch POST ke /api/generate-report */ }
```

---

## 3. Rencana Integrasi Frontend

UI sudah selesai dibuat di `src/routes/report/+page.svelte`. Implementator (AI Model) hanya perlu menambahkan reaktivitas (binding data) menggunakan Svelte 5.

### Tugas Integrasi di `report/+page.svelte`:

1.  **State Management**:
    - Tambahkan state `$state` untuk form generator: `formStartDate`, `formEndDate`, `formSelectedDemoplots`.
    - Gunakan `onMount` untuk me-load data Demoplot (panggil `getDemoplotList()`) dan me-load Riwayat Laporan (panggil `getReportArchives()`).
2.  **Ganti Mock Data**:
    - Variabel `reportHistory` saat ini menggunakan mock data. Ubah logic-nya agar diisi dengan hasil fetch dari tabel database `report_archives`.
3.  **Fungsi `handleGenerate()`**:
    - Buat fungsi ini async.
    - Panggil fungsi service `generateReportRequest(payload)`.
    - Tampilkan loading state (`generating = true`).
    - Setelah selesai, fetch ulang `reportHistory` untuk menampilkan dokumen yang baru saja dibuat.
4.  **Aksi Tabel (Download & Hapus)**:
    - Tombol Download: *Bind* ke `window.open(rpt.file_url, '_blank')` atau mekanisme unduh file.
    - Tombol Hapus: Panggil fungsi konfirmasi, lalu `deleteReport(rpt.id)`.

---

## 4. Langkah Kerja untuk Implementator AI Selanjutnya

Jika Anda adalah agen AI yang akan mengeksekusi rencana ini, lakukan dengan urutan berikut:

1.  **Buat Migrasi SQL (Tabel Riwayat & Bucket)**
    - Tulis file `017_create_report_archives_table.sql`. Jangan lupa RLS policies agar user hanya bisa melihat laporannya sendiri.
2.  **Buat Service Supabase**
    - Implementasikan CRUD untuk tabel riwayat di `src/lib/services/report.ts`.
3.  **Integrasikan UI Laporan**
    - Buka `src/routes/report/+page.svelte`.
    - Ganti `reportHistory` mock dengan data riwayat asli.
    - Lengkapi binding variabel pada bagian *Report Generator Drawer*.
4.  **Bangun API Generate PDF**
    - Install `pdfmake` atau library PDF pilihan di project (cek `package.json`).
    - Buat endpoint `src/routes/api/generate-report/+server.ts`.
    - Terapkan logika sederhana untuk membuat dokumen dasar (minimal PDF yang berisi tabel sederhana dari data yang difetch) dan upload ke bucket.

Dengan struktur ini, modul Laporan akan tersambung penuh secara end-to-end tanpa merusak standar visual premium (glassmorphism & dark mode) yang sudah ditetapkan pada Frontend SvelteKit.
