<script lang="ts">
  import { onMount } from "svelte";
  import {
    getPetaniList,
    createPetani,
    updatePetani,
    deletePetani,
    uploadFotoProfil,
    deleteFotoProfil,
  } from "$lib/services/petani";

  import type { Petani } from "../../../types/petani";
  import {
    BotMessageSquare,
    GraduationCap,
    Mail,
    Phone,
    FileDigit,
    VenusAndMars,
    Plus,
    Pencil,
    Trash2,
    Search,
    X,
    User,
    ChevronLeft,
    ChevronRight,
    Upload,
    Eye,
    AlertCircle,
    MapPin,
    Sprout,
    LandPlot,
    Users,
    Sparkles,
    RefreshCw,
    CheckCircle2,
    AlertTriangle,
    Calendar,
    Smile,
    ArrowLeft,
  } from "@lucide/svelte";

  import { fade, fly, scale } from "svelte/transition";
  import { backOut } from "svelte/easing";

  let petaniList = $state<Petani[]>([]);

  let loading = $state(true);
  let error = $state("");
  let success = $state("");
  let globalFilter = $state("");
  let showFormModal = $state(false);
  let showViewModal = $state(false);
  let isEditing = $state(false);
  let editingId = $state("");
  let showDeleteConfirm = $state(false);
  let deleteTarget = $state<Petani | null>(null);
  let selectedPetani = $state<Petani | null>(null);

  let totalLuasLahan = $derived(
    petaniList
      .reduce((acc, p) => acc + (Number(p.luas_lahan) || 0), 0)
      .toFixed(1),
  );

  const avatarImages = [
    "female.webp",
    "female1.webp",
    "female2.webp",
    "female3.webp",
    "female4.webp",
    "male.webp",
    "male1.webp",
    "male2.webp",
    "male3.webp",
    "male4.webp",
  ];
  let showAvatarSelection = $state(false);

  function openViewModal(petani: Petani) {
    selectedPetani = petani;
    showViewModal = true;
  }

  // Pagination state
  let pageIndex = $state(0);
  const pageSize = 12;

  // Filtered data
  let filteredPetani = $derived(
    petaniList.filter(
      (p) =>
        !globalFilter ||
        p.nama_lengkap?.toLowerCase().includes(globalFilter.toLowerCase()) ||
        p.desa?.toLowerCase().includes(globalFilter.toLowerCase()) ||
        p.tanaman_komoditas?.toLowerCase().includes(globalFilter.toLowerCase()),
    ),
  );

  // Paginated data
  let totalPages = $derived(Math.ceil(filteredPetani.length / pageSize));
  let paginatedPetani = $derived(
    filteredPetani.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize),
  );
  let startItem = $derived(pageIndex * pageSize + 1);
  let endItem = $derived(
    Math.min((pageIndex + 1) * pageSize, filteredPetani.length),
  );

  // Table helper functions
  function canPreviousPage() {
    return pageIndex > 0;
  }
  function canNextPage() {
    return pageIndex < totalPages - 1;
  }
  function previousPage() {
    if (canPreviousPage()) pageIndex--;
  }
  function nextPage() {
    if (canNextPage()) pageIndex++;
  }
  function setPage(i: number) {
    pageIndex = i;
  }

  // Reset to page 0 when filter changes
  $effect(() => {
    globalFilter;
    pageIndex = 0;
  });

  // Prevent background scroll when modals/drawers are open
  $effect(() => {
    if (showViewModal || showFormModal || showDeleteConfirm) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
    return () => {
      document.body.style.overflow = "auto";
    };
  });

  // Form fields
  let namaLengkap = $state("");
  let nik = $state("");
  let noTelepon = $state("");
  let email = $state("");
  let alamat = $state("");
  let desa = $state("");
  let kecamatan = $state("");
  let kabupaten = $state("");
  let provinsi = $state("");
  let luasLahan = $state("");
  let tanamanKomoditas = $state("");
  let tanggalLahir = $state("");

  let kelompokTani = $state("");
  let catatan = $state("");
  let jenisKelamin = $state<"laki-laki" | "perempuan" | "">("");
  let pendidikan = $state("");
  let fotoProfil = $state("");
  let uploading = $state(false);
  let uploadError = $state("");
  let fileInput: HTMLInputElement;

  async function loadPetani() {
    loading = true;
    error = "";
    try {
      const data = await getPetaniList();
      petaniList = data;
    } catch (err) {
      error = err instanceof Error ? err.message : "Gagal memuat data";
      console.error("Error loading petani:", err);
    } finally {
      loading = false;
    }
  }

  function openAddForm() {
    isEditing = false;
    editingId = "";
    namaLengkap = "";
    nik = "";
    noTelepon = "";
    email = "";
    alamat = "";
    desa = "";
    kecamatan = "";
    kabupaten = "";
    provinsi = "";
    luasLahan = "";
    tanamanKomoditas = "";
    tanggalLahir = "";
    kelompokTani = "";
    catatan = "";
    jenisKelamin = "";
    pendidikan = "";
    fotoProfil = "";
    uploadError = "";
    showFormModal = true;
  }

  function openEditForm(petani: Petani) {
    isEditing = true;
    editingId = petani.id;
    namaLengkap = petani.nama_lengkap || "";
    nik = petani.nik || "";
    noTelepon = petani.no_telepon || "";
    email = petani.email || "";
    alamat = petani.alamat || "";
    desa = petani.desa || "";
    kecamatan = petani.kecamatan || "";
    kabupaten = petani.kabupaten || "";
    provinsi = petani.provinsi || "";
    luasLahan = petani.luas_lahan?.toString() || "";
    tanamanKomoditas = petani.tanaman_komoditas || "";
    // Ensure date is in YYYY-MM-DD format for the input
    tanggalLahir = petani.tanggal_lahir
      ? petani.tanggal_lahir.split("T")[0]
      : "";

    kelompokTani = petani.kelompok_tani || "";
    catatan = petani.catatan || "";
    jenisKelamin = petani.jenis_kelamin || "";
    pendidikan = petani.pendidikan || "";
    fotoProfil = petani.foto_profil || "";
    uploadError = "";
    showFormModal = true;
  }

  async function handleFileChange(e: Event) {
    const target = e.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;

    uploading = true;
    uploadError = "";

    try {
      // Validate file type
      const allowedTypes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/webp",
      ];
      if (!allowedTypes.includes(file.type)) {
        uploadError =
          "Tipe file tidak didukung. Gunakan JPG, JPEG, PNG, atau WEBP";
        return;
      }

      // Validate file size (max 100 KB)
      const maxSize = 100 * 1024; // 100KB in bytes
      if (file.size > maxSize) {
        uploadError = "Ukuran file maksimal 100KB";
        return;
      }

      // Upload photo and get public URL
      const tempId = editingId || "temp-" + Date.now();
      const publicUrl = await uploadFotoProfil(file, tempId);
      fotoProfil = publicUrl;
    } catch (err) {
      uploadError =
        err instanceof Error ? err.message : "Gagal mengunggah foto";
      console.error("Error uploading photo:", err);
    } finally {
      uploading = false;
      // Reset file input
      if (fileInput) {
        fileInput.value = "";
      }
    }
  }

  function handleDeletePhoto() {
    fotoProfil = "";
    uploadError = "";
    if (fileInput) {
      fileInput.value = "";
    }
  }

  function closeModal() {
    showFormModal = false;
  }

  async function handleSubmit() {
    error = "";
    success = "";

    if (!namaLengkap || namaLengkap.trim() === "") {
      error = "Nama lengkap harus diisi";
      return;
    }

    try {
      const petaniData = {
        nama_lengkap: namaLengkap.trim(),
        nik: nik || null,
        no_telepon: noTelepon || null,
        email: email || null,
        alamat: alamat || null,
        desa: desa || null,
        kecamatan: kecamatan || null,
        kabupaten: kabupaten || null,
        provinsi: provinsi || null,
        luas_lahan: luasLahan ? parseFloat(luasLahan) : null,
        tanaman_komoditas: tanamanKomoditas || null,
        tanggal_lahir: tanggalLahir || null,

        kelompok_tani: kelompokTani || null,
        catatan: catatan || null,
        jenis_kelamin: jenisKelamin || null,
        pendidikan: pendidikan || null,
        foto_profil: fotoProfil || null,
      };

      console.log(
        "Attempting to save petani data:",
        JSON.stringify(petaniData, null, 2),
      );

      if (isEditing) {
        console.log("Updating petani with ID:", editingId);
        await updatePetani(editingId, petaniData);
        success = "Data petani berhasil diperbarui";
      } else {
        console.log("Creating new petani");
        await createPetani(petaniData);
        success = "Data petani berhasil ditambahkan";
      }

      showFormModal = false;
      await loadPetani();

      setTimeout(() => {
        success = "";
      }, 3000);
    } catch (err: any) {
      console.error("Full error object:", err);
      // Show more detailed error message if available with optional chaining
      error =
        err?.message ||
        err?.error_description ||
        (err instanceof Error ? err.message : "Gagal menyimpan data petani");
      console.error("Error saving petani:", err);
    }
  }

  const initiateDelete = (petani: Petani) => {
    deleteTarget = petani;
    showDeleteConfirm = true;
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    showDeleteConfirm = false;

    try {
      await deletePetani(deleteTarget.id);
      success = "Data petani berhasil dihapus";
      await loadPetani();

      setTimeout(() => {
        success = "";
      }, 3000);
    } catch (err) {
      error =
        err instanceof Error ? err.message : "Gagal menghapus data petani";
      console.error("Error deleting petani:", err);
    }
  };

  const cancelDelete = () => {
    showDeleteConfirm = false;
    deleteTarget = null;
  };

  async function handleDelete(petani: Petani) {
    if (
      !confirm(
        `Apakah Anda yakin ingin menghapus data petani "${petani.nama_lengkap}"?`,
      )
    ) {
      return;
    }

    try {
      await deletePetani(petani.id);
      success = "Data petani berhasil dihapus";
      await loadPetani();

      setTimeout(() => {
        success = "";
      }, 3000);
    } catch (err) {
      error =
        err instanceof Error ? err.message : "Gagal menghapus data petani";
      console.error("Error deleting petani:", err);
    }
  }

  function formatDate(dateStr: string | null | undefined): string {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  onMount(() => {
    loadPetani();
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
      <!-- Left Column: Branding & Title -->
      <div class="space-y-6 text-center lg:text-left">
        <div class="flex items-center justify-center lg:justify-start gap-3">
          <a
            href="/dashboard"
            class="p-2 hover:bg-white/20 backdrop-blur-md rounded-xl transition-colors"
          >
            <ArrowLeft size={18} class="text-white" />
          </a>
          <div
            class="inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 backdrop-blur-md rounded-full border border-white/10 text-[10px] font-black uppercase tracking-[0.2em]"
          >
            <Users size={12} class="text-emerald-400" /> Profil Petani
          </div>
        </div>
        <div class="space-y-4">
          <h1
            class="text-4xl md:text-7xl font-black tracking-tighter leading-[0.9]"
          >
            Data & <span
              class="bg-gradient-to-r from-emerald-400 to-emerald-200 bg-clip-text text-transparent"
              >Informasi</span
            >
          </h1>
          <p
            class="text-lg text-emerald-50/70 font-medium max-w-xl mx-auto lg:mx-0"
          >
            Basis data pengelola lahan dalam ekosistem Agrodemoplot.
          </p>
        </div>
      </div>

      <!-- Right Column: Stats Grid -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div
          class="group relative p-8 bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[2rem] hover:bg-white/10 hover:-translate-y-1 hover:shadow-2xl hover:border-white/20 transition-all duration-300 overflow-hidden active:scale-95"
        >
          <div
            class="absolute -right-4 -bottom-4 text-emerald-400/20 group-hover:text-emerald-400/30 transition-colors"
          >
            <Users size={100} strokeWidth={1} />
          </div>
          <p
            class="text-[10px] font-black text-emerald-200/40 uppercase tracking-[0.2em] mb-1"
          >
            Total Terdaftar
          </p>
          <div class="flex items-baseline gap-2">
            <span class="text-4xl font-black">{petaniList.length}</span>
            <span class="text-[10px] font-bold text-emerald-400">Petani</span>
          </div>
        </div>

        <div
          class="group relative p-8 bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[2rem] hover:bg-white/10 hover:-translate-y-1 hover:shadow-2xl hover:border-white/20 transition-all duration-300 overflow-hidden active:scale-95"
        >
          <div
            class="absolute -right-4 -bottom-4 text-blue-400/20 group-hover:text-blue-400/30 transition-colors"
          >
            <LandPlot size={100} strokeWidth={1} />
          </div>
          <p
            class="text-[10px] font-black text-emerald-200/40 uppercase tracking-[0.2em] mb-1"
          >
            Total Luasan Lahan
          </p>
          <div class="flex items-baseline gap-2">
            <span class="text-4xl font-black">{totalLuasLahan}</span>
            <span class="text-[10px] font-bold text-blue-400">Hektar</span>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- Action Bar -->
  <div
    class="sticky z-[100] flex flex-row items-center gap-4 bg-background/60 backdrop-blur-3xl p-4 rounded-[2rem] border border-border/50 shadow-2xl shadow-black/5 transition-all duration-500"
    style="top: calc(var(--nav-height, 5rem) + 1rem)"
    in:fade={{ delay: 200 }}
  >
    <div class="relative flex-1 w-full group">
      <Search
        size={20}
        class="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-emerald-500 transition-colors"
      />
      <input
        type="text"
        bind:value={globalFilter}
        placeholder="Cari nama, desa, atau komoditas..."
        class="w-full bg-muted/30 border-transparent focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/10 rounded-2xl pl-12 pr-4 py-3 text-sm font-medium transition-all"
      />
    </div>
    <button
      onclick={openAddForm}
      class="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-widest text-[10px] p-4 md:py-4 md:px-8 rounded-2xl transition-all shadow-lg shadow-emerald-600/20 active:scale-95 whitespace-nowrap"
    >
      <Plus size={18} />
      <span class="hidden md:inline">Tambah Petani</span>
    </button>
  </div>

  <!-- Content States -->
  {#if loading}
    <div class="flex flex-col items-center justify-center py-24 gap-4" in:fade>
      <div
        class="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-600 rounded-full animate-spin"
      ></div>
      <p
        class="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground animate-pulse"
      >
        Sinkronisasi Data
      </p>
    </div>
  {/if}

  <!-- Success/Error Toast -->
  {#if success}
    <div
      class="fixed bottom-10 left-1/2 -translate-x-1/2 z-[2000] px-8 py-4 bg-emerald-600 text-white rounded-2xl shadow-2xl flex items-center gap-3 font-black uppercase text-[10px] tracking-widest"
      in:fly={{ y: 20 }}
      out:fade
    >
      <CheckCircle2 size={20} />
      {success}
    </div>
  {/if}
  {#if error}
    <div
      class="fixed bottom-10 left-1/2 -translate-x-1/2 z-[2000] px-8 py-4 bg-red-600 text-white rounded-2xl shadow-2xl flex items-center gap-3 font-black uppercase text-[10px] tracking-widest"
      in:fly={{ y: 20 }}
      out:fade
    >
      <AlertTriangle size={20} />
      {error}
      <button
        onclick={() => (error = "")}
        class="ml-4 opacity-50 hover:opacity-100 transition-opacity"
        ><X size={16} /></button
      >
    </div>
  {/if}

  <!-- Grid List -->
  {#if !loading && petaniList.length === 0}
    <div
      class="flex flex-col items-center justify-center py-32 text-center space-y-6"
      in:scale
    >
      <div
        class="w-24 h-24 bg-muted rounded-full flex items-center justify-center text-muted-foreground/30"
      >
        <User size={48} />
      </div>
      <div>
        <h3 class="text-2xl font-black uppercase tracking-tight">
          Database Kosong
        </h3>
        <p class="text-muted-foreground font-medium">
          Belum ada data petani yang tersimpan dalam sistem.
        </p>
      </div>
      <button
        onclick={openAddForm}
        class="px-8 py-3 bg-emerald-600 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl"
        >Mulai Menambah</button
      >
    </div>
  {:else if !loading}
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
      {#each paginatedPetani as petani, i (petani.id)}
        <div
          class="group relative bg-card/60 backdrop-blur-3xl border border-border shadow-2xl shadow-black/5 rounded-[2.5rem] overflow-hidden p-3 transition-all duration-500 hover:border-emerald-500/50 hover:-translate-y-2"
          in:fly={{ y: 20, delay: 100 * (i % pageSize), easing: backOut }}
        >
          <!-- Card Header Mesh -->
          <div
            class="relative h-32 overflow-hidden rounded-[2rem] bg-emerald-950 mb-6"
          >
            <div class="absolute inset-0 opacity-40">
              <div
                class="absolute -top-1/2 -right-1/4 w-full h-[150%] bg-emerald-500 blur-3xl rounded-full"
              ></div>
            </div>

            <div class="relative z-10 p-6 flex items-center gap-4">
              <div class="relative group/avatar">
                <div
                  class="w-20 h-20 rounded-[1.5rem] overflow-hidden border-2 border-white/20 shadow-2xl transition-transform duration-500 group-hover/avatar:scale-105"
                >
                  {#if petani.foto_profil}
                    <img
                      src={petani.foto_profil}
                      alt={petani.nama_lengkap}
                      class="w-full h-full object-cover"
                    />
                  {:else}
                    <div
                      class="w-full h-full bg-white/10 flex items-center justify-center text-white"
                    >
                      <User size={32} />
                    </div>
                  {/if}
                </div>
              </div>

              <div class="grow min-w-0">
                <h3 class="text-lg font-black text-white truncate leading-none">
                  {petani.nama_lengkap}
                </h3>
                <div
                  class="flex items-center gap-1.5 text-[10px] text-emerald-100/60 font-bold uppercase tracking-wider mt-2"
                >
                  <MapPin size={10} />
                  {petani.desa || "-"}
                </div>
              </div>
            </div>
          </div>

          <div class="px-5 pb-5 space-y-6">
            <div class="grid grid-cols-1 gap-3">
              <div class="p-4 bg-muted/30 rounded-2xl border border-border/50">
                <p
                  class="text-[8px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-1"
                >
                  Komoditas
                </p>
                <div class="flex items-center gap-2">
                  <Sprout size={14} class="text-emerald-500" />
                  <span class="text-xs font-bold truncate"
                    >{petani.tanaman_komoditas || "-"}</span
                  >
                </div>
              </div>
              <div class="p-4 bg-muted/30 rounded-2xl border border-border/50">
                <p
                  class="text-[8px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-1"
                >
                  Luas Lahan
                </p>
                <div class="flex items-center gap-2">
                  <LandPlot size={14} class="text-emerald-500" />
                  <span class="text-xs font-bold"
                    >{petani.luas_lahan ? `${petani.luas_lahan} ha` : "-"}</span
                  >
                </div>
              </div>
            </div>

            <!-- Footer Meta -->
            <div
              class="flex items-center justify-between text-[10px] font-bold text-muted-foreground/60 border-t border-border/40 pt-4"
            >
              <div>#{petani.id.slice(0, 8).toUpperCase()}</div>
              <div>{formatDate(petani.created_at)}</div>
            </div>

            <!-- Actions -->
            <div class="flex gap-2">
              <div class="relative flex-1 group/btn">
                <button
                  onclick={() => openViewModal(petani)}
                  class="w-full h-11 flex items-center justify-center bg-white border border-border hover:border-emerald-500/50 hover:text-emerald-600 rounded-xl transition-all"
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
              <div class="relative flex-1 group/btn">
                <button
                  onclick={() => openEditForm(petani)}
                  class="w-full h-11 flex items-center justify-center bg-white border border-border hover:border-blue-500/50 hover:text-blue-600 rounded-xl transition-all"
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

              <div class="relative flex-1 group/btn">
                <button
                  onclick={() => initiateDelete(petani)}
                  class="w-full h-11 flex items-center justify-center bg-white border border-border hover:border-red-500/50 rounded-xl transition-all text-red-500/40 hover:text-red-500"
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
        </div>
      {/each}
    </div>

    <!-- Pagination -->
    {#if totalPages > 1}
      <div class="pt-12 flex items-center justify-between">
        <div
          class="text-[10px] font-black uppercase tracking-widest text-muted-foreground"
        >
          Halaman <span class="text-foreground">{pageIndex + 1}</span> dari {totalPages}
        </div>
        <div class="flex gap-2">
          <button
            onclick={previousPage}
            disabled={!canPreviousPage()}
            class="p-3 bg-card border border-border rounded-xl disabled:opacity-30 hover:bg-muted transition-all"
            ><ChevronLeft size={20} /></button
          >
          <button
            onclick={nextPage}
            disabled={!canNextPage()}
            class="p-3 bg-card border border-border rounded-xl disabled:opacity-30 hover:bg-muted transition-all"
            ><ChevronRight size={20} /></button
          >
        </div>
      </div>
    {/if}
  {/if}
</div>

{#if showFormModal}
  <div
    class="fixed inset-0 bg-black/20 backdrop-blur-sm z-[2000] flex justify-end"
    transition:fade
    onclick={closeModal}
  >
    <div
      class="h-full w-full max-w-2xl bg-card border-l border-border shadow-[-20px_0_50px_-20px_rgba(0,0,0,0.3)] overflow-hidden flex flex-col"
      in:fly={{ x: 600, duration: 500, easing: backOut }}
      out:fly={{ x: 600, duration: 400 }}
      onclick={(e) => e.stopPropagation()}
    >
      <div
        class="p-8 h-20 border-b border-border flex items-center justify-between bg-muted/30"
      >
        <div>
          <h2 class="text-2xl font-black uppercase tracking-tight">
            {isEditing ? "Perbarui Data" : "Tambah Petani"}
          </h2>
        </div>
        <button
          onclick={closeModal}
          class="p-3 bg-white border border-border rounded-2xl hover:bg-red-50 hover:text-red-500 transition-all"
          ><X size={24} /></button
        >
      </div>

      <div class="overflow-y-auto grow p-8 space-y-12">
        <!-- Photo Section -->
        <div class="flex flex-col md:flex-row gap-12 items-start">
          <div class="space-y-4">
            <h3
              class="text-sm font-black uppercase tracking-widest text-emerald-500"
            >
              Identitas Visual
            </h3>
            <div class="relative group">
              <div
                class="w-48 h-48 rounded-[2rem] overflow-hidden bg-muted border-2 border-dashed border-border group-hover:border-emerald-500/50 transition-all flex items-center justify-center"
              >
                {#if fotoProfil}
                  <img
                    src={fotoProfil}
                    alt="Preview"
                    class="w-full h-full object-cover"
                  />
                {:else}
                  <Upload size={32} class="text-muted-foreground/30" />
                {/if}
                <div
                  class="absolute inset-0 bg-black/40 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3"
                >
                  <button
                    type="button"
                    onclick={() => (showAvatarSelection = true)}
                    class="p-3 bg-white rounded-xl text-emerald-600 hover:scale-110 transition-transform"
                    title="Pilih Avatar"><User size={20} /></button
                  >
                  <button
                    type="button"
                    onclick={() => fileInput.click()}
                    class="p-3 bg-white rounded-xl text-emerald-600 hover:scale-110 transition-transform"
                    title="Upload Foto"><Upload size={20} /></button
                  >
                  {#if fotoProfil}
                    <button
                      type="button"
                      onclick={handleDeletePhoto}
                      class="p-3 bg-red-500 rounded-xl text-white hover:scale-110 transition-transform"
                      ><Trash2 size={20} /></button
                    >
                  {/if}
                </div>
              </div>
              {#if uploading}
                <div
                  class="absolute inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center rounded-[2rem]"
                >
                  <RefreshCw size={24} class="animate-spin text-emerald-600" />
                </div>
              {/if}
            </div>
          </div>

          <div class="grow grid grid-cols-1 md:grid-cols-2 gap-6 pt-8">
            <div class="space-y-2">
              <label
                class="text-[10px] font-black uppercase tracking-widest text-muted-foreground"
                >Nama Lengkap</label
              >
              <input
                type="text"
                bind:value={namaLengkap}
                class="w-full bg-muted/30 border-border focus:border-emerald-500/50 rounded-xl p-3 text-sm font-medium"
                placeholder="Contoh: Budi Santoso"
              />
            </div>
            <div class="space-y-2">
              <label
                class="text-[10px] font-black uppercase tracking-widest text-muted-foreground"
                >NIK</label
              >
              <input
                type="text"
                bind:value={nik}
                class="w-full bg-muted/30 border-border focus:border-emerald-500/50 rounded-xl p-3 text-sm font-medium"
                placeholder="16 digit angka"
              />
            </div>
            <div class="space-y-2">
              <label
                class="text-[10px] font-black uppercase tracking-widest text-muted-foreground"
                >Telepon</label
              >
              <input
                type="tel"
                bind:value={noTelepon}
                class="w-full bg-muted/30 border-border focus:border-emerald-500/50 rounded-xl p-3 text-sm font-medium"
                placeholder="08..."
              />
            </div>
            <div class="space-y-2">
              <label
                class="text-[10px] font-black uppercase tracking-widest text-muted-foreground"
                >Email</label
              >
              <input
                type="email"
                bind:value={email}
                class="w-full bg-muted/30 border-border focus:border-emerald-500/50 rounded-xl p-3 text-sm font-medium"
                placeholder="name@domain.com"
              />
            </div>
          </div>
        </div>

        <!-- Details Grid -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-12">
          <div class="space-y-6">
            <h3
              class="text-sm font-black uppercase tracking-widest text-emerald-500"
            >
              Data Personal
            </h3>
            <div class="space-y-4">
              <div class="space-y-2">
                <label
                  class="text-[10px] font-black uppercase tracking-widest text-muted-foreground"
                  >Tanggal Lahir</label
                >
                <input
                  type="date"
                  bind:value={tanggalLahir}
                  class="w-full bg-muted/30 border-border rounded-xl p-3 text-sm font-medium"
                />
              </div>
              <div class="space-y-2">
                <label
                  class="text-[10px] font-black uppercase tracking-widest text-muted-foreground"
                  >Jenis Kelamin</label
                >
                <select
                  bind:value={jenisKelamin}
                  class="w-full bg-muted/30 border-border rounded-xl p-3 text-sm font-medium"
                >
                  <option value="">Pilih...</option>
                  <option value="laki-laki">Laki-laki</option>
                  <option value="perempuan">Perempuan</option>
                </select>
              </div>
              <div class="space-y-2">
                <label
                  class="text-[10px] font-black uppercase tracking-widest text-muted-foreground"
                  >Pendidikan</label
                >
                <select
                  bind:value={pendidikan}
                 class="w-full bg-muted/30 border-border rounded-xl p-3 text-sm font-medium"
                >
                <option value="">Pilih...</option>
                  <option value="SD">SD</option>
                  <option value="SMP">SMP</option>
                  <option value="SMA">SMA</option>
                  <option value="Perguruan Tinggi">Perguruan Tinggi</option>
                </select>
              </div>
            </div>
          </div>

          <div class="space-y-6 md:col-span-2">
            <h3
              class="text-sm font-black uppercase tracking-widest text-emerald-500"
            >
              Domisili & Lokasi
            </h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div class="space-y-2 md:col-span-2">
                <label
                  class="text-[10px] font-black uppercase tracking-widest text-muted-foreground"
                  >Alamat Lengkap</label
                >
                <textarea
                  bind:value={alamat}
                  rows="2"
                  class="w-full bg-muted/30 border-border rounded-xl p-3 text-sm font-medium"
                ></textarea>
              </div>
              <div class="space-y-2">
                <label
                  class="text-[10px] font-black uppercase tracking-widest text-muted-foreground"
                  >Desa</label
                >
                <input
                  type="text"
                  bind:value={desa}
                  class="w-full bg-muted/30 border-border rounded-xl p-3 text-sm font-medium"
                />
              </div>
              <div class="space-y-2">
                <label
                  class="text-[10px] font-black uppercase tracking-widest text-muted-foreground"
                  >Kecamatan</label
                >
                <input
                  type="text"
                  bind:value={kecamatan}
                  class="w-full bg-muted/30 border-border rounded-xl p-3 text-sm font-medium"
                />
              </div>
              <div class="space-y-2">
                <label
                  class="text-[10px] font-black uppercase tracking-widest text-muted-foreground"
                  >Kabupaten</label
                >
                <input
                  type="text"
                  bind:value={kabupaten}
                  class="w-full bg-muted/30 border-border rounded-xl p-3 text-sm font-medium"
                />
              </div>
              <div class="space-y-2">
                <label
                  class="text-[10px] font-black uppercase tracking-widest text-muted-foreground"
                  >Provinsi</label
                >
                <input
                  type="text"
                  bind:value={provinsi}
                  class="w-full bg-muted/30 border-border rounded-xl p-3 text-sm font-medium"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- Farming Info -->
        <div class="space-y-6">
          <h3
            class="text-sm font-black uppercase tracking-widest text-emerald-500"
          >
            Profil Agrikultur
          </h3>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div class="space-y-2">
              <label
                class="text-[10px] font-black uppercase tracking-widest text-muted-foreground"
                >Komoditas Utama</label
              >
              <input
                type="text"
                bind:value={tanamanKomoditas}
                class="w-full bg-muted/30 border-border rounded-xl p-3 text-sm font-medium"
              />
            </div>
            <div class="space-y-2">
              <label
                class="text-[10px] font-black uppercase tracking-widest text-muted-foreground"
                >Luas Lahan (Ha)</label
              >
              <input
                type="number"
                step="0.01"
                bind:value={luasLahan}
                class="w-full bg-muted/30 border-border rounded-xl p-3 text-sm font-medium"
              />
            </div>
            <div class="space-y-2">
              <label
                class="text-[10px] font-black uppercase tracking-widest text-muted-foreground"
                >Kelompok Tani</label
              >
              <input
                type="text"
                bind:value={kelompokTani}
                class="w-full bg-muted/30 border-border rounded-xl p-3 text-sm font-medium"
              />
            </div>
          </div>
        </div>
      </div>

      <div
        class="p-8 h-20 bg-muted/30 border-t border-border flex items-center justify-end gap-3"
      >
        <button
          onclick={closeModal}
          class="p-3 bg-white border border-border font-black uppercase tracking-widest text-[10px] rounded-xl hover:bg-muted transition-all"
          >Batal</button
        >
        <button
          onclick={handleSubmit}
          class="p-3 bg-emerald-600 text-white font-black uppercase tracking-widest text-[10px] rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 text-white"
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

<!-- Avatar Selection Overlay -->
{#if showAvatarSelection}
  <div
    class="fixed inset-0 bg-background/60 backdrop-blur-xl z-[2000] flex items-center justify-center p-6"
    transition:fade
    onclick={() => (showAvatarSelection = false)}
  >
    <div
      class="w-full max-w-2xl bg-card border border-border shadow-2xl rounded-[2.5rem] overflow-hidden flex flex-col max-h-[90vh]"
      in:fly={{ y: 20, duration: 400 }}
      onclick={(e) => e.stopPropagation()}
    >
      <div
        class="p-8 h-20 border-b border-border flex items-center justify-between"
      >
        <h3 class="text-xl font-black uppercase tracking-tight">
          Pilih Avatar
        </h3>
        <button
          onclick={() => (showAvatarSelection = false)}
          class="p-3 bg-white border border-border rounded-2xl hover:bg-red-50 hover:text-red-500 transition-all"
        >
          <X size={24} />
        </button>
      </div>

      <div class="p-8 overflow-y-auto">
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-6">
          {#each avatarImages as avatar}
            {@const fullPath = `/avatar/${avatar}`}
            <button
              onclick={() => {
                fotoProfil = fullPath;
                showAvatarSelection = false;
              }}
              class="relative aspect-square rounded-2xl overflow-hidden border-2 transition-all p-1
              {fotoProfil === fullPath
                ? 'border-emerald-500 ring-4 ring-emerald-500/20 scale-105'
                : 'border-border hover:border-emerald-500/50'}"
            >
              <img
                src={fullPath}
                alt="Avatar"
                class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              />
              {#if fotoProfil === fullPath}
                <div
                  class="absolute inset-0 bg-emerald-500/20 flex items-center justify-center"
                  in:scale
                >
                  <CheckCircle2 size={32} class="text-white drop-shadow-lg" />
                </div>
              {/if}
            </button>
          {/each}
        </div>
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
          Menghapus data <span class="text-foreground font-bold"
            >"{deleteTarget?.nama_lengkap}"</span
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
          >Ya, Hapus</button
        >
      </div>
    </div>
  </div>
{/if}

<!-- Detail Petani Modal -->
{#if showViewModal && selectedPetani}
  <div
    class="fixed inset-0 bg-black/20 backdrop-blur-sm z-[2000] flex justify-end"
    transition:fade
    onclick={() => (showViewModal = false)}
  >
    <div
      class="h-full w-full max-w-2xl bg-card border-l border-border shadow-[-20px_0_50px_-20px_rgba(0,0,0,0.3)] overflow-hidden flex flex-col"
      in:fly={{ x: 600, duration: 500, easing: backOut }}
      out:fly={{ x: 600, duration: 400 }}
      onclick={(e) => e.stopPropagation()}
    >
      <div
        class="p-8 h-20 border-b border-border flex items-center justify-between bg-muted/30"
      >
        <div>
          <h2 class="text-2xl font-black uppercase tracking-tight">
            Detail Petani
          </h2>
          <p class="text-xs text-muted-foreground font-medium mt-1">
            Registrasi ID: #{selectedPetani.id.slice(0, 8).toUpperCase()}
          </p>
        </div>
        <button
          onclick={() => (showViewModal = false)}
          class="p-3 bg-white border border-border rounded-2xl hover:bg-red-50 hover:text-red-500 transition-all"
          ><X size={24} /></button
        >
      </div>

      <div class="overflow-y-auto grow p-8 space-y-12">
        <div class="flex flex-col md:flex-row gap-12">
          <!-- Left: Profile Summary -->
          <div class="w-full md:w-64 shrink-0 space-y-6">
            <div
              class="relative w-full aspect-square rounded-[2.5rem] overflow-hidden border-2 border-border shadow-2xl"
            >
              {#if selectedPetani.foto_profil}
                <img
                  src={selectedPetani.foto_profil}
                  alt={selectedPetani.nama_lengkap}
                  class="w-full h-full object-cover"
                />
              {:else}
                <div
                  class="w-full h-full bg-muted flex items-center justify-center text-muted-foreground/30"
                >
                  <User size={64} />
                </div>
              {/if}
            </div>
          </div>

          <!-- Right: Detailed Info -->
          <div class="grow space-y-12">
            <!-- Basic Info Grid -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div class="space-y-6">
                <h3
                  class="text-sm font-black uppercase tracking-widest text-emerald-500 mb-4 pb-2 border-b border-border/50"
                >
                  Identitas Diri
                </h3>
                <div class="space-y-4">
                  <div class="flex items-start gap-4">
                    <div
                      class="w-10 h-10 bg-muted rounded-xl flex items-center justify-center shrink-0"
                    >
                      <User size={18} class="text-muted-foreground" />
                    </div>
                    <div>
                      <p
                        class="text-[10px] font-bold text-muted-foreground uppercase"
                      >
                        Nama Lengkap
                      </p>
                      <p class="font-black text-foreground">
                        {selectedPetani.nama_lengkap}
                      </p>
                    </div>
                  </div>
                  <div class="flex items-start gap-4">
                    <div
                      class="w-10 h-10 bg-muted rounded-xl flex items-center justify-center shrink-0"
                    >
                      <FileDigit size={18} class="text-muted-foreground" />
                    </div>
                    <div>
                      <p
                        class="text-[10px] font-bold text-muted-foreground uppercase"
                      >
                        NIK
                      </p>
                      <p class="font-mono text-sm">
                        {selectedPetani.nik || "-"}
                      </p>
                    </div>
                  </div>
                  <div class="flex items-start gap-4">
                    <div
                      class="w-10 h-10 bg-muted rounded-xl flex items-center justify-center shrink-0"
                    >
                      <VenusAndMars size={18} class="text-muted-foreground" />
                    </div>
                    <div>
                      <p
                        class="text-[10px] font-bold text-muted-foreground uppercase"
                      >
                        Jenis Kelamin
                      </p>
                      <p class="font-bold capitalize">
                        {selectedPetani.jenis_kelamin || "-"}
                      </p>
                    </div>
                  </div>
                  <div class="flex items-start gap-4">
                    <div
                      class="w-10 h-10 bg-muted rounded-xl flex items-center justify-center shrink-0"
                    >
                      <Calendar size={18} class="text-muted-foreground" />
                    </div>
                    <div>
                      <p
                        class="text-[10px] font-bold text-muted-foreground uppercase"
                      >
                        Tanggal Lahir
                      </p>
                      <p class="font-bold">
                        {formatDate(selectedPetani.tanggal_lahir)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div class="space-y-6">
                <h3
                  class="text-sm font-black uppercase tracking-widest text-emerald-500 mb-4 pb-2 border-b border-border/50"
                >
                  Kontak & Pendidikan
                </h3>
                <div class="space-y-4">
                  <div class="flex items-start gap-4">
                    <div
                      class="w-10 h-10 bg-muted rounded-xl flex items-center justify-center shrink-0"
                    >
                      <Phone size={18} class="text-muted-foreground" />
                    </div>
                    <div>
                      <p
                        class="text-[10px] font-bold text-muted-foreground uppercase"
                      >
                        No. Telepon
                      </p>
                      <p class="font-bold">
                        {selectedPetani.no_telepon || "-"}
                      </p>
                    </div>
                  </div>
                  <div class="flex items-start gap-4">
                    <div
                      class="w-10 h-10 bg-muted rounded-xl flex items-center justify-center shrink-0"
                    >
                      <Mail size={18} class="text-muted-foreground" />
                    </div>
                    <div>
                      <p
                        class="text-[10px] font-bold text-muted-foreground uppercase"
                      >
                        Email
                      </p>
                      <p class="font-bold">{selectedPetani.email || "-"}</p>
                    </div>
                  </div>
                  <div class="flex items-start gap-4">
                    <div
                      class="w-10 h-10 bg-muted rounded-xl flex items-center justify-center shrink-0"
                    >
                      <GraduationCap size={18} class="text-muted-foreground" />
                    </div>
                    <div>
                      <p
                        class="text-[10px] font-bold text-muted-foreground uppercase"
                      >
                        Pendidikan
                      </p>
                      <p class="font-bold">
                        {selectedPetani.pendidikan || "-"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Agriculture Info -->
            <div class="space-y-6">
              <h3
                class="text-sm font-black uppercase tracking-widest text-emerald-500 mb-4 pb-2 border-b border-border/50"
              >
                Profil Agrikultur
              </h3>
              <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div
                  class="p-6 bg-muted/30 rounded-[2rem] border border-border/50 space-y-2"
                >
                  <div class="flex items-center gap-3">
                    <div
                      class="w-10 h-10 bg-emerald-500 text-white rounded-xl flex items-center justify-center"
                    >
                      <Sprout size={20} />
                    </div>
                    <div>
                      <p
                        class="text-[9px] font-black text-muted-foreground uppercase"
                      >
                        Komoditas
                      </p>
                      <p class="text-sm font-black text-foreground">
                        {selectedPetani.tanaman_komoditas || "-"}
                      </p>
                    </div>
                  </div>
                </div>
                <div
                  class="p-6 bg-muted/30 rounded-[2rem] border border-border/50 space-y-2"
                >
                  <div class="flex items-center gap-3">
                    <div
                      class="w-10 h-10 bg-emerald-500 text-white rounded-xl flex items-center justify-center"
                    >
                      <LandPlot size={20} />
                    </div>
                    <div>
                      <p
                        class="text-[9px] font-black text-muted-foreground uppercase"
                      >
                        Luas Lahan
                      </p>
                      <p class="text-sm font-black text-foreground">
                        {selectedPetani.luas_lahan
                          ? `${selectedPetani.luas_lahan} Ha`
                          : "-"}
                      </p>
                    </div>
                  </div>
                </div>
                <div
                  class="p-6 bg-muted/30 rounded-[2rem] border border-border/50 space-y-2"
                >
                  <div class="flex items-center gap-3">
                    <div
                      class="w-10 h-10 bg-emerald-500 text-white rounded-xl flex items-center justify-center"
                    >
                      <Users size={20} />
                    </div>
                    <div>
                      <p
                        class="text-[9px] font-black text-muted-foreground uppercase"
                      >
                        Kelompok
                      </p>
                      <p class="text-sm font-black text-foreground">
                        {selectedPetani.kelompok_tani || "-"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Location & Notes -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div class="space-y-4">
                <h3
                  class="text-sm font-black uppercase tracking-widest text-emerald-500"
                >
                  Domisili
                </h3>
                <div
                  class="p-6 bg-muted/10 border border-border rounded-3xl space-y-4"
                >
                  <div class="flex items-start gap-4">
                    <MapPin size={20} class="text-emerald-600 shrink-0 mt-1" />
                    <div>
                      <p class="text-sm font-bold text-foreground leading-snug">
                        {selectedPetani.alamat || "-"}
                      </p>
                      <p
                        class="text-[11px] text-muted-foreground font-medium mt-1"
                      >
                        {selectedPetani.desa}, Kec. {selectedPetani.kecamatan}, {selectedPetani.kabupaten},
                        Prov. {selectedPetani.provinsi}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div class="space-y-4">
                <h3
                  class="text-sm font-black uppercase tracking-widest text-emerald-500"
                >
                  Catatan Khusus
                </h3>
                <div
                  class="p-6 bg-muted/10 border border-border rounded-3xl min-h-[100px]"
                >
                  <p
                    class="text-xs text-muted-foreground italic font-medium leading-relaxed"
                  >
                    {selectedPetani.catatan ||
                      "Tidak ada catatan tambahan untuk petani ini."}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
{/if}
