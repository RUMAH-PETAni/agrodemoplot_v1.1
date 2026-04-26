<script lang="ts">
  import { marked } from "marked";
  import DOMPurify from "dompurify";
  import { browser } from "$app/environment";
  import { FileLock, Calendar, ArrowLeft } from "@lucide/svelte";
  import { fade, fly } from "svelte/transition";

  const rawMarkdown = `Dokumen ini merupakan perjanjian hukum antara Anda ("Pengguna") dan Agrodemoplot ("Kami") yang mengatur penggunaan produk dan layanan yang tersedia melalui situs web maupun aplikasi (selanjutnya disebut "Platform"). Dengan mengakses dan menggunakan Platform ini, Anda dianggap telah membaca, memahami, dan menyetujui untuk terikat oleh Syarat dan Ketentuan ini.

---

### **1. Penggunaan Layanan**

Anda setuju untuk menggunakan layanan ini hanya untuk tujuan yang sah dan sesuai dengan hukum yang berlaku.

---

### **2. Akun Pengguna**

- Anda bertanggung jawab atas keamanan akun Anda.
- Jangan membagikan kredensial login Anda kepada orang lain.
- Kami berhak untuk menangguhkan akun yang terlibat dalam aktivitas mencurigakan.

---

### **3. Privasi**

Penggunaan Platform tunduk pada Kebijakan Privasi Agrodemoplot, yang mengatur cara kami mengumpulkan, menyimpan, dan menggunakan data pribadi Pengguna.

---

### **4. Kepemilikan Konten**

Semua materi dalam platform (kode sumber, desain, logo, dan data sistem) menjadi milik **tim Agrodemoplot**. Reproduksi atau modifikasi tanpa izin tertulis dilarang.

---

### **5. Pembatasan Tanggung Jawab**

Kami tidak bertanggung jawab atas kerusakan yang diakibatkan oleh penggunaan data atau kesalahan sistem di luar kendali kami.

---

### **6. Modifikasi Layanan**

Kami dapat memperbarui, menambahkan, atau menghentikan fitur tertentu tanpa pemberitahuan sebelumnya.

---

### **7. Hukum yang Berlaku**

Ketentuan ini diatur berdasarkan hukum Republik Indonesia.

---

### **8. Kontak**

Untuk pertanyaan apapun, hubungi **Administrator**
`;

  const rawHtml = marked.parse(rawMarkdown) as string;
  const termsContent = browser ? DOMPurify.sanitize(rawHtml) : rawHtml;
</script>

<svelte:head>
  <title>Ketentuan Layanan — Agrodemoplot</title>
  <meta name="description" content="Ketentuan layanan Agrodemoplot yang mengatur penggunaan produk dan layanan platform kami." />
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
      <FileLock size={40} />
    </div>
    <h1
      class="text-4xl md:text-5xl font-black text-foreground tracking-tight mb-4 uppercase"
    >
      Ketentuan <span class="text-emerald-600">Layanan</span>
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
      {@html termsContent}
    </article>
  </div>

  <!-- Support Footer -->
  <div class="mt-16 text-center">
    <p class="text-muted-foreground text-sm font-medium">
      Ada bagian yang kurang jelas?
      <a
        href="mailto:ikurniawan.consultant@gmail.com"
        class="text-emerald-600 font-bold hover:underline ml-1"
        >Hubungi Tim Bantuan</a
      >
    </p>
  </div>
</div>