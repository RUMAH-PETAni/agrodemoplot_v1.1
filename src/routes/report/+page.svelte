<script lang="ts">
  import { onMount } from "svelte";
  import { fade, fly, scale } from "svelte/transition";
  import { backOut } from "svelte/easing";
  import {
    FileText,
    Plus,
    Search,
    Filter,
    Download,
    Calendar,
    ChevronRight,
    TrendingUp,
    AlertCircle,
    CheckCircle2,
    Clock,
    FileBarChart2,
    FileSearch,
    MapPin,
    ArrowUpRight,
    ArrowLeft,
    Printer,
    FilePieChart,
    ShieldAlert,
    Sprout,
    X,
    LayoutDashboard,
    ExternalLink,
    FileDown,
    Loader2,
    Trash2,
    Files,
    Database,
    Zap,
    Earth,
  } from "@lucide/svelte";

  import {
    getReportArchives,
    deleteReport,
    generateReportRequest,
    type ReportArchive,
  } from "$lib/services/report";
  import { getDemoplotList } from "$lib/services/demoplot";

  // State
  let searchQuery = $state("");
  let selectedCategory = $state("Semua");
  let loading = $state(true);
  let showGenerator = $state(false);
  let generating = $state(false);
  let showDeleteConfirm = $state(false);
  let deleteTarget = $state<ReportArchive | null>(null);
  let success = $state("");
  let error = $state("");

  // Generator Form State
  let selectedTemplate = $state("Ringkasan Eksekutif");
  let startDate = $state(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString()
      .split("T")[0],
  );
  let endDate = $state(new Date().toISOString().split("T")[0]);
  let demoplots = $state<any[]>([]);
  let selectedDemoplots = $state<string[]>([]);
  let reportHistory = $state<ReportArchive[]>([]);

  // Filter options
  const categories = [
    "Semua",
    "Produktivitas",
    "Kesehatan Tanaman",
    "Hama & Penyakit",
    "Inventaris",
    "Keuangan",
  ];

  // Derived state for filtering
  let filteredHistory = $derived(
    reportHistory.filter((rpt) => {
      const matchesSearch =
        rpt.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rpt.id.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory =
        selectedCategory === "Semua" || rpt.category === selectedCategory;
      return matchesSearch && matchesCategory;
    }),
  );

  // Template cards
  const templates = [
    {
      name: "Ringkasan Eksekutif",
      desc: "Laporan menyeluruh performa kebun bulanan.",
      icon: FilePieChart,
      color: "from-emerald-500 to-teal-600",
    },
    {
      name: "Profil & Demoplot",
      desc: "Informasi identitas petani dan spesifikasi teknis lahan.",
      icon: LayoutDashboard,
      color: "from-slate-500 to-slate-700",
    },
    {
      name: "Analisis Tanah & Iklim",
      desc: "Data parameter tanah dan historis cuaca lahan.",
      icon: Earth,
      color: "from-blue-400 to-cyan-600",
    },
    {
      name: "Monitoring Tanaman",
      desc: "Monitoring tinggi dan kondisi tanaman.",
      icon: Sprout,
      color: "from-amber-500 to-orange-600",
    },
    {
      name: "Monitoring HPG",
      desc: "Riwayat temuan hama dan tindakan pengendalian.",
      icon: ShieldAlert,
      color: "from-rose-500 to-orange-600",
    },
    {
      name: "Log Aktivitas Umum",
      desc: "Riwayat harian kegiatan pemeliharaan dan operasional.",
      icon: Clock,
      color: "from-purple-500 to-indigo-600",
    },
    {
      name: "Analisis Profitabilitas",
      desc: "Perbandingan biaya input vs hasil panen.",
      icon: TrendingUp,
      color: "from-blue-500 to-indigo-600",
    },
  ];
  function formatFileSize(bytes: number) {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  }

  async function loadData() {
    loading = true;
    try {
      const [archives, plots] = await Promise.all([
        getReportArchives(),
        getDemoplotList(),
      ]);
      reportHistory = archives;
      demoplots = plots;
      selectedDemoplots = plots.map((p) => p.id);
    } catch (error) {
      console.error("Failed to load report data:", error);
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    loadData();
  });

  async function handleGenerate() {
    if (selectedDemoplots.length === 0) {
      error = "Pilih minimal satu demoplot";
      return;
    }

    generating = true;
    try {
      await generateReportRequest({
        template: selectedTemplate,
        startDate,
        endDate,
        demoplotIds: selectedDemoplots,
      });

      // Refresh list
      await loadData();
      showGenerator = false;
      success = "Laporan berhasil dibuat!";
    } catch (err: any) {
      console.error("Generation failed:", err);
      error =
        "Gagal generate laporan: " + (err.message || "Silakan coba lagi.");
    } finally {
      generating = false;
    }
  }

  const initiateDelete = (report: ReportArchive) => {
    deleteTarget = report;
    showDeleteConfirm = true;
  };

  const cancelDelete = () => {
    showDeleteConfirm = false;
    deleteTarget = null;
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const reportToDelete = deleteTarget;
    showDeleteConfirm = false;

    try {
      await deleteReport(reportToDelete.id, reportToDelete.file_url);
      reportHistory = reportHistory.filter((r) => r.id !== reportToDelete.id);
      success = "Laporan berhasil dihapus";
    } catch (err: any) {
      console.error("Delete failed:", err);
      error = "Gagal menghapus laporan";
    } finally {
      deleteTarget = null;
    }
  };

  async function handleDelete(report: ReportArchive) {
    initiateDelete(report);
  }

  function getStatusColor(status: string) {
    switch (status) {
      case "Selesai":
        return "text-emerald-500 bg-emerald-500/10 border-emerald-500/20";
      case "Diproses":
        return "text-blue-500 bg-blue-500/10 border-blue-500/20 animate-pulse";
      case "Gagal":
        return "text-red-500 bg-red-500/10 border-red-500/20";
      default:
        return "text-muted-foreground bg-muted border-border";
    }
  }

  // Disable body scroll when drawer is open
  $effect(() => {
    if (showGenerator || showDeleteConfirm) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
    return () => {
      document.body.style.overflow = "auto";
    };
  });

  // Auto-clear toasts
  $effect(() => {
    if (success || error) {
      const timer = setTimeout(() => {
        success = "";
        error = "";
      }, 3000);
      return () => clearTimeout(timer);
    }
  });
</script>

<div class="min-h-screen pb-24 px-6 max-w-7xl mx-auto space-y-16">
  <!-- Module Hero -->
  <section
    class="relative mt-28 rounded-[2.5rem] bg-slate-950 overflow-hidden shadow-2xl shadow-slate-950/20"
    in:fly={{ y: -20, duration: 800 }}
  >
    <!-- Mesh Background -->
    <div class="absolute inset-0 z-0 opacity-40">
      <div
        class="absolute -top-[20%] -left-[10%] w-[60%] h-[120%] bg-emerald-500/20 blur-[120px] rounded-full"
      ></div>
      <div
        class="absolute top-[20%] -right-[10%] w-[40%] h-[80%] bg-blue-500/10 blur-[100px] rounded-full"
      ></div>
    </div>

    <div
      class="relative z-10 p-10 md:p-16 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center text-white"
    >
      <!-- Left Column: Branding & Title -->
      <div class="space-y-6 text-center lg:text-left">
        <div class="flex items-center justify-center lg:justify-start gap-3">
          <div
            class="inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 backdrop-blur-md rounded-full border border-white/20 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-100"
          >
            <FileText size={12} class="text-emerald-400" /> Laporan
          </div>
        </div>
        <div class="space-y-4">
          <h1
            class="text-4xl md:text-7xl font-black tracking-tighter leading-[0.9]"
          >
            Arsip
            <span
              class="bg-gradient-to-r from-emerald-400 to-blue-400 bg-clip-text text-transparent"
            >
              Laporan</span
            >
          </h1>
          <p
            class="text-lg text-slate-50/70 font-medium max-w-xl mx-auto lg:mx-0"
          >
            Kelola dan terbitkan dokumentasi operasional kebun.
          </p>
        </div>
      </div>

      <!-- Right Column:  -->
      <div
        class="relative flex items-center justify-center"
        in:scale={{ delay: 400 }}
      >
        <div
          class="flex flex-wrap items-center justify-center lg:justify-start gap-4 pt-4"
        >
          <button
            onclick={() => (showGenerator = true)}
            class="px-8 py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-black uppercase tracking-[0.2em] text-[10px] rounded-2xl transition-all shadow-xl shadow-emerald-500/20 active:scale-95 flex items-center gap-2"
          >
            <Plus size={18} /> Buat Laporan
          </button>
        </div>
        <!-- Large Decorative Background Icon -->
        <div
          class="absolute lg:-right-12 -top-12 text-blue-400/10 group-hover:text-blue-400/20 transition-all duration-700 blur-[1px]"
        >
          <FileText size={300} strokeWidth={1} />
        </div>
      </div>
    </div>
  </section>

  <!-- Report Templates Grid -->
  <section class="space-y-8">
    <div class="flex items-end justify-between px-2">
      <div class="space-y-1">
        <h2 class="text-3xl font-black tracking-tight uppercase">
          Template Tersedia
        </h2>
        <p class="text-sm text-muted-foreground font-medium">
          Pilih jenis laporan yang ingin Anda buat secara otomatis.
        </p>
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {#each templates as template, i}
        <button
          class="group relative bg-card/60 backdrop-blur-3xl border border-border p-8 rounded-[2.5rem] text-left transition-all duration-500 hover:border-emerald-500/50 hover:-translate-y-1 hover:shadow-2xl active:scale-95 overflow-hidden flex flex-col min-h-[280px]
          {selectedTemplate === template.name
            ? 'border-emerald-500 ring-2 ring-emerald-500/20 shadow-emerald-500/10'
            : ''}"
          in:fly={{ y: 20, delay: i * 100 }}
          onclick={() => {
            selectedTemplate = template.name;
            showGenerator = true;
          }}
        >
          <!-- Background Icon -->
          <div
            class="absolute -right-4 -bottom-4 text-emerald-500/5 group-hover:text-emerald-500/10 transition-colors z-0"
          >
            <svelte:component this={template.icon} size={140} strokeWidth={1} />
          </div>

          <!-- Top Content -->
          <div class="relative z-10 space-y-3 flex-1">
            <p
              class="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em]"
            >
              Template Laporan
            </p>
            <h3
              class="text-xl font-black leading-tight uppercase tracking-tight text-foreground"
            >
              {template.name}
            </h3>
            <p
              class="text-sm text-muted-foreground font-medium leading-relaxed pr-6"
            >
              {template.desc}
            </p>
          </div>

          <!-- Bottom Right Button -->
          <div class="relative z-10 flex justify-start mt-4">
            <div
              class="inline-flex px-4 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-[10px] font-black text-emerald-600 uppercase tracking-widest transition-all group-hover:bg-emerald-500 group-hover:text-white group-hover:shadow-lg group-hover:shadow-emerald-500/20"
            >
              Pilih Template
            </div>
          </div>
        </button>
      {/each}
    </div>
  </section>

  <!-- History & Archives -->
  <section class="space-y-8">
    <div
      class="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2"
    >
      <div class="space-y-1">
        <h2 class="text-3xl font-black tracking-tight uppercase">
          Riwayat Dokumen
        </h2>
        <p class="text-sm text-muted-foreground font-medium">
          Daftar laporan yang telah digenerate sebelumnya.
        </p>
      </div>

      <!-- Action Bar -->
      <div class="flex flex-wrap items-center gap-3">
        <div class="relative group min-w-[280px]">
          <Search
            size={18}
            class="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-emerald-500 transition-colors"
          />
          <input
            type="text"
            bind:value={searchQuery}
            placeholder="Cari laporan..."
            class="w-full bg-card/60 border border-border rounded-2xl pl-12 pr-4 py-3.5 text-sm font-medium focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500/50 transition-all"
          />
        </div>

        <div
          class="flex flex-wrap items-center gap-2 bg-card border border-border rounded-2xl p-1.5"
        >
          {#each categories as cat}
            <button
              onclick={() => (selectedCategory = cat)}
              class="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all
              {selectedCategory === cat
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
                : 'hover:bg-muted text-muted-foreground'}"
            >
              {cat}
            </button>
          {/each}
        </div>
      </div>
    </div>

    <!-- Table/List Area -->
    <div
      class="bg-card/40 backdrop-blur-3xl border border-border rounded-[3rem] overflow-hidden shadow-2xl"
    >
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="border-b border-border bg-muted/20">
              <th
                class="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground"
                >Dokumen</th
              >
              <th
                class="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground"
                >Kategori</th
              >
              <th
                class="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground"
                >Tanggal</th
              >
              <th
                class="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground"
                >Status</th
              >
              <th
                class="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground text-right"
                >Aksi</th
              >
            </tr>
          </thead>
          <tbody>
            {#each filteredHistory as rpt, i}
              <tr
                class="group hover:bg-emerald-500/[0.02] transition-colors border-b border-border/50 last:border-none"
              >
                <td class="px-8 py-6">
                  <div class="flex items-center gap-4">
                    <div
                      class="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground group-hover:bg-emerald-500 group-hover:text-white transition-all duration-500"
                    >
                      {#if rpt.format === "PDF"}
                        <FileText size={20} />
                      {:else}
                        <FileBarChart2 size={20} />
                      {/if}
                    </div>
                    <div>
                      <p
                        class="font-black text-foreground uppercase tracking-tight leading-none mb-1"
                      >
                        {rpt.title}
                      </p>
                      <p
                        class="text-[10px] font-mono text-muted-foreground uppercase"
                      >
                        {rpt.id} • {formatFileSize(rpt.file_size_bytes)}
                      </p>
                    </div>
                  </div>
                </td>
                <td class="px-8 py-6">
                  <span
                    class="px-3 py-1 rounded-lg bg-muted text-[10px] font-black uppercase tracking-widest text-muted-foreground"
                  >
                    {rpt.category}
                  </span>
                </td>
                <td class="px-8 py-6">
                  <div class="flex flex-col">
                    <p class="text-sm font-bold text-foreground">
                      {new Date(rpt.created_at).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                    <p
                      class="text-[10px] font-bold text-muted-foreground uppercase"
                    >
                      {new Date(rpt.created_at).toLocaleTimeString("id-ID", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })} WIB
                    </p>
                  </div>
                </td>
                <td class="px-8 py-6">
                  <span
                    class="px-3 py-1 rounded-lg border text-[9px] font-black uppercase tracking-widest {getStatusColor(
                      rpt.status,
                    )}"
                  >
                    {rpt.status}
                  </span>
                </td>
                <td class="px-8 py-6 text-right">
                  <div class="flex items-center justify-end gap-2">
                    <a
                      href={rpt.file_url}
                      target="_blank"
                      class="p-2.5 hover:bg-muted rounded-xl transition-colors text-muted-foreground"
                      title="Buka Dokumen"
                    >
                      <ExternalLink size={18} />
                    </a>
                    <a
                      href={rpt.file_url}
                      download
                      class="p-2.5 bg-emerald-600/10 text-emerald-600 hover:bg-emerald-600 hover:text-white rounded-xl transition-all shadow-sm"
                      title="Download"
                    >
                      <Download size={18} />
                    </a>
                    <button
                      onclick={() => handleDelete(rpt)}
                      class="p-2.5 hover:bg-rose-500/10 hover:text-rose-500 rounded-xl transition-all text-muted-foreground"
                      title="Hapus"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>

      {#if filteredHistory.length === 0}
        <div class="py-24 text-center space-y-4">
          <div
            class="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto text-muted-foreground/30"
          >
            <FileSearch size={40} />
          </div>
          <div class="space-y-1">
            <h3
              class="text-xl font-black text-foreground uppercase tracking-tight"
            >
              Data Tidak Ditemukan
            </h3>
            <p class="text-sm text-muted-foreground font-medium">
              Gunakan kata kunci atau kategori lain untuk pencarian.
            </p>
          </div>
        </div>
      {/if}
    </div>
  </section>
</div>

<!-- Report Generator Drawer -->
{#if showGenerator}
  <div
    class="fixed inset-0 bg-black/20 backdrop-blur-sm z-[2000] flex justify-end"
    onclick={() => !generating && (showGenerator = false)}
    transition:fade
  >
    <div
      class="h-full w-full max-w-2xl bg-card border-l border-border shadow-[-20px_0_50px_-20px_rgba(0,0,0,0.3)] overflow-hidden flex flex-col"
      in:fly={{ x: 600, duration: 500, easing: backOut }}
      out:fly={{ x: 600, duration: 400 }}
      onclick={(e) => e.stopPropagation()}
    >
      <!-- Header -->
      <div
        class="p-8 h-20 border-b border-border flex items-center justify-between bg-muted/30"
      >
        <div class="space-y-1">
          <h2 class="text-2xl font-black tracking-tight uppercase leading-none">
            Konfigurasi Laporan
          </h2>
        </div>
        <button
          onclick={() => (showGenerator = false)}
          disabled={generating}
          class="p-3 bg-white border border-border rounded-2xl hover:bg-red-50 hover:text-red-500 transition-all"
        >
          <X size={24} />
        </button>
      </div>

      <!-- Content -->
      <div class="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
        <!-- Template Select -->
        <div class="space-y-4">
          <label
            class="text-[11px] font-black text-muted-foreground uppercase tracking-[0.2em]"
            >Pilih Template</label
          >
          <div class="grid grid-cols-2 gap-4">
            {#each templates as t}
              <button
                onclick={() => (selectedTemplate = t.name)}
                class="p-5 bg-card border rounded-[2rem] text-left hover:border-emerald-500/50 hover:bg-emerald-500/[0.02] transition-all group
                {selectedTemplate === t.name
                  ? 'border-emerald-500 bg-emerald-500/[0.02]'
                  : 'border-border'}"
              >
                <div
                  class="w-10 h-10 rounded-xl bg-muted group-hover:bg-emerald-500 group-hover:text-white flex items-center justify-center transition-colors mb-3"
                >
                  <svelte:component this={t.icon} size={20} />
                </div>
                <p class="font-black text-sm uppercase tracking-tight">
                  {t.name}
                </p>
              </button>
            {/each}
          </div>
        </div>

        <!-- Period -->
        <div class="space-y-4">
          <label
            class="text-[11px] font-black text-muted-foreground uppercase tracking-[0.2em]"
            >Rentang Waktu</label
          >
          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-2">
              <p class="text-[9px] font-black text-muted-foreground uppercase">
                Dari
              </p>
              <input
                type="date"
                bind:value={startDate}
                class="w-full bg-card border border-border rounded-xl px-4 py-3 text-sm font-bold"
              />
            </div>
            <div class="space-y-2">
              <p class="text-[9px] font-black text-muted-foreground uppercase">
                Sampai
              </p>
              <input
                type="date"
                bind:value={endDate}
                class="w-full bg-card border border-border rounded-xl px-4 py-3 text-sm font-bold"
              />
            </div>
          </div>
        </div>

        <!-- Demoplot Multi-select -->
        <div class="space-y-4">
          <label
            class="text-[11px] font-black text-muted-foreground uppercase tracking-[0.2em]"
            >Filter Demoplot</label
          >
          <div
            class="p-6 bg-card border border-border rounded-[2rem] space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar"
          >
            {#if demoplots.length > 0}
              <div
                class="flex items-center gap-3 pb-3 border-b border-border/50"
              >
                <input
                  type="checkbox"
                  checked={selectedDemoplots.length === demoplots.length &&
                    demoplots.length > 0}
                  onchange={(e) => {
                    if (e.currentTarget.checked) {
                      selectedDemoplots = demoplots.map((p) => p.id);
                    } else {
                      selectedDemoplots = [];
                    }
                  }}
                  class="w-5 h-5 rounded-lg border-border text-emerald-600 focus:ring-emerald-500"
                />
                <span class="text-sm font-bold uppercase tracking-widest"
                  >Pilih Semua ({demoplots.length})</span
                >
              </div>
              <div class="space-y-3 pt-3">
                {#each demoplots as plot}
                  <label
                    class="flex items-center gap-3 cursor-pointer group/item"
                  >
                    <input
                      type="checkbox"
                      value={plot.id}
                      bind:group={selectedDemoplots}
                      class="w-4 h-4 rounded border-border text-emerald-600 focus:ring-emerald-500"
                    />
                    <span
                      class="text-sm font-medium group-hover/item:text-emerald-600 transition-colors"
                      >{plot.nama_demoplot}</span
                    >
                  </label>
                {/each}
              </div>
            {:else}
              <div class="py-6 text-center space-y-3">
                <div
                  class="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto text-muted-foreground"
                >
                  <MapPin size={24} />
                </div>
                <p class="text-xs font-bold text-muted-foreground uppercase">
                  Belum ada demoplot terdaftar
                </p>
                <a
                  href="/dashboard/kebun"
                  class="inline-block text-[10px] font-black text-emerald-600 uppercase border-b border-emerald-600/30 pb-0.5"
                  >Tambah di Informasi Kebun</a
                >
              </div>
            {/if}
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div
        class="p-8 h-20 bg-muted/30 border-t border-border flex items-center justify-end gap-3"
      >
        <button
          onclick={handleGenerate}
          disabled={generating}
          class="p-3 bg-emerald-600 text-white font-black uppercase tracking-widest text-[10px] rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 text-white"
        >
          {#if generating}
            Sedang Mengolah Data...
          {:else}
            Generate Dokumen
          {/if}
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- Delete Confirmation -->
{#if showDeleteConfirm}
  <div
    class="fixed inset-0 bg-background/60 backdrop-blur-xl z-[3000] flex items-center justify-center p-6"
    in:fade
    onclick={cancelDelete}
  >
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="w-full max-w-md bg-card border border-border shadow-2xl rounded-[2.5rem] p-10 text-center space-y-6"
      in:scale
      onclick={(e) => e.stopPropagation()}
    >
      <div
        class="w-20 h-20 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto"
      >
        <Trash2 size={40} />
      </div>
      <div>
        <h3 class="text-2xl font-black uppercase tracking-tight">
          Konfirmasi Hapus
        </h3>
        <p class="text-muted-foreground font-medium mt-2">
          Menghapus laporan <span class="text-foreground font-bold"
            >"{deleteTarget?.title}"</span
          > bersifat permanen. Lanjutkan?
        </p>
      </div>
      <div class="grid grid-cols-2 gap-3 pt-4">
        <button
          onclick={cancelDelete}
          class="h-14 bg-card border border-border font-black uppercase tracking-widest text-[10px] rounded-2xl hover:bg-muted transition-all"
          >Batal</button
        >
        <button
          onclick={confirmDelete}
          class="h-14 bg-red-600 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl hover:bg-red-700 transition-all shadow-lg shadow-red-600/20"
          >Ya, Hapus</button
        >
      </div>
    </div>
  </div>
{/if}

<!-- Success/Error Toast -->
{#if success}
  <div
    class="fixed bottom-10 left-1/2 -translate-x-1/2 z-[4000] px-8 py-4 bg-emerald-600 text-white rounded-2xl shadow-2xl flex items-center gap-3 font-black uppercase text-[10px] tracking-widest"
    in:fly={{ y: 20 }}
    out:fade
  >
    <CheckCircle2 size={20} />
    {success}
  </div>
{/if}
{#if error}
  <div
    class="fixed bottom-10 left-1/2 -translate-x-1/2 z-[4000] px-8 py-4 bg-red-600 text-white rounded-2xl shadow-2xl flex items-center gap-3 font-black uppercase text-[10px] tracking-widest"
    in:fly={{ y: 20 }}
    out:fade
  >
    <AlertCircle size={20} />
    {error}
    <button
      onclick={() => (error = "")}
      class="ml-4 opacity-50 hover:opacity-100 transition-opacity"
      ><X size={16} /></button
    >
  </div>
{/if}

<style>
  .custom-scrollbar::-webkit-scrollbar {
    width: 6px;
  }
  .custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: hsl(var(--muted-foreground) / 0.2);
    border-radius: 10px;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: hsl(var(--emerald-500) / 0.4);
  }
</style>
