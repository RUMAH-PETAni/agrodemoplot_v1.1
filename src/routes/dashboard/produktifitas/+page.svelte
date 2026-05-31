<script lang="ts">
  import { onMount } from "svelte";
  import {
    getProduktivitas,
    getProduktivitasSummary,
    createProduktivitas,
    updateProduktivitas,
    deleteProduktivitas,
    type Produktivitas,
    type ProduktivitasSummary,
  } from "$lib/services/produktivitas";
  import { getDemoplotList } from "$lib/services/demoplot";
  import type { Demoplot } from "../../../types/demoplot";
  import {
    BarChart3,
    Plus,
    Search,
    Filter,
    Cherry,
    Calendar,
    ArrowLeft,
    TrendingUp,
    TrendingDown,
    Zap,
    Scale,
    Coins,
    User,
    Sprout,
    Box,
    Truck,
    Pencil,
    Trash2,
    RefreshCw,
    X,
    ChevronLeft,
    ChevronRight,
    MapPin,
    AlertCircle,
    CheckCircle2,
    Briefcase,
    ShoppingBag,
    Leaf,
  } from "@lucide/svelte";
  import { fade, fly, scale } from "svelte/transition";
  import { backOut } from "svelte/easing";

  let records = $state<Produktivitas[]>([]);
  let demoplots = $state<Demoplot[]>([]);
  let loading = $state(true);
  let error = $state("");
  let success = $state("");

  // Stats Counts
  let inputCount = $derived(
    records.filter((r) => r.kategori_pencatatan === "input").length,
  );
  let tkCount = $derived(
    records.filter((r) => r.kategori_pencatatan === "tenaga kerja").length,
  );
  let panenCount = $derived(
    records.filter((r) => r.kategori_pencatatan === "hasil panen").length,
  );

  // Filtering
  let searchQuery = $state("");
  let categoryFilter = $state("");
  let demoplotFilter = $state("");

  let filteredRecords = $derived.by(() => {
    return records.filter((r) => {
      const matchSearch =
        !searchQuery ||
        r.nama_jenis?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.jenis_input?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.jenis_pekerjaan?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.demoplot?.nama_demoplot
          .toLowerCase()
          .includes(searchQuery.toLowerCase());

      const matchCategory =
        !categoryFilter || r.kategori_pencatatan === categoryFilter;
      const matchDemoplot = !demoplotFilter || r.demoplot_id === demoplotFilter;

      return matchSearch && matchCategory && matchDemoplot;
    });
  });

  // Pagination
  let currentPage = $state(1);
  const itemsPerPage = 12;
  let totalPages = $derived(Math.ceil(filteredRecords.length / itemsPerPage));
  let paginatedRecords = $derived(
    filteredRecords.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage,
    ),
  );

  // Form State
  let showFormDrawer = $state(false);
  let isEditing = $state(false);
  let editingId = $state("");

  let formDemoplotId = $state("");
  let formTanggal = $state(new Date().toISOString().split("T")[0]);
  let formKategori = $state<"input" | "tenaga kerja" | "hasil panen" | "">("");

  // Input Fields
  let formJenisInput = $state("");
  let formJumlahPakai = $state<number | null>(null);
  let formSatuan = $state("");
  let formBiayaTotal = $state<number | null>(null);
  let formWaktuPenggunaan = $state(new Date().toISOString().split("T")[0]);

  // Tenaga Kerja Fields
  let formJenisPekerjaan = $state("");
  let formBiayaTK = $state<number | null>(null);
  let formJamKerja = $state<number | null>(null);
  let formTanggalPelaksanaan = $state(new Date().toISOString().split("T")[0]);

  // Hasil Panen Fields
  let formKategoriTanaman = $state("tanaman utama");
  let formNamaJenis = $state("");
  let formJumlahTanaman = $state<number | null>(null);
  let formBeratBasah = $state<number | null>(null);
  let formPutaranPanen = $state(1);
  let formCatatanKualitas = $state("");
  let formTanggalPanen = $state(new Date().toISOString().split("T")[0]);

  // Pasca Panen
  let formMetodePengolahan = $state("");
  let formBeratKering = $state<number | null>(null);
  let formBeratTerbuang = $state<number | null>(null);
  let formTanggalSelesai = $state<string | null>(null);

  async function loadInitialData() {
    loading = true;
    try {
      const [recordsData, demoplotsData] = await Promise.all([
        getProduktivitas(),
        getDemoplotList(),
      ]);
      records = recordsData;
      demoplots = demoplotsData;
    } catch (err) {
      error = "Gagal memuat data produktivitas";
      console.error(err);
    } finally {
      loading = false;
    }
  }

  function openAddForm() {
    isEditing = false;
    editingId = "";
    formKategori = "";
    resetFormFields();
    showFormDrawer = true;
  }

  function resetFormFields() {
    formDemoplotId = "";
    formTanggal = new Date().toISOString().split("T")[0];
    formJenisInput = "";
    formJumlahPakai = null;
    formSatuan = "";
    formBiayaTotal = null;
    formWaktuPenggunaan = new Date().toISOString().split("T")[0];
    formJenisPekerjaan = "";
    formBiayaTK = null;
    formJamKerja = null;
    formTanggalPelaksanaan = new Date().toISOString().split("T")[0];
    formKategoriTanaman = "tanaman utama";
    formNamaJenis = "";
    formJumlahTanaman = null;
    formBeratBasah = null;
    formPutaranPanen = 1;
    formCatatanKualitas = "";
    formTanggalPanen = new Date().toISOString().split("T")[0];
    formMetodePengolahan = "";
    formBeratKering = null;
    formBeratTerbuang = null;
    formTanggalSelesai = null;
  }

  function openEditForm(record: Produktivitas) {
    isEditing = true;
    editingId = record.id;
    formKategori = record.kategori_pencatatan;
    formDemoplotId = record.demoplot_id;
    formTanggal = record.tanggal_pencatatan;

    // Input
    formJenisInput = record.jenis_input || "";
    formJumlahPakai = record.jumlah_pakai || null;
    formSatuan = record.satuan || "";
    formBiayaTotal = record.biaya_total || null;
    formWaktuPenggunaan = record.waktu_penggunaan || formTanggal;

    // TK
    formJenisPekerjaan = record.jenis_pekerjaan || "";
    formBiayaTK = record.biaya_tenaga_kerja || null;
    formJamKerja = record.jumlah_jam_kerja || null;
    formTanggalPelaksanaan = record.tanggal_pelaksanaan || formTanggal;

    // Panen
    formKategoriTanaman = record.kategori_tanaman || "tanaman utama";
    formNamaJenis = record.nama_jenis || "";
    formJumlahTanaman = record.jumlah_tanaman || null;
    formBeratBasah = record.berat_basah_kg || null;
    formPutaranPanen = record.putaran_panen || 1;
    formCatatanKualitas = record.catatan_kualitas || "";
    formTanggalPanen = record.tanggal_panen || formTanggal;

    formMetodePengolahan = record.metode_pengolahan || "";
    formBeratKering = record.berat_kering_kg || null;
    formBeratTerbuang = record.berat_terbuang_kg || null;
    formTanggalSelesai = record.tanggal_selesai || null;

    showFormDrawer = true;
  }

  async function handleSubmit() {
    if (!formDemoplotId || !formKategori) {
      error = "Mohon pilih Plot dan Kategori";
      return;
    }

    loading = true;
    try {
      const payload: Partial<Produktivitas> = {
        demoplot_id: formDemoplotId,
        tanggal_pencatatan: formTanggal,
        kategori_pencatatan: formKategori as any,
      };

      if (formKategori === "input") {
        payload.jenis_input = formJenisInput;
        payload.jumlah_pakai = formJumlahPakai;
        payload.satuan = formSatuan;
        payload.biaya_total = formBiayaTotal;
        payload.waktu_penggunaan = formWaktuPenggunaan;
      } else if (formKategori === "tenaga kerja") {
        payload.jenis_pekerjaan = formJenisPekerjaan;
        payload.biaya_tenaga_kerja = formBiayaTK;
        payload.jumlah_jam_kerja = formJamKerja;
        payload.tanggal_pelaksanaan = formTanggalPelaksanaan;
      } else if (formKategori === "hasil panen") {
        payload.kategori_tanaman = formKategoriTanaman;
        payload.nama_jenis = formNamaJenis;
        payload.jumlah_tanaman = formJumlahTanaman;
        payload.berat_basah_kg = formBeratBasah;
        payload.putaran_panen = formPutaranPanen;
        payload.catatan_kualitas = formCatatanKualitas;
        payload.tanggal_panen = formTanggalPanen;
        payload.metode_pengolahan = formMetodePengolahan;
        payload.berat_kering_kg = formBeratKering;
        payload.berat_terbuang_kg = formBeratTerbuang;
        payload.tanggal_selesai = formTanggalSelesai;
      }

      if (isEditing) {
        await updateProduktivitas(editingId, payload);
        success = "Data berhasil diperbarui";
      } else {
        await createProduktivitas(payload);
        success = "Data baru berhasil disimpan";
      }

      showFormDrawer = false;
      await loadInitialData();
      setTimeout(() => (success = ""), 3000);
    } catch (err) {
      error = "Gagal menyimpan data";
      console.error(err);
    } finally {
      loading = false;
    }
  }

  let showDeleteConfirm = $state(false);
  let deleteTarget = $state<Produktivitas | null>(null);

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      await deleteProduktivitas(deleteTarget.id);
      success = "Catatan berhasil dihapus";
      await loadInitialData();
      setTimeout(() => (success = ""), 3000);
    } catch (err) {
      error = "Gagal menghapus data";
    } finally {
      showDeleteConfirm = false;
      deleteTarget = null;
    }
  }

  function getCategoryColor(cat: string) {
    switch (cat) {
      case "input":
        return "bg-blue-500";
      case "tenaga kerja":
        return "bg-amber-500";
      case "hasil panen":
        return "bg-emerald-500";
      default:
        return "bg-slate-500";
    }
  }

  function getCategoryIcon(cat: string) {
    switch (cat) {
      case "input":
        return ShoppingBag;
      case "tenaga kerja":
        return User;
      case "hasil panen":
        return Cherry;
      default:
        return Box;
    }
  }

  function formatCurrency(val: number | null | undefined) {
    if (val === null || val === undefined) return "Rp 0";
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(val);
  }

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  onMount(loadInitialData);

  $effect(() => {
    if (showFormDrawer || showDeleteConfirm) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
  });
</script>

<div class="min-h-screen pb-24 px-6 max-w-7xl mx-auto space-y-12">
  <!-- Module Hero -->
  <section
    class="relative mt-28 rounded-[2.5rem] bg-slate-950 overflow-hidden shadow-2xl shadow-slate-950/20"
    in:fly={{ y: -20, duration: 800 }}
  >
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
      <div class="space-y-6 text-center lg:text-left">
        <div class="flex items-center justify-center lg:justify-start gap-3">
          <a
            href="/dashboard"
            class="p-2 hover:bg-white/20 backdrop-blur-md rounded-xl transition-colors"
          >
            <ArrowLeft size={18} class="text-white" />
          </a>
          <div
            class="inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 backdrop-blur-md rounded-full border border-white/20 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-100"
          >
            <BarChart3 size={12} class="text-emerald-400" /> Produktivitas Kebun
          </div>
        </div>
        <div class="space-y-4">
          <h1
            class="text-4xl md:text-7xl font-black tracking-tighter leading-[0.9]"
          >
            Manajemen <span
              class="bg-gradient-to-r from-emerald-400 to-blue-400 bg-clip-text text-transparent"
              >Produktivitas</span
            >
          </h1>
          <p
            class="text-lg text-slate-50/70 font-medium max-w-xl mx-auto lg:mx-0"
          >
            Lacak input, tenaga kerja, dan hasil panen komoditas lahan.
          </p>
        </div>
      </div>

      <!-- Simple Category Stats -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div
          class="group relative p-6 bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[2rem] hover:bg-white/10 hover:-translate-y-1 hover:shadow-2xl hover:border-white/20 transition-all duration-300 overflow-hidden active:scale-95"
        >
          <div
            class="absolute -right-4 -bottom-4 text-blue-500/25 group-hover:text-blue-500/40 transition-colors"
          >
            <ShoppingBag size={80} strokeWidth={1} />
          </div>
          <p
            class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1"
          >
            Input
          </p>
          <p class="text-3xl font-black">{inputCount}</p>
        </div>
        <div
          class="group relative p-6 bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[2rem] hover:bg-white/10 hover:-translate-y-1 hover:shadow-2xl hover:border-white/20 transition-all duration-300 overflow-hidden active:scale-95"
        >
          <div
            class="absolute -right-4 -bottom-4 text-amber-500/20 group-hover:text-amber-500/30 transition-colors"
          >
            <User size={80} strokeWidth={1} />
          </div>
          <p
            class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1"
          >
            Tenaga Kerja
          </p>
          <p class="text-3xl font-black">{tkCount}</p>
        </div>
        <div
          class="group relative p-6 bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[2rem] hover:bg-white/10 hover:-translate-y-1 hover:shadow-2xl hover:border-white/20 transition-all duration-300 overflow-hidden active:scale-95"
        >
          <div
            class="absolute -right-4 -bottom-4 text-emerald-400/20 group-hover:text-emerald-400/30 transition-colors"
          >
            <Cherry size={80} strokeWidth={1} />
          </div>
          <p
            class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1"
          >
            Hasil Panen
          </p>
          <p class="text-3xl font-black">{panenCount}</p>
        </div>
      </div>
    </div>
  </section>

  <!-- Action Bar -->
  <div
    class="sticky z-[100] flex flex-row items-center gap-3 bg-background/60 backdrop-blur-3xl p-3 md:p-4 rounded-[2rem] border border-border/50 shadow-2xl transition-all"
    style="top: calc(var(--nav-height, 5rem) + 1rem)"
  >
    <div class="relative flex-1 group">
      <Search
        size={18}
        class="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-emerald-500 transition-colors"
      />
      <input
        type="text"
        bind:value={searchQuery}
        placeholder="Cari komoditas, input, atau plot..."
        class="w-full bg-muted/40 border-transparent focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/10 rounded-2xl pl-11 pr-4 py-3 text-sm font-medium transition-all"
      />
    </div>

    <div class="hidden lg:flex items-center gap-2">
      <select
        bind:value={categoryFilter}
        class="w-40 bg-muted/30 border-transparent rounded-xl px-3 py-2.5 text-[10px] font-black uppercase outline-none"
      >
        <option value="">Semua Kategori</option>
        <option value="input">INPUT</option>
        <option value="tenaga kerja">TENAGA KERJA</option>
        <option value="hasil panen">HASIL PANEN</option>
      </select>

      <select
        bind:value={demoplotFilter}
        class="w-40 bg-muted/30 border-transparent rounded-xl px-3 py-2.5 text-[10px] font-black uppercase outline-none"
      >
        <option value="">Semua Plot</option>
        {#each demoplots as dp}
          <option value={dp.id}>{dp.nama_demoplot}</option>
        {/each}
      </select>
    </div>

    <button
      onclick={openAddForm}
      class="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-widest text-[10px] p-4 md:py-4 md:px-8 rounded-2xl transition-all shadow-lg active:scale-95 whitespace-nowrap"
    >
      <Plus size={18} /> <span class="hidden md:inline">Tambah Catatan</span>
    </button>
  </div>

  <!-- Records Grid -->
  {#if loading && records.length === 0}
    <div class="py-24 text-center">
      <RefreshCw
        size={40}
        class="animate-spin text-emerald-500 mx-auto opacity-20"
      />
    </div>
  {:else if filteredRecords.length === 0}
    <div
      class="py-32 text-center bg-muted/20 rounded-[3rem] border-2 border-dashed border-border/50"
    >
      <BarChart3 size={48} class="mx-auto text-muted-foreground/30 mb-4" />
      <h3 class="text-lg font-black uppercase text-muted-foreground">
        Tidak ada data produktivitas
      </h3>
    </div>
  {:else}
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {#each paginatedRecords as r, i}
        {@const Icon = getCategoryIcon(r.kategori_pencatatan)}
        <div
          class="group relative bg-card border border-border shadow-xl rounded-[2.5rem] flex flex-col transition-all hover:border-emerald-500/50 hover:-translate-y-1 hover:z-50"
          in:fly={{ y: 20, delay: i * 50 }}
        >
          <div class="p-6 space-y-4">
            <div class="flex items-start justify-between">
              <div class="flex items-center gap-3">
                <div
                  class="w-12 h-12 rounded-2xl {getCategoryColor(
                    r.kategori_pencatatan,
                  )} flex items-center justify-center text-white shadow-lg"
                >
                  <Icon size={24} />
                </div>
                <div>
                  <p
                    class="text-[10px] font-black uppercase tracking-widest text-muted-foreground"
                  >
                    {r.kategori_pencatatan}
                  </p>
                  <h3 class="font-black text-lg leading-tight">
                    {r.kategori_pencatatan === "input"
                      ? r.jenis_input
                      : r.kategori_pencatatan === "tenaga kerja"
                        ? r.jenis_pekerjaan
                        : r.nama_jenis}
                  </h3>
                </div>
              </div>
              <div
                class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <div class="relative group/tip">
                  <button
                    onclick={() => openEditForm(r)}
                    class="p-2 hover:bg-muted rounded-xl transition-colors"
                  >
                    <Pencil size={14} class="text-slate-500" />
                  </button>
                  <!-- Tooltip -->
                  <div
                    class="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 px-3 py-1.5 bg-foreground text-background text-[10px] font-black uppercase tracking-widest rounded-lg opacity-0 pointer-events-none group-hover/tip:opacity-100 group-hover/tip:-translate-y-1 translate-y-1 transition-all duration-200 whitespace-nowrap z-50 shadow-xl"
                  >
                    Edit
                    <div
                      class="absolute top-full left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-foreground rotate-45"
                    ></div>
                  </div>
                </div>

                <div class="relative group/tip">
                  <button
                    onclick={() => {
                      deleteTarget = r;
                      showDeleteConfirm = true;
                    }}
                    class="p-2 hover:bg-red-50/50 rounded-xl transition-colors"
                  >
                    <Trash2 size={14} class="text-red-500" />
                  </button>
                  <!-- Tooltip -->
                  <div
                    class="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 px-3 py-1.5 bg-foreground text-background text-[10px] font-black uppercase tracking-widest rounded-lg opacity-0 pointer-events-none group-hover/tip:opacity-100 group-hover/tip:-translate-y-1 translate-y-1 transition-all duration-200 whitespace-nowrap z-50 shadow-xl"
                  >
                    Hapus
                    <div
                      class="absolute top-full left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-foreground rotate-45"
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-4 py-4 border-y border-border/50">
              {#if r.kategori_pencatatan === "input"}
                <div>
                  <p
                    class="text-[9px] font-black text-muted-foreground uppercase"
                  >
                    Jumlah
                  </p>
                  <p class="text-sm font-bold">{r.jumlah_pakai} {r.satuan}</p>
                </div>
                <div>
                  <p
                    class="text-[9px] font-black text-muted-foreground uppercase"
                  >
                    Biaya
                  </p>
                  <p class="text-sm font-bold text-blue-600">
                    {formatCurrency(r.biaya_total)}
                  </p>
                </div>
              {:else if r.kategori_pencatatan === "tenaga kerja"}
                <div>
                  <p
                    class="text-[9px] font-black text-muted-foreground uppercase"
                  >
                    Waktu
                  </p>
                  <p class="text-sm font-bold">{r.jumlah_jam_kerja} Jam</p>
                </div>
                <div>
                  <p
                    class="text-[9px] font-black text-muted-foreground uppercase"
                  >
                    Upah
                  </p>
                  <p class="text-sm font-bold text-amber-600">
                    {formatCurrency(r.biaya_tenaga_kerja)}
                  </p>
                </div>
              {:else if r.kategori_pencatatan === "hasil panen"}
                <div>
                  <p
                    class="text-[9px] font-black text-muted-foreground uppercase"
                  >
                    Berat Basah
                  </p>
                  <p class="text-sm font-bold text-emerald-600">
                    {r.berat_basah_kg} Kg
                  </p>
                </div>
                <div>
                  <p
                    class="text-[9px] font-black text-muted-foreground uppercase"
                  >
                    Putaran
                  </p>
                  <p class="text-sm font-bold">Ke-{r.putaran_panen}</p>
                </div>
              {/if}
            </div>

            <div class="flex items-center justify-between text-[10px]">
              <div
                class="flex items-center gap-1.5 text-muted-foreground font-bold uppercase"
              >
                <MapPin size={12} />
                {r.demoplot?.nama_demoplot}
              </div>
              <div
                class="flex items-center gap-1.5 text-muted-foreground font-bold uppercase"
              >
                <Calendar size={12} />
                {formatDate(r.tanggal_pencatatan)}
              </div>
            </div>
          </div>
        </div>
      {/each}
    </div>

    <!-- Pagination -->
    {#if totalPages > 1}
      <div class="flex justify-center items-center gap-4 mt-12">
        <button
          disabled={currentPage === 1}
          onclick={() => (currentPage -= 1)}
          class="p-4 bg-card border border-border rounded-2xl disabled:opacity-30"
        >
          <ChevronLeft size={20} />
        </button>
        <span class="text-sm font-black uppercase tracking-widest">
          Halaman {currentPage} dari {totalPages}
        </span>
        <button
          disabled={currentPage === totalPages}
          onclick={() => (currentPage += 1)}
          class="p-4 bg-card border border-border rounded-2xl disabled:opacity-30"
        >
          <ChevronRight size={20} />
        </button>
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
            {isEditing ? "Perbarui Data" : "Tambah Catatan"}
          </h2>
        </div>
        <button
          onclick={() => (showFormDrawer = false)}
          class="p-3 bg-white border border-border rounded-2xl hover:bg-red-50 hover:text-red-500 transition-all"
          ><X size={24} /></button
        >
      </div>

      <!-- Drawer Content -->
      <div class="overflow-y-auto grow p-8 space-y-8 custom-scrollbar">
        <!-- Main Info -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="space-y-2">
            <label
              class="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1"
              >Plot Kebun</label
            >
            <select
              bind:value={formDemoplotId}
              class="w-full bg-muted/30 border-border rounded-xl p-4 text-sm font-bold focus:ring-2 ring-emerald-500/20"
            >
              <option value="">Pilih Plot</option>
              {#each demoplots as dp}
                <option value={dp.id}>{dp.nama_demoplot}</option>
              {/each}
            </select>
          </div>
          <div class="space-y-2">
            <label
              class="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1"
              >Kategori</label
            >
            <select
              bind:value={formKategori}
              class="w-full bg-muted/30 border-border rounded-xl p-4 text-sm font-bold focus:ring-2 ring-emerald-500/20"
            >
              <option value="">Pilih Kategori</option>
              <option value="input">Input Pertanian</option>
              <option value="tenaga kerja">Tenaga Kerja</option>
              <option value="hasil panen">Hasil Panen</option>
            </select>
          </div>
        </div>

        <div class="space-y-2">
          <label
            class="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1"
            >Tanggal Pencatatan</label
          >
          <input
            type="date"
            bind:value={formTanggal}
            class="w-full bg-muted/30 border-border rounded-xl p-4 text-sm font-bold focus:ring-2 ring-emerald-500/20"
          />
        </div>

        <div class="pt-6 border-t border-border/50">
          {#if formKategori === "input"}
            <div class="space-y-6" in:fade>
              <div class="space-y-2">
                <label
                  class="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1"
                  >Jenis Input</label
                >
                <input
                  type="text"
                  bind:value={formJenisInput}
                  placeholder="Misal: Urea, NPK, Roundup..."
                  class="w-full bg-muted/30 border-border rounded-xl p-4 text-sm font-bold focus:ring-2 ring-emerald-500/20"
                />
              </div>
              <div class="grid grid-cols-2 gap-6">
                <div class="space-y-2">
                  <label
                    class="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1"
                    >Jumlah</label
                  >
                  <input
                    type="number"
                    bind:value={formJumlahPakai}
                    class="w-full bg-muted/30 border-border rounded-xl p-4 text-sm font-bold focus:ring-2 ring-emerald-500/20"
                  />
                </div>
                <div class="space-y-2">
                  <label
                    class="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1"
                    >Satuan</label
                  >
                  <input
                    type="text"
                    bind:value={formSatuan}
                    placeholder="Kg/L/Karung"
                    class="w-full bg-muted/30 border-border rounded-xl p-4 text-sm font-bold focus:ring-2 ring-emerald-500/20"
                  />
                </div>
              </div>
              <div class="grid grid-cols-2 gap-6">
                <div class="space-y-2">
                  <label
                    class="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1"
                    >Biaya Total (Rp)</label
                  >
                  <input
                    type="number"
                    bind:value={formBiayaTotal}
                    placeholder="0"
                    class="w-full bg-muted/30 border-border rounded-xl p-4 text-sm font-bold focus:ring-2 ring-emerald-500/20"
                  />
                </div>
                <div class="space-y-2">
                  <label
                    class="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1"
                    >Waktu Penggunaan</label
                  >
                  <input
                    type="date"
                    bind:value={formWaktuPenggunaan}
                    class="w-full bg-muted/30 border-border rounded-xl p-4 text-sm font-bold focus:ring-2 ring-emerald-500/20"
                  />
                </div>
              </div>
            </div>
          {:else if formKategori === "tenaga kerja"}
            <div class="space-y-6" in:fade>
              <div class="grid grid-cols-2 gap-6">
                <div class="space-y-2">
                  <label
                    class="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1"
                    >Jenis Pekerjaan</label
                  >
                  <input
                    type="text"
                    bind:value={formJenisPekerjaan}
                    placeholder="Misal: Penyiangan, Pemupukan..."
                    class="w-full bg-muted/30 border-border rounded-xl p-4 text-sm font-bold focus:ring-2 ring-emerald-500/20"
                  />
                </div>
                <div class="space-y-2">
                  <label
                    class="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1"
                    >Tanggal Pelaksanaan</label
                  >
                  <input
                    type="date"
                    bind:value={formTanggalPelaksanaan}
                    class="w-full bg-muted/30 border-border rounded-xl p-4 text-sm font-bold focus:ring-2 ring-emerald-500/20"
                  />
                </div>
              </div>
              <div class="grid grid-cols-2 gap-6">
                <div class="space-y-2">
                  <label
                    class="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1"
                    >Lama Kerja (Jam)</label
                  >
                  <input
                    type="number"
                    bind:value={formJamKerja}
                    placeholder="0"
                    class="w-full bg-muted/30 border-border rounded-xl p-4 text-sm font-bold focus:ring-2 ring-emerald-500/20"
                  />
                </div>
                <div class="space-y-2">
                  <label
                    class="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1"
                    >Upah Total (Rp)</label
                  >
                  <input
                    type="number"
                    bind:value={formBiayaTK}
                    placeholder="0"
                    class="w-full bg-muted/30 border-border rounded-xl p-4 text-sm font-bold focus:ring-2 ring-emerald-500/20"
                  />
                </div>
              </div>
            </div>
          {:else if formKategori === "hasil panen"}
            <div class="space-y-6" in:fade>
              <div class="grid grid-cols-2 gap-6">
                <div class="space-y-2">
                  <label
                    class="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1"
                    >Kategori Tanaman</label
                  >
                  <select
                    bind:value={formKategoriTanaman}
                    class="w-full bg-muted/30 border-border rounded-xl p-4 text-sm font-bold focus:ring-2 ring-emerald-500/20"
                  >
                    <option value="tanaman utama">Utama</option>
                    <option value="pohon penaung">Penaung</option>
                    <option value="tanaman lainnya">Lainnya</option>
                  </select>
                </div>
                <div class="space-y-2">
                  <label
                    class="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1"
                    >Nama Komoditas</label
                  >
                  <input
                    type="text"
                    bind:value={formNamaJenis}
                    placeholder="Misal: Kopi Arabika"
                    class="w-full bg-muted/30 border-border rounded-xl p-4 text-sm font-bold focus:ring-2 ring-emerald-500/20"
                  />
                </div>
              </div>
              <div class="grid grid-cols-2 gap-6">
                <div class="space-y-2">
                  <label
                    class="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1"
                    >Berat Basah (Kg)</label
                  >
                  <input
                    type="number"
                    bind:value={formBeratBasah}
                    placeholder="0"
                    class="w-full bg-muted/30 border-border rounded-xl p-4 text-sm font-bold focus:ring-2 ring-emerald-500/20"
                  />
                </div>
                <div class="space-y-2">
                  <label
                    class="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1"
                    >Putaran Panen</label
                  >
                  <input
                    type="number"
                    bind:value={formPutaranPanen}
                    placeholder="1"
                    class="w-full bg-muted/30 border-border rounded-xl p-4 text-sm font-bold focus:ring-2 ring-emerald-500/20"
                  />
                </div>
              </div>
              <div class="space-y-2">
                <label
                  class="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1"
                  >Tanggal Panen</label
                >
                <input
                  type="date"
                  bind:value={formTanggalPanen}
                  class="w-full bg-muted/30 border-border rounded-xl p-4 text-sm font-bold focus:ring-2 ring-emerald-500/20"
                />
              </div>
              <div class="space-y-2">
                <label
                  class="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1"
                  >Catatan Kualitas</label
                >
                <textarea
                  bind:value={formCatatanKualitas}
                  placeholder="Misal: Grade A, Petik Merah..."
                  class="w-full bg-muted/30 border-border rounded-xl p-4 text-sm font-medium h-32 resize-none focus:ring-2 ring-emerald-500/20"
                ></textarea>
              </div>

              <div class="pt-6 border-t border-border/50 space-y-6">
                <h3 class="text-[12px] font-black uppercase tracking-widest text-emerald-500">Pasca Panen (Opsional)</h3>
                
                <div class="grid grid-cols-2 gap-6">
                  <div class="space-y-2">
                    <label
                      class="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1"
                      >Metode Pengolahan</label
                    >
                    <input
                      type="text"
                      bind:value={formMetodePengolahan}
                      placeholder="Misal: Full Wash, Natural..."
                      class="w-full bg-muted/30 border-border rounded-xl p-4 text-sm font-bold focus:ring-2 ring-emerald-500/20"
                    />
                  </div>
                  <div class="space-y-2">
                    <label
                      class="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1"
                      >Tanggal Selesai Olah</label
                    >
                    <input
                      type="date"
                      bind:value={formTanggalSelesai}
                      class="w-full bg-muted/30 border-border rounded-xl p-4 text-sm font-bold focus:ring-2 ring-emerald-500/20"
                    />
                  </div>
                </div>

                <div class="grid grid-cols-2 gap-6">
                  <div class="space-y-2">
                    <label
                      class="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1"
                      >Berat Kering (Kg)</label
                    >
                    <input
                      type="number"
                      bind:value={formBeratKering}
                      placeholder="0"
                      class="w-full bg-muted/30 border-border rounded-xl p-4 text-sm font-bold focus:ring-2 ring-emerald-500/20"
                    />
                  </div>
                  <div class="space-y-2">
                    <label
                      class="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1"
                      >Berat Terbuang (Kg)</label
                    >
                    <input
                      type="number"
                      bind:value={formBeratTerbuang}
                      placeholder="0"
                      class="w-full bg-muted/30 border-border rounded-xl p-4 text-sm font-bold focus:ring-2 ring-emerald-500/20"
                    />
                  </div>
                </div>
              </div>
            </div>
          {/if}
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
          disabled={loading}
          class="px-8 py-4 bg-emerald-600 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-600/20 disabled:opacity-50"
        >
          {loading ? "Menyimpan..." : "Simpan Data"}
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- Alert Notification -->
{#if error}
  <div
    class="fixed bottom-8 left-1/2 -translate-x-1/2 z-[2000]"
    in:fly={{ y: 20 }}
  >
    <div
      class="bg-red-600 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3"
    >
      <AlertCircle size={20} />
      <p class="text-sm font-bold uppercase tracking-widest">{error}</p>
      <button
        onclick={() => (error = "")}
        class="p-1 hover:bg-white/20 rounded-lg"
      >
        <X size={16} />
      </button>
    </div>
  </div>
{/if}

{#if success}
  <div
    class="fixed bottom-8 left-1/2 -translate-x-1/2 z-[2000]"
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

<!-- Delete Confirmation -->
{#if showDeleteConfirm}
  <div class="fixed inset-0 z-[2000] flex items-center justify-center p-6">
    <div
      class="absolute inset-0 bg-slate-950/60 backdrop-blur-md"
      onclick={() => (showDeleteConfirm = false)}
    ></div>
    <div
      class="relative bg-background border border-border rounded-[2.5rem] p-8 max-w-sm w-full space-y-6"
      in:scale
    >
      <div
        class="w-16 h-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto"
      >
        <Trash2 size={32} />
      </div>
      <div class="text-center space-y-2">
        <h3 class="text-xl font-black">Hapus Data?</h3>
        <p class="text-sm text-muted-foreground font-medium">
          Catatan ini akan dihapus secara permanen dari sistem.
        </p>
      </div>
      <div class="flex gap-3">
        <button
          onclick={() => (showDeleteConfirm = false)}
          class="flex-1 py-4 bg-muted hover:bg-muted/80 rounded-2xl font-black uppercase tracking-widest text-[10px]"
          >Batal</button
        >
        <button
          onclick={confirmDelete}
          class="flex-1 py-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black uppercase tracking-widest text-[10px]"
          >Hapus</button
        >
      </div>
    </div>
  </div>
{/if}

<style>
  :global(body) {
    background-color: hsl(var(--background));
  }
</style>
