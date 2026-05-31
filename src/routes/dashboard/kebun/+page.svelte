<script lang="ts">
  import { onMount, tick } from "svelte";
  import Chart from "chart.js/auto";
  import {
    getDemoplotList,
    deleteDemoplot,
    getDemoplotStats,
    createDemoplot,
    updateDemoplot,
  } from "$lib/services/demoplot";
  import type {
    Demoplot,
    DemoplotInsert,
    DemoplotUpdate,
  } from "../../../types/demoplot";
  import {
    Plus,
    LandPlot,
    Pencil,
    Trash2,
    X,
    Mountain,
    ClipboardList,
    User,
    MapPin,
    Map,
    Sprout,
    Layers,
    Navigation,
    Info,
    ArrowUpRight,
    Sparkles,
    RefreshCw,
    BotMessageSquare,
    Activity,
    Search,
    Eye,
    ChevronLeft,
    ChevronRight,
    Plane,
    ArrowLeft,
    CheckCircle2,
    AlertTriangle,
    Home,
    LocateFixed,
  } from "@lucide/svelte";
  import {
    getKarakteristikLahanByDemoplotId,
    createKarakteristikLahan,
    updateKarakteristikLahan,
    deleteKarakteristikLahanByDemoplotId,
  } from "$lib/services/karakteristik_lahan";
  import type {
    KarakteristikLahan,
    KarakteristikLahanInsert,
    KarakteristikLahanUpdate,
  } from "../../../types/karakteristik_lahan";
  import { supabase } from "$lib/supabase/client";
  import { browser } from "$app/environment";
  import { fade, fly, scale } from "svelte/transition";
  import { backOut } from "svelte/easing";

  let L: any;
  let demoPlots = $state<Demoplot[]>([]);
  let petaniList = $state<
    Array<{ id: string; nama_lengkap: string; foto_profil?: string }>
  >([]);
  let selectedPetaniId = $state("");
  let selectedDemoplotId = $state("");
  let selectedDemoplot = $state<Demoplot | null>(null);
  let loading = $state(true);

  // Derived filtered list of demoplots for the selected farmer
  let filteredDemoplots = $derived(
    selectedPetaniId
      ? demoPlots.filter((dp) => dp.petani_id === selectedPetaniId)
      : [],
  );

  // Effect to handle selection logic
  $effect(() => {
    if (selectedPetaniId) {
      if (filteredDemoplots.length > 0) {
        if (
          !selectedDemoplotId ||
          !filteredDemoplots.some((dp) => dp.id === selectedDemoplotId)
        ) {
          selectedDemoplotId = filteredDemoplots[0].id;
        }
      } else {
        selectedDemoplotId = "";
      }
    } else {
      selectedDemoplotId = "";
    }
  });

  // Effect to sync selectedDemoplot object
  $effect(() => {
    selectedDemoplot =
      demoPlots.find((dp) => dp.id === selectedDemoplotId) || null;
  });

  let error = $state("");
  let success = $state("");

  // Filtering & Pagination
  let searchQuery = $state("");
  let farmerFilter = $state("");
  let pageIndex = $state(0);
  const pageSize = 12;

  let filteredPlots = $derived.by(() => {
    return demoPlots.filter((p) => {
      const matchSearch =
        !searchQuery ||
        p.nama_demoplot?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.lokasi?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.petani_nama?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchFarmer = !farmerFilter || p.petani_id === farmerFilter;
      return matchSearch && matchFarmer;
    });
  });

  let totalPages = $derived(Math.ceil(filteredPlots.length / pageSize));
  let paginatedPlots = $derived(
    filteredPlots.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize),
  );

  // Drawer States
  let showMapDrawer = $state(false);
  let showDetailDrawer = $state(false);
  let showFormDrawer = $state(false);
  let isEditing = $state(false);
  let editingId = $state("");

  let currentBaseMap = $state("esri");
  let showBasemapDropdown = $state(false);
  function toggleBasemap() {
    showBasemapDropdown = !showBasemapDropdown;
  }

  // Chart.js
  let veggieChart: Chart | null = null;
  let veggieCanvas = $state<HTMLCanvasElement>();

  $effect(() => {
    if (showDetailDrawer && selectedDemoplot && veggieCanvas) {
      const data = {
        labels: ["Tanaman Utama", "Pohon Penaung"],
        datasets: [
          {
            data: [
              selectedDemoplot.jumlah_tanaman_utama || 0,
              selectedDemoplot.jumlah_pohon_penaung || 0,
            ],
            backgroundColor: ["#10b981", "#3b82f6"],
            hoverOffset: 4,
            borderWidth: 0,
            borderRadius: 8,
          },
        ],
      };

      if (veggieChart) {
        veggieChart.data = data;
        veggieChart.update();
      } else {
        veggieChart = new Chart(veggieCanvas, {
          type: "doughnut",
          data: data,
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                display: false,
              },
              tooltip: {
                enabled: true,
                callbacks: {
                  label: (context) => {
                    return ` ${context.label}: ${context.raw} Pohon`;
                  },
                },
              },
            },
            cutout: "75%",
          },
        });
      }
    } else {
      if (veggieChart) {
        veggieChart.destroy();
        veggieChart = null;
      }
    }
  });

  // Lock body scroll when drawer is active
  $effect(() => {
    if (browser) {
      if (showMapDrawer || showDetailDrawer || showFormDrawer) {
        document.body.classList.add("overflow-hidden");
      } else {
        document.body.classList.remove("overflow-hidden");
      }
    }
  });

  const baseMaps = {
    osm: {
      label: "Street Map",
      url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
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

  function switchBaseMap(type: string) {
    if (!map || !tileLayer || !selectedDemoplot) return;
    map.removeLayer(tileLayer);
    currentBaseMap = type;

    let url = "";
    let attribution = "";
    let maxNativeZoom = 18;

    if (type === "drone") {
      if (!selectedDemoplot.foto_udara) {
        // Fallback to Satellite silently if drone imagery is missing
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
      }).addTo(map);
      updateMap();
      return;
    }

    const config = baseMaps[type as keyof typeof baseMaps];
    currentBaseMap = type;
    url = config.url;
    attribution = config.attribution;
    maxNativeZoom = config.maxNativeZoom;

    tileLayer = L.tileLayer(url, {
      attribution,
      maxNativeZoom,
      maxZoom: 22,
    }).addTo(map);

    updateMap();
  }

  let marker: any = null;
  let polygon: any = null;
  let rasterLayer: any = null;

  // Map Container Reference
  let mapContainer: HTMLDivElement;
  let map: any = null;
  let tileLayer: any = null;

  function zoomToAll() {
    if (!map || !selectedDemoplot) return;
    if (polygon) {
      map.fitBounds(polygon.getBounds(), { padding: [50, 50] });
    } else if (selectedDemoplot.latitude && selectedDemoplot.longitude) {
      map.setView([selectedDemoplot.latitude, selectedDemoplot.longitude], 18);
    }
  }

  function getCurrentLocation() {
    if (!map) return;
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          map.flyTo([latitude, longitude], 16, { duration: 1.5 });

          L.circleMarker([latitude, longitude], {
            radius: 8,
            fillColor: "#3b82f6",
            color: "#fff",
            weight: 2,
            opacity: 1,
            fillOpacity: 0.8,
          })
            .addTo(map)
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

  // Form Fields (Demoplot)
  let formNamaDemoplot = $state("");
  let formPetaniId = $state("");
  let formLokasi = $state("");
  let formLuasDemoplot = $state("");
  let formLatitude = $state("");
  let formLongitude = $state("");
  let formAltitude = $state("");

  let formSistemBudidaya = $state(""); // agroforestri, monokultur
  let formTanamanUtama = $state("");
  let formJumlahTanamanUtama = $state("");
  let formPohonPenaung = $state("");
  let formJumlahPohonPenaung = $state("");
  let formJenisTanamanLainnya = $state("");

  let formStatusPlot = $state<"aktif" | "selesai" | "rencana" | "">("");
  let formCatatan = $state("");
  let formPolygon = $state<any>(null);
  let polygonFileName = $state("");
  let polygonInput = $state<HTMLInputElement>();

  // Form Fields (Karakteristik Lahan)
  let formKelerengan = $state("");
  let formSuhu = $state("");
  let formKelembapanRelatif = $state("");
  let formCurahHujan = $state("");
  let formKtk = $state("");
  let formPhAir = $state("");
  let formCOrganic = $state("");
  let formKandunganNitrogen = $state("");
  let formTeksturTanah = $state("");
  let showDeleteConfirm = $state(false);
  let deleteTarget = $state<Demoplot | null>(null);

  // Karakteristik Lahan state
  let selectedKarakteristik = $state<KarakteristikLahan | null>(null);
  let karakteristikLoading = $state(false);

  function previousPage() {
    if (pageIndex > 0) pageIndex--;
  }

  function nextPage() {
    if (pageIndex < totalPages - 1) pageIndex++;
  }

  async function openKarakteristikModal(demoplot: Demoplot) {
    karakteristikLoading = true;
    selectedKarakteristik = null;
    try {
      const data = await getKarakteristikLahanByDemoplotId(demoplot.id);
      selectedKarakteristik = data;
    } catch (err) {
      console.error("Error loading karakteristik lahan:", err);
    } finally {
      karakteristikLoading = false;
    }
  }

  function openMapDrawer(demoplot: Demoplot) {
    if (!demoplot.polygon && (!demoplot.latitude || !demoplot.longitude)) {
      error = "Geo-tagging tidak tersedia";
      setTimeout(() => {
        if (error === "Geo-tagging tidak tersedia") {
          error = "";
        }
      }, 3000);
      return;
    }
    selectedDemoplot = demoplot;
    showMapDrawer = true;
    showDetailDrawer = false;
    tick().then(initMap);
  }

  async function openDetailDrawer(demoplot: Demoplot) {
    selectedDemoplot = demoplot;
    showDetailDrawer = true;
    showMapDrawer = false;
    await openKarakteristikModal(demoplot);
  }

  async function loadData() {
    loading = true;
    error = "";
    try {
      const [plots, plotStats, petaniData] = await Promise.all([
        getDemoplotList(),
        getDemoplotStats(),
        supabase
          .from("petani")
          .select("id, nama_lengkap, foto_profil")
          .order("nama_lengkap"),
      ]);
      demoPlots = plots;
      petaniList = petaniData.data || [];
    } catch (err) {
      error = err instanceof Error ? err.message : "Gagal memuat data";
    } finally {
      loading = false;
    }
  }

  async function initMap() {
    if (!browser || !mapContainer) return;
    const leaflet = await import("leaflet");
    await import("leaflet/dist/leaflet.css");
    L = leaflet.default || leaflet;
    if (map) map.remove();
    map = L.map(mapContainer, {
      maxZoom: 20,
      zoomControl: false,
    } as any).setView([-2.5, 118], 5);

    const defaultConfig =
      baseMaps[currentBaseMap as keyof typeof baseMaps] || baseMaps.esri;
    tileLayer = L.tileLayer(defaultConfig.url, {
      attribution: defaultConfig.attribution,
      maxNativeZoom: defaultConfig.maxNativeZoom,
      maxZoom: 20,
    }).addTo(map);

    const rasterPane = map.createPane("rasterPane");
    rasterPane.style.zIndex = "350";
    rasterPane.style.pointerEvents = "none";

    // Ensure data is drawn after map is ready
    updateMap();
  }

  async function updateMap() {
    if (!browser || !map || !selectedDemoplot) return;
    if (marker) map.removeLayer(marker);
    if (polygon) map.removeLayer(polygon);
    if (rasterLayer) map.removeLayer(rasterLayer);

    // Marker Logic
    if (selectedDemoplot.latitude && selectedDemoplot.longitude) {
      let markerOptions = {};
      const petaniFoto = selectedDemoplot.petani_foto;
      if (petaniFoto) {
        markerOptions = {
          icon: L.divIcon({
            className: "custom-farmer-icon",
            html: `<div class="w-16 h-16 rounded-full border-2 border-white shadow-2xl overflow-hidden bg-emerald-500 flex items-center justify-center scale-110">
                    <img src="${petaniFoto}" class="w-full h-full object-cover" />
                  </div>`,
            iconSize: [64, 64],
            iconAnchor: [32, 64],
            popupAnchor: [0, -64],
          }),
        };
      } else {
        markerOptions = {
          icon: L.divIcon({
            className: "custom-land-icon",
            html: `<div class="w-14 h-14 rounded-3xl border-4 border-white shadow-2xl bg-emerald-600 flex items-center justify-center text-white">
                    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>
                  </div>`,
            iconSize: [56, 56],
            iconAnchor: [28, 28],
            popupAnchor: [0, -28],
          }),
        };
      }

      marker = L.marker(
        [selectedDemoplot.latitude, selectedDemoplot.longitude],
        markerOptions,
      )
        .addTo(map)
        .bindPopup(
          `
        <div class="p-4 min-w-[220px]">
          <p class="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-1">Identitas Plot</p>
          <h3 class="font-black text-slate-800 uppercase text-sm leading-tight mb-2">${selectedDemoplot.nama_demoplot}</h3>
          <div class="flex items-center gap-2 mb-3">
             <div class="w-6 h-6 rounded-lg bg-muted flex items-center justify-center text-slate-400">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
             </div>
             <p class="text-[10px] font-bold text-slate-600">${selectedDemoplot.petani_nama || "Petani Umum"}</p>
          </div>
          <div class="pt-3 border-t border-slate-100 flex items-center justify-between">
            <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest">${selectedDemoplot.luas_demoplot || 0} ha</span>
            <span class="px-2 py-0.5 bg-emerald-50 text-[8px] font-black text-emerald-600 rounded-full uppercase tracking-tighter">${selectedDemoplot.status_plot || "Aktif"}</span>
          </div>
        </div>
      `,
        )
        .openPopup();
    }

    // Polygon Logic (Independent of pin)
    if (selectedDemoplot.polygon) {
      try {
        const geojsonData =
          typeof selectedDemoplot.polygon === "string"
            ? JSON.parse(selectedDemoplot.polygon)
            : selectedDemoplot.polygon;

        polygon = L.geoJSON(geojsonData, {
          style: {
            color: "#10b981",
            fillColor: "#10b981",
            fillOpacity: 0.3,
            weight: 2,
          },
        }).addTo(map);
      } catch (e) {
        console.error("Error parsing polygon data:", e);
      }
    }

    // Raster Logic (Only show if drone basemap is selected)
    if (selectedDemoplot.foto_udara && currentBaseMap === "drone") {
      if (
        selectedDemoplot.foto_udara.includes("{z}") &&
        selectedDemoplot.foto_udara.includes("{x}") &&
        selectedDemoplot.foto_udara.includes("{y}")
      ) {
        rasterLayer = L.tileLayer(selectedDemoplot.foto_udara, {
          opacity: 0.8,
          pane: "rasterPane",
          maxZoom: 20,
        }).addTo(map);
      } else {
        let bounds = polygon
          ? polygon.getBounds()
          : [
              [
                (selectedDemoplot.latitude || 0) - 0.002,
                (selectedDemoplot.longitude || 0) - 0.002,
              ],
              [
                (selectedDemoplot.latitude || 0) + 0.002,
                (selectedDemoplot.longitude || 0) + 0.002,
              ],
            ];
        rasterLayer = L.imageOverlay(selectedDemoplot.foto_udara, bounds, {
          opacity: 0.8,
          pane: "rasterPane",
        }).addTo(map);
      }
    }

    const flyOptions = { animate: true, duration: 1.5 };
    if (polygon) {
      map.fitBounds(polygon.getBounds(), {
        padding: [50, 50],
        ...flyOptions,
      });
    } else if (selectedDemoplot.latitude && selectedDemoplot.longitude) {
      map.setView(
        [selectedDemoplot.latitude, selectedDemoplot.longitude],
        18,
        flyOptions,
      );
    }
  }

  $effect(() => {
    if (selectedDemoplot && map) updateMap();
  });

  async function handleSubmit() {
    error = "";
    if (!formNamaDemoplot.trim() || !formPetaniId) {
      error = "Nama demoplot dan petani harus diisi";
      return;
    }
    loading = true;
    try {
      const demoplotData: DemoplotInsert = {
        petani_id: formPetaniId,
        nama_demoplot: formNamaDemoplot.trim(),
        lokasi: formLokasi || null,
        luas_demoplot: formLuasDemoplot ? parseFloat(formLuasDemoplot) : null,
        latitude: formLatitude ? parseFloat(formLatitude) : null,
        longitude: formLongitude ? parseFloat(formLongitude) : null,
        altitude: formAltitude ? parseFloat(formAltitude) : null,

        sistem_budidaya: formSistemBudidaya || null,
        tanaman_utama: formTanamanUtama || null,
        jumlah_tanaman_utama: formJumlahTanamanUtama
          ? parseInt(formJumlahTanamanUtama)
          : null,
        pohon_penanung: formPohonPenaung || null,
        jumlah_pohon_penaung: formJumlahPohonPenaung
          ? parseInt(formJumlahPohonPenaung)
          : null,
        jenis_tanaman_lainnya: formJenisTanamanLainnya || null,

        status_plot: formStatusPlot || "aktif",
        catatan: formCatatan || null,
        polygon: formPolygon || null,
      };

      let savedDemoplot: Demoplot;
      if (isEditing) {
        savedDemoplot = await updateDemoplot(editingId, demoplotData);
      } else {
        savedDemoplot = await createDemoplot(demoplotData);
      }

      // Handle Karakteristik Lahan
      const karakteristikData: KarakteristikLahanInsert = {
        demoplot_id: savedDemoplot.id,
        kelerengan: formKelerengan ? parseFloat(formKelerengan) : null,
        suhu: formSuhu ? parseFloat(formSuhu) : null,
        kelembapan_relatif: formKelembapanRelatif
          ? parseFloat(formKelembapanRelatif)
          : null,
        curah_hujan: formCurahHujan ? parseFloat(formCurahHujan) : null,
        kapasitas_tukar_kation: formKtk ? parseFloat(formKtk) : null,
        ph_air: formPhAir ? parseFloat(formPhAir) : null,
        kandungan_c_organic: formCOrganic ? parseFloat(formCOrganic) : null,
        kandungan_nitrogen: formKandunganNitrogen || null,
        tekstur_tanah: formTeksturTanah || null,
      };

      const existingKarakteristik = await getKarakteristikLahanByDemoplotId(
        savedDemoplot.id,
      );

      if (existingKarakteristik) {
        await updateKarakteristikLahan(
          existingKarakteristik.id,
          karakteristikData,
        );
      } else {
        await createKarakteristikLahan(karakteristikData);
      }

      success = isEditing ? "Demoplot diperbarui" : "Demoplot ditambahkan";
      showFormDrawer = false;

      // Reset filter & pagination agar data baru langsung muncul
      pageIndex = 0;
      searchQuery = "";
      farmerFilter = "";

      await loadData();
      setTimeout(() => {
        success = "";
      }, 3000);
    } catch (err) {
      console.error(err);
      error = "Gagal menyimpan data";
    } finally {
      loading = false;
    }
  }

  function openAddForm() {
    isEditing = false;
    editingId = "";
    formNamaDemoplot = "";
    formPetaniId = "";
    formLokasi = "";
    formLuasDemoplot = "";
    formLatitude = "";
    formLongitude = "";
    formAltitude = "";

    formSistemBudidaya = "";
    formTanamanUtama = "";
    formJumlahTanamanUtama = "";
    formPohonPenaung = "";
    formJumlahPohonPenaung = "";
    formJenisTanamanLainnya = "";

    formStatusPlot = "aktif";
    formCatatan = "";
    formPolygon = null;
    polygonFileName = "";

    // Reset Karakteristik
    formKelerengan = "";
    formSuhu = "";
    formKelembapanRelatif = "";
    formCurahHujan = "";
    formKtk = "";
    formPhAir = "";
    formCOrganic = "";
    formKandunganNitrogen = "";
    formTeksturTanah = "";

    showFormDrawer = true;
  }

  async function openEditForm(demoplot: Demoplot) {
    isEditing = true;
    editingId = demoplot.id;
    formNamaDemoplot = demoplot.nama_demoplot || "";
    formPetaniId = demoplot.petani_id || "";
    formLokasi = demoplot.lokasi || "";
    formLuasDemoplot = demoplot.luas_demoplot?.toString() || "";
    formLatitude = demoplot.latitude?.toString() || "";
    formLongitude = demoplot.longitude?.toString() || "";
    formAltitude = demoplot.altitude?.toString() || "";

    formSistemBudidaya = demoplot.sistem_budidaya || "";
    formTanamanUtama = demoplot.tanaman_utama || "";
    formJumlahTanamanUtama = demoplot.jumlah_tanaman_utama?.toString() || "";
    formPohonPenaung = demoplot.pohon_penanung || "";
    formJumlahPohonPenaung = demoplot.jumlah_pohon_penaung?.toString() || "";
    formJenisTanamanLainnya = demoplot.jenis_tanaman_lainnya || "";

    formStatusPlot = demoplot.status_plot || "";
    formCatatan = demoplot.catatan || "";
    formPolygon = demoplot.polygon || null;
    polygonFileName = demoplot.polygon ? "Polygon Terunggah" : "";

    // Load Karakteristik
    karakteristikLoading = true;
    try {
      const data = await getKarakteristikLahanByDemoplotId(demoplot.id);
      if (data) {
        formKelerengan = data.kelerengan?.toString() || "";
        formSuhu = data.suhu?.toString() || "";
        formKelembapanRelatif = data.kelembapan_relatif?.toString() || "";
        formCurahHujan = data.curah_hujan?.toString() || "";
        formKtk = data.kapasitas_tukar_kation?.toString() || "";
        formPhAir = data.ph_air?.toString() || "";
        formCOrganic = data.kandungan_c_organic?.toString() || "";
        formKandunganNitrogen = data.kandungan_nitrogen || "";
        formTeksturTanah = data.tekstur_tanah || "";
      } else {
        formKelerengan = "";
        formSuhu = "";
        formKelembapanRelatif = "";
        formCurahHujan = "";
        formKtk = "";
        formPhAir = "";
        formCOrganic = "";
        formKandunganNitrogen = "";
        formTeksturTanah = "";
      }
    } catch (err) {
      console.error(err);
    } finally {
      karakteristikLoading = false;
    }

    showFormDrawer = true;
  }

  async function handlePolygonUpload(e: Event) {
    const target = e.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".json") && !file.name.endsWith(".geojson")) {
      error = "Format file harus .json atau .geojson";
      return;
    }

    try {
      const text = await file.text();
      const json = JSON.parse(text);

      // Basic validation if it's a GeoJSON
      if (
        json.type === "FeatureCollection" ||
        json.type === "Feature" ||
        json.type === "Polygon" ||
        json.type === "MultiPolygon"
      ) {
        formPolygon = json;
        polygonFileName = file.name;
        success = "File Polygon berhasil dimuat";
        setTimeout(() => {
          success = "";
        }, 2000);
      } else {
        error = "File bukan format GeoJSON yang valid";
      }
    } catch (err) {
      error = "Gagal membaca file JSON";
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      // Delete linked karakteristik first to avoid FK constraint issues
      await deleteKarakteristikLahanByDemoplotId(deleteTarget.id);

      await deleteDemoplot(deleteTarget.id);
      success = "Demoplot berhasil dihapus";
      await loadData();
      if (selectedDemoplotId === deleteTarget.id) {
        selectedDemoplotId = "";
      }
      setTimeout(() => {
        success = "";
      }, 3000);
    } catch (e) {
      console.error(e);
      error = "Gagal menghapus data. Pastikan tidak ada data terkait lainnya.";
    } finally {
      showDeleteConfirm = false;
    }
  }

  let gpsLoading = $state(false);
  function getLocationFromGPS() {
    if (!navigator.geolocation) {
      error = "Geolocation tidak didukung oleh browser Anda";
      return;
    }

    gpsLoading = true;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        formLatitude = position.coords.latitude.toString();
        formLongitude = position.coords.longitude.toString();
        if (position.coords.altitude) {
          formAltitude = position.coords.altitude.toString();
        }
        gpsLoading = false;
        success = "Koordinat berhasil diambil dari GPS";
        setTimeout(() => {
          success = "";
        }, 2000);
      },
      (err) => {
        gpsLoading = false;
        error = "Gagal mengambil lokasi: " + err.message;
      },
      { enableHighAccuracy: true },
    );
  }

  onMount(async () => {
    await loadData();
  });
</script>

<div class="min-h-screen pb-24 px-6 max-w-7xl mx-auto space-y-12">
  <!-- Module Hero -->
  <section
    class="relative mt-28 rounded-[2.5rem] bg-emerald-900 overflow-hidden shadow-2xl shadow-emerald-900/20"
    in:fly={{ y: -20, duration: 800 }}
  >
    <!-- Mesh Background -->
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
            <LandPlot size={12} class="text-emerald-400" /> Informasi Kebun
          </div>
        </div>
        <div class="space-y-4">
          <h1
            class="text-4xl md:text-7xl font-black tracking-tighter leading-[0.9]"
          >
            Plot &<span
              class="bg-gradient-to-r from-emerald-400 to-emerald-200 bg-clip-text text-transparent"
              >Spasial</span
            >
          </h1>
          <p
            class="text-lg text-emerald-50/70 font-medium max-w-xl mx-auto lg:mx-0"
          >
            Digitalisasi perimeter kebun & analisis karakteristik lahan.
          </p>
        </div>
      </div>

      <!-- Right Column: Stats Grid -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div
          class="group relative p-8 bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] hover:bg-white/10 hover:-translate-y-1 hover:shadow-2xl hover:border-white/20 transition-all duration-300 overflow-hidden active:scale-95"
        >
          <div
            class="absolute -right-4 -bottom-4 text-emerald-400/20 group-hover:text-emerald-400/30 transition-colors"
          >
            <Layers size={100} strokeWidth={1} />
          </div>
          <p
            class="text-[9px] font-black text-emerald-200/40 uppercase tracking-[0.2em] mb-1"
          >
            Database Lahan
          </p>
          <div class="flex items-baseline gap-2">
            <span class="text-4xl font-black">{demoPlots.length}</span>
            <span
              class="text-[10px] font-bold text-emerald-400 uppercase tracking-widest"
              >Plot</span
            >
          </div>
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
            Perimeter Aktif
          </p>
          <div class="flex items-baseline gap-2">
            <span class="text-4xl font-black"
              >{demoPlots.filter((p) => p.status_plot === "aktif").length}</span
            >
            <span
              class="text-[10px] font-bold text-blue-400 uppercase tracking-widest"
              >Unit</span
            >
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- Action Bar -->
  <div
    class="sticky z-[100] flex flex-row items-center gap-4 bg-background/60 backdrop-blur-3xl p-4 rounded-[2rem] border border-border/50 shadow-2xl shadow-black/5 transition-all duration-500"
    style="top: calc(var(--nav-height, 5rem) + 1rem)"
  >
    <div class="relative flex-1 w-full group">
      <Search
        size={22}
        class="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-emerald-500 transition-colors"
      />
      <input
        type="text"
        bind:value={searchQuery}
        placeholder="Cari plot, lokasi, atau pengelola..."
        class="w-full bg-muted/30 border-transparent focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/10 rounded-2xl pl-12 pr-4 py-3 text-sm font-medium transition-all outline-none"
      />
    </div>

    <button
      onclick={openAddForm}
      class="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-widest text-[10px] py-4 px-6 md:px-8 rounded-2xl transition-all shadow-lg shadow-emerald-600/20 active:scale-95 whitespace-nowrap"
    >
      <Plus size={18} />
      <span class="hidden md:inline">Tambah Plot</span>
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

  <!-- Content States -->
  {#if loading}
    <div class="flex flex-col items-center justify-center py-24 gap-4" in:fade>
      <div
        class="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-600 rounded-full animate-spin"
      ></div>
      <p
        class="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground animate-pulse"
      >
        Memuat Geospasial
      </p>
    </div>
  {:else if demoPlots.length === 0}
    <div
      class="flex flex-col items-center justify-center py-32 text-center space-y-6"
      in:scale
    >
      <div
        class="w-24 h-24 bg-muted rounded-[2.5rem] flex items-center justify-center text-muted-foreground/30"
      >
        <LandPlot size={48} />
      </div>
      <div>
        <h3 class="text-2xl font-black uppercase tracking-tight">
          Database Lahan Kosong
        </h3>
        <p class="text-muted-foreground font-medium">
          Belum ada plot demoplot yang terdaftar dalam sistem.
        </p>
      </div>
    </div>
  {:else}
    <div
      class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8"
    >
      {#each paginatedPlots as p, i (p.id)}
        <div
          class="group relative bg-card/60 backdrop-blur-3xl border border-border shadow-2xl shadow-black/5 rounded-[2.5rem] overflow-hidden p-3 transition-all duration-500 hover:border-emerald-500/50 hover:-translate-y-2"
          in:fly={{ y: 20, delay: 100 * (i % pageSize), easing: backOut }}
        >
          <!-- Card Header & Identitas -->
          <div
            class="relative h-32 rounded-[2rem] bg-emerald-950 overflow-hidden mb-5"
          >
            <div class="absolute inset-0 opacity-40">
              <div
                class="absolute -top-1/2 -right-1/4 w-full h-[150%] bg-emerald-500 blur-3xl rounded-full"
              ></div>
              <div
                class="absolute -bottom-1/2 -left-1/4 w-full h-[150%] bg-blue-500 blur-3xl rounded-full opacity-30"
              ></div>
            </div>
            <div class="relative z-10 p-6 flex flex-col h-full justify-between">
              <div class="flex items-center justify-between">
                <div
                  class="px-2.5 py-1 bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-[8px] font-black uppercase text-white tracking-widest"
                >
                  {p.status_plot || "aktif"}
                </div>
                <div class="text-emerald-400">
                  <Navigation size={16} />
                </div>
              </div>
              <div>
                <h3
                  class="text-lg font-black text-white truncate leading-none uppercase tracking-tight"
                >
                  {p.nama_demoplot}
                </h3>
                <div
                  class="flex items-center gap-1.5 text-[10px] text-emerald-100/60 font-bold uppercase tracking-wider mt-2"
                >
                  <User size={10} />
                  {p.petani_nama || "Petani Umum"}
                </div>
              </div>
            </div>
          </div>

          <div class="px-5 pb-5 space-y-6">
            <div class="space-y-3">
              <!-- Koordinat (Atas, Penuh) -->
              <div class="p-4 bg-muted/30 rounded-2xl border border-border/50">
                <p
                  class="text-[8px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-1"
                >
                  Koordinat
                </p>
                <div class="flex items-center gap-2">
                  <MapPin size={14} class="text-rose-500" />
                  <span class="text-xs font-bold truncate">
                    {#if p.latitude && p.longitude}
                      {p.latitude.toFixed(6)}, {p.longitude.toFixed(6)}
                    {:else}
                      <span class="text-[10px] text-muted-foreground italic font-medium">Belum Geotagging</span>
                    {/if}
                  </span>
                </div>
              </div>

              <!-- Luas & Elevasi (Bawah, Satu Baris Kiri-Kanan) -->
              <div class="grid grid-cols-2 gap-3">
                <div class="p-4 bg-muted/30 rounded-2xl border border-border/50">
                  <p
                    class="text-[8px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-1"
                  >
                    Luas Plot
                  </p>
                  <div class="flex items-center gap-2">
                    <LandPlot size={14} class="text-emerald-500" />
                    <span class="text-xs font-bold truncate"
                      >{p.luas_demoplot || 0} ha</span
                    >
                  </div>
                </div>

                <div class="p-4 bg-muted/30 rounded-2xl border border-border/50">
                  <p
                    class="text-[8px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-1"
                  >
                    Elevasi
                  </p>
                  <div class="flex items-center gap-2">
                    <Mountain size={14} class="text-blue-500" />
                    <span class="text-xs font-bold truncate">{p.altitude || 0} m</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Footer Meta -->
            <div
              class="flex items-center justify-between text-[10px] font-bold text-muted-foreground/60 border-t border-border/40 pt-4"
            >
              <div>#{p.id.slice(0, 8).toUpperCase()}</div>
              <div class="flex items-center gap-1">
                <MapPin size={10} />
                {p.lokasi?.slice(0, 10) || "-"}...
              </div>
            </div>

            <div class="flex gap-1.5">
              <div class="relative flex-1 group/btn">
                <button
                  onclick={() => openMapDrawer(p)}
                  class="w-full h-11 flex items-center justify-center bg-white border border-border hover:border-emerald-500/50 hover:text-emerald-600 rounded-xl transition-all"
                >
                  <Map size={16} />
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
              <div class="relative flex-1 group/btn">
                <button
                  onclick={() => openDetailDrawer(p)}
                  class="w-full h-11 flex items-center justify-center bg-white border border-border hover:border-emerald-500/50 hover:text-emerald-600 rounded-xl transition-all"
                >
                  <Eye size={16} />
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
                  onclick={() => openEditForm(p)}
                  class="w-full h-11 flex items-center justify-center bg-white border border-border hover:border-blue-500/50 hover:text-blue-600 rounded-xl transition-all"
                >
                  <Pencil size={16} />
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
                  onclick={() => {
                    deleteTarget = p;
                    showDeleteConfirm = true;
                  }}
                  class="w-full h-11 flex items-center justify-center bg-white border border-border hover:border-red-500/50 rounded-xl transition-all text-red-500/40 hover:text-red-500"
                >
                  <Trash2 size={16} />
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
            disabled={pageIndex === 0}
            class="p-3 bg-card border border-border rounded-xl disabled:opacity-30 hover:bg-muted transition-all"
            ><ChevronLeft size={20} /></button
          >
          <button
            onclick={nextPage}
            disabled={pageIndex === totalPages - 1}
            class="p-3 bg-card border border-border rounded-xl disabled:opacity-30 hover:bg-muted transition-all"
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
      <div
        class="p-8 h-20 border-b border-border flex items-center justify-between bg-muted/30"
      >
        <div>
          <h2 class="text-2xl font-black uppercase tracking-tight">
            {isEditing ? "Perbarui Data" : "Tambah Plot"}
          </h2>
        </div>
        <button
          onclick={() => (showFormDrawer = false)}
          class="p-3 bg-white border border-border rounded-2xl hover:bg-red-50 hover:text-red-500 transition-all"
          ><X size={24} /></button
        >
      </div>

      <div class="overflow-y-auto grow p-8 space-y-12 custom-scrollbar">
        <!-- Basic Info Section -->
        <div class="space-y-6">
          <h3
            class="text-sm font-black uppercase tracking-widest text-emerald-500 flex items-center gap-2"
          >
            <Info size={16} /> Informasi Dasar
          </h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="space-y-2 col-span-2">
              <label
                class="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1"
                >Nama Demoplot</label
              >
              <input
                type="text"
                bind:value={formNamaDemoplot}
                placeholder="Contoh: Demoplot 01"
                class="w-full bg-muted/50 border-2 border-transparent focus:border-emerald-500/50 rounded-2xl px-4 py-3 text-sm font-bold outline-none"
              />
            </div>
            <div class="space-y-2">
              <label
                class="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1"
                >Pemilik Lahan</label
              >
              <select
                bind:value={formPetaniId}
                class="w-full bg-muted/50 border-2 border-transparent focus:border-emerald-500/50 rounded-2xl px-4 py-3 text-sm font-bold outline-none"
              >
                <option value="">Pilih Petani...</option>
                {#each petaniList as p}<option value={p.id}
                    >{p.nama_lengkap}</option
                  >{/each}
              </select>
            </div>
            <div class="space-y-2">
              <label
                class="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1"
                >Status Lahan</label
              >
              <select
                bind:value={formStatusPlot}
                class="w-full bg-muted/50 border-2 border-transparent focus:border-emerald-500/50 rounded-2xl px-4 py-3 text-sm font-bold outline-none"
              >
                <option value="aktif">Aktif</option>
                <option value="rencana">Rencana</option>
                <option value="selesai">Selesai</option>
              </select>
            </div>
            <div class="space-y-2 col-span-2">
              <label
                class="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1"
                >Lokasi Spasial (Alamat)</label
              >
              <input
                type="text"
                bind:value={formLokasi}
                placeholder="Dusun, Desa, Kecamatan..."
                class="w-full bg-muted/50 border-2 border-transparent focus:border-emerald-500/50 rounded-2xl px-4 py-3 text-sm font-bold outline-none"
              />
            </div>
          </div>
        </div>

        <!-- Geo Context -->
        <div class="space-y-6">
          <div class="flex items-center justify-between">
            <h3
              class="text-sm font-black uppercase tracking-widest text-emerald-500 flex items-center gap-2"
            >
              <MapPin size={16} /> Koordinat & Spasial
            </h3>
            <button
              type="button"
              onclick={getLocationFromGPS}
              disabled={gpsLoading}
              class="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 rounded-xl border border-emerald-500/20 transition-all text-[9px] font-black uppercase tracking-widest disabled:opacity-50"
            >
              {#if gpsLoading}
                <RefreshCw size={12} class="animate-spin" />
                Mencari...
              {:else}
                <Navigation size={12} />
                Ambil dari GPS
              {/if}
            </button>
          </div>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div class="space-y-2">
              <label
                class="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1"
                >Luas (ha)</label
              >
              <input
                type="number"
                step="any"
                bind:value={formLuasDemoplot}
                class="w-full bg-muted/50 border-2 border-transparent focus:border-emerald-500/50 rounded-xl p-3 text-xs font-bold outline-none"
              />
            </div>
            <div class="space-y-2">
              <label
                class="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1"
                >Latitude</label
              >
              <input
                type="number"
                step="any"
                bind:value={formLatitude}
                class="w-full bg-muted/50 border-2 border-transparent focus:border-emerald-500/50 rounded-xl p-3 text-xs font-bold outline-none"
              />
            </div>
            <div class="space-y-2">
              <label
                class="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1"
                >Longitude</label
              >
              <input
                type="number"
                step="any"
                bind:value={formLongitude}
                class="w-full bg-muted/50 border-2 border-transparent focus:border-emerald-500/50 rounded-xl p-3 text-xs font-bold outline-none"
              />
            </div>
            <div class="space-y-2">
              <label
                class="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1"
                >Elevasi (m)</label
              >
              <input
                type="number"
                step="any"
                bind:value={formAltitude}
                class="w-full bg-muted/50 border-2 border-transparent focus:border-emerald-500/50 rounded-xl p-3 text-xs font-bold outline-none"
              />
            </div>
            <div class="space-y-4 col-span-2 md:col-span-4">
              <label
                class="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1"
                >Polygon Spasial (.json, .geojson)</label
              >
              <div
                class="relative group h-64 bg-muted/30 rounded-[2.5rem] border-2 border-dashed border-border flex items-center justify-center overflow-hidden transition-all hover:border-emerald-500/50"
              >
                {#if polygonFileName}
                  <div class="flex flex-col items-center gap-4 text-center p-8">
                    <div
                      class="w-20 h-20 bg-emerald-500/10 text-emerald-600 rounded-3xl flex items-center justify-center shadow-xl shadow-emerald-500/5 border border-emerald-500/20"
                    >
                      <Layers size={40} />
                    </div>
                    <div>
                      <p
                        class="text-sm font-black text-foreground max-w-xs truncate px-4"
                      >
                        {polygonFileName}
                      </p>
                      <p
                        class="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mt-1"
                      >
                        File Spasial Terpasang
                      </p>
                    </div>
                  </div>

                  <div
                    class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3"
                  >
                    <button
                      type="button"
                      onclick={() => polygonInput?.click()}
                      class="p-4 bg-white rounded-2xl text-emerald-600 hover:scale-110 transition-transform"
                      title="Ganti File"><RefreshCw size={24} /></button
                    >
                    <button
                      type="button"
                      onclick={() => {
                        formPolygon = null;
                        polygonFileName = "";
                      }}
                      class="p-4 bg-red-500 rounded-2xl text-white hover:scale-110 transition-transform"
                      title="Hapus"><Trash2 size={24} /></button
                    >
                  </div>
                {:else}
                  <div
                    class="flex flex-col items-center gap-3 text-muted-foreground/40 group-hover:text-emerald-500/50"
                  >
                    <Layers size={48} />
                    <button
                      type="button"
                      onclick={() => polygonInput?.click()}
                      class="text-[10px] font-black uppercase tracking-widest border border-current px-4 py-2 rounded-xl"
                      >Upload GeoJSON</button
                    >
                    <p class="text-[9px] font-medium opacity-60">
                      Format: .json, .geojson
                    </p>
                  </div>
                {/if}
              </div>

              <input
                type="file"
                bind:this={polygonInput}
                accept=".json,.geojson"
                onchange={handlePolygonUpload}
                class="hidden"
              />
            </div>
          </div>
        </div>

        <!-- Sistem Budidaya -->
        <div class="space-y-6">
          <h3
            class="text-sm font-black uppercase tracking-widest text-emerald-500 flex items-center gap-2"
          >
            <Sprout size={16} /> Sistem Budidaya
          </h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="space-y-2">
              <label
                class="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1"
                >Sistem Budidaya</label
              >
              <select
                bind:value={formSistemBudidaya}
                class="w-full bg-muted/50 border-2 border-transparent focus:border-emerald-500/50 rounded-2xl px-4 py-3 text-sm font-bold outline-none"
              >
                <option value="">Pilih Sistem...</option>
                <option value="agroforestri">Agroforestri</option>
                <option value="monokultur">Monokultur</option>
              </select>
            </div>
            <div class="space-y-2">
              <label
                class="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1"
                >Varietas Utama</label
              >
              <input
                type="text"
                bind:value={formTanamanUtama}
                placeholder="Contoh: Kopi Robusta..."
                class="w-full bg-muted/50 border-2 border-transparent focus:border-emerald-500/50 rounded-2xl px-4 py-3 text-sm font-bold outline-none"
              />
            </div>
            <div class="space-y-2">
              <label
                class="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1"
                >Jumlah Tanaman Utama</label
              >
              <input
                type="number"
                bind:value={formJumlahTanamanUtama}
                placeholder="0"
                class="w-full bg-muted/50 border-2 border-transparent focus:border-emerald-500/50 rounded-2xl px-4 py-3 text-sm font-bold outline-none"
              />
            </div>
            <div class="space-y-2">
              <label
                class="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1"
                >Jenis Pohon Naungan</label
              >
              <input
                type="text"
                bind:value={formPohonPenaung}
                placeholder="Contoh: Alpukat..."
                class="w-full bg-muted/50 border-2 border-transparent focus:border-emerald-500/50 rounded-2xl px-4 py-3 text-sm font-bold outline-none"
              />
            </div>
            <div class="space-y-2">
              <label
                class="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1"
                >Jumlah Pohon Naungan</label
              >
              <input
                type="number"
                bind:value={formJumlahPohonPenaung}
                placeholder="0"
                class="w-full bg-muted/50 border-2 border-transparent focus:border-emerald-500/50 rounded-2xl px-4 py-3 text-sm font-bold outline-none"
              />
            </div>
            <div class="space-y-2">
              <label
                class="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1"
                >Jenis Tanaman Lainnya</label
              >
              <input
                type="text"
                bind:value={formJenisTanamanLainnya}
                placeholder="Contoh: Pisang..."
                class="w-full bg-muted/50 border-2 border-transparent focus:border-emerald-500/50 rounded-2xl px-4 py-3 text-sm font-bold outline-none"
              />
            </div>
          </div>
        </div>

        <!-- Karakteristik Lahan -->
        <div class="space-y-6">
          <h3
            class="text-sm font-black uppercase tracking-widest text-emerald-500 flex items-center gap-2"
          >
            <Mountain size={16} /> Karakteristik Fisik & Tanah
          </h3>
          <div class="grid grid-cols-2 md:grid-cols-3 gap-6">
            <div class="space-y-2">
              <label
                class="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1"
                >Kelerengan (%)</label
              >
              <input
                type="number"
                step="any"
                bind:value={formKelerengan}
                class="w-full bg-muted/50 border-2 border-transparent focus:border-emerald-500/50 rounded-xl p-3 text-xs font-bold outline-none"
              />
            </div>
            <div class="space-y-2">
              <label
                class="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1"
                >Suhu (°C)</label
              >
              <input
                type="number"
                step="any"
                bind:value={formSuhu}
                class="w-full bg-muted/50 border-2 border-transparent focus:border-emerald-500/50 rounded-xl p-3 text-xs font-bold outline-none"
              />
            </div>
            <div class="space-y-2">
              <label
                class="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1"
                >Kelembapan (%)</label
              >
              <input
                type="number"
                step="any"
                bind:value={formKelembapanRelatif}
                class="w-full bg-muted/50 border-2 border-transparent focus:border-emerald-500/50 rounded-xl p-3 text-xs font-bold outline-none"
              />
            </div>
            <div class="space-y-2">
              <label
                class="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1"
                >Curah Hujan (mm)</label
              >
              <input
                type="number"
                step="any"
                bind:value={formCurahHujan}
                class="w-full bg-muted/50 border-2 border-transparent focus:border-emerald-500/50 rounded-xl p-3 text-xs font-bold outline-none"
              />
            </div>
            <div class="space-y-2">
              <label
                class="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1"
                >PH Air</label
              >
              <input
                type="number"
                step="0.1"
                bind:value={formPhAir}
                class="w-full bg-muted/50 border-2 border-transparent focus:border-emerald-500/50 rounded-xl p-3 text-xs font-bold outline-none"
              />
            </div>
            <div class="space-y-2">
              <label
                class="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1"
                >KTK (cmol/kg)</label
              >
              <input
                type="number"
                step="any"
                bind:value={formKtk}
                class="w-full bg-muted/50 border-2 border-transparent focus:border-emerald-500/50 rounded-xl p-3 text-xs font-bold outline-none"
              />
            </div>
            <div class="space-y-2">
              <label
                class="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1"
                >C-Organic (%)</label
              >
              <input
                type="number"
                step="any"
                bind:value={formCOrganic}
                class="w-full bg-muted/50 border-2 border-transparent focus:border-emerald-500/50 rounded-xl p-3 text-xs font-bold outline-none"
              />
            </div>
            <div class="space-y-2">
              <label
                class="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1"
                >Kandungan Nitrogen</label
              >
              <select
                bind:value={formKandunganNitrogen}
                class="w-full bg-muted/50 border-2 border-transparent focus:border-emerald-500/50 rounded-xl p-3 text-xs font-bold outline-none"
              >
                <option value="">Pilih...</option>
                <option value="sedang">Sedang</option>
                <option value="rendah">Rendah</option>
                <option value="sangat rendah">Sangat Rendah</option>
              </select>
            </div>
            <div class="space-y-2">
              <label
                class="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1"
                >Tekstur Tanah</label
              >
              <select
                bind:value={formTeksturTanah}
                class="w-full bg-muted/50 border-2 border-transparent focus:border-emerald-500/50 rounded-xl p-3 text-xs font-bold outline-none"
              >
                <option value="">Pilih...</option>
                <option value="Pasir sangat kasar">Pasir sangat kasar</option>
                <option value="Pasir kasar">Pasir kasar</option>
                <option value="Pasir sedang">Pasir sedang</option>
                <option value="Pasir halus">Pasir halus</option>
                <option value="Pasir sangat halus">Pasir sangat halus</option>
                <option value="Debu">Debu</option>
                <option value="Liat">Liat</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Catatan -->
        <div class="space-y-6">
          <h3
            class="text-sm font-black uppercase tracking-widest text-emerald-500 flex items-center gap-2"
          >
            <ClipboardList size={16} /> Catatan Tambahan
          </h3>
          <textarea
            bind:value={formCatatan}
            placeholder="Keterangan tambahan mengenai plot lahan..."
            class="w-full bg-muted/50 border-2 border-transparent focus:border-emerald-500/50 rounded-2xl px-4 py-4 text-sm font-medium outline-none min-h-[120px]"
          ></textarea>
        </div>
      </div>

      <div
        class="p-8 h-20 border-t border-border bg-muted/30 flex items-center justify-end gap-3"
      >
        <button
          onclick={() => (showFormDrawer = false)}
          class="px-8 py-4 bg-white border border-border rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-muted transition-all"
          >Batalkan</button
        >
        <button
          onclick={handleSubmit}
          class="px-8 py-4 bg-emerald-600 text-white rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-emerald-500/20 active:scale-95"
          >Simpan Data</button
        >
      </div>
    </div>
  </div>
{/if}

<!-- Map Drawer -->
{#if showMapDrawer && selectedDemoplot}
  <div
    class="fixed inset-0 bg-black/40 backdrop-blur-sm z-[2000] flex justify-end"
    transition:fade
    onclick={() => (showMapDrawer = false)}
  >
    <div
      class="h-full w-full lg:max-w-[50vw] bg-card border-l border-border shadow-2xl overflow-hidden flex flex-col"
      in:fly={{ x: 800, duration: 600, easing: backOut }}
      out:fly={{ x: 800, duration: 500 }}
      onclick={(e) => e.stopPropagation()}
    >
      <div class="relative flex-1 overflow-hidden group">
        <div bind:this={mapContainer} class="h-full w-full z-0"></div>

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
            title="Zoom ke Demoplot"
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

<!-- Detail Drawer -->
{#if showDetailDrawer && selectedDemoplot}
  <div
    class="fixed inset-0 bg-black/40 backdrop-blur-sm z-[2000] flex justify-end"
    transition:fade
    onclick={() => (showDetailDrawer = false)}
  >
    <div
      class="h-full w-full max-w-2xl bg-card border-l border-border shadow-2xl overflow-hidden flex flex-col"
      in:fly={{ x: 600, duration: 600, easing: backOut }}
      out:fly={{ x: 600, duration: 500 }}
      onclick={(e) => e.stopPropagation()}
    >
      <div
        class="p-8 h-20 border-b border-border flex items-center justify-between bg-muted/30"
      >
        <div>
          <h2 class="text-2xl font-black uppercase tracking-tight">
            Detail Demoplot
          </h2>
        </div>
        <button
          onclick={() => (showDetailDrawer = false)}
          class="p-3 bg-white border border-border rounded-2xl hover:bg-red-50 hover:text-red-500 transition-all"
          ><X size={24} /></button
        >
      </div>

      <div class="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
        <!-- Pengelola Section -->
        <div
          class="flex items-center justify-between gap-4 p-6 bg-muted/30 rounded-3xl border border-border/50"
        >
          <div class="flex items-center gap-4">
            <div
              class="w-12 h-12 rounded-2xl overflow-hidden bg-emerald-100 border-2 border-emerald-500/20 shadow-lg"
            >
              {#if selectedDemoplot.petani_foto}
                <img
                  src={selectedDemoplot.petani_foto}
                  alt=""
                  class="w-full h-full object-cover"
                />
              {:else}
                <div
                  class="w-full h-full flex items-center justify-center text-emerald-600"
                >
                  <User size={24} />
                </div>
              {/if}
            </div>
            <div>
              <p class="text-sm font-black text-slate-900 leading-tight">
                {selectedDemoplot.petani_nama || "Petani Kopi"}
              </p>
              <p
                class="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mt-1"
              >
                ID: {selectedDemoplot.petani_id.slice(0, 8)}
              </p>
            </div>
          </div>
          <div
            class="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-[8px] font-black uppercase text-emerald-600 tracking-widest"
          >
            {selectedDemoplot.status_plot || "aktif"}
          </div>
        </div>

        <!-- Dimension Grid -->
        <div class="grid grid-cols-2 gap-4">
          <div
            class="p-6 bg-emerald-50/50 rounded-3xl border border-emerald-100 flex flex-col justify-between"
          >
            <p
              class="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-2"
            >
              Luas Plot
            </p>
            <div class="flex items-baseline gap-2">
              <span class="text-4xl font-black text-emerald-700"
                >{selectedDemoplot.luas_demoplot || 0}</span
              >
              <span class="text-xs font-bold text-emerald-600/60 uppercase"
                >Hektar</span
              >
            </div>
          </div>
          <div
            class="p-6 bg-blue-50/50 rounded-3xl border border-blue-100 flex flex-col justify-between"
          >
            <p
              class="text-[9px] font-black text-blue-600 uppercase tracking-widest mb-2"
            >
              Elevasi Lahan
            </p>
            <div class="flex items-baseline gap-2">
              <span class="text-4xl font-black text-blue-700"
                >{selectedDemoplot.altitude || 0}</span
              >
              <span class="text-xs font-bold text-blue-600/60 uppercase"
                >MDPL</span
              >
            </div>
          </div>
        </div>

        <!-- Sistem & Vegetasi -->
        <div class="space-y-6">
          <div
            class="flex items-center gap-3 text-emerald-700 border-b border-emerald-100 pb-2"
          >
            <Sprout size={18} />
            <h4 class="text-[10px] font-black uppercase tracking-widest">
              Analisis Vegetasi & Budidaya
            </h4>
          </div>

          <div class="flex flex-col md:flex-row items-center gap-8">
            <!-- Pie Chart (Chart.js) -->
            {#if (selectedDemoplot.jumlah_tanaman_utama || 0) + (selectedDemoplot.jumlah_pohon_penaung || 0) > 0}
              {@const total =
                (selectedDemoplot.jumlah_tanaman_utama || 0) +
                (selectedDemoplot.jumlah_pohon_penaung || 0)}
              {@const pUtama =
                ((selectedDemoplot.jumlah_tanaman_utama || 0) / total) * 100}
              {@const pPenaung =
                ((selectedDemoplot.jumlah_pohon_penaung || 0) / total) * 100}

              <div class="relative w-32 h-32 flex-shrink-0">
                <canvas bind:this={veggieCanvas}></canvas>
                <div
                  class="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
                >
                  <span
                    class="text-[8px] font-black text-slate-400 uppercase tracking-tighter"
                    >Total</span
                  >
                  <span class="text-xs font-black text-slate-700">{total}</span>
                </div>
              </div>

              <div class="flex-1 grid grid-cols-1 gap-4 w-full">
                <div
                  class="flex items-center justify-between p-3 bg-emerald-50/50 rounded-2xl border border-emerald-100"
                >
                  <div class="flex items-center gap-3">
                    <div class="w-2 h-2 rounded-full bg-emerald-500"></div>
                    <span class="text-[10px] font-bold text-slate-600"
                      >Tanaman Utama</span
                    >
                  </div>
                  <span class="text-xs font-black text-emerald-700"
                    >{Math.round(pUtama)}%</span
                  >
                </div>
                <div
                  class="flex items-center justify-between p-3 bg-blue-50/50 rounded-2xl border border-blue-100"
                >
                  <div class="flex items-center gap-3">
                    <div class="w-2 h-2 rounded-full bg-blue-500"></div>
                    <span class="text-[10px] font-bold text-slate-600"
                      >Pohon Penaung</span
                    >
                  </div>
                  <span class="text-xs font-black text-blue-700"
                    >{Math.round(pPenaung)}%</span
                  >
                </div>
              </div>
            {:else}
              <div
                class="w-full py-8 text-center bg-muted/20 rounded-3xl border border-dashed border-border"
              >
                <p
                  class="text-[9px] font-black text-slate-400 uppercase tracking-widest"
                >
                  Data Populasi Kosong
                </p>
              </div>
            {/if}
          </div>

          <div class="grid grid-cols-2 gap-y-8 gap-x-12 pt-4">
            <div>
              <p class="text-[9px] font-black text-slate-400 uppercase mb-1">
                Sistem Budidaya
              </p>
              <p class="font-black text-sm text-slate-900 capitalize">
                {selectedDemoplot.sistem_budidaya || "-"}
              </p>
            </div>
            <div>
              <p class="text-[9px] font-black text-slate-400 uppercase mb-1">
                Varietas Utama
              </p>
              <p class="font-black text-sm text-slate-900">
                {selectedDemoplot.tanaman_utama || "-"}
              </p>
            </div>
            <div>
              <p class="text-[9px] font-black text-slate-400 uppercase mb-1">
                Populasi Utama
              </p>
              <p class="font-black text-sm text-slate-900">
                {selectedDemoplot.jumlah_tanaman_utama || 0} btg
              </p>
            </div>
            <div>
              <p class="text-[9px] font-black text-slate-400 uppercase mb-1">
                Pohon Penaung
              </p>
              <p class="font-black text-sm text-slate-900">
                {selectedDemoplot.pohon_penanung || "-"}
              </p>
            </div>
            <div>
              <p class="text-[9px] font-black text-slate-400 uppercase mb-1">
                Populasi Penaung
              </p>
              <p class="font-black text-sm text-slate-900">
                {selectedDemoplot.jumlah_pohon_penaung || 0} btg
              </p>
            </div>
            <div>
              <p class="text-[9px] font-black text-slate-400 uppercase mb-1">
                Tanaman Lainnya
              </p>
              <p class="font-black text-sm text-slate-900">
                {selectedDemoplot.jenis_tanaman_lainnya || "-"}
              </p>
            </div>
          </div>
        </div>

        <!-- Karakteristik Tanah -->
        <div class="space-y-6 pt-6 border-t border-border/60">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3 text-amber-700">
              <Mountain size={18} />
              <h4 class="text-[10px] font-black uppercase tracking-widest">
                Karakteristik Tanah & Fisik
              </h4>
            </div>
            <button
              onclick={() => openKarakteristikModal(selectedDemoplot!)}
              class="text-emerald-600 hover:text-emerald-700 font-bold text-[9px] uppercase tracking-widest flex items-center gap-2"
            >
              <RefreshCw
                size={12}
                class={karakteristikLoading ? "animate-spin" : ""}
              />
              Refresh
            </button>
          </div>

          {#if karakteristikLoading}
            <div
              class="py-10 flex flex-col items-center justify-center gap-4 bg-muted/20 rounded-3xl animate-pulse"
            >
              <RefreshCw class="animate-spin text-emerald-500" size={24} />
            </div>
          {:else if selectedKarakteristik}
            <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div class="p-5 bg-muted/30 rounded-2xl border border-border/50">
                <p
                  class="text-[8px] font-black text-muted-foreground uppercase mb-1"
                >
                  Tekstur Tanah
                </p>
                <p class="text-xs font-black text-slate-800 leading-none">
                  {selectedKarakteristik.tekstur_tanah || "-"}
                </p>
              </div>
              <div class="p-5 bg-muted/30 rounded-2xl border border-border/50">
                <p
                  class="text-[8px] font-black text-muted-foreground uppercase mb-1"
                >
                  pH Air
                </p>
                <p class="text-xs font-black text-amber-600 leading-none">
                  {selectedKarakteristik.ph_air || "-"}
                </p>
              </div>
              <div class="p-5 bg-muted/30 rounded-2xl border border-border/50">
                <p
                  class="text-[8px] font-black text-muted-foreground uppercase mb-1"
                >
                  C-Organic
                </p>
                <p class="text-xs font-black text-emerald-600 leading-none">
                  {selectedKarakteristik.kandungan_c_organic || "-"}%
                </p>
              </div>
              <div class="p-5 bg-muted/30 rounded-2xl border border-border/50">
                <p
                  class="text-[8px] font-black text-muted-foreground uppercase mb-1"
                >
                  Nitrogen
                </p>
                <p
                  class="text-xs font-black text-slate-800 capitalize leading-none"
                >
                  {selectedKarakteristik.kandungan_nitrogen || "-"}
                </p>
              </div>
              <div class="p-5 bg-muted/30 rounded-2xl border border-border/50">
                <p
                  class="text-[8px] font-black text-muted-foreground uppercase mb-1"
                >
                  KTK
                </p>
                <p class="text-xs font-black text-slate-800 leading-none">
                  {selectedKarakteristik.kapasitas_tukar_kation || "-"}
                </p>
              </div>
              <div class="p-5 bg-muted/30 rounded-2xl border border-border/50">
                <p
                  class="text-[8px] font-black text-muted-foreground uppercase mb-1"
                >
                  Kelerengan
                </p>
                <p class="text-xs font-black text-slate-800 leading-none">
                  {selectedKarakteristik.kelerengan || "-"}%
                </p>
              </div>
            </div>

            <!-- Climate Data -->
            <div class="pt-6">
              <p
                class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4"
              >
                Lingkungan & Iklim
              </p>
              <div class="grid grid-cols-3 gap-4">
                <div class="flex items-center gap-3">
                  <div
                    class="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center text-orange-600"
                  >
                    <Activity size={14} />
                  </div>
                  <div>
                    <p class="text-[8px] font-bold text-slate-400 uppercase">
                      Suhu
                    </p>
                    <p class="text-xs font-black">
                      {selectedKarakteristik.suhu || "-"}°C
                    </p>
                  </div>
                </div>
                <div class="flex items-center gap-3">
                  <div
                    class="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600"
                  >
                    <Navigation size={14} />
                  </div>
                  <div>
                    <p class="text-[8px] font-bold text-slate-400 uppercase">
                      Hujan
                    </p>
                    <p class="text-xs font-black">
                      {selectedKarakteristik.curah_hujan || "-"} mm
                    </p>
                  </div>
                </div>
                <div class="flex items-center gap-3">
                  <div
                    class="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600"
                  >
                    <RefreshCw size={14} />
                  </div>
                  <div>
                    <p class="text-[8px] font-bold text-slate-400 uppercase">
                      Lembap
                    </p>
                    <p class="text-xs font-black">
                      {selectedKarakteristik.kelembapan_relatif || "-"}%
                    </p>
                  </div>
                </div>
              </div>
            </div>
          {:else}
            <div
              class="py-10 border-2 border-dashed border-border rounded-3xl flex flex-col items-center justify-center text-center p-8 bg-muted/5 opacity-60"
            >
              <p
                class="text-[9px] font-black uppercase text-muted-foreground tracking-widest"
              >
                Data Karakteristik Belum Tersedia
              </p>
            </div>
          {/if}
        </div>
      </div>
    </div>
  </div>
{/if}

<!-- Delete Confirmation -->
{#if showDeleteConfirm}
  <div
    class="fixed inset-0 bg-background/60 backdrop-blur-xl z-[3000] flex items-center justify-center p-6"
    transition:fade
  >
    <div
      class="bg-card border border-border shadow-2xl rounded-[2rem] p-8 max-w-md w-full space-y-6"
      in:scale
    >
      <div class="flex flex-col items-center text-center space-y-3">
        <div
          class="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mb-2"
        >
          <Trash2 size={32} />
        </div>
        <h3 class="text-xl font-black uppercase tracking-tight">
          Konfirmasi Hapus
        </h3>
        <p class="text-xs text-muted-foreground font-medium">
          Apakah Anda yakin ingin menghapus demoplot <span
            class="text-foreground font-bold italic"
            >"{deleteTarget?.nama_demoplot}"</span
          >? Seluruh data riwayat spasi akan hilang.
        </p>
      </div>
      <div class="flex gap-3">
        <button
          onclick={() => (showDeleteConfirm = false)}
          class="flex-1 py-4 bg-muted text-foreground font-black uppercase tracking-widest text-[10px] rounded-xl"
          >Batalkan</button
        >
        <button
          onclick={confirmDelete}
          class="flex-1 py-4 bg-red-600 text-white font-black uppercase tracking-widest text-[10px] rounded-xl"
          >Ya, Hapus Data</button
        >
      </div>
    </div>
  </div>
{/if}

<style>
  :global(body.overflow-hidden) {
    overflow: hidden !important;
  }
  :global(.leaflet-container) {
    background: #022c22 !important;
  }
  :global(.custom-farmer-icon) {
    background: transparent !important;
    border: none !important;
  }
</style>
