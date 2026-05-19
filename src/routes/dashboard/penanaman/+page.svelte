<script lang="ts">
  import { onMount, mount } from "svelte";
  import {
    getMonitoringPenanaman,
    createMonitoringPenanaman,
    updateMonitoringPenanaman,
    deleteMonitoringPenanaman,
    uploadFotoTanaman,
    type MonitoringPenanaman,
  } from "$lib/services/penanaman";
  import { getDemoplotList } from "$lib/services/demoplot";
  import type { Demoplot } from "../../../types/demoplot";
  import {
    Sprout,
    Plus,
    Calendar,
    Ruler,
    Dna,
    Trash2,
    Pencil,
    X,
    Filter,
    Search,
    Map as MapIcon,
    MapPin,
    Home,
    LocateFixed,
    ArrowUpRight,
    Camera,
    Sparkles,
    RefreshCw,
    CheckCircle2,
    Layers,
    ChevronLeft,
    ChevronRight,
    User,
    Eye,
    Activity,
    BotMessageSquare,
    Thermometer,
    Clock,
    Trees,
    LandPlot,
    Image as ImageIcon,
    ClipboardCheck,
    Smile,
    Meh,
    Frown,
    ArrowLeft,
    AlertTriangle,
  } from "@lucide/svelte";

  import { fade, fly, scale } from "svelte/transition";
  import { backOut } from "svelte/easing";

  let records = $state<MonitoringPenanaman[]>([]);
  let demoplots = $state<Demoplot[]>([]);
  let loading = $state(true);
  let error = $state("");
  let success = $state("");

  // Filtering
  let searchQuery = $state("");
  let conditionFilter = $state("");
  let demoplotFilter = $state("");
  let categoryFilter = $state("");

  let filteredRecords = $derived.by(() => {
    // Group by kode_tanaman and take the latest (first in sorted records)
    const groupedMap = new Map<string, MonitoringPenanaman>();
    records.forEach((r) => {
      if (!groupedMap.has(r.kode_tanaman)) {
        groupedMap.set(r.kode_tanaman, r);
      }
    });

    return Array.from(groupedMap.values()).filter((r) => {
      const matchSearch =
        !searchQuery ||
        r.jenis_tanaman?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.nama_ilmiah?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.demoplot?.nama_demoplot
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        r.kode_tanaman.toLowerCase().includes(searchQuery.toLowerCase());
      const matchCondition =
        !conditionFilter || r.kondisi_pertumbuhan === conditionFilter;
      const matchDemoplot = !demoplotFilter || r.demoplot_id === demoplotFilter;
      const matchCategory =
        !categoryFilter || r.kategori_tanaman === categoryFilter;
      return matchSearch && matchCondition && matchDemoplot && matchCategory;
    });
  });

  // Pagination
  let pageIndex = $state(0);
  const pageSize = 12;
  let totalPages = $derived(Math.ceil(filteredRecords.length / pageSize));
  let paginatedRecords = $derived(
    filteredRecords.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize),
  );
  let startItem = $derived(pageIndex * pageSize + 1);
  let endItem = $derived(
    Math.min((pageIndex + 1) * pageSize, filteredRecords.length),
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
  const canPreviousPage = () => pageIndex > 0;
  const canNextPage = () => pageIndex < totalPages - 1;

  // Latest Unique Records for Stats (regardless of UI filters)
  let latestStatusRecords = $derived.by(() => {
    const map = new Map<string, MonitoringPenanaman>();
    records.forEach((r) => {
      if (!map.has(r.kode_tanaman)) map.set(r.kode_tanaman, r);
    });
    return Array.from(map.values());
  });

  // Stats
  let totalPlants = $derived(latestStatusRecords.length);
  let totalLogs = $derived(records.length);
  let healthyPlantsCount = $derived(
    latestStatusRecords.filter((r) => r.kondisi_pertumbuhan === "sehat").length,
  );
  let unhealthyPlantsCount = $derived(
    latestStatusRecords.filter((r) => r.kondisi_pertumbuhan !== "sehat").length,
  );
  let healthPercentage = $derived(
    totalPlants > 0 ? Math.round((healthyPlantsCount / totalPlants) * 100) : 0,
  );

  // Form State
  let showFormDrawer = $state(false);
  let showViewDrawer = $state(false);
  let showDeleteConfirm = $state(false);
  let selectedRecord = $state<MonitoringPenanaman | null>(null);
  let deleteTarget = $state<MonitoringPenanaman | null>(null);
  let isEditing = $state(false);
  let editingId = $state("");

  // Form Fields
  let formDemoplotId = $state("");
  let formKodeTanaman = $state("");
  let formTanggal = $state(new Date().toISOString().split("T")[0]);
  let formPeriode = $state<MonitoringPenanaman["periode_monitoring"]>("P1");

  let formWaktuTanam = $state("");
  let formJarakTanam = $state("");
  let formKategoriTanaman =
    $state<MonitoringPenanaman["kategori_tanaman"]>(null);
  let formJenisTanaman = $state("");
  let formNamaIlmiah = $state("");
  let formSumberBibit =
    $state<MonitoringPenanaman["sumber_bibit"]>("bibit sertifikat");
  let formUsia = $state<number | "">("");
  let formKondisi = $state<MonitoringPenanaman["kondisi_pertumbuhan"]>(null);

  let formTinggi = $state<number | "">("");
  let formDbh = $state<number | "">("");
  let formCatatan = $state("");
  let formFoto = $state("");
  let formLatitude = $state<number | null>(null);
  let formLongitude = $state<number | null>(null);
  let formAltitude = $state<number | null>(null);
  let showMapDrawer = $state(false);
  let focusRecord = $state<MonitoringPenanaman | null>(null);
  let mapContainer: HTMLElement;
  let leafletMap: any;
  let tileLayer: any = null;
  let rasterLayer: any = null;
  let uploading = $state(false);

  let mapMarkers: any[] = [];
  let mapPolygons: any[] = [];

  function zoomToAll() {
    if (!leafletMap || (mapMarkers.length === 0 && mapPolygons.length === 0))
      return;
    const group = L.featureGroup([...mapMarkers, ...mapPolygons]);
    leafletMap.fitBounds(group.getBounds().pad(0.1));
  }

  function getCurrentLocation() {
    if (!leafletMap) return;
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          leafletMap.flyTo([latitude, longitude], 16, { duration: 1.5 });

          L.circleMarker([latitude, longitude], {
            radius: 8,
            fillColor: "#3b82f6",
            color: "#fff",
            weight: 2,
            opacity: 1,
            fillOpacity: 0.8,
          })
            .addTo(leafletMap)
            .bindPopup("Lokasi Anda")
            .openPopup();
        },
        (err) => {
          console.error("Geolocation error:", err);
          error = "Gagal mengambil lokasi: " + err.message;
        },
      );
    }
  }

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
      // Render Satellite under drone
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

  let fileInput: HTMLInputElement;

  let historyRecords = $derived(
    selectedRecord
      ? records.filter((r) => r.kode_tanaman === selectedRecord!.kode_tanaman)
      : [],
  );

  async function loadInitialData() {
    loading = true;
    try {
      const [recordsData, demoplotsData] = await Promise.all([
        getMonitoringPenanaman(),
        getDemoplotList(),
      ]);
      records = recordsData;
      demoplots = demoplotsData;
    } catch (err) {
      error = "Gagal memuat data monitoring";
      console.error(err);
    } finally {
      loading = false;
    }
  }

  function openViewDrawer(record: MonitoringPenanaman) {
    selectedRecord = record;
    showViewDrawer = true;
  }

  function openAddForm() {
    isEditing = false;
    editingId = "";
    formDemoplotId = "";
    formKodeTanaman = "";
    formTanggal = new Date().toISOString().split("T")[0];
    formPeriode = "P1";

    formWaktuTanam = "";
    formJarakTanam = "";
    formKategoriTanaman = null;
    formJenisTanaman = "";
    formNamaIlmiah = "";

    formSumberBibit = "bibit sertifikat";
    formUsia = "";
    formKondisi = null;

    formTinggi = "";
    formDbh = "";
    formCatatan = "";
    formFoto = "";
    formLatitude = null;
    formLongitude = null;
    formAltitude = null;
    showFormDrawer = true;
  }

  function openEditForm(record: MonitoringPenanaman) {
    isEditing = true;
    editingId = record.id;
    formDemoplotId = record.demoplot_id;
    formKodeTanaman = record.kode_tanaman || "";
    formTanggal = record.tanggal_monitoring;
    formPeriode = record.periode_monitoring || "P1";

    formWaktuTanam = record.waktu_tanam || "";
    formJarakTanam = record.jarak_tanam || "";
    formKategoriTanaman = record.kategori_tanaman;
    formJenisTanaman = record.jenis_tanaman || "";
    formNamaIlmiah = record.nama_ilmiah || "";
    formSumberBibit = record.sumber_bibit;
    formUsia = record.usia_tanaman || "";
    formKondisi = record.kondisi_pertumbuhan;
    formTinggi = record.tinggi || "";
    formDbh = record.dbh || "";
    formCatatan = record.catatan || "";
    formFoto = record.foto_tanaman || "";
    formLatitude = record.latitude;
    formLongitude = record.longitude;
    formAltitude = record.altitude;
    showFormDrawer = true;
  }

  function startNextMonitoring(record: MonitoringPenanaman) {
    isEditing = false;
    editingId = "";

    // Pre-fill from previous record
    formDemoplotId = record.demoplot_id;
    formKodeTanaman = record.kode_tanaman || "";
    formTanggal = new Date().toISOString().split("T")[0];

    // Increment Period
    if (record.periode_monitoring === "P1") formPeriode = "P2";
    else if (record.periode_monitoring === "P2") formPeriode = "P3";
    else formPeriode = "P1"; // Should not happen with current logic

    formWaktuTanam = record.waktu_tanam || "";
    formJarakTanam = record.jarak_tanam || "";
    formKategoriTanaman = record.kategori_tanaman;
    formJenisTanaman = record.jenis_tanaman || "";
    formNamaIlmiah = record.nama_ilmiah || "";
    formSumberBibit = record.sumber_bibit;

    // Reset values that should be updated
    formUsia = "";
    formKondisi = "sehat";
    formTinggi = "";
    formDbh = "";
    formCatatan = "";
    formFoto = "";
    formLatitude = record.latitude;
    formLongitude = record.longitude;
    formAltitude = record.altitude;

    showFormDrawer = true;
  }

  async function handleSubmit() {
    if (!formDemoplotId) {
      error = "Pilih demoplot";
      return;
    }
    if (!formKodeTanaman.trim()) {
      error = "Kode Tanaman wajib diisi";
      return;
    }
    if (formPeriode === "P1") {
      if (!formJarakTanam || !formJarakTanam.trim()) {
        error = "Jarak Tanam wajib diisi";
        return;
      }
      if (!formKategoriTanaman) {
        error = "Kategori Tanaman wajib dipilih";
        return;
      }
    }
    if (!formKondisi) {
      error = "Kondisi Pertumbuhan wajib dipilih";
      return;
    }

    loading = true;

    try {
      const payload = {
        demoplot_id: formDemoplotId,
        kode_tanaman: formKodeTanaman,
        tanggal_monitoring: formTanggal,
        periode_monitoring: formPeriode,
        waktu_tanam: formWaktuTanam || null,

        jarak_tanam: formJarakTanam || null,
        kategori_tanaman: formKategoriTanaman,
        jenis_tanaman: formJenisTanaman,
        nama_ilmiah: formNamaIlmiah,
        sumber_bibit: formSumberBibit,
        usia_tanaman: formUsia === "" ? null : Number(formUsia),
        kondisi_pertumbuhan: formKondisi,
        tinggi: formTinggi === "" ? null : Number(formTinggi),
        dbh: formPeriode === "P3" && formDbh !== "" ? Number(formDbh) : null,
        catatan: formCatatan,
        foto_tanaman: formFoto,
        latitude: formLatitude,
        longitude: formLongitude,
        altitude: formAltitude,
      };

      if (isEditing) {
        await updateMonitoringPenanaman(editingId, payload);
        success = "Data monitoring berhasil diperbarui";
      } else {
        await createMonitoringPenanaman(payload);
        success = "Data monitoring baru berhasil disimpan";
      }

      showFormDrawer = false;
      records = await getMonitoringPenanaman();
      setTimeout(() => (success = ""), 3000);
    } catch (err) {
      error = "Gagal menyimpan data";
      console.error(err);
    } finally {
      loading = false;
    }
  }

  function initiateDelete(record: MonitoringPenanaman) {
    deleteTarget = record;
    showDeleteConfirm = true;
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      await deleteMonitoringPenanaman(deleteTarget.id);
      records = records.filter((r) => r.id !== deleteTarget!.id);
      success = "Data berhasil dihapus";
      setTimeout(() => (success = ""), 3000);
    } catch (err) {
      error = "Gagal menghapus data";
    } finally {
      showDeleteConfirm = false;
      deleteTarget = null;
    }
  }

  async function handleFileChange(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    uploading = true;
    try {
      const tempId = editingId || `new-${Date.now()}`;
      formFoto = await uploadFotoTanaman(file, tempId);
    } catch (err) {
      error = "Gagal upload foto";
    } finally {
      uploading = false;
    }
  }

  function getConditionColor(cond: string) {
    if (cond === "sehat") return "bg-emerald-500";
    if (cond === "tidak sehat") return "bg-amber-500";
    return "bg-red-500";
  }

  function getConditionIcon(cond: string) {
    if (cond === "sehat") return Smile;
    if (cond === "tidak sehat") return Meh;
    return Frown;
  }

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  async function getLocation() {
    if (!navigator.geolocation) {
      error = "Geolokasi tidak didukung oleh browser Anda";
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        formLatitude = pos.coords.latitude;
        formLongitude = pos.coords.longitude;
        formAltitude = pos.coords.altitude || 0;
        success = "Lokasi berhasil diperbarui";
        setTimeout(() => (success = ""), 2000);
      },
      (err) => {
        error = "Gagal mengambil lokasi: " + err.message;
        console.error(err);
      },
    );
  }

  onMount(loadInitialData);

  $effect(() => {
    if (
      showFormDrawer ||
      showViewDrawer ||
      showDeleteConfirm ||
      showMapDrawer
    ) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
  });

  $effect(() => {
    if (showMapDrawer && mapContainer) {
      initMap();
    } else if (leafletMap) {
      leafletMap.remove();
      leafletMap = null;
    }
  });

  let L: any;
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

    // Clear existing layers except tileLayer
    leafletMap.eachLayer((layer: any) => {
      if (layer !== tileLayer) {
        leafletMap.removeLayer(layer);
      }
    });

    const fullPlot = demoplots.find((dp) => dp.id === focusRecord?.demoplot_id);
    const fotoUdara = (fullPlot as any)?.foto_udara;
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
      } else {
        // Fallback for non-tile drone images
        const plot = fullPlot;
        if (!plot) return;
        let bounds = (plot as any).polygon
          ? L.geoJSON(
              typeof (plot as any).polygon === "string"
                ? JSON.parse((plot as any).polygon)
                : (plot as any).polygon,
            ).getBounds()
          : [
              [(plot.latitude || 0) - 0.002, (plot.longitude || 0) - 0.002],
              [(plot.latitude || 0) + 0.002, (plot.longitude || 0) + 0.002],
            ];
        rasterLayer = L.imageOverlay(fotoUdara, bounds, {
          opacity: 0.8,
        }).addTo(leafletMap);
      }
    }

    const markers: any[] = [];
    latestStatusRecords.forEach((r) => {
      if (r.latitude && r.longitude) {
        // Render the Sprout icon to a temporary container to get its HTML
        const iconContainer = document.createElement("div");
        mount(Sprout, {
          target: iconContainer,
          props: { size: 18, strokeWidth: 2.5 },
        });

        const icon = L.divIcon({
          className: "custom-icon-marker",
          html: `<div class="marker-container group">
                  <div class="marker-pulse bg-emerald-500/20"></div>
                  <div class="w-10 h-10 bg-white border-2 border-emerald-500 rounded-full flex items-center justify-center text-emerald-700 shadow-lg transition-transform hover:scale-125 relative z-10">
                    ${iconContainer.innerHTML}
                  </div>
                </div>`,
          iconSize: [40, 40],
          iconAnchor: [20, 20],
        });

        const marker = L.marker([r.latitude, r.longitude], { icon }).addTo(
          leafletMap,
        ).bindPopup(`
            <div class="p-4 min-w-[200px]">
              <p class="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-1">ID Tanaman: ${r.kode_tanaman}</p>
              <h3 class="font-black text-slate-800 uppercase text-sm leading-tight mb-2">${r.jenis_tanaman}</h3>
              <div class="flex items-center gap-2 mb-3">
                 <div class="w-6 h-6 rounded-lg bg-muted flex items-center justify-center text-slate-400">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                 </div>
                 <div class="flex flex-col">
                   <p class="text-[10px] font-bold text-slate-600">${r.demoplot?.nama_demoplot || "Plot Umum"}</p>
                   ${r.kategori_tanaman ? `<p class="text-[8px] font-black text-emerald-600 uppercase tracking-wider">${r.kategori_tanaman}</p>` : ""}
                 </div>
              </div>
              <div class="pt-3 border-t border-slate-100 flex flex-col gap-1">
                <div class="flex items-center justify-between">
                  <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Tinggi: ${r.tinggi || 0} cm</span>
                  ${r.dbh ? `<span class="text-[9px] font-black text-slate-400 uppercase tracking-widest">DBH: ${r.dbh} cm</span>` : ""}
                </div>
                <div class="flex items-center justify-between mt-1">
                  <span class="px-2 py-0.5 ${getConditionColor(r.kondisi_pertumbuhan || "")} text-[8px] font-black text-white rounded-full uppercase tracking-tighter">${r.kondisi_pertumbuhan || "Normal"}</span>
                </div>
              </div>
            </div>
          `);
        markers.push(marker);

        if (focusRecord && focusRecord.kode_tanaman === r.kode_tanaman) {
          marker.openPopup();
        }
      }
    });

    const polygonLayers: any[] = [];
    const demoplotsToDraw = focusRecord
      ? demoplots.filter((dp) => dp.id === focusRecord?.demoplot_id)
      : demoplots;

    demoplotsToDraw.forEach((dp) => {
      if (dp.polygon) {
        try {
          let geojsonData =
            typeof dp.polygon === "string"
              ? JSON.parse(dp.polygon)
              : dp.polygon;

          const layer = L.geoJSON(geojsonData, {
            style: {
              color: "#10b981",
              weight: 2,
              opacity: 0.8,
              fillColor: "#10b981",
              fillOpacity: 0.2,
            },
          }).addTo(leafletMap);
          polygonLayers.push(layer);
        } catch (e) {
          console.error("Error parsing polygon", e);
        }
      }
    });

    if (focusRecord && focusRecord.latitude && focusRecord.longitude) {
      leafletMap.setView([focusRecord.latitude, focusRecord.longitude], 18);
    } else if (markers.length > 0 || polygonLayers.length > 0) {
      const group = L.featureGroup([...markers, ...polygonLayers]);
      leafletMap.fitBounds(group.getBounds().pad(0.1));
    }
    mapMarkers = markers;
    mapPolygons = polygonLayers;
  }

  function openMapForRecord(record: MonitoringPenanaman) {
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

  $effect(() => {
    searchQuery;
    conditionFilter;
    demoplotFilter;
    categoryFilter;
    pageIndex = 0;
  });
</script>

<div class="min-h-screen pb-24 px-6 max-w-7xl mx-auto space-y-12">
  <!-- Module Hero -->
  <section
    class="relative mt-28 rounded-[2.5rem] bg-emerald-950 overflow-hidden shadow-2xl shadow-emerald-950/20"
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
            <Sprout size={12} class="text-emerald-400" /> Pantau Tanaman
          </div>
        </div>
        <div class="space-y-4">
          <h1
            class="text-4xl md:text-7xl font-black tracking-tighter leading-[0.9]"
          >
            Monitoring <span
              class="bg-gradient-to-r from-emerald-400 to-emerald-200 bg-clip-text text-transparent"
              >Pertumbuhan</span
            >
          </h1>
          <p
            class="text-lg text-emerald-50/70 font-medium max-w-xl mx-auto lg:mx-0"
          >
            Analisis kondisi vegetasi secara periodik.
          </p>
        </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div
          class="group relative p-8 bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] hover:bg-white/10 hover:-translate-y-1 hover:shadow-2xl hover:border-white/20 transition-all duration-300 overflow-hidden active:scale-95"
        >
          <div
            class="absolute -right-4 -bottom-4 text-emerald-400/20 group-hover:text-emerald-400/30 transition-colors"
          >
            <Smile size={100} strokeWidth={1} />
          </div>
          <p
            class="text-[9px] font-black text-emerald-200/40 uppercase tracking-[0.2em] mb-1"
          >
            Populasi Sehat
          </p>
          <div class="flex items-baseline gap-2">
            <p class="text-4xl font-black">{healthyPlantsCount}</p>
            <p class="text-xs font-bold text-emerald-100/50">
              / {totalPlants} Tanaman
            </p>
          </div>
          <p class="mt-2 text-[10px] font-bold text-emerald-400">
            {healthPercentage}% Indeks Kesehatan
          </p>
        </div>
        <div
          class="group relative p-8 bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] hover:bg-white/10 hover:-translate-y-1 hover:shadow-2xl hover:border-white/20 transition-all duration-300 overflow-hidden active:scale-95"
        >
          <div
            class="absolute -right-4 -bottom-4 text-blue-400/20 group-hover:text-blue-400/30 transition-colors"
          >
            <Activity size={100} strokeWidth={1} />
          </div>
          <p
            class="text-[9px] font-black text-emerald-200/40 uppercase tracking-[0.2em] mb-1"
          >
            Aktivitas Monitor
          </p>
          <p class="text-4xl font-black">{totalLogs}</p>
          <p class="mt-2 text-[10px] font-bold text-blue-100/50 italic">
            Log data tersimpan
          </p>
        </div>
      </div>
    </div>
  </section>

  <!-- Action Bar -->
  <div
    class="sticky z-[100] flex flex-row items-center gap-3 bg-background/60 backdrop-blur-3xl p-3 md:p-4 rounded-[2rem] border border-border/50 shadow-2xl shadow-black/5 transition-all duration-500"
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
        placeholder="Cari jenis tanaman atau plot..."
        class="w-full bg-muted/40 border-transparent focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/10 rounded-2xl pl-11 pr-4 py-3 text-sm font-medium transition-all"
      />
    </div>

    <div class="hidden lg:flex items-center gap-2">
      <select
        bind:value={conditionFilter}
        class="w-40 bg-muted/30 border border-transparent hover:border-border rounded-xl px-3 py-2.5 text-[10px] font-black uppercase outline-none transition-all"
      >
        <option value="">Semua Kondisi</option>
        <option value="sehat">SEHAT</option>
        <option value="tidak sehat">KURANG SEHAT</option>
        <option value="mati">MATI</option>
      </select>
      <select
        bind:value={categoryFilter}
        class="w-40 bg-muted/30 border border-transparent hover:border-border rounded-xl px-3 py-2.5 text-[10px] font-black uppercase outline-none transition-all"
      >
        <option value="">Semua Kategori</option>
        <option value="tanaman utama">TANAMAN UTAMA</option>
        <option value="pohon penaung">POHON PENAUNG</option>
        <option value="tanaman lainnya">TANAMAN LAINNYA</option>
      </select>
      <select
        bind:value={demoplotFilter}
        class="w-40 bg-muted/30 border border-transparent hover:border-border rounded-xl px-3 py-2.5 text-[10px] font-black uppercase outline-none transition-all"
      >
        <option value="">Semua Plot</option>
        {#each demoplots as dp}<option value={dp.id}>{dp.nama_demoplot}</option
          >{/each}
      </select>
    </div>

    <button
      onclick={openAddForm}
      class="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-widest text-[10px] p-4 md:py-4 md:px-8 rounded-2xl transition-all shadow-lg active:scale-95 whitespace-nowrap"
    >
      <Plus size={18} /> <span class="hidden md:inline">Tambah Monitoring</span>
    </button>
  </div>

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

  <!-- Content -->
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
      <BotMessageSquare
        size={48}
        class="mx-auto text-muted-foreground/30 mb-4"
      />
      <h3
        class="text-lg font-black uppercase tracking-tight text-muted-foreground"
      >
        Data tidak ditemukan
      </h3>
    </div>
  {:else}
    <div
      class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
      in:fade
    >
      {#each paginatedRecords as r, i}
        <div
          class="group relative bg-card border border-border shadow-xl rounded-[2.5rem] overflow-hidden flex flex-col transition-all hover:border-emerald-500/50 hover:-translate-y-1"
          in:fly={{ y: 20, delay: i * 50 }}
        >
          <div class="relative h-56 bg-muted">
            {#if r.foto_tanaman}
              <img
                src={r.foto_tanaman}
                alt=""
                class="w-full h-full object-cover"
              />
            {:else}
              <div
                class="w-full h-full flex flex-col items-center justify-center opacity-20"
              >
                <Trees size={48} />
              </div>
            {/if}
            <div class="absolute top-4 left-4">
              <span
                class="inline-flex items-center gap-1.5 px-3 py-1.5 {getConditionColor(
                  r.kondisi_pertumbuhan || '',
                )} text-white text-[9px] font-black uppercase tracking-widest rounded-full shadow-lg"
              >
                <svelte:component
                  this={getConditionIcon(r.kondisi_pertumbuhan || "")}
                  size={12}
                />
                {r.kondisi_pertumbuhan}
              </span>
            </div>
            <div class="absolute top-4 right-4">
              <span
                class="inline-flex items-center px-3 py-1.5 bg-black/50 backdrop-blur-md border border-white/20 text-white text-[9px] font-black uppercase tracking-widest rounded-full shadow-lg"
              >
                {r.kode_tanaman}
              </span>
            </div>

            <div
              class="absolute inset-0 bg-emerald-950/40 backdrop-blur-sm lg:opacity-0 lg:group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2"
            >
              <div class="relative group/btn">
                <button
                  onclick={() => openMapForRecord(r)}
                  disabled={!r.latitude}
                  class="p-3 bg-white rounded-xl text-emerald-600 hover:scale-110 transition-transform disabled:opacity-20 shadow-xl"
                >
                  <MapIcon size={18} />
                </button>
                <!-- Tooltip -->
                <div
                  class="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 px-3 py-1.5 bg-foreground text-background text-[10px] font-black uppercase tracking-widest rounded-lg opacity-0 pointer-events-none group-hover/btn:opacity-100 group-hover/btn:-translate-y-1 translate-y-1 transition-all duration-200 whitespace-nowrap z-50 shadow-xl"
                >
                  Peta
                  <div
                    class="absolute top-full left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-foreground rotate-45"
                  ></div>
                </div>
              </div>

              <div class="relative group/btn">
                <button
                  onclick={() => openViewDrawer(r)}
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
                  onclick={() => openEditForm(r)}
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
                  onclick={() => initiateDelete(r)}
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
          <div class="p-8 space-y-4">
            <div class="flex flex-col gap-1">
              <div
                class="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-emerald-600/80"
              >
                <div class="flex items-center gap-1.5">
                  <LandPlot size={12} />
                  {r.demoplot?.nama_demoplot || "Umum"}
                </div>
                {#if r.kategori_tanaman}
                  <span
                    class="px-2 py-0.5 bg-emerald-500/10 text-emerald-600 rounded-md text-[8px] font-black uppercase tracking-widest"
                  >
                    {r.kategori_tanaman}
                  </span>
                {/if}
              </div>
              <div
                class="flex items-center justify-between text-xs font-bold text-muted-foreground"
              >
                <div class="flex items-center gap-1">
                  <Calendar size={14} />
                  {formatDate(r.tanggal_monitoring)}
                </div>
                <div class="flex items-center gap-1">
                  <Activity size={14} />
                  {r.periode_monitoring}
                </div>
              </div>
            </div>

            <div>
              <h3 class="font-black text-xl leading-tight">
                {r.jenis_tanaman || "Tanpa Nama"}
              </h3>
              <p class="text-xs italic text-muted-foreground">
                {r.nama_ilmiah || "-"}
              </p>
            </div>

            <div class="pt-2 flex gap-2">
              {#if r.periode_monitoring === "P3"}
                <div
                  class="flex-1 py-3 bg-muted/50 rounded-2xl text-[9px] font-black uppercase tracking-widest text-muted-foreground flex items-center justify-center gap-2"
                >
                  <ClipboardCheck size={14} /> Monitoring Selesai
                </div>
              {:else}
                <button
                  onclick={() => startNextMonitoring(r)}
                  class="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-600/20 active:scale-95"
                >
                  <Plus size={14} /> Monitoring P{r.periode_monitoring === "P1"
                    ? "2"
                    : "3"}
                </button>
              {/if}
            </div>
          </div>
        </div>
      {/each}
    </div>

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
            class="p-3 bg-card border border-border rounded-xl disabled:opacity-30"
            ><ChevronLeft size={20} /></button
          >
          <button
            onclick={nextPage}
            disabled={!canNextPage()}
            class="p-3 bg-card border border-border rounded-xl disabled:opacity-30"
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
            {isEditing ? "Perbarui Data" : "Tambah Monitoring"}
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
              >Tanggal Monitoring</label
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
              >Kode Tanaman <span class="text-red-500">*</span></label
            >
            <input
              type="text"
              bind:value={formKodeTanaman}
              required
              placeholder="Contoh: K-001"
              class="w-full bg-muted/30 border-border rounded-xl p-4 text-sm font-bold"
            />
          </div>

          <div class="space-y-2">
            <label
              class="text-[10px] font-black uppercase tracking-widest text-muted-foreground"
              >Periode Monitoring</label
            >
            <select
              bind:value={formPeriode}
              class="w-full bg-muted/30 border-border rounded-xl p-4 text-sm font-bold"
            >
              <option value="P1">P1 (Awal)</option>
              <option value="P2">P2 (Tengah)</option>
              <option value="P3">P3 (Akhir)</option>
            </select>
          </div>
        </div>

        <!-- Plant Specs -->
        <div class="space-y-6 pt-6 border-t border-border/50">
          {#if formPeriode === "P1"}
            <!-- Waktu & Jarak Tanam -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div class="space-y-2">
                <label
                  class="text-[10px] font-black uppercase tracking-widest text-muted-foreground"
                  >Waktu Tanam</label
                >
                <input
                  type="date"
                  bind:value={formWaktuTanam}
                  class="w-full bg-muted/30 border-border rounded-xl p-4 text-sm font-bold"
                />
              </div>
              <div class="space-y-2">
                <label
                  class="text-[10px] font-black uppercase tracking-widest text-muted-foreground"
                  >Jarak Tanam</label
                >
                <input
                  type="text"
                  bind:value={formJarakTanam}
                  placeholder="contoh: 3x3"
                  class="w-full bg-muted/30 border-border rounded-xl p-4 text-sm font-bold"
                />
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div class="space-y-2">
                <label
                  class="text-[10px] font-black uppercase tracking-widest text-muted-foreground"
                  >Jenis Tanaman</label
                >
                <input
                  type="text"
                  bind:value={formJenisTanaman}
                  placeholder="Contoh: Kopi Robusta"
                  class="w-full bg-muted/30 border-border rounded-xl p-4 text-sm font-bold"
                />
              </div>
              <div class="space-y-2">
                <label
                  class="text-[10px] font-black uppercase tracking-widest text-muted-foreground"
                  >Nama Ilmiah</label
                >
                <input
                  type="text"
                  bind:value={formNamaIlmiah}
                  placeholder="Contoh: Coffea canephora"
                  class="w-full bg-muted/30 border-border rounded-xl p-4 text-sm font-bold"
                />
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div class="space-y-2">
                <label
                  class="text-[10px] font-black uppercase tracking-widest text-muted-foreground"
                  >Kategori Tanaman <span class="text-red-500">*</span></label
                >
                <select
                  bind:value={formKategoriTanaman}
                  class="w-full bg-muted/30 border-border rounded-xl p-4 text-sm font-bold"
                >
                  <option value={null} disabled selected>Pilih Kategori</option>
                  <option value="tanaman utama">Tanaman Utama</option>
                  <option value="pohon penaung">Pohon Penaung</option>
                  <option value="tanaman lainnya">Tanaman Lainnya</option>
                </select>
              </div>
              <div class="space-y-2">
                <label
                  class="text-[10px] font-black uppercase tracking-widest text-muted-foreground"
                  >Sumber Bibit</label
                >
                <select
                  bind:value={formSumberBibit}
                  class="w-full bg-muted/30 border-border rounded-xl p-4 text-sm font-bold"
                >
                  <option value="bibit sertifikat">Bibit Sertifikat</option>
                  <option value="non sertifikat">Non Sertifikat</option>
                  <option value="lainnya">Lainnya</option>
                </select>
              </div>
            </div>
          {/if}

          <div
            class="grid grid-cols-1 {formPeriode === 'P3'
              ? 'md:grid-cols-3'
              : 'md:grid-cols-2'} gap-6"
          >
            <div class="space-y-2">
              <label
                class="text-[10px] font-black uppercase tracking-widest text-muted-foreground"
                >Tinggi Tanaman (cm)</label
              >
              <input
                type="number"
                bind:value={formTinggi}
                placeholder="0"
                class="w-full bg-muted/30 border-border rounded-xl p-4 text-sm font-bold"
              />
            </div>
            {#if formPeriode === "P3"}
              <div class="space-y-2">
                <label
                  class="text-[10px] font-black uppercase tracking-widest text-muted-foreground"
                  >DBH (cm)</label
                >
                <input
                  type="number"
                  step="any"
                  bind:value={formDbh}
                  placeholder="0"
                  class="w-full bg-muted/30 border-border rounded-xl p-4 text-sm font-bold"
                />
              </div>
            {/if}
            <div class="space-y-2">
              <label
                class="text-[10px] font-black uppercase tracking-widest text-muted-foreground"
                >Usia (Bulan)</label
              >
              <input
                type="number"
                bind:value={formUsia}
                placeholder="0"
                class="w-full bg-muted/30 border-border rounded-xl p-4 text-sm font-bold"
              />
            </div>
          </div>
        </div>

        <!-- Growth Condition -->
        <div class="space-y-4 pt-6 border-t border-border/50">
          <label
            class="text-[10px] font-black uppercase tracking-widest text-muted-foreground"
            >Kondisi Pertumbuhan</label
          >
          <div class="grid grid-cols-3 gap-3">
            {#each ["sehat", "tidak sehat", "mati"] as c}
              <button
                onclick={() => (formKondisi = c as any)}
                class="py-4 rounded-xl border-2 text-[10px] font-black uppercase tracking-widest transition-all flex flex-col items-center gap-2 {formKondisi ===
                c
                  ? 'border-emerald-500 bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                  : 'bg-muted/30 border-transparent text-muted-foreground hover:bg-muted'}"
              >
                <svelte:component this={getConditionIcon(c)} size={20} />
                {c}
              </button>
            {/each}
          </div>
        </div>

        <!-- Geospatial -->
        {#if formPeriode === "P1"}
          <div class="space-y-4 pt-6 border-t border-border/50">
            <div class="flex items-center justify-between mb-2">
              <label
                class="text-[10px] font-black uppercase tracking-widest text-muted-foreground"
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
                  class="text-[8px] font-black text-muted-foreground uppercase tracking-widest"
                >
                  Lat
                </p>
                <input
                  type="number"
                  step="any"
                  bind:value={formLatitude}
                  placeholder="0.000"
                  class="w-full bg-muted/20 border-transparent rounded-lg p-2 text-xs font-bold"
                />
              </div>
              <div class="space-y-1">
                <p
                  class="text-[8px] font-black text-muted-foreground uppercase tracking-widest"
                >
                  Long
                </p>
                <input
                  type="number"
                  step="any"
                  bind:value={formLongitude}
                  placeholder="0.000"
                  class="w-full bg-muted/20 border-transparent rounded-lg p-2 text-xs font-bold"
                />
              </div>
              <div class="space-y-1">
                <p
                  class="text-[8px] font-black text-muted-foreground uppercase tracking-widest"
                >
                  Alt (m)
                </p>
                <input
                  type="number"
                  step="any"
                  bind:value={formAltitude}
                  placeholder="0"
                  class="w-full bg-muted/20 border-transparent rounded-lg p-2 text-xs font-bold"
                />
              </div>
            </div>
          </div>
        {/if}

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

        <!-- Catatan -->
        <div class="space-y-2 pt-6 border-t border-border/50">
          <label
            class="text-[10px] font-black uppercase tracking-widest text-muted-foreground"
            >Catatan Tambahan</label
          >
          <textarea
            bind:value={formCatatan}
            rows="3"
            placeholder="Tambahkan observasi khusus jika ada..."
            class="w-full bg-muted/30 border-border rounded-xl p-4 text-sm font-medium"
          ></textarea>
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

<!-- Map Drawer -->
{#if showMapDrawer}
  <div
    class="fixed inset-0 bg-black/20 backdrop-blur-sm z-[2000] flex justify-end"
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

        <!-- Floating Close Button (Styled like Basemap Toggle) -->
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

        <!-- Navigation Controls (Home) -->
        <div class="absolute right-6 bottom-6 z-[1000] flex flex-col gap-3">
          <button
            onclick={zoomToAll}
            class="w-12 h-12 bg-slate-900/60 backdrop-blur-3xl border border-white/20 rounded-2xl flex items-center justify-center text-white hover:bg-white/30 transition-all active:scale-95 shadow-2xl group"
            title="Zoom ke Semua Plot"
          >
            <Home
              size={20}
              class="group-hover:text-emerald-400 transition-colors"
            />
          </button>
          <!-- Navigation Controls (Geolocate) -->
          <button
            onclick={getCurrentLocation}
            class="w-12 h-12 bg-slate-900/60 backdrop-blur-3xl border border-white/20 rounded-2xl flex items-center justify-center text-white hover:bg-white/30 transition-all active:scale-95 shadow-2xl group"
            title="Cari Lokasi Saya"
          >
            <LocateFixed
              size={20}
              class="group-hover:text-blue-400 transition-colors"
            />
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

<!-- View Detail Drawer -->
{#if showViewDrawer && selectedRecord}
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
            Detail Monitoring
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
        <!-- Comparison Gallery (All History Photos) -->
        <div class="flex flex-nowrap overflow-x-auto bg-muted">
          {#each historyRecords as h}
            {#if h.foto_tanaman}
              <div
                class="flex-none w-64 h-64 relative group border-r border-white/10 overflow-hidden"
              >
                <img
                  src={h.foto_tanaman}
                  alt=""
                  class="w-full h-full object-cover"
                />
                <div
                  class="absolute top-4 left-4 px-3 py-1.5 bg-black/50 backdrop-blur-md rounded-xl text-[10px] font-black text-white uppercase tracking-widest border border-white/20"
                >
                  Periode {h.periode_monitoring}
                </div>
                <div
                  class="absolute bottom-4 left-4 right-4 translate-y-12 group-hover:translate-y-0 transition-transform duration-300"
                >
                  <div
                    class="bg-black/50 backdrop-blur-md p-3 rounded-2xl flex items-center justify-between"
                  >
                    <span class="text-[10px] font-black text-emerald-400"
                      >{h.tinggi || 0} cm</span
                    >
                    <span class="text-[8px] font-medium text-white/70"
                      >{formatDate(h.tanggal_monitoring)}</span
                    >
                  </div>
                </div>
              </div>
            {/if}
          {/each}
        </div>

        <div class="p-10 space-y-12">
          <div
            class="inline-flex items-center gap-2 py-1 bg-white/10 backdrop-blur-md rounded-full border border-white/20 text-[9px] font-black uppercase tracking-widest mb-2"
          >
            ID: {selectedRecord.kode_tanaman}
          </div>
          <h2 class="text-3xl font-black tracking-tight leading-none uppercase">
            {selectedRecord.jenis_tanaman}
          </h2>
          <!-- Quick Metadata Grid -->
          <div class="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div
              class="p-6 bg-muted/30 rounded-3xl border border-border/50 text-center"
            >
              <p
                class="text-[9px] font-black text-muted-foreground uppercase mb-1"
              >
                Tinggi
              </p>
              <p class="text-xl font-black text-foreground">
                {selectedRecord.tinggi || 0} <span class="text-xs">cm</span>
              </p>
            </div>
            <div
              class="p-6 bg-muted/30 rounded-3xl border border-border/50 text-center"
            >
              <p
                class="text-[9px] font-black text-muted-foreground uppercase mb-1"
              >
                DBH
              </p>
              <p class="text-xl font-black text-foreground">
                {selectedRecord.dbh || 0} <span class="text-xs">cm</span>
              </p>
            </div>
            <div
              class="p-6 bg-muted/30 rounded-3xl border border-border/50 text-center"
            >
              <p
                class="text-[9px] font-black text-muted-foreground uppercase mb-1"
              >
                Usia
              </p>
              <p class="text-xl font-black text-foreground">
                {selectedRecord.usia_tanaman || 0}
                <span class="text-xs">Bln</span>
              </p>
            </div>
            <div
              class="p-6 bg-muted/30 rounded-3xl border border-border/50 text-center flex flex-col items-center"
            >
              <p
                class="text-[9px] font-black text-muted-foreground uppercase mb-1"
              >
                Kondisi
              </p>
              <div class="flex items-center gap-1.5">
                <svelte:component
                  this={getConditionIcon(
                    selectedRecord.kondisi_pertumbuhan || "",
                  )}
                  size={14}
                  class="text-emerald-600"
                />
              </div>
              <p class="text-sm font-black text-emerald-600 uppercase">
                {selectedRecord.kondisi_pertumbuhan}
              </p>
            </div>
            <div
              class="p-6 bg-muted/30 rounded-3xl border border-border/50 text-center"
            >
              <p
                class="text-[9px] font-black text-muted-foreground uppercase mb-1"
              >
                Periode
              </p>
              <p class="text-xl font-black text-foreground">
                {selectedRecord.periode_monitoring}
              </p>
            </div>
          </div>

          <!-- Specifications Grid -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="p-6 bg-muted/20 border border-border/50 rounded-3xl">
              <p
                class="text-[9px] font-black text-muted-foreground uppercase mb-2"
              >
                Waktu Tanam
              </p>
              <div class="flex items-center gap-2 font-bold text-sm">
                <Calendar size={14} class="text-emerald-600" />
                {selectedRecord.waktu_tanam
                  ? formatDate(selectedRecord.waktu_tanam)
                  : "-"}
              </div>
            </div>
            <div class="p-6 bg-muted/20 border border-border/50 rounded-3xl">
              <p
                class="text-[9px] font-black text-muted-foreground uppercase mb-2"
              >
                Jarak Tanam
              </p>
              <div class="flex items-center gap-2 font-bold text-sm">
                <Layers size={14} class="text-emerald-600" />
                {selectedRecord.jarak_tanam || "-"}
              </div>
            </div>
            <div class="p-6 bg-muted/20 border border-border/50 rounded-3xl">
              <p
                class="text-[9px] font-black text-muted-foreground uppercase mb-2"
              >
                Kategori Tanaman
              </p>
              <div
                class="flex items-center gap-2 font-bold text-sm text-emerald-700 capitalize"
              >
                <Sprout size={14} />
                {selectedRecord.kategori_tanaman || "-"}
              </div>
            </div>
            <div class="p-6 bg-muted/20 border border-border/50 rounded-3xl">
              <p
                class="text-[9px] font-black text-muted-foreground uppercase mb-2"
              >
                Sumber Bibit
              </p>
              <div
                class="flex items-center gap-2 font-bold text-sm text-emerald-700 capitalize"
              >
                <CheckCircle2 size={14} />
                {selectedRecord.sumber_bibit || "-"}
              </div>
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
                Catatan Monitoring
              </h3>
            </div>
            <div
              class="p-8 bg-muted/20 border border-border/50 rounded-[2.5rem] relative font-medium text-sm leading-relaxed italic"
            >
              {selectedRecord.catatan ||
                "Tidak ada catatan observasi untuk monitoring ini."}
            </div>
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
                    {selectedRecord.demoplot?.petani?.nama_lengkap}
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
                    {selectedRecord.demoplot?.nama_demoplot}
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

          <!-- Riwayat Monitoring -->

          <div class="pt-8 border-t border-border/50 space-y-6">
            <div class="flex items-center gap-3">
              <div
                class="w-8 h-8 bg-blue-500/10 text-blue-600 rounded-lg flex items-center justify-center"
              >
                <Clock size={16} />
              </div>
              <h3
                class="text-sm font-black uppercase tracking-[0.2em] text-blue-600"
              >
                Riwayat Monitoring
              </h3>
            </div>

            <div class="space-y-3">
              {#each historyRecords as h}
                <div
                  class="flex items-center justify-between p-6 bg-muted/20 border border-border/50 rounded-3xl hover:bg-muted/30 transition-all"
                >
                  <div class="flex items-center gap-4">
                    <div
                      class="w-10 h-10 {getConditionColor(
                        h.kondisi_pertumbuhan || '',
                      )} text-white rounded-xl flex items-center justify-center shadow-sm"
                    >
                      <svelte:component
                        this={getConditionIcon(h.kondisi_pertumbuhan || "")}
                        size={18}
                      />
                    </div>
                    <div>
                      <p class="text-xs font-black text-foreground">
                        Periode {h.periode_monitoring}
                      </p>
                      <p class="text-[10px] font-medium text-muted-foreground">
                        {formatDate(h.tanggal_monitoring)}
                      </p>
                    </div>
                  </div>
                  <div class="text-right">
                    <p class="text-sm font-black text-emerald-600">
                      {h.tinggi || 0} cm
                      {#if h.dbh}
                        <span class="text-xs text-slate-500 font-bold ml-1"
                          >/ {h.dbh} cm DBH</span
                        >
                      {/if}
                    </p>
                    <p
                      class="text-[9px] font-black uppercase text-muted-foreground opacity-50"
                    >
                      {h.kondisi_pertumbuhan}
                    </p>
                  </div>
                </div>
              {/each}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
{/if}

<!-- Delete Confirm -->
{#if showDeleteConfirm}
  <div
    class="fixed inset-0 bg-background/60 backdrop-blur-xl z-[3000] flex items-center justify-center p-6"
    in:fade
    onclick={() => (showDeleteConfirm = false)}
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
      <h3 class="text-2xl font-black uppercase tracking-tight">Hapus Data?</h3>
      <p class="text-muted-foreground font-medium mt-2">
        Menghapus data monitoring ini bersifat permanen.
      </p>
      <div class="grid grid-cols-2 gap-3 pt-4">
        <button
          onclick={() => (showDeleteConfirm = false)}
          class="h-14 bg-white border border-border font-black uppercase tracking-widest text-[10px] rounded-2xl hover:bg-muted"
          >Batal</button
        ><button
          onclick={confirmDelete}
          class="h-14 bg-red-600 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl"
          >Hapus</button
        >
      </div>
    </div>
  </div>
{/if}

<style>
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
    background: rgba(16, 185, 129, 0.2);
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
