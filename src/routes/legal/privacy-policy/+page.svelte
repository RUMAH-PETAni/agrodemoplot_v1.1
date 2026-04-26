<script lang="ts">
  import { marked } from "marked";
  import DOMPurify from "dompurify";
  import { browser } from "$app/environment";
  import { ShieldCheck, Calendar, ArrowLeft } from "@lucide/svelte";
  import { fade, fly } from "svelte/transition";

  const rawMarkdown = `Kami menghargai privasi Anda dan berkomitmen untuk melindungi data pribadi yang Anda berikan kepada kami. Dokumen ini menjelaskan bagaimana kami mengumpulkan, menggunakan, menyimpan, dan membagikan informasi pribadi Anda saat menggunakan platform kami.

Dengan menggunakan situs web, aplikasi, dan layanan ("Platform"), Anda menyetujui praktik yang dijelaskan dalam Kebijakan Privasi ini.

---

### **1. Informasi yang Kami Kumpulkan**

Kami mungkin mengumpulkan:

- Detail akun (email, nama, jenis kelamin, nomor telepon dan alamat)
- Data lokasi lahan (koordinat dan input alamat)
- Data teknis seperti alamat IP, tipe perangkat, dan aktivitas platform

---

### **2. Cara Kami Menggunakan Informasi**

Data Anda digunakan untuk:

- Mengelola akun pengguna dan otentikasi
- Menyediakan layanan sistem monitoring dan manajemen kebun
- Meningkatkan pengalaman pengguna dan fitur platform
- Mengirimkan pemberitahuan terkait layanan

---

### **3. Penyimpanan dan Keamanan Data**

Data disimpan secara aman menggunakan penyedia pihak ketiga dengan langkah-langkah keamanan yang sesuai untuk mencegah akses atau penghapusan yang tidak sah. Namun, Anda memahami bahwa tidak ada metode transmisi data melalui internet yang sepenuhnya aman. Oleh karena itu, kami tidak dapat menjamin keamanan mutlak dari data yang Anda kirimkan kepada kami.

---

### **4. Berbagi Data**

Kami **tidak menjual atau menyewakan** data pribadi Anda. Data hanya dibagikan dengan penyedia layanan yang membantu dalam operasi aplikasi di bawah perlindungan privasi yang serupa.

---

### **5. Hak Pengguna**

Anda dapat meminta pembaruan atau penghapusan data Anda dengan mengirimkan email ke: **Administrator**

---

### **6. Pembaruan Kebijakan**

Kebijakan ini dapat diperbarui dari waktu ke waktu. Versi terbaru akan selalu tersedia di platform kami.

---

### **7. Kontak**

Untuk pertanyaan atau kekhawatiran tentang privasi, hubungi: **Administrator**

---

## **Pengumpulan Data Pribadi Sensitif**

Kami mungkin mengumpulkan informasi pribadi sensitif seperti **Nomor Induk Kependudukan (NIK)**, alamat lengkap, dan detail kepemilikan lahan. Data ini dikumpulkan **hanya untuk tujuan verifikasi identitas dan manajemen lahan**. Kami memastikan keamanan dan kerahasiaan data tersebut dengan:

- Menyimpan semua data sensitif terenkripsi di server aman
- Tidak pernah menampilkan NIK atau identitas serupa di area publik aplikasi
- Tidak pernah membagikan data sensitif kepada pihak ketiga tanpa persetujuan eksplisit pengguna
- Mengizinkan pengguna untuk meminta penghapusan data mereka kapan saja melalui **Administrator**
`;

  const rawHtml = marked.parse(rawMarkdown) as string;
  const privacyContent = browser ? DOMPurify.sanitize(rawHtml) : rawHtml;
</script>

<svelte:head>
  <title>Kebijakan Privasi — Agrodemoplot</title>
  <meta name="description" content="Kebijakan privasi Agrodemoplot menjelaskan bagaimana kami mengumpulkan, menggunakan, dan melindungi data pribadi Anda." />
</svelte:head>

<div class="min-h-screen pt-32 pb-20 px-6 max-w-4xl mx-auto">
  <!-- Nav Back -->
  <a
    href="/"
    class="inline-flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-emerald-600 transition-colors mb-12"
  >
    <ArrowLeft size={16} /> Kembali ke Beranda
  </a>

  <!-- Header -->
  <header class="text-center mb-16" in:fly={{ y: -20, duration: 800 }}>
    <div
      class="w-20 h-20 bg-emerald-500/10 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-emerald-500/20"
    >
      <ShieldCheck size={40} />
    </div>
    <h1
      class="text-4xl md:text-5xl font-black text-foreground tracking-tight mb-4 uppercase"
    >
      Kebijakan <span class="text-emerald-600">Privasi</span>
    </h1>
    <div
      class="flex items-center justify-center gap-3 text-muted-foreground text-sm"
    >
      <Calendar size={14} />
      <span class="font-bold tracking-widest uppercase"
        >Pembaruan Terakhir: {new Date().toLocaleDateString("id-ID", {
          month: "long",
          year: "numeric",
        })}</span
      >
    </div>
  </header>

  <!-- Content Card -->
  <div
    class="bg-card/50 backdrop-blur-xl border border-border rounded-[2.5rem] p-8 md:p-16 shadow-2xl shadow-emerald-900/5 dark:shadow-emerald-100/5"
    in:fade={{ duration: 1000, delay: 200 }}
  >
    <article
      class="prose prose-emerald dark:prose-invert max-w-none
      prose-headings:text-foreground prose-headings:font-black prose-headings:tracking-tighter prose-headings:uppercase
      prose-p:text-muted-foreground prose-p:leading-relaxed prose-p:text-lg
      prose-strong:text-foreground prose-strong:font-black
      prose-ul:text-muted-foreground prose-li:marker:text-emerald-500"
    >
      {@html privacyContent}
    </article>
  </div>

  <!-- Support Footer -->
  <div class="mt-16 text-center">
    <p class="text-muted-foreground text-sm font-medium">
      Punya pertanyaan tentang privasi Anda?
      <a
        href="mailto:ikurniawan.consultant@gmail.com"
        class="text-emerald-600 font-bold hover:underline ml-1"
        >Hubungi Tim Legal Kami</a
      >
    </p>
  </div>
</div>
