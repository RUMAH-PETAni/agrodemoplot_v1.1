# Agrodemoplot v1.1

Agrodemoplot adalah sistem manajemen dan monitoring lahan pertanian (demoplot) berbasis web yang dirancang dengan antarmuka modern, responsif, dan premium. Aplikasi ini memudahkan pengelolaan data petani, lahan, monitoring pertumbuhan tanaman, deteksi hama dan penyakit (HPG), analisis tanah dan iklim, hingga pembuatan laporan analitik secara otomatis.

## 🌟 Fitur Utama

- **Dashboard Interaktif**: Ringkasan data pertanian dengan visualisasi data yang informatif.
- **Manajemen Petani & Lahan**: Pencatatan profil lengkap petani dan informasi teknis demoplot.
- **Monitoring Tanaman**: Pelacakan fase pertumbuhan, tinggi, dan kondisi kesehatan tanaman secara berkala.
- **Pemantauan HPG (Hama & Penyakit)**: Pencatatan intensitas serangan hama/penyakit dan tingkat kerusakan.
- **Analisis Tanah & Iklim**: Monitoring parameter tanah (pH, tekstur) dan data iklim (suhu, curah hujan).
- **Log Aktivitas**: Pencatatan operasional harian dan biaya produksi.
- **Pemetaan Geospasial (WebGIS)**: Visualisasi lokasi lahan pada peta interaktif dengan dukungan *raster layers* dan *basemap* kustom.
- **AI Agronomist**: Asisten cerdas berbasis AI untuk memberikan rekomendasi operasional dan analisis data.
- **Generator Laporan PDF**: Pembuatan laporan analitik siap cetak (Ringkasan Eksekutif, Profil Demoplot, Analisis Profitabilitas, dll.) dengan satu klik.

## 🛠️ Teknologi yang Digunakan

Aplikasi ini dibangun menggunakan *stack* teknologi modern untuk memastikan performa yang cepat dan pengalaman pengguna yang luar biasa:

- **Frontend Framework**: [SvelteKit](https://kit.svelte.dev/) (dengan Svelte 5)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) v4
- **Backend & Database**: [Supabase](https://supabase.com/) (Autentikasi, Database PostgreSQL, & Storage)
- **Geospasial**: Leaflet / MapLibre
- **Generator PDF**: `pdfmake`
- **Ikonografi**: `@lucide/svelte`
- **Integrasi AI**: OpenAI API (`@ai-sdk/openai`)

## 📋 Persyaratan Sistem

Sebelum menjalankan proyek ini secara lokal, pastikan Anda telah memiliki:
- **Node.js** (v18.x atau lebih baru)
- Akun dan Project **Supabase** yang sudah disiapkan.
- API Key **OpenAI** (untuk mengaktifkan fitur asisten AI).

## 🚀 Panduan Instalasi

1. **Buka direktori proyek:**
   Pastikan Anda berada di direktori proyek `svelte`.

2. **Instal seluruh dependensi:**
   ```bash
   npm install
   ```

3. **Konfigurasi Variabel Lingkungan:**
   Pastikan Anda memiliki file `.env` di *root directory* proyek yang berisi kredensial layanan eksternal:
   ```env
   # Supabase Configuration
   VITE_SUPABASE_URL=https://<your-project-id>.supabase.co
   VITE_SUPABASE_ANON_KEY=<your-anon-key>

   # OpenAI Configuration
   OPENAI_API_KEY=<your-openai-api-key>
   VITE_OPENAI_API_KEY=<your-openai-api-key>
   ```

4. **Jalankan Server Development:**
   ```bash
   npm run dev
   ```
   Aplikasi akan berjalan secara lokal (default biasanya pada `http://localhost:5173` atau sesuai konfigurasi Vite di `vite.config.js`).

## 📁 Struktur Direktori Utama

- `src/routes/` : Struktur rute halaman aplikasi (termasuk Auth, Dashboard, Map, Laporan, dll).
- `src/routes/api/` : Endpoint backend *server-side* SvelteKit (seperti `/api/generate-report`).
- `src/lib/components/` : Komponen antarmuka pengguna (UI) modular yang terisolasi.
- `src/lib/services/` : Fungsi perantara untuk mengelola operasi CRUD ke Supabase.
- `src/lib/supabase/` : Konfigurasi *client-side* untuk Supabase.

## 📄 Versi

Saat ini berjalan di versi **1.1.0**.
