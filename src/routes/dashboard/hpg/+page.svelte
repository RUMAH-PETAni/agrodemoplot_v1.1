<script lang="ts">
  import { onMount, mount } from "svelte";
  import {
    getMonitoringHPG,
    createMonitoringHPG,
    updateMonitoringHPG,
    deleteMonitoringHPG,
    uploadFotoHPG,
    type MonitoringHPG,
  } from "$lib/services/hpg";
  import {
    getDirektoriHPG,
    type DirektoriHPG,
  } from "$lib/services/direktori_hpg";
  import { getDemoplotList } from "$lib/services/demoplot";
  import type { Demoplot } from "../../../types/demoplot";
  import {
    Bug,
    Plus,
    Calendar,
    Search,
    Filter,
    Map,
    MapPin,
    Camera,
    RefreshCw,
    Pencil,
    Trash2,
    Eye,
    X,
    ArrowUpRight,
    LandPlot,
    Image as ImageIcon,
    ShieldAlert,
    Shovel,
    AlertTriangle,
    Info,
    CheckCircle2,
    User,
    ChevronLeft,
    ChevronRight,
    Map as MapIcon,
    Layers,
    Thermometer,
    Zap,
    Skull,
    Leaf,
    BookOpen,
    Info as InfoIcon,
    ArrowLeft,
  } from "@lucide/svelte";

  import { fade, fly, scale } from "svelte/transition";
  import { backOut } from "svelte/easing";

  let records = $state<MonitoringHPG[]>([]);
  let demoplots = $state<Demoplot[]>([]);
  let direktoriItems = $state<DirektoriHPG[]>([]);
  let loading = $state(true);
  let error = $state("");
  let success = $state("");

  // Filtering
  let searchQuery = $state("");
  let categoryFilter = $state("");
  let severityFilter = $state("");
  let demoplotFilter = $state("");

  // Directory state
  let showDirectoryDrawer = $state(false);
  let directorySearchQuery = $state("");
  let filteredDirektori = $derived.by(() => {
    return direktoriItems.filter(
      (item) =>
        item.nama_jenis
          .toLowerCase()
          .includes(directorySearchQuery.toLowerCase()) ||
        item.nama_ilmiah
          ?.toLowerCase()
          .includes(directorySearchQuery.toLowerCase()) ||
        item.kategori_gangguan
          .toLowerCase()
          .includes(directorySearchQuery.toLowerCase()),
    );
  });

  // Image preview state
  let previewImage = $state<string | null>(null);

  let filteredRecords = $derived.by(() => {
    return records.filter((r) => {
      const matchSearch =
        !searchQuery ||
        r.nama_jenis?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.nama_ilmiah?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.demoplot?.nama_demoplot
          .toLowerCase()
          .includes(searchQuery.toLowerCase());
      const matchCategory =
        !categoryFilter || r.kategori_gangguan === categoryFilter;
      const matchSeverity =
        !severityFilter ||
        parseInt(r.tingkat_serangan || "0") >= parseInt(severityFilter);
      const matchDemoplot = !demoplotFilter || r.demoplot_id === demoplotFilter;
      return matchSearch && matchCategory && matchSeverity && matchDemoplot;
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
  let uploading = $state(false);
  let fileInput: HTMLInputElement;

  let formDemoplotId = $state("");
  let formTanggal = $state(new Date().toISOString().split("T")[0]);
  let formKategori = $state<"hama" | "penyakit" | "gulma" | "">("");
  let formNamaJenis = $state("");
  let formNamaIlmiah = $state("");
  let formTingkatSerangan = $state("");
  let formBagianTerserang = $state<string[]>([]);
  let formPengendalian = $state<string[]>([]);
  let formCatatan = $state("");
  let formFoto = $state("");
  let formLatitude = $state<number | null>(null);
  let formLongitude = $state<number | null>(null);
  let formAltitude = $state(0);

  // View Detail State
  let showViewDrawer = $state(false);
  let selectedRecord = $state<MonitoringHPG | null>(null);

  // Map State
  let showMapDrawer = $state(false);
  let mapContainer: HTMLElement;
  let leafletMap: any;
  let tileLayer: any = null;
  let rasterLayer: any = null;
  let L: any;
  let focusRecord = $state<MonitoringHPG | null>(null);

  let currentBaseMap = $state("esri");
  let showBasemapDropdown = $state(false);
  function toggleBasemap() {
    showBasemapDropdown = !showBasemapDropdown;
  }

  const baseMaps = {
    osm: {
      label: "Street Map",
      url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      attribution: "&copy; OpenStreetMap",
      maxNativeZoom: 19,
      maxZoom: 20,
    },
    esri: {
      label: "Satelit",
      url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      attribution: "&copy; Esri",
      maxNativeZoom: 18,
      maxZoom: 20,
    },
    drone: {
      label: "Foto Udara",
      url: "",
      attribution: "Drone Imagery",
      maxNativeZoom: 22,
    },
  };

  async function switchBaseMap(type: string) {
    if (!leafletMap || !tileLayer) return;
    leafletMap.removeLayer(tileLayer);

    if (type === "drone") {
      const fullPlot = demoplots.find(
        (dp) => dp.id === focusRecord?.demoplot_id,
      );
      if (!fullPlot?.foto_udara) {
        switchBaseMap("esri");
        return;
      }
      currentBaseMap = "drone";
      const config = baseMaps.esri;
      tileLayer = L.tileLayer(config.url, {
        attribution: config.attribution,
        maxNativeZoom: config.maxNativeZoom,
        maxZoom: 22,
      }).addTo(leafletMap);
      updateMapLayers();
      return;
    }

    const config = baseMaps[type as keyof typeof baseMaps];
    currentBaseMap = type;
    tileLayer = L.tileLayer(config.url, {
      attribution: config.attribution,
      maxNativeZoom: config.maxNativeZoom,
      maxZoom: 22,
    }).addTo(leafletMap);
    updateMapLayers();
  }

  // Delete State
  let showDeleteConfirm = $state(false);
  let deleteTarget = $state<MonitoringHPG | null>(null);

  // Stats
  let hamaCount = $derived(
    records.filter((r) => r.kategori_gangguan === "hama").length,
  );
  let penyakitCount = $derived(
    records.filter((r) => r.kategori_gangguan === "penyakit").length,
  );
  let gulmaCount = $derived(
    records.filter((r) => r.kategori_gangguan === "gulma").length,
  );

  async function loadInitialData() {
    loading = true;
    try {
      const [recordsData, demoplotsData, direktoriData] = await Promise.all([
        getMonitoringHPG(),
        getDemoplotList(),
        getDirektoriHPG(),
      ]);
      records = recordsData;
      demoplots = demoplotsData;
      direktoriItems = direktoriData;
      if (demoplots.length > 0) formDemoplotId = "";
    } catch (err) {
      error = "Gagal memuat data monitoring HPG";
    } finally {
      loading = false;
    }
  }

  function selectFromDirectory(item: DirektoriHPG) {
    openAddForm();
    formKategori = item.kategori_gangguan as any;
    formNamaJenis = item.nama_jenis;
    formNamaIlmiah = item.nama_ilmiah || "";

    // Fix: cara_pengendalian in directory is string, formPengendalian is string[]
    if (item.cara_pengendalian) {
      // Split by comma if it contains multiple, or just wrap in array
      if (item.cara_pengendalian.includes(",")) {
        formPengendalian = item.cara_pengendalian
          .split(",")
          .map((s) => s.trim());
      } else {
        formPengendalian = [item.cara_pengendalian];
      }
    } else {
      formPengendalian = [];
    }

    showDirectoryDrawer = false;
    success = `Template ${item.nama_jenis} diterapkan`;
    setTimeout(() => (success = ""), 2000);
  }

  function toggleBagianTerserang(part: string) {
    if (formBagianTerserang.includes(part)) {
      formBagianTerserang = formBagianTerserang.filter((p) => p !== part);
    } else {
      formBagianTerserang = [...formBagianTerserang, part];
    }
  }

  function togglePengendalian(p: string) {
    if (formPengendalian.includes(p)) {
      formPengendalian = formPengendalian.filter((item) => item !== p);
    } else {
      formPengendalian = [...formPengendalian, p];
    }
  }

  function openAddForm() {
    isEditing = false;
    editingId = "";
    formKategori = "";
    formNamaJenis = "";
    formNamaIlmiah = "";
    formTingkatSerangan = "";
    formBagianTerserang = [];
    formPengendalian = [];
    formCatatan = "";
    formFoto = "";
    formLatitude = null;
    formLongitude = null;
    formAltitude = 0;
    formDemoplotId = "";
    showFormDrawer = true;
  }

  function openEditForm(record: MonitoringHPG) {
    isEditing = true;
    editingId = record.id;
    formDemoplotId = record.demoplot_id;
    formTanggal = record.tanggal_monitoring;
    formKategori = record.kategori_gangguan as any;
    formNamaJenis = record.nama_jenis || "";
    formNamaIlmiah = record.nama_ilmiah || "";
    formTingkatSerangan = record.tingkat_serangan || "";
    formBagianTerserang = record.bagian_terserang
      ? record.bagian_terserang.split(", ")
      : [];
    formPengendalian = record.cara_pengendalian
      ? record.cara_pengendalian.split(", ")
      : [];
    formCatatan = record.catatan || "";
    formFoto = record.foto || "";
    formLatitude = record.latitude;
    formLongitude = record.longitude;
    formAltitude = record.altitude || 0;
    showFormDrawer = true;
  }

  async function handleSubmit() {
    if (
      !formDemoplotId ||
      !formNamaJenis ||
      !formTingkatSerangan ||
      !formKategori
    ) {
      error = "Mohon lengkapi data wajib (Plot, Nama, Serangan & Kategori)";
      return;
    }

    loading = true;
    try {
      const payload = {
        demoplot_id: formDemoplotId,
        tanggal_monitoring: formTanggal,
        kategori_gangguan: formKategori,
        nama_jenis: formNamaJenis,
        nama_ilmiah: formNamaIlmiah,
        tingkat_serangan: formTingkatSerangan,
        bagian_terserang: formBagianTerserang.join(", "),
        cara_pengendalian: formPengendalian.join(", "),
        catatan: formCatatan,
        foto: formFoto,
        latitude: formLatitude,
        longitude: formLongitude,
        altitude: formAltitude,
      };

      if (isEditing) {
        await updateMonitoringHPG(editingId, payload);
        success = "Data HPG berhasil diperbarui";
      } else {
        await createMonitoringHPG(payload);
        success = "Data HPG baru berhasil disimpan";
      }

      showFormDrawer = false;
      records = await getMonitoringHPG();
      setTimeout(() => (success = ""), 3000);
    } catch (err) {
      error = "Gagal menyimpan data";
    } finally {
      loading = false;
    }
  }

  async function handleFileChange(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    uploading = true;
    try {
      const tempId = editingId || `new-${Date.now()}`;
      formFoto = await uploadFotoHPG(file, tempId);
    } catch (err) {
      error = "Gagal upload foto";
    } finally {
      uploading = false;
    }
  }

  async function getLocation() {
    if (!navigator.geolocation) {
      error = "Geolokasi tidak didukung";
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        formLatitude = pos.coords.latitude;
        formLongitude = pos.coords.longitude;
        formAltitude = pos.coords.altitude || 0;
        success = "Lokasi sinkron";
        setTimeout(() => (success = ""), 2000);
      },
      (err) => {
        error = "Gagal ambil lokasi";
      },
    );
  }

  function getSeverityColor(tingkat: string | null) {
    if (!tingkat) return "bg-slate-400";
    const val = parseInt(tingkat);
    if (!isNaN(val)) {
      if (val < 25) return "bg-emerald-500";
      if (val < 50) return "bg-amber-500";
      return "bg-red-600";
    }
    const t = tingkat.toLowerCase();
    if (t.includes("tinggi")) return "bg-red-600";
    if (t.includes("sedang")) return "bg-amber-500";
    return "bg-emerald-500";
  }

  function getCategoryIcon(cat: string) {
    if (cat === "hama") return Bug;
    if (cat === "penyakit") return ShieldAlert;
    return Leaf;
  }

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      await deleteMonitoringHPG(deleteTarget.id);
      records = records.filter((r) => r.id !== deleteTarget!.id);
      success = "Laporan berhasil dihapus";
      setTimeout(() => (success = ""), 3000);
    } catch (err) {
      error = "Gagal menghapus data";
    } finally {
      showDeleteConfirm = false;
      deleteTarget = null;
    }
  }

  onMount(loadInitialData);

  $effect(() => {
    if (
      showFormDrawer ||
      showViewDrawer ||
      showDeleteConfirm ||
      showMapDrawer ||
      showDirectoryDrawer ||
      previewImage
    ) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
  });

  $effect(() => {
    if (showMapDrawer && mapContainer) {
      setTimeout(initMap, 100);
    } else if (leafletMap) {
      leafletMap.remove();
      leafletMap = null;
    }
  });

  async function initMap() {
    L = (await import("leaflet")).default;
    await import("leaflet/dist/leaflet.css");

    if (leafletMap) leafletMap.remove();

    leafletMap = L.map(mapContainer, {
      zoomControl: false,
    }).setView([-7.0, 110.0], 13);

    const config =
      baseMaps[currentBaseMap as keyof typeof baseMaps] || baseMaps.esri;
    tileLayer = L.tileLayer(config.url, {
      attribution: config.attribution,
      maxNativeZoom: config.maxNativeZoom,
      maxZoom: 22,
    }).addTo(leafletMap);

    updateMapLayers();
  }

  function updateMapLayers() {
    if (!leafletMap || !L) return;

    // Clear non-tile layers
    leafletMap.eachLayer((layer: any) => {
      if (layer !== tileLayer) leafletMap.removeLayer(layer);
    });

    // Drone overlay
    const fullPlot = demoplots.find((dp) => dp.id === focusRecord?.demoplot_id);
    const fotoUdara = fullPlot?.foto_udara;
    if (fotoUdara && currentBaseMap === "drone") {
      if (
        fotoUdara.includes("{z}") &&
        fotoUdara.includes("{x}") &&
        fotoUdara.includes("{y}")
      ) {
        rasterLayer = L.tileLayer(fotoUdara, {
          opacity: 0.8,
          maxZoom: 20,
        }).addTo(leafletMap);
      } else if (fullPlot) {
        let bounds = fullPlot.polygon
          ? L.geoJSON(
              typeof fullPlot.polygon === "string"
                ? JSON.parse(fullPlot.polygon)
                : fullPlot.polygon,
            ).getBounds()
          : [
              [
                (fullPlot.latitude || 0) - 0.002,
                (fullPlot.longitude || 0) - 0.002,
              ],
              [
                (fullPlot.latitude || 0) + 0.002,
                (fullPlot.longitude || 0) + 0.002,
              ],
            ];
        rasterLayer = L.imageOverlay(fotoUdara, bounds, {
          opacity: 0.8,
        }).addTo(leafletMap);
      }
    }

    // Polygon layers
    const demoplotsToDraw = focusRecord
      ? demoplots.filter((dp) => dp.id === focusRecord?.demoplot_id)
      : demoplots;
    demoplotsToDraw.forEach((dp) => {
      if (dp.polygon) {
        try {
          const geojsonData =
            typeof dp.polygon === "string"
              ? JSON.parse(dp.polygon)
              : dp.polygon;
          L.geoJSON(geojsonData, {
            style: {
              color: "#ef4444",
              weight: 2,
              opacity: 0.8,
              fillColor: "#ef4444",
              fillOpacity: 0.15,
            },
          }).addTo(leafletMap);
        } catch (e) {
          console.error("Error parsing polygon", e);
        }
      }
    });

    // Markers
    const markers: any[] = [];
    records.forEach((r) => {
      if (r.latitude && r.longitude) {
        // Differentiate icon & styling based on HPG category
        let IconComponent = Bug;
        let colorClass = "rose"; // Default
        
        if (r.kategori_gangguan === "penyakit") {
          IconComponent = ShieldAlert;
          colorClass = "amber";
        } else if (r.kategori_gangguan === "gulma") {
          IconComponent = Leaf;
          colorClass = "green";
        } else if (r.kategori_gangguan === "hama") {
          IconComponent = Bug;
          colorClass = "rose";
        }

        const iconContainer = document.createElement("div");
        mount(IconComponent, {
          target: iconContainer,
          props: { size: 18, strokeWidth: 2.5 },
        });

        const pulseColor = colorClass === "rose" ? "bg-rose-500/20" : colorClass === "amber" ? "bg-amber-500/20" : "bg-emerald-500/20";
        const borderColor = colorClass === "rose" ? "border-rose-500" : colorClass === "amber" ? "border-amber-500" : "border-emerald-500";
        const textColor = colorClass === "rose" ? "text-rose-700" : colorClass === "amber" ? "text-amber-700" : "text-emerald-700";

        const icon = L.divIcon({
          className: "custom-icon-marker",
          html: `<div class="marker-container group">
                  <div class="marker-pulse ${pulseColor}"></div>
                  <div class="w-10 h-10 bg-white border-2 ${borderColor} rounded-full flex items-center justify-center ${textColor} shadow-lg transition-transform hover:scale-125 relative z-10">
                    ${iconContainer.innerHTML}
                  </div>
                </div>`,
          iconSize: [40, 40],
          iconAnchor: [20, 20],
        });

        const marker = L.marker([r.latitude, r.longitude], { icon }).addTo(leafletMap)
          .bindPopup(`
            <div class="p-4 min-w-[200px]">
              <p class="text-[9px] font-black text-red-600 uppercase tracking-widest mb-1">${r.kategori_gangguan}</p>
              <h3 class="font-black text-slate-800 uppercase text-sm leading-tight mb-2">${r.nama_jenis}</h3>
              <div class="flex items-center gap-2 mb-3">
                 <div class="w-6 h-6 rounded-lg bg-muted flex items-center justify-center text-slate-400">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                 </div>
                 <p class="text-[10px] font-bold text-slate-600">${r.demoplot?.nama_demoplot || "Plot Umum"}</p>
              </div>
              <div class="pt-3 border-t border-slate-100 flex items-center justify-between">
                <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Serangan</span>
                <span class="px-2 py-0.5 bg-red-500 text-[8px] font-black text-white rounded-full uppercase tracking-tighter">${r.tingkat_serangan || 0}%</span>
              </div>
            </div>
          `);
        markers.push(marker);
        if (focusRecord && focusRecord.id === r.id) marker.openPopup();
      }
    });

    if (focusRecord && focusRecord.latitude && focusRecord.longitude) {
      leafletMap.setView([focusRecord.latitude, focusRecord.longitude], 18);
    } else if (markers.length > 0) {
      const group = L.featureGroup(markers);
      leafletMap.fitBounds(group.getBounds().pad(0.1));
    }
  }

  function openMapForRecord(record: MonitoringHPG) {
    if (!record.latitude || !record.longitude) {
      error = "Geo-tagging tidak tersedia";
      setTimeout(() => {
        if (error === "Geo-tagging tidak tersedia") {
          error = "";
        }
      }, 3000);
      return;
    }
    focusRecord = record;
    showMapDrawer = true;
  }
</script>

<div class="min-h-screen pb-24 px-6 max-w-7xl mx-auto space-y-12">
  <!-- Module Hero -->
  <section
    class="relative mt-28 rounded-[2.5rem] bg-slate-950 overflow-hidden shadow-2xl shadow-slate-950/20"
    in:fly={{ y: -20, duration: 800 }}
  >
    <div class="absolute inset-0 z-0 opacity-40">
      <div
        class="absolute -top-[20%] -left-[10%] w-[60%] h-[120%] bg-red-500/20 blur-[120px] rounded-full"
      ></div>
      <div
        class="absolute top-[20%] -right-[10%] w-[40%] h-[80%] bg-amber-500/10 blur-[100px] rounded-full"
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
            class="inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 backdrop-blur-md rounded-full border border-white/20 text-[10px] font-black uppercase tracking-[0.2em] text-red-100"
          >
            <Bug size={12} class="text-red-400" /> Identifikasi Gangguan
          </div>
        </div>
        <div class="space-y-4">
          <h1
            class="text-4xl md:text-7xl font-black tracking-tighter leading-[0.9]"
          >
            Monitoring <span
              class="bg-gradient-to-r from-red-400 to-amber-200 bg-clip-text text-transparent"
              >HPG</span
            >
          </h1>
          <p
            class="text-lg text-slate-50/70 font-medium max-w-xl mx-auto lg:mx-0"
          >
            Identifikasi Hama, Penyakit & Gulma untuk pengendalian dini.
          </p>
        </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div
          class="group relative p-6 bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[2rem] hover:bg-white/10 hover:-translate-y-1 hover:shadow-2xl hover:border-white/20 transition-all duration-300 overflow-hidden active:scale-95"
        >
          <div
            class="absolute -right-4 -bottom-4 text-rose-500/25 group-hover:text-rose-500/40 transition-colors"
          >
            <Bug size={80} strokeWidth={1} />
          </div>
          <p
            class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1"
          >
            Hama
          </p>
          <p class="text-3xl font-black">{hamaCount}</p>
        </div>
        <div
          class="group relative p-6 bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[2rem] hover:bg-white/10 hover:-translate-y-1 hover:shadow-2xl hover:border-white/20 transition-all duration-300 overflow-hidden active:scale-95"
        >
          <div
            class="absolute -right-4 -bottom-4 text-amber-400/20 group-hover:text-amber-400/30 transition-colors"
          >
            <ShieldAlert size={80} strokeWidth={1} />
          </div>
          <p
            class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1"
          >
            Penyakit
          </p>
          <p class="text-3xl font-black">{penyakitCount}</p>
        </div>
        <div
          class="group relative p-6 bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[2rem] hover:bg-white/10 hover:-translate-y-1 hover:shadow-2xl hover:border-white/20 transition-all duration-300 overflow-hidden active:scale-95"
        >
          <div
            class="absolute -right-4 -bottom-4 text-emerald-400/20 group-hover:text-emerald-400/30 transition-colors"
          >
            <Leaf size={80} strokeWidth={1} />
          </div>
          <p
            class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1"
          >
            Gulma
          </p>
          <p class="text-3xl font-black">{gulmaCount}</p>
        </div>
        <div class="sm:col-span-3 flex justify-end">
          <button
            onclick={() => (showDirectoryDrawer = true)}
            class="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all active:scale-95"
          >
            <BookOpen size={14} class="text-amber-400" />
            Direktori HPG
          </button>
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
        class="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-red-500 transition-colors"
      />
      <input
        type="text"
        bind:value={searchQuery}
        placeholder="Cari hama/penyakit/gulma..."
        class="w-full bg-muted/40 border-transparent focus:border-red-500/50 focus:ring-4 focus:ring-red-500/10 rounded-2xl pl-11 pr-4 py-3 text-sm font-medium transition-all"
      />
    </div>

    <div class="hidden lg:flex items-center gap-2">
      <select
        bind:value={categoryFilter}
        class="w-40 bg-muted/30 border-transparent rounded-xl px-3 py-2.5 text-[10px] font-black uppercase outline-none"
      >
        <option value="">Semua Kategori</option>
        <option value="hama">HAMA</option>
        <option value="penyakit">PENYAKIT</option>
        <option value="gulma">GULMA</option>
      </select>

      <select
        bind:value={severityFilter}
        class="w-40 bg-muted/30 border-transparent rounded-xl px-3 py-2.5 text-[10px] font-black uppercase outline-none"
      >
        <option value="">Semua Tingkat</option>
        <option value="25">SIAGA (>25%)</option>
        <option value="50">BAHAYA (>50%)</option>
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
      class="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-widest text-[10px] p-4 md:py-4 md:px-8 rounded-2xl transition-all shadow-lg active:scale-95 whitespace-nowrap"
    >
      <Plus size={18} /> <span class="hidden md:inline">Tambah Monitoring</span>
    </button>
  </div>

  <!-- Records Grid -->
  {#if loading && records.length === 0}
    <div class="py-24 text-center">
      <RefreshCw
        size={40}
        class="animate-spin text-red-500 mx-auto opacity-20"
      />
    </div>
  {:else if filteredRecords.length === 0}
    <div
      class="py-32 text-center bg-muted/20 rounded-[3rem] border-2 border-dashed border-border/50"
    >
      <Bug size={48} class="mx-auto text-muted-foreground/30 mb-4" />
      <h3 class="text-lg font-black uppercase text-muted-foreground">
        Tidak ada temuan HPG
      </h3>
    </div>
  {:else}
    <div
      class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
    >
      {#each paginatedRecords as r, i}
        <div
          class="group relative bg-card border border-border shadow-xl rounded-[2.5rem] overflow-hidden flex flex-col transition-all hover:border-red-500/50 hover:-translate-y-1"
          in:fly={{ y: 20, delay: i * 50 }}
        >
          <div class="relative h-56 bg-muted group/img overflow-hidden">
            {#if r.foto}
              <img src={r.foto} alt="" class="w-full h-full object-cover" />
            {:else}
              <div
                class="w-full h-full flex items-center justify-center opacity-10"
              >
                <svelte:component
                  this={getCategoryIcon(r.kategori_gangguan || "hama")}
                  size={64}
                />
              </div>
            {/if}
            <div class="absolute top-4 left-4">
              <span
                class="inline-flex items-center gap-1.5 px-3 py-1.5 {getSeverityColor(
                  r.tingkat_serangan || '',
                )} text-white text-[9px] font-black uppercase tracking-widest rounded-full shadow-lg"
              >
                <AlertTriangle size={12} /> Serangan: {r.tingkat_serangan}%
              </span>
            </div>
            <div class="absolute top-4 right-4">
              <span
                class="px-3 py-1.5 bg-black/50 backdrop-blur-md text-white text-[9px] font-black uppercase tracking-widest rounded-full border border-white/20 capitalize"
              >
                {r.kategori_gangguan}
              </span>
            </div>

            <div
              class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm lg:opacity-0 lg:group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3"
            >
              <div class="relative group/tip">
                <button
                  onclick={() => openMapForRecord(r)}
                  class="p-3 bg-white rounded-xl text-emerald-600 hover:scale-110 transition-transform disabled:opacity-20 shadow-xl"
                >
                  <Map size={18} /></button
                >
                <div
                  class="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 px-3 py-1.5 bg-foreground text-background text-[10px] font-black uppercase tracking-widest rounded-lg opacity-0 pointer-events-none group-hover/tip:opacity-100 group-hover/tip:-translate-y-1 translate-y-0 transition-all duration-200 whitespace-nowrap z-50 shadow-xl"
                >
                  Peta
                  <div
                    class="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-2 h-2 bg-foreground rotate-45"
                  ></div>
                </div>
              </div>

              <div class="relative group/tip">
                <button
                  onclick={() => {
                    selectedRecord = r;
                    showViewDrawer = true;
                  }}
                  class="p-3 bg-white rounded-xl text-emerald-600 hover:scale-110 transition-transform shadow-xl"
                  ><Eye size={18} /></button
                >
                <div
                  class="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 px-3 py-1.5 bg-foreground text-background text-[10px] font-black uppercase tracking-widest rounded-lg opacity-0 pointer-events-none group-hover/tip:opacity-100 group-hover/tip:-translate-y-1 translate-y-0 transition-all duration-200 whitespace-nowrap z-50 shadow-xl"
                >
                  Rincian
                  <div
                    class="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-2 h-2 bg-foreground rotate-45"
                  ></div>
                </div>
              </div>

              <div class="relative group/tip">
                <button
                  onclick={() => openEditForm(r)}
                  class="p-3 bg-white rounded-xl text-emerald-600 hover:scale-110 transition-transform shadow-xl"
                  ><Pencil size={18} /></button
                >
                <div
                  class="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 px-3 py-1.5 bg-foreground text-background text-[10px] font-black uppercase tracking-widest rounded-lg opacity-0 pointer-events-none group-hover/tip:opacity-100 group-hover/tip:-translate-y-1 translate-y-0 transition-all duration-200 whitespace-nowrap z-50 shadow-xl"
                >
                  Edit
                  <div
                    class="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-2 h-2 bg-foreground rotate-45"
                  ></div>
                </div>
              </div>

              <div class="relative group/tip">
                <button
                  onclick={() => {
                    deleteTarget = r;
                    showDeleteConfirm = true;
                  }}
                  class="p-3 bg-red-500 rounded-xl text-white hover:scale-110 transition-transform shadow-xl"
                  ><Trash2 size={18} /></button
                >
                <div
                  class="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 px-3 py-1.5 bg-red-600 text-white text-[10px] font-black uppercase tracking-widest rounded-lg opacity-0 pointer-events-none group-hover/tip:opacity-100 group-hover/tip:-translate-y-1 translate-y-0 transition-all duration-200 whitespace-nowrap z-50 shadow-xl"
                >
                  Hapus
                  <div
                    class="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-2 h-2 bg-red-600 rotate-45"
                  ></div>
                </div>
              </div>
            </div>
          </div>

          <div class="p-8 space-y-4">
            <div class="flex flex-col gap-1">
              <div
                class="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-red-600/80"
              >
                <LandPlot size={12} />
                {r.demoplot?.nama_demoplot || "Umum"}
              </div>
              <div
                class="flex items-center gap-1 text-xs font-bold text-muted-foreground"
              >
                <Calendar size={14} />
                {formatDate(r.tanggal_monitoring)}
              </div>
            </div>

            <div>
              <h3 class="font-black text-xl leading-tight">
                {r.nama_jenis || "Tanpa Nama"}
              </h3>
              <p class="text-xs italic text-muted-foreground">
                {r.nama_ilmiah || "-"}
              </p>
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
          Halaman <span class="text-foreground">{currentPage}</span> dari {totalPages}
        </div>
        <div class="flex gap-2">
          <button
            onclick={() => (currentPage = Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            class="p-3 bg-card border border-border rounded-xl disabled:opacity-30 hover:bg-muted transition-all"
            ><ChevronLeft size={20} /></button
          >
          <button
            onclick={() =>
              (currentPage = Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            class="p-3 bg-card border border-border rounded-xl disabled:opacity-30 hover:bg-muted transition-all"
            ><ChevronRight size={20} /></button
          >
        </div>
      </div>
    {/if}
  {/if}

  <!-- Form Drawer -->
  {#if showFormDrawer}
    <div
      class="fixed inset-0 z-[2000] bg-black/20 backdrop-blur-sm flex justify-end"
      transition:fade
      onclick={() => (showFormDrawer = false)}
    >
      <div
        class="relative w-full max-w-2xl bg-card border-l border-border h-full shadow-2xl flex flex-col overflow-hidden"
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
              {isEditing ? "Perbarui Data" : "Tambah Monitoring"}
            </h2>
          </div>
          <button
            onclick={() => (showFormDrawer = false)}
            class="p-3 bg-white border border-border rounded-2xl hover:bg-red-50 hover:text-red-500 transition-all"
            ><X size={24} /></button
          >
        </div>

        <div class="flex-1 overflow-y-auto p-10 space-y-10 custom-scrollbar">
          <!-- Form Sections -->
          <div class="space-y-6">
            <div class="grid grid-cols-2 gap-4">
              <div class="space-y-2">
                <label
                  class="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1"
                  >Demoplot</label
                >
                <select
                  bind:value={formDemoplotId}
                  class="w-full bg-muted/50 border-2 border-transparent focus:border-red-500/50 rounded-2xl px-4 py-3 text-sm font-bold transition-all outline-none"
                >
                  <option value="">Pilih Demoplot</option>
                  {#each demoplots as dp}<option value={dp.id}
                      >{dp.nama_demoplot}</option
                    >{/each}
                </select>
              </div>
              <div class="space-y-2">
                <label
                  class="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1"
                  >Tanggal Monitoring</label
                >
                <input
                  type="date"
                  bind:value={formTanggal}
                  class="w-full bg-muted/50 border-2 border-transparent focus:border-red-500/50 rounded-2xl px-4 py-3 text-sm font-bold transition-all outline-none"
                />
              </div>
            </div>

            <div class="space-y-4">
              <label
                class="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1"
                >Kategori Gangguan</label
              >
              <div class="grid grid-cols-3 gap-3">
                {#each ["hama", "penyakit", "gulma"] as cat}
                  <button
                    onclick={() => (formKategori = cat as any)}
                    class="py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border-2 transition-all {formKategori ===
                    cat
                      ? 'bg-red-600 border-red-600 text-white shadow-lg'
                      : 'bg-muted/50 border-transparent text-slate-500 hover:border-slate-200'}"
                  >
                    {cat}
                  </button>
                {/each}
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="space-y-2">
                <label
                  class="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1"
                  >Nama Jenis</label
                >
                <input
                  type="text"
                  bind:value={formNamaJenis}
                  placeholder="Contoh: Wereng Coklat"
                  class="w-full bg-muted/50 border-2 border-transparent focus:border-red-500/50 rounded-2xl px-4 py-3 text-sm font-bold outline-none"
                />
              </div>
              <div class="space-y-2">
                <label
                  class="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1"
                  >Nama Ilmiah</label
                >
                <input
                  type="text"
                  bind:value={formNamaIlmiah}
                  placeholder="Contoh: Nilaparvata lugens"
                  class="w-full bg-muted/50 border-2 border-transparent focus:border-red-500/50 rounded-2xl px-4 py-3 text-sm font-bold outline-none italic"
                />
              </div>
            </div>

            <div class="space-y-10">
              <!-- Bagian Terserang Section First -->
              <div class="space-y-4">
                <label
                  class="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1"
                  >Bagian/area yang terdampak</label
                >
                <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {#each ["akar", "batang", "cabang/ranting", "daun", "buah", "permukaan tanah"] as part}
                    <button
                      type="button"
                      onclick={() => toggleBagianTerserang(part)}
                      class="py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border-2 transition-all {formBagianTerserang.includes(
                        part,
                      )
                        ? 'bg-slate-900 border-slate-900 text-white shadow-lg'
                        : 'bg-muted/30 border-transparent text-slate-500 hover:border-slate-200'}"
                    >
                      {part}
                    </button>
                  {/each}
                </div>
              </div>

              <!-- Tingkat Serangan Slider Section Second -->
              <div
                class="p-6 bg-red-50/50 rounded-3xl border border-red-500/10 space-y-6"
              >
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-3">
                    <div
                      class="w-8 h-8 bg-red-500 text-white rounded-lg flex items-center justify-center shadow-lg shadow-red-500/20"
                    >
                      <AlertTriangle size={16} />
                    </div>
                    <div>
                      <label
                        class="text-[10px] font-black uppercase tracking-widest text-slate-500"
                        >Tingkat Serangan</label
                      >
                      <p class="text-[10px] font-bold text-red-600/70">
                        Estimasi area yang terdampak
                      </p>
                    </div>
                  </div>
                  <div
                    class="px-4 py-2 bg-red-600 text-white rounded-xl shadow-lg ring-4 ring-red-500/5"
                  >
                    <span class="text-lg font-black"
                      >{formTingkatSerangan || 0}%</span
                    >
                  </div>
                </div>

                <div class="px-2">
                  <input
                    type="range"
                    bind:value={formTingkatSerangan}
                    min="0"
                    max="100"
                    step="10"
                    class="hpg-slider w-full h-2 bg-slate-200 rounded-full appearance-none cursor-pointer outline-none"
                  />
                  <div class="flex justify-between mt-4 px-2">
                    {#each [0, 20, 40, 60, 80, 100] as mark}
                      <div class="flex flex-col items-center gap-1.5">
                        <div
                          class="w-1 h-1 rounded-full {mark <=
                          parseInt(formTingkatSerangan)
                            ? 'bg-red-500'
                            : 'bg-slate-300'}"
                        ></div>
                        <span
                          class="text-[8px] font-black {mark <=
                          parseInt(formTingkatSerangan)
                            ? 'text-red-600'
                            : 'text-slate-400'}">{mark}%</span
                        >
                      </div>
                    {/each}
                  </div>
                </div>
              </div>
            </div>

            <div class="space-y-4">
              <label
                class="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1"
                >Pengendalian saat ini</label
              >
              <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                {#each ["pengendalian manual/fisik", "pemanfaatan musuh alami", "penggunaan bahan organik", "penggunaan bahan kimia"] as opt}
                  <button
                    type="button"
                    onclick={() => togglePengendalian(opt)}
                    class="py-4 px-6 rounded-2xl text-[9px] text-left font-black uppercase tracking-wider border-2 transition-all {formPengendalian.includes(
                      opt,
                    )
                      ? 'bg-red-600 border-red-600 text-white shadow-lg'
                      : 'bg-muted/30 border-transparent text-slate-500 hover:border-slate-200'}"
                  >
                    {opt}
                  </button>
                {/each}
              </div>
            </div>

            <div class="space-y-4 pt-6 border-t border-border/50">
              <div class="flex items-center justify-between mb-2">
                <label
                  class="text-[10px] font-black uppercase tracking-widest text-slate-500"
                  >Geo-Tagging</label
                >
                <button
                  onclick={getLocation}
                  class="flex items-center gap-2 px-4 py-2 bg-blue-500/10 text-blue-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-500 hover:text-white transition-all"
                >
                  <MapPin size={12} /> Ambil GPS
                </button>
              </div>
              <div class="grid grid-cols-3 gap-3">
                <div class="space-y-1">
                  <p
                    class="text-[8px] font-black text-slate-400 uppercase tracking-widest"
                  >
                    Lat
                  </p>
                  <input
                    type="number"
                    step="any"
                    bind:value={formLatitude}
                    placeholder="0.000"
                    class="w-full bg-muted/50 border-transparent rounded-xl p-3 text-xs font-bold outline-none focus:border-red-500/50 border-2 transition-all"
                  />
                </div>
                <div class="space-y-1">
                  <p
                    class="text-[8px] font-black text-slate-400 uppercase tracking-widest"
                  >
                    Long
                  </p>
                  <input
                    type="number"
                    step="any"
                    bind:value={formLongitude}
                    placeholder="0.000"
                    class="w-full bg-muted/50 border-transparent rounded-xl p-3 text-xs font-bold outline-none focus:border-red-500/50 border-2 transition-all"
                  />
                </div>
                <div class="space-y-1">
                  <p
                    class="text-[8px] font-black text-slate-400 uppercase tracking-widest"
                  >
                    Alt (m)
                  </p>
                  <input
                    type="number"
                    step="any"
                    bind:value={formAltitude}
                    placeholder="0"
                    class="w-full bg-muted/50 border-transparent rounded-xl p-3 text-xs font-bold outline-none focus:border-red-500/50 border-2 transition-all"
                  />
                </div>
              </div>
            </div>

            <!-- Documentation -->
            <div class="space-y-4 pt-6 border-t border-border/50">
              <label
                class="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1"
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

              <input
                type="file"
                bind:this={fileInput}
                onchange={handleFileChange}
                accept="image/*"
                class="hidden"
              />
            </div>

            <div class="space-y-2">
              <label
                class="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1"
                >Catatan Tambahan</label
              >
              <textarea
                bind:value={formCatatan}
                rows="4"
                placeholder="Jelaskan detail pengamatan Anda..."
                class="w-full bg-muted/50 border-2 border-transparent focus:border-red-500/50 rounded-2xl px-6 py-4 text-sm font-medium outline-none resize-none"
              ></textarea>
            </div>
          </div>
        </div>

        <div
          class="p-8 h-20 border-t border-border bg-muted/30 flex items-center justify-end gap-3"
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
      </div>
    </div>
  {/if}

  <!-- Success/Error Toast -->
  {#if success}
    <div
      class="fixed bottom-10 left-1/2 -translate-x-1/2 z-[2000] px-8 py-4 bg-emerald-600 text-white rounded-2xl shadow-2xl flex items-center gap-3 font-black uppercase text-[10px] tracking-widest"
      in:fly={{ y: 20 }}
    >
      <CheckCircle2 size={20} />
      {success}
    </div>
  {/if}
  {#if error}
    <div
      class="fixed bottom-10 left-1/2 -translate-x-1/2 z-[2000] px-8 py-4 bg-red-600 text-white rounded-2xl shadow-2xl flex items-center gap-3 font-black uppercase text-[10px] tracking-widest"
      in:fly={{ y: 20 }}
    >
      <AlertTriangle size={20} />
      {error}
      <button onclick={() => (error = "")} class="ml-4 opacity-50"
        ><X size={16} /></button
      >
    </div>
  {/if}

  <!-- View Drawer -->
  {#if showViewDrawer && selectedRecord}
    <div
      class="fixed inset-0 z-[2000] bg-black/20 backdrop-blur-sm flex justify-end"
      transition:fade
      onclick={() => (showViewDrawer = false)}
    >
      <div
        class="relative w-full max-w-2xl bg-card border-l border-border h-full shadow-2xl flex flex-col overflow-hidden"
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
              Detail Monitoring
            </h2>
          </div>
          <button
            onclick={() => (showViewDrawer = false)}
            class="p-3 bg-white border border-border rounded-2xl hover:bg-red-50 hover:text-red-500 transition-all"
            ><X size={24} /></button
          >
        </div>

        <div class="grow overflow-y-auto custom-scrollbar">
          <div class="relative h-72 overflow-hidden">
            {#if selectedRecord.foto}
              <img
                src={selectedRecord.foto}
                alt=""
                class="w-full h-full object-cover opacity-80"
              />
            {:else}
              <div
                class="w-full h-full flex flex-col items-center justify-center gap-6 text-white/10"
              >
                <Bug size={120} />
              </div>
            {/if}

            <div class="absolute bottom-8 left-8">
              <span
                class="inline-flex items-center gap-2 px-4 py-2 {getSeverityColor(
                  selectedRecord.tingkat_serangan || '',
                )} text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-xl"
              >
                <AlertTriangle size={14} /> Serangan: {selectedRecord.tingkat_serangan}%
              </span>
            </div>
          </div>

          <div class="p-10 space-y-12">
            <h2
              class="text-3xl font-black tracking-tight leading-none uppercase"
            >
              {selectedRecord.nama_jenis}
            </h2>
            <div class="grid grid-cols-3 gap-8">
              <div class="space-y-1">
                <p
                  class="text-[9px] font-black text-slate-400 uppercase tracking-widest"
                >
                  Kategori
                </p>
                <p class="text-base font-black capitalize text-slate-800">
                  {selectedRecord.kategori_gangguan}
                </p>
              </div>
              <div class="space-y-1">
                <p
                  class="text-[9px] font-black text-slate-400 uppercase tracking-widest"
                >
                  Bagian
                </p>
                <p class="text-base font-black capitalize text-emerald-600">
                  {selectedRecord.bagian_terserang || "-"}
                </p>
              </div>
              <div class="space-y-1">
                <p
                  class="text-[9px] font-black text-slate-400 uppercase tracking-widest"
                >
                  Tanggal Monitoring
                </p>
                <p class="text-base font-black text-slate-800">
                  {formatDate(selectedRecord.tanggal_monitoring)}
                </p>
              </div>
            </div>

            <div
              class="p-8 bg-muted/40 rounded-[2.5rem] border border-border/50"
            >
              <div class="flex items-center gap-3 mb-4">
                <div
                  class="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white"
                >
                  <Shovel size={20} />
                </div>
                <h4
                  class="text-[10px] font-black uppercase tracking-widest text-slate-900"
                >
                  Pengendalian saat ini
                </h4>
              </div>
              <p
                class="text-lg font-bold text-slate-700 leading-relaxed capitalize"
              >
                {selectedRecord.cara_pengendalian || "Belum Ada Pengendalian"}
              </p>
            </div>

            <!-- Farmer & Plot Details -->
            <div class="pt-8 border-t border-border/50">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <!-- Farmer -->
                <div
                  class="flex items-center gap-6 p-8 bg-emerald-500/5 rounded-3xl border border-emerald-500/10"
                >
                  <div
                    class="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-sm shrink-0 border border-border overflow-hidden"
                  >
                    {#if selectedRecord.demoplot?.petani?.foto_profil}
                      <img
                        src={selectedRecord.demoplot.petani.foto_profil}
                        alt=""
                        class="w-full h-full object-cover"
                      />
                    {:else}
                      <User size={24} class="text-emerald-400" />
                    {/if}
                  </div>
                  <div>
                    <p
                      class="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-1"
                    >
                      Petani Pengelola
                    </p>
                    <h4 class="font-black text-lg text-foreground leading-none">
                      {selectedRecord.demoplot?.petani?.nama_lengkap || "-"}
                    </h4>
                  </div>
                </div>

                <!-- Plot -->
                <div
                  class="flex items-center gap-6 p-8 bg-muted/30 rounded-3xl border border-border/50"
                >
                  <div
                    class="w-14 h-14 bg-white rounded-2xl flex items-center justify-center border border-border shadow-sm shrink-0"
                  >
                    <LandPlot size={24} class="text-emerald-600" />
                  </div>
                  <div>
                    <p
                      class="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1"
                    >
                      Lokasi Demoplot
                    </p>
                    <h4 class="font-black text-lg text-foreground leading-none">
                      {selectedRecord.demoplot?.nama_demoplot || "-"}
                    </h4>
                  </div>
                </div>
              </div>
            </div>

            <!-- Geospatial Data -->
            {#if selectedRecord.latitude}
              <div class="pt-8 border-t border-border/50 space-y-4">
                <div class="flex items-center gap-3">
                  <div
                    class="w-8 h-8 bg-blue-500/10 text-blue-600 rounded-lg flex items-center justify-center"
                  >
                    <MapPin size={16} />
                  </div>
                  <h3
                    class="text-sm font-black uppercase tracking-[0.2em] text-blue-600"
                  >
                    Geo-Tagging
                  </h3>
                </div>
                <div class="grid grid-cols-3 gap-4">
                  <div
                    class="p-4 bg-muted/30 rounded-2xl border border-border/50"
                  >
                    <p
                      class="text-[8px] font-black text-muted-foreground uppercase mb-1"
                    >
                      Latitude
                    </p>
                    <p class="text-xs font-bold">
                      {selectedRecord.latitude.toFixed(6)}
                    </p>
                  </div>
                  <div
                    class="p-4 bg-muted/30 rounded-2xl border border-border/50"
                  >
                    <p
                      class="text-[8px] font-black text-muted-foreground uppercase mb-1"
                    >
                      Longitude
                    </p>
                    <p class="text-xs font-bold">
                      {selectedRecord.longitude?.toFixed(6) || "-"}
                    </p>
                  </div>
                  <div
                    class="p-4 bg-muted/30 rounded-2xl border border-border/50"
                  >
                    <p
                      class="text-[8px] font-black text-muted-foreground uppercase mb-1"
                    >
                      Altitude
                    </p>
                    <p class="text-xs font-bold">
                      {selectedRecord.altitude?.toFixed(1) || "0"} m
                    </p>
                  </div>
                </div>
              </div>
            {/if}

            <div class="space-y-3">
              <h4
                class="text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-border pb-2"
              >
                Catatan Pengamat
              </h4>
              <p class="text-base text-slate-600 font-medium leading-relaxed">
                {selectedRecord.catatan || "Tidak ada catatan tambahan."}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  {/if}

  <!-- Map Drawer -->
  {#if showMapDrawer}
    <div
      class="fixed inset-0 z-[2000] bg-black/20 backdrop-blur-sm flex justify-end"
      transition:fade
      onclick={() => (showMapDrawer = false)}
    >
      <div
        class="h-full w-full lg:max-w-[50vw] bg-card border-l border-border shadow-2xl overflow-hidden flex flex-col"
        in:fly={{ x: 800, duration: 500, easing: backOut }}
        out:fly={{ x: 800, duration: 400 }}
        onclick={(e) => e.stopPropagation()}
      >
        <div class="grow relative">
          <div bind:this={mapContainer} class="absolute inset-0 z-0"></div>

          <!-- Floating Close Button -->
          <button
            onclick={() => (showMapDrawer = false)}
            class="absolute top-6 left-6 z-[1000] h-12 w-12 bg-slate-900/60 backdrop-blur-3xl border border-white/20 rounded-2xl text-white hover:bg-white/20 transition-all active:scale-95 flex items-center justify-center shadow-2xl"
          >
            <X size={20} />
          </button>

          <!-- HUD Controls (Basemap Dropdown) -->
          <div class="absolute top-6 right-6 z-[1000] flex flex-col gap-3">
            <div class="relative">
              <button
                onclick={toggleBasemap}
                class="h-12 px-6 bg-slate-900/60 backdrop-blur-3xl border border-white/20 rounded-2xl flex items-center gap-3 text-white hover:bg-white/30 transition-all shadow-2xl"
              >
                <Layers size={18} class="text-emerald-400" />
                <span class="text-[10px] font-black uppercase tracking-widest">
                  {baseMaps[currentBaseMap as keyof typeof baseMaps]?.label ||
                    "Standard Map"}
                </span>
                <ChevronRight
                  size={14}
                  class="transition-transform {showBasemapDropdown
                    ? 'rotate-[-90deg]'
                    : 'rotate-90'}"
                />
              </button>

              {#if showBasemapDropdown}
                <div
                  class="absolute top-full right-0 mt-2 w-48 bg-slate-900/80 backdrop-blur-3xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl z-[2000]"
                  in:fly={{ y: 10, duration: 300 }}
                  out:fade={{ duration: 200 }}
                >
                  {#each Object.entries(baseMaps) as [key, config]}
                    <button
                      onclick={() => {
                        switchBaseMap(key);
                        showBasemapDropdown = false;
                      }}
                      class="w-full px-5 py-3.5 text-left text-[10px] font-black uppercase tracking-widest transition-colors flex items-center justify-between {currentBaseMap ===
                      key
                        ? 'bg-emerald-600 text-white'
                        : 'text-slate-300 hover:bg-white/10'}"
                    >
                      {config.label}
                    </button>
                  {/each}
                </div>
              {/if}
            </div>
          </div>
        </div>
      </div>
    </div>
  {/if}

  <!-- Direktori Drawer -->
  {#if showDirectoryDrawer}
    <div
      class="fixed inset-0 z-[2000] bg-black/20 backdrop-blur-sm flex justify-end"
      transition:fade
      onclick={() => (showDirectoryDrawer = false)}
    >
      <div
        class="relative w-full max-w-2xl bg-card border-l border-border h-full shadow-2xl flex flex-col overflow-hidden"
        in:fly={{ x: 600, duration: 500, easing: backOut }}
        out:fly={{ x: 600, duration: 400 }}
        onclick={(e) => e.stopPropagation()}
      >
        <!-- Header -->
        <div
          class="p-8 h-20 border-b border-border flex items-center justify-between bg-white text-slate-900 relative"
        >
          <div>
            <h2
              class="text-3xl font-black tracking-tight leading-none uppercase"
            >
              Direktori HPG
            </h2>
          </div>
          <button
            onclick={() => (showDirectoryDrawer = false)}
            class="p-3 bg-white border border-border rounded-2xl hover:bg-red-50 hover:text-red-500 transition-all"
            ><X size={24} /></button
          >
        </div>

        <div class="flex-1 overflow-y-auto p-8 pt-0 space-y-6 custom-scrollbar relative">
          <!-- Floating Glass Search -->
          <div class="sticky top-4 z-[100] pb-4 bg-card/0">
            <div
              class="flex flex-row items-center gap-3 bg-background/60 backdrop-blur-3xl p-3 md:p-4 rounded-[2rem] border border-border/50 shadow-2xl shadow-black/5 transition-all duration-500"
            >
              <div class="relative flex-1 group">
                <Search
                  size={18}
                  class="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-amber-500 transition-colors"
                />
                <input
                  type="text"
                  bind:value={directorySearchQuery}
                  placeholder="Cari referensi hama/penyakit/gulma..."
                  class="w-full bg-transparent border-transparent focus:ring-0 rounded-2xl pl-11 pr-4 py-1 text-sm font-medium transition-all outline-none"
                />
              </div>
            </div>
          </div>

          {#if filteredDirektori.length === 0}
            <div class="py-20 text-center">
              <InfoIcon
                size={40}
                class="mx-auto text-muted-foreground/30 mb-4"
              />
              <p
                class="text-sm font-bold text-muted-foreground uppercase tracking-widest"
              >
                Tidak ada referensi ditemukan
              </p>
            </div>
          {:else}
            <div class="grid grid-cols-1 gap-4">
              {#each filteredDirektori as item}
                <div
                  class="group bg-card border border-border/50 rounded-3xl p-6 hover:border-amber-500/50 transition-all hover:shadow-xl hover:shadow-amber-500/5"
                >
                  <div class="flex gap-6 items-start">
                    {#if item.image_url}
                      <button
                        onclick={() => (previewImage = item.image_url)}
                        class="flex-shrink-0 cursor-zoom-in"
                      >
                        <img
                          src={item.image_url}
                          alt={item.nama_jenis}
                          class="w-24 h-24 rounded-2xl object-cover shadow-lg hover:scale-105 transition-transform"
                        />
                      </button>
                    {:else}
                      <div
                        class="w-24 h-24 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground"
                      >
                        <Bug size={32} />
                      </div>
                    {/if}
                    <div class="flex-1 space-y-2">
                      <div class="flex items-center justify-between">
                        <span
                          class="text-[9px] font-black uppercase px-2 py-1 bg-amber-100 text-amber-700 rounded-lg tracking-widest"
                          >{item.kategori_gangguan}</span
                        >
                        <button
                          onclick={() => selectFromDirectory(item)}
                          class="flex items-center gap-2 px-3 py-1.5 bg-slate-900 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all active:scale-95"
                        >
                          <Plus size={12} /> Gunakan Template
                        </button>
                      </div>
                      <h3
                        class="text-xl font-black text-slate-800 leading-tight"
                      >
                        {item.nama_jenis}
                      </h3>
                      <p class="text-xs italic text-slate-500 font-medium">
                        {item.nama_ilmiah}
                      </p>
                    </div>
                  </div>
                  <div
                    class="mt-6 pt-6 border-t border-dashed border-border space-y-4"
                  >
                    <div>
                      <h4
                        class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1"
                      >
                        Deskripsi
                      </h4>
                      <p
                        class="text-xs font-medium text-slate-600 leading-relaxed"
                      >
                        {item.deskripsi || "Belum ada deskripsi."}
                      </p>
                    </div>
                    <div>
                      <h4
                        class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1"
                      >
                        Pengendalian Standar
                      </h4>
                      <p class="text-xs font-bold text-slate-700">
                        {item.cara_pengendalian ||
                          "Patuhi protokol standar kebun."}
                      </p>
                    </div>
                  </div>
                </div>
              {/each}
            </div>
          {/if}
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

  <!-- Delete Confirm Modal -->
  {#if showDeleteConfirm}
    <div
      class="fixed inset-0 z-[2000] flex items-center justify-center p-6"
      in:fade
    >
      <div
        class="absolute inset-0 bg-slate-950/80 backdrop-blur-xl"
        onclick={() => (showDeleteConfirm = false)}
      ></div>
      <div
        class="relative w-full max-w-sm bg-background p-10 rounded-[3rem] shadow-2xl text-center space-y-8"
        in:scale={{ start: 0.9, duration: 400 }}
      >
        <div
          class="w-24 h-24 bg-red-100 rounded-[2.5rem] flex items-center justify-center text-red-500 mx-auto"
        >
          <Trash2 size={40} />
        </div>
        <div class="space-y-2">
          <h3 class="text-2xl font-black tracking-tight text-slate-900">
            Hapus Laporan?
          </h3>
          <p class="text-sm font-medium text-slate-500 italic">
            Data yang dihapus tidak dapat dikembalikan lagi dari database.
          </p>
        </div>
        <div class="flex flex-col gap-3">
          <button
            onclick={confirmDelete}
            class="w-full py-4 bg-red-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-red-600/20 active:scale-95"
            >Ya, Hapus Permanen</button
          >
          <button
            onclick={() => (showDeleteConfirm = false)}
            class="w-full py-4 bg-muted hover:bg-slate-200 text-slate-900 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-colors"
            >Batalkan</button
          >
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  :global(body) {
    background-color: #f8fafc;
  }

  .hpg-slider {
    -webkit-appearance: none;
    appearance: none;
  }

  /* Webkit (Chrome, Safari, Edge) */
  .hpg-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 24px;
    height: 24px;
    background: #dc2626; /* red-600 */
    border: 4px solid white;
    border-radius: 50%;
    cursor: pointer;
    box-shadow: 0 4px 10px rgba(220, 38, 38, 0.3);
    transition: all 0.2s ease;
  }

  .hpg-slider::-webkit-slider-thumb:hover {
    transform: scale(1.1);
    box-shadow: 0 6px 15px rgba(220, 38, 38, 0.4);
  }

  .hpg-slider::-webkit-slider-thumb:active {
    transform: scale(0.95);
    background: #b91c1c; /* red-700 */
  }

  /* Firefox */
  .hpg-slider::-moz-range-thumb {
    width: 20px;
    height: 20px;
    background: #dc2626;
    border: 4px solid white;
    border-radius: 50%;
    cursor: pointer;
    box-shadow: 0 4px 10px rgba(220, 38, 38, 0.3);
  }

  :global(.marker-container) {
    position: relative;
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  :global(.marker-pulse) {
    position: absolute;
    width: 60px;
    height: 60px;
    border-radius: 50%;
    z-index: 1;
    animation: pulse 2s infinite;
  }

  @keyframes pulse {
    0% {
      transform: scale(0.5);
      opacity: 1;
    }
    100% {
      transform: scale(1.5);
      opacity: 0;
    }
  }
</style>
