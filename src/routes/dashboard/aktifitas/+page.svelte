<script lang="ts">
  import { onMount } from "svelte";
  import {
    getLogAktifitas,
    createLogAktifitas,
    updateLogAktifitas,
    deleteLogAktifitas,
    uploadFotoAktifitas,
    type LogAktifitas,
  } from "$lib/services/aktifitas";
  import { getDemoplotList } from "$lib/services/demoplot";
  import type { Demoplot } from "../../../types/demoplot";
  import {
    Activity,
    Plus,
    Calendar,
    Clock,
    ClipboardCheck,
    Image as ImageIcon,
    Trash2,
    Pencil,
    X,
    Filter,
    Search,
    MapPin,
    ArrowUpRight,
    Camera,
    Sparkles,
    RefreshCw,
    CheckCircle2,
    AlertTriangle,
    Layers,
    ChevronLeft,
    ChevronRight,
    Sprout,
    Hammer,
    BotMessageSquare,
    AlertCircle,
    ClipboardClock,
    Eye,
    User,
    ArrowLeft,
    LayoutGrid,
    List,
    ArrowUpDown,
    ArrowUp,
    ArrowDown,
  } from "@lucide/svelte";

  import { fade, fly, scale } from "svelte/transition";
  import { backOut } from "svelte/easing";

  let logs = $state<LogAktifitas[]>([]);
  let demoplots = $state<Demoplot[]>([]);
  let loading = $state(true);
  let error = $state("");
  let success = $state("");

  // Filtering
  let searchQuery = $state("");
  let categoryFilter = $state("");
  let demoplotFilter = $state("");

  let filteredLogs = $derived(
    logs.filter((log) => {
      const matchSearch =
        !searchQuery ||
        log.kategori.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.deskripsi?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.demoplot?.nama_demoplot
          .toLowerCase()
          .includes(searchQuery.toLowerCase());
      const matchCategory = !categoryFilter || log.kategori === categoryFilter;
      const matchDemoplot =
        !demoplotFilter || log.demoplot_id === demoplotFilter;
      return matchSearch && matchCategory && matchDemoplot;
    }),
  );

  // View & UI State
  let viewMode = $state<"grid" | "list">("grid");
  let actionBarHeight = $state(0);

  // Sorting
  let sortColumn = $state("");
  let sortDirection = $state<"asc" | "desc">("asc");

  function handleSort(column: string) {
    if (sortColumn === column) {
      if (sortDirection === "asc") {
        sortDirection = "desc";
      } else {
        sortColumn = "";
        sortDirection = "asc";
      }
    } else {
      sortColumn = column;
      sortDirection = "asc";
    }
  }

  let sortedLogs = $derived(
    [...filteredLogs].sort((a, b) => {
      if (!sortColumn) return 0;
      let valA = (a as any)[sortColumn];
      let valB = (b as any)[sortColumn];
      
      if (sortColumn === "nama_demoplot") {
        valA = a.demoplot?.nama_demoplot || "";
        valB = b.demoplot?.nama_demoplot || "";
      } else if (sortColumn === "tanggal") {
        valA = new Date(valA).getTime();
        valB = new Date(valB).getTime();
      } else {
        valA = (valA || "").toString().toLowerCase();
        valB = (valB || "").toString().toLowerCase();
      }

      if (valA < valB) return sortDirection === "asc" ? -1 : 1;
      if (valA > valB) return sortDirection === "asc" ? 1 : -1;
      return 0;
    })
  );

  // Pagination
  let pageIndex = $state(0);
  const pageSize = 12;

  let totalPages = $derived(Math.ceil(sortedLogs.length / pageSize));
  let paginatedLogs = $derived(
    sortedLogs.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize),
  );
  let startItem = $derived(pageIndex * pageSize + 1);
  let endItem = $derived(
    Math.min((pageIndex + 1) * pageSize, sortedLogs.length),
  );

  function previousPage() {
    if (pageIndex > 0) pageIndex--;
  }
  function nextPage() {
    if (pageIndex < totalPages - 1) pageIndex++;
  }
  function setPage(i: number) {
    pageIndex = i;
  }
  function canPreviousPage() {
    return pageIndex > 0;
  }
  function canNextPage() {
    return pageIndex < totalPages - 1;
  }

  // Stats
  let totalAktifitas = $derived(logs.length);
  let latestActivity = $derived(logs.length > 0 ? logs[0].tanggal : "-");

  // Form State
  let showFormDrawer = $state(false);
  let showViewDrawer = $state(false);
  let showTimelineDrawer = $state(false);
  let highlightedLogId = $state("");
  let showDeleteConfirm = $state(false);
  let selectedLog = $state<LogAktifitas | null>(null);
  let deleteTarget = $state<LogAktifitas | null>(null);
  let isEditing = $state(false);
  let editingId = $state("");
  let previewImage = $state<string | null>(null);

  let formDemoplotId = $state("");
  let formTanggal = $state(new Date().toISOString().split("T")[0]);
  let formKategori = $state<LogAktifitas["kategori"] | "">("");
  let formDeskripsi = $state("");
  let formDurasi = $state("");
  let formOutput = $state("");
  let formFoto = $state("");
  let uploading = $state(false);
  let fileInput: HTMLInputElement;

  const kategoriOptions = [
    "sekolah lapangan",
    "persiapan lahan",
    "pembibitan",
    "penanaman",
    "pemupukan",
    "pemangkasan",
    "pengendalian hama",
    "panen",
    "pasca panen",
  ];

  async function loadInitialData() {
    loading = true;
    try {
      const [logsData, demoplotsData] = await Promise.all([
        getLogAktifitas(),
        getDemoplotList(),
      ]);
      logs = logsData;
      demoplots = demoplotsData;
    } catch (err) {
      error = "Gagal memuat data aktivitas";
      console.error(err);
    } finally {
      loading = false;
    }
  }

  function openViewDrawer(log: LogAktifitas) {
    selectedLog = log;
    showViewDrawer = true;
  }

  function openTimeline(logId?: string) {
    highlightedLogId = logId || "";
    showTimelineDrawer = true;
  }

  function openAddForm() {
    isEditing = false;
    editingId = "";
    formDemoplotId = "";
    formTanggal = new Date().toISOString().split("T")[0];
    formKategori = "";
    formDeskripsi = "";
    formDurasi = "";
    formOutput = "";
    formFoto = "";
    showFormDrawer = true;
  }

  function openEditForm(log: LogAktifitas) {
    isEditing = true;
    editingId = log.id;
    formDemoplotId = log.demoplot_id;
    formTanggal = log.tanggal;
    formKategori = log.kategori;
    formDeskripsi = log.deskripsi || "";
    formDurasi = log.durasi || "";
    formOutput = log.output || "";
    formFoto = log.foto_dokumentasi || "";
    showFormDrawer = true;
  }

  async function handleSubmit() {
    if (!formDemoplotId || !formKategori) {
      error = "Silakan pilih demoplot dan kategori";
      return;
    }

    loading = true;
    try {
      const logData: Partial<LogAktifitas> = {
        demoplot_id: formDemoplotId,
        tanggal: formTanggal,
        kategori: formKategori as LogAktifitas["kategori"],
        deskripsi: formDeskripsi,
        durasi: formDurasi,
        output: formOutput,
        foto_dokumentasi: formFoto,
      };

      if (isEditing) {
        await updateLogAktifitas(editingId, logData);
        success = "Catatan aktivitas berhasil diperbarui";
      } else {
        await createLogAktifitas(logData);
        success = "Catatan aktivitas baru berhasil ditambahkan";
      }

      showFormDrawer = false;
      await loadLogDataOnly();
      setTimeout(() => (success = ""), 3000);
    } catch (err) {
      error = "Gagal menyimpan data";
      console.error(err);
    } finally {
      loading = false;
    }
  }

  async function loadLogDataOnly() {
    try {
      logs = await getLogAktifitas();
    } catch (err) {
      console.error(err);
    }
  }

  function initiateDelete(log: LogAktifitas) {
    deleteTarget = log;
    showDeleteConfirm = true;
  }

  function cancelDelete() {
    showDeleteConfirm = false;
    deleteTarget = null;
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      await deleteLogAktifitas(deleteTarget.id);
      logs = logs.filter((l) => l.id !== deleteTarget!.id);
      success = "Catatan berhasil dihapus";
      setTimeout(() => (success = ""), 3000);
    } catch (err) {
      error = "Gagal menghapus data";
    } finally {
      showDeleteConfirm = false;
      deleteTarget = null;
    }
  }

  async function handleFileChange(e: Event) {
    const target = e.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;

    uploading = true;
    try {
      const tempId = editingId || `new-${Date.now()}`;
      const url = await uploadFotoAktifitas(file, tempId);
      formFoto = url;
    } catch (err) {
      console.error(err);
      error = "Gagal mengunggah foto";
    } finally {
      uploading = false;
    }
  }

  function getCategoryColor(cat: string) {
    const map: Record<string, string> = {
      "sekolah lapangan": "bg-blue-500",
      "persiapan lahan": "bg-amber-600",
      pembibitan: "bg-emerald-500",
      penanaman: "bg-green-600",
      pemupukan: "bg-purple-500",
      pemangkasan: "bg-rose-500",
      "pengendalian hama": "bg-red-600",
      panen: "bg-orange-500",
      "pasca panen": "bg-cyan-600",
    };
    return map[cat] || "bg-gray-500";
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  onMount(loadInitialData);

  // Reset pageIndex on filter change
  $effect(() => {
    searchQuery;
    categoryFilter;
    demoplotFilter;
    pageIndex = 0;
  });

  // Scroll Lock for Drawer

  $effect(() => {
    if (
      showFormDrawer ||
      showViewDrawer ||
      showTimelineDrawer ||
      showDeleteConfirm
    ) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
    return () => {
      document.body.style.overflow = "auto";
    };
  });

  $effect(() => {
    if (showTimelineDrawer && highlightedLogId) {
      setTimeout(() => {
        const el = document.getElementById(`timeline-item-${highlightedLogId}`);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 500);
    }
  });
</script>

<div class="min-h-screen pb-24 px-6 max-w-7xl mx-auto space-y-12">
  <!-- Module Hero -->
  <section
    class="relative mt-28 rounded-[2.5rem] bg-emerald-900 overflow-hidden shadow-2xl shadow-emerald-900/20"
    in:fly={{ y: -20, duration: 800 }}
  >
    <div class="absolute inset-0 z-0 opacity-40">
      <div
        class="absolute -top-[20%] -left-[10%] w-[60%] h-[120%] bg-emerald-400 blur-[120px] rounded-full"
      ></div>
      <div
        class="absolute top-[20%] -right-[10%] w-[40%] h-[80%] bg-blue-500/30 blur-[100px] rounded-full"
      ></div>
    </div>

    <div
      class="relative z-10 p-10 md:p-16 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center text-white"
    >
      <!-- Left Column: Branding -->
      <div class="space-y-6 text-center lg:text-left">
        <div class="flex items-center justify-center lg:justify-start gap-3">
          <a
            href="/dashboard"
            class="p-2 hover:bg-white/20 backdrop-blur-md rounded-xl transition-colors"
          >
            <ArrowLeft size={18} class="text-white" />
          </a>
          <div
            class="inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 backdrop-blur-md rounded-full border border-white/10 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-100"
          >
            <ClipboardClock size={12} class="text-emerald-400" /> Aktivitas Pengelola
          </div>
        </div>
        <div class="space-y-4">
          <h1
            class="text-4xl md:text-7xl font-black tracking-tighter leading-[0.9]"
          >
            Catat & <span
              class="bg-gradient-to-r from-emerald-400 to-emerald-200 bg-clip-text text-transparent"
              >Evaluasi</span
            >
          </h1>
          <p
            class="text-lg text-emerald-50/70 font-medium max-w-xl mx-auto lg:mx-0"
          >
            Dokumentasi untuk analisis produktivitas yang akurat.
          </p>
        </div>
      </div>

      <!-- Right Column: Stats -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div
          class="group relative p-8 bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] hover:bg-white/10 hover:-translate-y-1 hover:shadow-2xl hover:border-white/20 transition-all duration-300 overflow-hidden active:scale-95"
        >
          <div
            class="absolute -right-4 -bottom-4 text-emerald-400/20 group-hover:text-emerald-400/30 transition-colors"
          >
            <ClipboardCheck size={100} strokeWidth={1} />
          </div>
          <p
            class="text-[9px] font-black text-emerald-200/40 uppercase tracking-[0.2em] mb-1"
          >
            Total Aktivitas
          </p>
          <div class="flex items-baseline gap-2">
            <span class="text-4xl font-black">{totalAktifitas}</span>
            <span class="text-[10px] font-bold text-emerald-400">Entri</span>
          </div>
        </div>

        <div
          class="group relative p-8 bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] hover:bg-white/10 hover:-translate-y-1 hover:shadow-2xl hover:border-white/20 transition-all duration-300 overflow-hidden active:scale-95"
        >
          <div
            class="absolute -right-4 -bottom-4 text-blue-400/20 group-hover:text-blue-400/30 transition-colors"
          >
            <Calendar size={100} strokeWidth={1} />
          </div>
          <p
            class="text-[9px] font-black text-emerald-200/40 uppercase tracking-[0.2em] mb-1"
          >
            Update Terakhir
          </p>
          <div class="flex items-baseline gap-1">
            <span class="text-xl font-black"
              >{latestActivity !== "-" ? formatDate(latestActivity) : "-"}</span
            >
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- Action Bar -->
  <div
    bind:clientHeight={actionBarHeight}
    class="sticky z-[100] flex flex-row items-center gap-3 bg-background/60 backdrop-blur-3xl p-3 md:p-4 rounded-[2rem] border border-border/50 shadow-2xl shadow-black/5 transition-all duration-500 flex-wrap md:flex-nowrap"
    style="top: calc(var(--nav-height, 5rem) + 1rem)"
  >
    <!-- Search -->
    <div class="relative flex-1 group min-w-[200px]">
      <Search
        size={18}
        class="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-emerald-500 transition-colors"
      />
      <input
        type="text"
        bind:value={searchQuery}
        placeholder="Cari aktivitas..."
        class="w-full bg-muted/40 border-transparent focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/10 rounded-2xl pl-11 pr-4 py-3 text-sm font-medium transition-all"
      />
    </div>

    <div
      class="flex items-center p-1 bg-muted/30 rounded-2xl border border-border/50"
    >
      <button
        onclick={() => (viewMode = "grid")}
        class="p-3 rounded-xl transition-all {viewMode === 'grid'
          ? 'bg-white shadow-sm text-emerald-600'
          : 'text-muted-foreground hover:text-foreground hover:bg-black/5'}"
        title="Tampilan Grid"
      >
        <LayoutGrid size={18} />
      </button>
      <button
        onclick={() => (viewMode = "list")}
        class="p-3 rounded-xl transition-all {viewMode === 'list'
          ? 'bg-white shadow-sm text-emerald-600'
          : 'text-muted-foreground hover:text-foreground hover:bg-black/5'}"
        title="Tampilan List"
      >
        <List size={18} />
      </button>
    </div>

    <!-- Filters (Visible on Tablet/Desktop) -->
    <div class="hidden lg:flex items-center gap-2">
      <select
        bind:value={categoryFilter}
        class="w-40 bg-muted/30 border border-transparent hover:border-border rounded-xl px-3 py-2.5 text-[10px] font-black uppercase outline-none transition-all"
      >
        <option value="">Semua Kategori</option>
        {#each kategoriOptions as opt}
          <option value={opt}>{opt.toUpperCase()}</option>
        {/each}
      </select>

      <select
        bind:value={demoplotFilter}
        class="w-40 bg-muted/30 border border-transparent hover:border-border rounded-xl px-3 py-2.5 text-[10px] font-black uppercase outline-none transition-all"
      >
        <option value="">Semua Plot</option>
        {#each demoplots as dp}
          <option value={dp.id}>{dp.nama_demoplot}</option>
        {/each}
      </select>
    </div>

    <!-- Active Filters Button (Mobile) -->
    <button class="lg:hidden p-3 bg-muted/50 rounded-xl text-muted-foreground">
      <Filter size={18} />
    </button>

    <!-- Add Button (Matches Petani Page) -->
    <button
      onclick={openAddForm}
      class="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-widest text-[10px] p-4 md:py-4 md:px-8 rounded-2xl transition-all shadow-lg shadow-emerald-600/20 active:scale-95 whitespace-nowrap"
    >
      <Plus size={18} />
      <span class="hidden md:inline">Tambah Aktivitas</span>
    </button>
  </div>

  <!-- Alert Notification -->
  {#if error}
    <div
      class="fixed bottom-8 left-1/2 -translate-x-1/2 z-[9999]"
      in:fly={{ y: 20 }}
    >
      <div
        class="bg-red-600 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3"
      >
        <AlertTriangle size={20} />
        <p class="text-sm font-bold uppercase tracking-widest">{error}</p>
        <button
          onclick={() => (error = "")}
          class="p-1 hover:bg-white/20 rounded-lg ml-2"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  {/if}

  {#if success}
    <div
      class="fixed bottom-8 left-1/2 -translate-x-1/2 z-[9999]"
      in:fly={{ y: 20 }}
    >
      <div
        class="bg-emerald-600 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3"
      >
        <CheckCircle2 size={20} />
        <p class="text-sm font-bold uppercase tracking-widest">{success}</p>
      </div>
    </div>
  {/if}

  <!-- Content -->
  {#if loading && logs.length === 0}
    <div class="py-24 text-center space-y-4">
      <RefreshCw
        size={40}
        class="animate-spin text-emerald-500 mx-auto opacity-20"
      />
      <p
        class="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground"
      >
        Sinkronisasi Data
      </p>
    </div>
  {:else if filteredLogs.length === 0}
    <div
      class="py-32 text-center bg-muted/20 rounded-[3rem] border-2 border-dashed border-border/50"
      in:fade
    >
      <BotMessageSquare
        size={48}
        class="mx-auto text-muted-foreground/30 mb-4"
      />
      <h3
        class="text-lg font-black uppercase tracking-tight text-muted-foreground"
      >
        Belum ada aktivitas
      </h3>
      <p
        class="text-sm text-muted-foreground/60 max-w-xs mx-auto mt-2 font-medium"
      >
        Catat aktivitas pengerjaan lahan pertama Anda untuk mulai melacak
        perkembangan.
      </p>
    </div>
  {:else}
    {#if viewMode === "grid"}
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" in:fade>
      {#each paginatedLogs as log, i}
        <div
          class="group relative bg-card border border-border shadow-xl rounded-[2.5rem] overflow-hidden flex flex-col transition-all duration-300 hover:border-emerald-500/50 hover:shadow-2xl hover:shadow-emerald-500/5 hover:-translate-y-1"
          in:fly={{ y: 20, delay: i * 50 }}
        >
          <!-- Card Header & Image -->
          <div class="relative h-48 overflow-hidden bg-muted">
            {#if log.foto_dokumentasi}
              <img
                src={log.foto_dokumentasi}
                alt={log.kategori}
                class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
            {:else}
              <div
                class="w-full h-full flex flex-col items-center justify-center gap-3 opacity-20"
              >
                <ImageIcon size={48} />
                <span class="text-[10px] font-black uppercase tracking-widest"
                  >No Documentation</span
                >
              </div>
            {/if}
            <div class="absolute top-4 left-4">
              <span
                class="px-3 py-1.5 {getCategoryColor(
                  log.kategori,
                )} text-white text-[9px] font-black uppercase tracking-widest rounded-full shadow-lg"
              >
                {log.kategori}
              </span>
            </div>

            <!-- Actions Overlay -->
            <div
              class="absolute inset-0 bg-emerald-950/40 backdrop-blur-sm lg:opacity-0 lg:group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2"
            >
              <div class="relative group/btn">
                <button
                  onclick={() => openTimeline(log.id)}
                  class="p-3 bg-white rounded-xl text-emerald-600 hover:scale-110 transition-transform shadow-xl"
                >
                  <ClipboardClock size={18} />
                </button>
                <!-- Tooltip -->
                <div
                  class="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 px-3 py-1.5 bg-foreground text-background text-[10px] font-black uppercase tracking-widest rounded-lg opacity-0 pointer-events-none group-hover/btn:opacity-100 group-hover/btn:-translate-y-1 translate-y-1 transition-all duration-200 whitespace-nowrap z-50 shadow-xl"
                >
                  Timeline
                  <div
                    class="absolute top-full left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-foreground rotate-45"
                  ></div>
                </div>
              </div>

              <div class="relative group/btn">
                <button
                  onclick={() => openViewDrawer(log)}
                  class="p-3 bg-white rounded-xl text-emerald-600 hover:scale-110 transition-transform shadow-xl"
                >
                  <Eye size={18} />
                </button>
                <!-- Tooltip -->
                <div
                  class="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 px-3 py-1.5 bg-foreground text-background text-[10px] font-black uppercase tracking-widest rounded-lg opacity-0 pointer-events-none group-hover/btn:opacity-100 group-hover/btn:-translate-y-1 translate-y-1 transition-all duration-200 whitespace-nowrap z-50 shadow-xl"
                >
                  Rincian
                  <div
                    class="absolute top-full left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-foreground rotate-45"
                  ></div>
                </div>
              </div>

              <div class="relative group/btn">
                <button
                  onclick={() => openEditForm(log)}
                  class="p-3 bg-white rounded-xl text-emerald-600 hover:scale-110 transition-transform shadow-xl"
                >
                  <Pencil size={18} />
                </button>
                <!-- Tooltip -->
                <div
                  class="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 px-3 py-1.5 bg-foreground text-background text-[10px] font-black uppercase tracking-widest rounded-lg opacity-0 pointer-events-none group-hover/btn:opacity-100 group-hover/btn:-translate-y-1 translate-y-1 transition-all duration-200 whitespace-nowrap z-50 shadow-xl"
                >
                  Edit
                  <div
                    class="absolute top-full left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-foreground rotate-45"
                  ></div>
                </div>
              </div>

              <div class="relative group/btn">
                <button
                  onclick={() => initiateDelete(log)}
                  class="p-3 bg-red-500 rounded-xl text-white hover:scale-110 transition-transform shadow-xl"
                >
                  <Trash2 size={18} />
                </button>
                <!-- Tooltip -->
                <div
                  class="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 px-3 py-1.5 bg-foreground text-background text-[10px] font-black uppercase tracking-widest rounded-lg opacity-0 pointer-events-none group-hover/btn:opacity-100 group-hover/btn:-translate-y-1 translate-y-1 transition-all duration-200 whitespace-nowrap z-50 shadow-xl"
                >
                  Hapus
                  <div
                    class="absolute top-full left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-foreground rotate-45"
                  ></div>
                </div>
              </div>
            </div>
          </div>

          <!-- Card Content -->
          <div class="p-8 space-y-4 flex-1 flex flex-col">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2 text-muted-foreground">
                <Calendar size={14} />
                <span class="text-xs font-bold">{formatDate(log.tanggal)}</span>
              </div>
              {#if log.durasi}
                <div class="flex items-center gap-2 text-emerald-600">
                  <Clock size={14} />
                  <span class="text-xs font-black">{log.durasi}</span>
                </div>
              {/if}
            </div>

            <h3
              class="font-black text-lg leading-tight group-hover:text-emerald-600 transition-colors"
            >
              {log.demoplot?.nama_demoplot || "Plot Tidak Diketahui"}
            </h3>

            <p
              class="text-sm text-muted-foreground/80 font-medium line-clamp-2 grow"
            >
              {log.deskripsi || "Tidak ada deskripsi aktivitas."}
            </p>

            {#if log.output}
              <div
                class="pt-4 mt-auto border-t border-border/50 flex items-start gap-2"
              >
                <Sparkles size={16} class="text-amber-500 shrink-0 mt-0.5" />
                <p class="text-xs font-bold text-foreground">
                  <span class="text-muted-foreground">Hasil:</span>
                  {log.output}
                </p>
              </div>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  {:else}
    <div
      class="bg-card/60 backdrop-blur-3xl border border-border rounded-md shadow-2xl shadow-black/5 w-full max-w-full"
      style="--action-bar-h: {actionBarHeight}px;"
      in:fade
    >
      <div class="w-full overflow-x-auto lg:overflow-visible">
        <table class="w-full text-left border-collapse relative min-w-[800px] lg:min-w-0">
          <thead
            class="sticky z-30 bg-background/95 backdrop-blur-xl shadow-sm after:absolute after:bottom-0 after:left-0 after:right-0 after:h-px after:bg-border/50 rounded-t-md top-0 lg:top-[calc(var(--nav-height,5rem)+1rem+var(--action-bar-h)+1.5rem)]"
          >
            <tr class="bg-muted/30 text-[10px] uppercase tracking-widest text-muted-foreground font-black">
              <th class="p-5 pl-8 rounded-tl-md">
                <button class="flex items-center gap-2 hover:text-foreground transition-colors group" onclick={() => handleSort("kategori")}>
                  Kategori
                  {#if sortColumn !== "kategori"}
                    <ArrowUpDown size={12} class="opacity-0 group-hover:opacity-50 transition-opacity" />
                  {:else if sortDirection === "asc"}
                    <ArrowUp size={12} class="text-emerald-500" />
                  {:else}
                    <ArrowDown size={12} class="text-emerald-500" />
                  {/if}
                </button>
              </th>
              <th class="p-5">
                <button class="flex items-center gap-2 hover:text-foreground transition-colors group" onclick={() => handleSort("nama_demoplot")}>
                  Plot Lahan
                  {#if sortColumn !== "nama_demoplot"}
                    <ArrowUpDown size={12} class="opacity-0 group-hover:opacity-50 transition-opacity" />
                  {:else if sortDirection === "asc"}
                    <ArrowUp size={12} class="text-emerald-500" />
                  {:else}
                    <ArrowDown size={12} class="text-emerald-500" />
                  {/if}
                </button>
              </th>
              <th class="p-5 w-[35%]">
                <span class="flex items-center gap-2 text-foreground">Aktivitas</span>
              </th>
              <th class="p-5">
                <button class="flex items-center gap-2 hover:text-foreground transition-colors group" onclick={() => handleSort("tanggal")}>
                  Waktu
                  {#if sortColumn !== "tanggal"}
                    <ArrowUpDown size={12} class="opacity-0 group-hover:opacity-50 transition-opacity" />
                  {:else if sortDirection === "asc"}
                    <ArrowUp size={12} class="text-emerald-500" />
                  {:else}
                    <ArrowDown size={12} class="text-emerald-500" />
                  {/if}
                </button>
              </th>
              <th class="p-5 text-center rounded-tr-md">Aksi</th>
            </tr>
          </thead>
          <tbody class="text-sm">
            {#each paginatedLogs as log, i (log.id)}
              <tr class="border-b border-border/50 hover:bg-muted/20 transition-colors group {i === paginatedLogs.length - 1 ? 'border-0' : ''}">
                <td class="p-5 pl-8">
                  <div class="flex items-center gap-4">
                    <div class="w-12 h-12 rounded-xl bg-muted overflow-hidden flex-shrink-0">
                      {#if log.foto_dokumentasi}
                        <img src={log.foto_dokumentasi} alt="" class="w-full h-full object-cover" />
                      {:else}
                        <div class="w-full h-full flex items-center justify-center opacity-30">
                          <ImageIcon size={24} />
                        </div>
                      {/if}
                    </div>
                    <div>
                      <div class="font-bold text-foreground flex items-center gap-2 uppercase tracking-tight">
                        <span class="px-2 py-0.5 {getCategoryColor(log.kategori)} text-white text-[8px] font-black uppercase tracking-widest rounded-full">
                          {log.kategori}
                        </span>
                      </div>
                    </div>
                  </div>
                </td>
                <td class="p-5">
                  <div class="flex items-center gap-2 text-xs font-bold text-emerald-600">
                    <MapPin size={14} />
                    {log.demoplot?.nama_demoplot || "Plot Tidak Diketahui"}
                  </div>
                </td>
                <td class="p-5">
                  <p class="text-sm text-muted-foreground/80 font-medium line-clamp-2">
                    {log.deskripsi || "Tidak ada deskripsi aktivitas."}
                  </p>
                  {#if log.output}
                    <div class="mt-2 flex items-start gap-1">
                      <Sparkles size={12} class="text-amber-500 shrink-0 mt-0.5" />
                      <p class="text-[10px] font-bold text-foreground">
                        <span class="text-muted-foreground">Hasil:</span> {log.output}
                      </p>
                    </div>
                  {/if}
                </td>
                <td class="p-5">
                  <div class="space-y-1.5">
                    <div class="flex items-center gap-2 text-xs font-bold">
                      <Calendar size={14} class="text-blue-500" />
                      {formatDate(log.tanggal)}
                    </div>
                    {#if log.durasi}
                      <div class="flex items-center gap-2 text-[10px] text-muted-foreground">
                        <Clock size={12} class="text-emerald-500" />
                        <span class="font-bold">{log.durasi}</span>
                      </div>
                    {/if}
                  </div>
                </td>
                <td class="p-5">
                  <div class="flex items-center justify-center gap-2">
                    <div class="relative group/btn">
                      <button onclick={() => openTimeline(log.id)} class="p-2 flex items-center justify-center bg-white border border-border hover:border-emerald-500/50 hover:text-emerald-600 rounded-xl transition-all shadow-sm">
                        <ClipboardClock size={16} />
                      </button>
                      <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 px-3 py-1.5 bg-foreground text-background text-[10px] font-black uppercase tracking-widest rounded-lg opacity-0 pointer-events-none group-hover/btn:opacity-100 group-hover/btn:-translate-y-1 translate-y-1 transition-all duration-200 whitespace-nowrap z-50 shadow-xl">
                        Timeline
                        <div class="absolute top-full left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-foreground rotate-45"></div>
                      </div>
                    </div>
                    <div class="relative group/btn">
                      <button onclick={() => openViewDrawer(log)} class="p-2 flex items-center justify-center bg-white border border-border hover:border-emerald-500/50 hover:text-emerald-600 rounded-xl transition-all shadow-sm">
                        <Eye size={16} />
                      </button>
                      <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 px-3 py-1.5 bg-foreground text-background text-[10px] font-black uppercase tracking-widest rounded-lg opacity-0 pointer-events-none group-hover/btn:opacity-100 group-hover/btn:-translate-y-1 translate-y-1 transition-all duration-200 whitespace-nowrap z-50 shadow-xl">
                        Rincian
                        <div class="absolute top-full left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-foreground rotate-45"></div>
                      </div>
                    </div>
                    <div class="relative group/btn">
                      <button onclick={() => openEditForm(log)} class="p-2 flex items-center justify-center bg-white border border-border hover:border-blue-500/50 hover:text-blue-600 rounded-xl transition-all shadow-sm">
                        <Pencil size={16} />
                      </button>
                      <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 px-3 py-1.5 bg-foreground text-background text-[10px] font-black uppercase tracking-widest rounded-lg opacity-0 pointer-events-none group-hover/btn:opacity-100 group-hover/btn:-translate-y-1 translate-y-1 transition-all duration-200 whitespace-nowrap z-50 shadow-xl">
                        Edit
                        <div class="absolute top-full left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-foreground rotate-45"></div>
                      </div>
                    </div>
                    <div class="relative group/btn">
                      <button onclick={() => initiateDelete(log)} class="p-2 flex items-center justify-center bg-white border border-border hover:border-red-500/50 text-red-500/70 hover:text-red-600 rounded-xl transition-all shadow-sm">
                        <Trash2 size={16} />
                      </button>
                      <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 px-3 py-1.5 bg-foreground text-background text-[10px] font-black uppercase tracking-widest rounded-lg opacity-0 pointer-events-none group-hover/btn:opacity-100 group-hover/btn:-translate-y-1 translate-y-1 transition-all duration-200 whitespace-nowrap z-50 shadow-xl">
                        Hapus
                        <div class="absolute top-full left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-foreground rotate-45"></div>
                      </div>
                    </div>
                  </div>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>
    {/if}

    <!-- Pagination -->
    {#if totalPages > 1}
      <div
        class="pt-12 flex flex-col md:flex-row items-center justify-between gap-6"
        in:fade
      >
        <div
          class="text-[10px] font-black uppercase tracking-widest text-muted-foreground"
        >
          Menampilkan <span class="text-foreground">{startItem}-{endItem}</span>
          dari <span class="text-foreground">{filteredLogs.length}</span> Aktivitas
        </div>
        <div class="flex items-center gap-2">
          <button
            onclick={previousPage}
            disabled={!canPreviousPage()}
            class="w-12 h-12 flex items-center justify-center bg-card border border-border rounded-2xl disabled:opacity-30 transition-all hover:bg-muted"
            ><ChevronLeft size={20} /></button
          >
          <div class="flex gap-1.5">
            {#each Array(totalPages) as _, i}
              {#if i === 0 || i === totalPages - 1 || (i >= pageIndex - 1 && i <= pageIndex + 1)}
                <button
                  onclick={() => setPage(i)}
                  class="w-12 h-12 flex items-center justify-center rounded-2xl text-[10px] font-black transition-all border {pageIndex ===
                  i
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xl shadow-emerald-600/20'
                    : 'bg-card border-border hover:border-emerald-500'}"
                  >{i + 1}</button
                >
              {:else if (i === 1 && pageIndex > 2) || (i === totalPages - 2 && pageIndex < totalPages - 3)}
                <div
                  class="w-12 h-12 flex items-center justify-center text-muted-foreground"
                >
                  ...
                </div>
              {/if}
            {/each}
          </div>
          <button
            onclick={nextPage}
            disabled={!canNextPage()}
            class="w-12 h-12 flex items-center justify-center bg-card border border-border rounded-2xl disabled:opacity-30 transition-all hover:bg-muted"
            ><ChevronRight size={20} /></button
          >
        </div>
      </div>
    {/if}
  {/if}
</div>

<!-- Form Drawer -->
{#if showFormDrawer}
  <div
    class="fixed inset-0 bg-black/20 backdrop-blur-sm z-[2000] flex justify-end"
    transition:fade
    onclick={() => (showFormDrawer = false)}
  >
    <div
      class="h-full w-full max-w-2xl bg-card border-l border-border shadow-2xl overflow-hidden flex flex-col"
      in:fly={{ x: 600, duration: 500, easing: backOut }}
      out:fly={{ x: 600, duration: 400 }}
      onclick={(e) => e.stopPropagation()}
    >
      <!-- Drawer Header -->
      <div
        class="p-8 h-20 border-b border-border flex items-center justify-between bg-muted/30"
      >
        <div>
          <h2 class="text-2xl font-black uppercase tracking-tight">
            {isEditing ? "Perbarui Data" : "Tambah Aktivitas"}
          </h2>
        </div>
        <button
          onclick={() => (showFormDrawer = false)}
          class="p-3 bg-white border border-border rounded-2xl hover:bg-red-50 hover:text-red-500 transition-all"
          ><X size={24} /></button
        >
      </div>

      <!-- Drawer Content -->
      <div class="overflow-y-auto grow p-8 space-y-8">
        <!-- Main Info -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="space-y-2 lg:col-span-2">
            <label
              class="text-[10px] font-black uppercase tracking-widest text-muted-foreground"
              >Demoplot</label
            >
            <select
              bind:value={formDemoplotId}
              class="w-full bg-muted/30 border-border rounded-xl p-4 text-sm font-bold focus:ring-2 ring-emerald-500/20"
            >
              <option value="">Pilih Demoplot</option>
              {#each demoplots as dp}
                <option value={dp.id}>{dp.nama_demoplot}</option>
              {/each}
            </select>
          </div>

          <div class="space-y-2">
            <label
              class="text-[10px] font-black uppercase tracking-widest text-muted-foreground"
              >Tanggal Pelaksanaan</label
            >
            <input
              type="date"
              bind:value={formTanggal}
              class="w-full bg-muted/30 border-border rounded-xl p-4 text-sm font-bold"
            />
          </div>

          <div class="space-y-2">
            <label
              class="text-[10px] font-black uppercase tracking-widest text-muted-foreground"
              >Kategori Aktivitas</label
            >
            <select
              bind:value={formKategori}
              class="w-full bg-muted/30 border-border rounded-xl p-4 text-sm font-bold"
            >
              <option value="">Pilih Kategori</option>
              {#each kategoriOptions as opt}
                <option value={opt}>{opt.toUpperCase()}</option>
              {/each}
            </select>
          </div>
        </div>

        <!-- Details -->
        <div class="space-y-6 pt-4 border-t border-border/50">
          <div class="space-y-2">
            <label
              class="text-[10px] font-black uppercase tracking-widest text-muted-foreground"
              >Deskripsi Aktivitas</label
            >
            <textarea
              bind:value={formDeskripsi}
              rows="3"
              placeholder="Apa saja yang dikerjakan?"
              class="w-full bg-muted/30 border-border rounded-xl p-4 text-sm font-medium"
            ></textarea>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="space-y-2">
              <label
                class="text-[10px] font-black uppercase tracking-widest text-muted-foreground"
                >Durasi Pengerjaan</label
              >
              <input
                type="text"
                bind:value={formDurasi}
                placeholder="Contoh: 4 Jam"
                class="w-full bg-muted/30 border-border rounded-xl p-4 text-sm font-bold"
              />
            </div>
            <div class="space-y-2">
              <label
                class="text-[10px] font-black uppercase tracking-widest text-muted-foreground"
                >Output / Hasil</label
              >
              <input
                type="text"
                bind:value={formOutput}
                placeholder="Contoh: 50Kg Pupuk Organik"
                class="w-full bg-muted/30 border-border rounded-xl p-4 text-sm font-bold"
              />
            </div>
          </div>
        </div>

        <!-- Documentation -->
        <div class="space-y-4 pt-6 border-t border-border/50">
          <label
            class="text-[10px] font-black uppercase tracking-widest text-muted-foreground"
            >Dokumentasi</label
          >
          <div
            class="relative group h-64 bg-muted/30 rounded-[2.5rem] border-2 border-dashed border-border flex items-center justify-center overflow-hidden transition-all hover:border-emerald-500/50"
          >
            {#if formFoto}
              <img
                src={formFoto}
                alt="Preview"
                class="w-full h-full object-cover"
              />
              <div
                class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3"
              >
                <button
                  type="button"
                  onclick={() => fileInput.click()}
                  class="p-4 bg-white rounded-2xl text-emerald-600 hover:scale-110 transition-transform"
                  ><Camera size={24} /></button
                >
                <button
                  type="button"
                  onclick={() => (formFoto = "")}
                  class="p-4 bg-red-500 rounded-2xl text-white hover:scale-110 transition-transform"
                  ><Trash2 size={24} /></button
                >
              </div>
            {:else}
              <div
                class="flex flex-col items-center gap-3 text-muted-foreground/40 group-hover:text-emerald-500/50"
              >
                <ImageIcon size={48} />
                <button
                  type="button"
                  onclick={() => fileInput.click()}
                  class="text-[10px] font-black uppercase tracking-widest border border-current px-4 py-2 rounded-xl"
                  >Upload Foto</button
                >
              </div>
            {/if}

            {#if uploading}
              <div
                class="absolute inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center"
              >
                <RefreshCw size={32} class="animate-spin text-emerald-600" />
              </div>
            {/if}
          </div>
        </div>
      </div>

      <!-- Drawer Footer -->
      <div
        class="p-8 h-20 bg-muted/30 border-t border-border flex items-center justify-end gap-3"
      >
        <button
          onclick={() => (showFormDrawer = false)}
          class="px-8 py-4 bg-white border border-border font-black uppercase tracking-widest text-[10px] rounded-2xl hover:bg-muted transition-all"
          >Batal</button
        >
        <button
          onclick={handleSubmit}
          class="px-8 py-4 bg-emerald-600 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-600/20"
          >Simpan Data</button
        >
      </div>

      <input
        type="file"
        accept="image/*"
        bind:this={fileInput}
        onchange={handleFileChange}
        class="hidden"
      />
    </div>
  </div>
{/if}

<!-- View Detail Drawer -->
{#if showViewDrawer && selectedLog}
  <div
    class="fixed inset-0 bg-black/20 backdrop-blur-sm z-[2000] flex justify-end"
    transition:fade
    onclick={() => (showViewDrawer = false)}
  >
    <div
      class="h-full w-full max-w-2xl bg-card border-l border-border shadow-2xl overflow-hidden flex flex-col"
      in:fly={{ x: 600, duration: 500, easing: backOut }}
      out:fly={{ x: 600, duration: 400 }}
      onclick={(e) => e.stopPropagation()}
    >
      <!-- Header -->
      <div
        class="p-8 h-20 border-b border-border flex items-center justify-between bg-muted/30"
      >
        <div>
          <h2 class="text-2xl font-black uppercase tracking-tight">
            Detail Aktivitas
          </h2>
        </div>
        <button
          onclick={() => (showViewDrawer = false)}
          class="p-3 bg-white border border-border rounded-2xl hover:bg-red-50 hover:text-red-500 transition-all"
          ><X size={24} /></button
        >
      </div>
      <!-- Content -->
      <div class="overflow-y-auto grow custom-scrollbar">
        {#if selectedLog}
          <!-- Hero Image -->
          {#if selectedLog.foto_dokumentasi}
            <div class="h-80 w-full overflow-hidden">
              <button
                onclick={() => { if (selectedLog) previewImage = selectedLog.foto_dokumentasi; }}
                class="w-full h-full cursor-zoom-in block p-0 border-0 bg-transparent"
              >
                <img
                  src={selectedLog.foto_dokumentasi}
                  alt={selectedLog.kategori}
                  class="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                />
              </button>
            </div>
          {/if}

        <div class="p-10 space-y-12">
          <h2 class="text-3xl font-black tracking-tight leading-none uppercase">
            {selectedLog.kategori}
          </h2>
          <!-- Quick Metadata Grid -->
          <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div
              class="p-6 bg-muted/30 rounded-3xl border border-border/50 text-center"
            >
              <p
                class="text-[9px] font-black text-muted-foreground uppercase mb-1"
              >
                Tanggal
              </p>
              <p class="text-sm font-black text-foreground">
                {formatDate(selectedLog.tanggal)}
              </p>
            </div>
            <div
              class="p-6 bg-muted/30 rounded-3xl border border-border/50 text-center"
            >
              <p
                class="text-[9px] font-black text-muted-foreground uppercase mb-1"
              >
                Durasi
              </p>
              <p class="text-sm font-black text-emerald-600">
                {selectedLog.durasi || "-"}
              </p>
            </div>
            <div
              class="p-6 bg-muted/30 rounded-3xl border border-border/50 text-center col-span-2 md:col-span-1"
            >
              <p
                class="text-[9px] font-black text-muted-foreground uppercase mb-1"
              >
                Lokasi Plot
              </p>
              <p class="text-sm font-black text-foreground truncate">
                {selectedLog.demoplot?.nama_demoplot}
              </p>
            </div>
          </div>

          <!-- Description Section -->
          <div class="space-y-4">
            <div class="flex items-center gap-3">
              <div
                class="w-8 h-8 bg-emerald-500/10 text-emerald-600 rounded-lg flex items-center justify-center"
              >
                <ClipboardCheck size={16} />
              </div>
              <h3
                class="text-sm font-black uppercase tracking-[0.2em] text-emerald-600"
              >
                Laporan Kegiatan
              </h3>
            </div>
            <div
              class="p-8 bg-muted/20 border border-border/50 rounded-[2.5rem] relative"
            >
              <p class="text-base text-foreground leading-relaxed font-medium">
                {selectedLog.deskripsi ||
                  "Tidak ada deskripsi detail untuk aktivitas ini."}
              </p>
            </div>
          </div>

          <!-- Output Section -->
          {#if selectedLog.output}
            <div
              class="p-8 bg-emerald-500/5 border border-emerald-500/10 rounded-[2.5rem] flex items-center gap-6"
            >
              <div
                class="w-16 h-16 bg-emerald-500 text-white rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/20"
              >
                <Sparkles size={32} />
              </div>
              <div>
                <p
                  class="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1"
                >
                  Capaian / Hasil
                </p>
                <p class="text-2xl font-black text-emerald-950 tracking-tight">
                  {selectedLog.output}
                </p>
              </div>
            </div>
          {/if}

          <!-- Farmer Details -->
          <div class="pt-8 border-t border-border/50">
            <div
              class="flex items-center gap-6 p-8 bg-emerald-500/5 rounded-3xl border border-emerald-500/10"
            >
              <div class="relative">
                <div
                  class="w-16 h-16 rounded-2xl overflow-hidden border-2 border-white shadow-lg bg-emerald-100 flex items-center justify-center shrink-0"
                >
                  {#if selectedLog.demoplot?.petani?.foto_profil}
                    <img
                      src={selectedLog.demoplot.petani.foto_profil}
                      alt=""
                      class="w-full h-full object-cover"
                    />
                  {:else}
                    <User size={32} class="text-emerald-300" />
                  {/if}
                </div>
                <div
                  class="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-600 rounded-lg flex items-center justify-center text-white shadow-md"
                >
                  <CheckCircle2 size={14} />
                </div>
              </div>
              <div>
                <p
                  class="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1"
                >
                  Penanggung Jawab
                </p>
                <h4 class="text-xl font-black text-foreground leading-none">
                  {selectedLog.demoplot?.petani?.nama_lengkap || "Petani Umum"}
                </h4>
                <p
                  class="text-xs font-medium text-muted-foreground mt-2 flex items-center gap-1"
                >
                  <MapPin size={10} />
                  {selectedLog.demoplot?.petani?.desa ||
                    "Lokasi tidak terdaftar"}
                </p>
              </div>
            </div>
          </div>
        </div>
        {/if}
      </div>
    </div>
  </div>
{/if}

<!-- Delete Confirmation Modal -->
{#if showDeleteConfirm}
  <div
    class="fixed inset-0 bg-background/60 backdrop-blur-xl z-[3000] flex items-center justify-center p-6"
    transition:fade
    onclick={cancelDelete}
  >
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
          Menghapus catatan aktivitas <span class="text-foreground font-bold"
            >"{deleteTarget?.kategori}" untuk {deleteTarget?.demoplot
              ?.nama_demoplot}</span
          > bersifat permanen. Lanjutkan?
        </p>
      </div>
      <div class="grid grid-cols-2 gap-3 pt-4">
        <button
          onclick={cancelDelete}
          class="h-14 bg-white border border-border font-black uppercase tracking-widest text-[10px] rounded-2xl hover:bg-muted transition-all"
          >Batal</button
        >
        <button
          onclick={confirmDelete}
          class="h-14 bg-red-600 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl hover:bg-red-700 transition-all shadow-lg shadow-red-600/20"
          >Hapus Sekarang</button
        >
      </div>
    </div>
  </div>
{/if}

<!-- Timeline Drawer -->
{#if showTimelineDrawer}
  <div
    class="fixed inset-0 bg-black/20 backdrop-blur-sm z-[2000] flex justify-end"
    transition:fade
    onclick={() => (showTimelineDrawer = false)}
  >
    <div
      class="h-full w-full max-w-2xl bg-card border-l border-border shadow-2xl overflow-hidden flex flex-col"
      in:fly={{ x: 600, duration: 500, easing: backOut }}
      out:fly={{ x: 600, duration: 400 }}
      onclick={(e) => e.stopPropagation()}
    >
      <!-- Header -->
      <div
        class="p-8 h-20 border-b border-border flex items-center justify-between bg-white text-slate-900 relative"
      >
        <div>
          <h2 class="text-3xl font-black tracking-tight leading-none uppercase">
            Timeline
          </h2>
        </div>
        <button
          onclick={() => (showTimelineDrawer = false)}
          class="p-3 bg-white border border-border rounded-2xl hover:bg-red-50 hover:text-red-500 transition-all"
          ><X size={24} /></button
        >
      </div>

      <!-- Content -->
      <div class="overflow-y-auto grow p-10 custom-scrollbar bg-slate-50/50">
        <div class="relative space-y-8">
          <!-- Timeline Vertical Line -->
          <div
            class="absolute left-6 top-2 bottom-2 w-0.5 bg-gradient-to-b from-emerald-500/50 via-slate-200 to-transparent"
          ></div>

          {#each logs as log, i}
            <div
              class="relative pl-12 group/item"
              in:fly={{ x: 20, delay: i * 30 }}
              id="timeline-item-{log.id}"
            >
              <!-- Dot -->
              <div
                class="absolute left-[21px] top-2 w-3 h-3 rounded-full border-2 border-white shadow-sm transition-all duration-500 {getCategoryColor(
                  log.kategori,
                )} {log.id === highlightedLogId
                  ? 'scale-150 ring-4 ring-emerald-500/20'
                  : 'group-hover/item:scale-150'}"
              ></div>

              <div
                class="bg-white border rounded-3xl p-6 shadow-sm transition-all duration-300 {log.id ===
                highlightedLogId
                  ? 'border-emerald-500 ring-4 ring-emerald-500/10 shadow-xl'
                  : 'border-border/50 hover:shadow-xl hover:border-emerald-500/30'}"
              >
                <div class="flex items-center justify-between mb-3">
                  <span
                    class="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground"
                    >{formatDate(log.tanggal)}</span
                  >
                  <span
                    class="px-2 py-1 {getCategoryColor(
                      log.kategori,
                    )} text-[8px] text-white font-black uppercase rounded-lg shadow-sm"
                    >{log.kategori}</span
                  >
                </div>

                <div class="flex gap-4 items-start">
                  {#if log.foto_dokumentasi}
                    <div
                      class="w-16 h-16 rounded-2xl overflow-hidden shrink-0 border border-border/10"
                    >
                      <img
                        src={log.foto_dokumentasi}
                        alt=""
                        class="w-full h-full object-cover"
                      />
                    </div>
                  {/if}
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2">
                      <h4 class="font-black text-slate-800 text-sm truncate">
                        {log.demoplot?.nama_demoplot || "Plot Umum"}
                      </h4>
                      <span
                        class="text-[8px] font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full"
                        >{log.demoplot?.petani?.nama_lengkap || "Admin"}</span
                      >
                    </div>
                    <p
                      class="text-xs text-slate-500 font-medium mt-1 line-clamp-2 leading-relaxed"
                    >
                      {log.deskripsi || "Tidak ada deskripsi."}
                    </p>

                    {#if log.durasi || log.output}
                      <div
                        class="flex gap-4 mt-3 pt-3 border-t border-slate-50"
                      >
                        {#if log.durasi}
                          <div
                            class="flex items-center gap-1.5 text-xs font-black text-emerald-600"
                          >
                            <Clock size={12} />
                            {log.durasi}
                          </div>
                        {/if}
                        {#if log.output}
                          <div
                            class="flex items-center gap-1.5 text-xs font-black text-amber-500"
                          >
                            <Sparkles size={12} />
                            {log.output}
                          </div>
                        {/if}
                      </div>
                    {/if}
                  </div>
                </div>

                <div
                  class="mt-4 flex justify-end gap-2 opacity-0 group-hover/item:opacity-100 transition-opacity"
                >
                  <button
                    onclick={() => {
                      showTimelineDrawer = false;
                      openViewDrawer(log);
                    }}
                    class="text-[9px] font-black uppercase text-emerald-600 hover:bg-emerald-50 px-3 py-1.5 rounded-lg transition-colors"
                    >Detail</button
                  >
                </div>
              </div>
            </div>
          {/each}
        </div>
      </div>
    </div>
  </div>
{/if}

<!-- Image Preview Modal -->
{#if previewImage}
  <div
    class="fixed inset-0 z-[5000] flex items-center justify-center p-6 md:p-12 cursor-pointer"
    in:fade={{ duration: 200 }}
    onclick={() => (previewImage = null)}
  >
    <div
      class="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
      in:fade
    ></div>

    <div
      class="relative max-w-4xl max-h-[80vh] bg-background p-2 rounded-[2rem] shadow-2xl cursor-default overflow-hidden"
      in:scale={{ start: 0.95, duration: 300, easing: backOut }}
      onclick={(e) => e.stopPropagation()}
    >
      <button
        class="absolute top-4 right-4 z-10 p-2 bg-white/20 hover:bg-white/40 backdrop-blur-md rounded-full text-white shadow-xl transition-all"
        onclick={() => (previewImage = null)}
      >
        <X size={20} />
      </button>

      <img
        src={previewImage}
        alt="Preview"
        class="w-full h-full max-h-[75vh] object-contain rounded-[1.5rem]"
      />
    </div>
  </div>
{/if}
