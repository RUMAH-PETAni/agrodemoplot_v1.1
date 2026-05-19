<script lang="ts">
  import { onMount, tick, mount } from "svelte";
  import { browser } from "$app/environment";
  import { fade, fly, scale } from "svelte/transition";
  import {
    Map as MapIcon,
    Layers,
    Navigation,
    CircleDotDashed,
    Leaf,
    Flower,
    FlaskConical,
    Search,
    MapPin,
    Sprout,
    Trees,
    Mountain,
    Info,
    ArrowLeft,
    Maximize,
    Minimize,
    Maximize2,
    Activity,
    Compass,
    X,
    ChevronRight,
    ArrowUpRight,
    CloudRain,
    Thermometer,
    Droplets,
    Home,
    LocateFixed,
    Bug,
    ShieldAlert,
  } from "@lucide/svelte";
  import { getDemoplotList } from "$lib/services/demoplot";
  import type { Demoplot } from "../../types/demoplot";
  import { getSoilSummary } from "$lib/services/soil_data";
  import { getClimateSummary } from "$lib/services/climate_data";
  import {
    getMonitoringPenanaman,
    type MonitoringPenanaman,
  } from "$lib/services/penanaman";
  import { getMonitoringHPG, type MonitoringHPG } from "$lib/services/hpg";

  let L: any;
  let map: any;
  let mapContainer: HTMLElement;
  let demoplots = $state<Demoplot[]>([]);
  let selectedPlot = $state<Demoplot | null>(null);
  let loading = $state(true);
  let searchQuery = $state("");
  let showStats = $state(true);
  let currentBaseMap = $state("satellite");
  let markers: any[] = [];
  let polygons: any[] = [];

  let monitoringData = $state<MonitoringPenanaman[]>([]);
  let hpgData = $state<MonitoringHPG[]>([]);

  // Data Analitik Singkat untuk Plot Terpilih
  let soilSummary = $state<any>(null);
  let climateSummary = $state<any>(null);
  let analitikLoading = $state(false);

  const baseMaps = {
    osm: {
      url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      attribution: "&copy; OpenStreetMap contributors",
      label: "Street Map",
    },
    satellite: {
      url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      attribution:
        "Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community",
      label: "Satelit",
    },
    drone: {
      url: "", // Not a standard tile layer
      attribution: "Drone Imagery &copy; Agrodemoplot Project",
      label: "Foto Udara",
    },
  };

  let droneLayers: any[] = [];

  onMount(async () => {
    try {
      const [plots, monitoring, hpg] = await Promise.all([
        getDemoplotList(),
        getMonitoringPenanaman(),
        getMonitoringHPG(),
      ]);
      demoplots = plots;
      monitoringData = monitoring;
      hpgData = hpg;

      if (browser) {
        await initMap();
      }
    } catch (e) {
      console.error(e);
    } finally {
      loading = false;
    }
  });

  async function initMap() {
    const leaflet = await import("leaflet");
    await import("leaflet/dist/leaflet.css");
    L = leaflet.default || leaflet;

    map = L.map(mapContainer, {
      zoomControl: false,
      attributionControl: false,
    }).setView([-2.5, 118], 5);

    L.control.attribution({ position: "bottomright" }).addTo(map);

    updateTileLayer();
    renderMarkers();
  }

  function updateTileLayer() {
    if (!map) return;
    map.eachLayer((layer: any) => {
      if (layer instanceof L.TileLayer) map.removeLayer(layer);
    });

    const config = baseMaps[currentBaseMap as keyof typeof baseMaps];

    if (currentBaseMap === "drone") {
      // Use Satellite as background for Drone mode
      const satellite = baseMaps.satellite;
      L.tileLayer(satellite.url, { attribution: satellite.attribution }).addTo(
        map,
      );
      renderDronePhotos();
    } else {
      clearDronePhotos();
      L.tileLayer(config.url, {
        attribution: config.attribution,
        maxZoom: 20,
        maxNativeZoom: 19,
      }).addTo(map);
    }
  }

  function clearDronePhotos() {
    droneLayers.forEach((l) => map.removeLayer(l));
    droneLayers = [];
  }

  function renderDronePhotos() {
    if (!map) return;
    clearDronePhotos();

    demoplots.forEach((plot) => {
      if (plot.foto_udara) {
        try {
          // Handle Tile Layer (XYZ)
          if (
            plot.foto_udara.includes("{z}") ||
            plot.foto_udara.includes("{x}") ||
            plot.foto_udara.includes("{y}")
          ) {
            const layer = L.tileLayer(plot.foto_udara, {
              maxZoom: 22,
              maxNativeZoom: 20,
              zIndex: 500,
            }).addTo(map);
            droneLayers.push(layer);
          }
          // Handle Single Image Overlay (Needs Polygon for Bounds)
          else if (plot.polygon) {
            const geojson =
              typeof plot.polygon === "string"
                ? JSON.parse(plot.polygon)
                : plot.polygon;
            const geojsonLayer = L.geoJSON(geojson);
            const bounds = geojsonLayer.getBounds();

            if (bounds.isValid()) {
              const layer = L.imageOverlay(plot.foto_udara, bounds, {
                opacity: 1,
                zIndex: 500,
                interactive: true,
              }).addTo(map);
              droneLayers.push(layer);
            }
          }
        } catch (e) {
          console.error(
            "Error rendering drone photo for plot:",
            plot.nama_demoplot,
            e,
          );
        }
      }
    });
  }

  function renderMarkers() {
    if (!map) return;

    // Clear existing
    markers.forEach((m) => map.removeLayer(m));
    polygons.forEach((p) => map.removeLayer(p));
    markers = [];
    polygons = [];

    demoplots.forEach((plot) => {
      if (!plot.latitude || !plot.longitude) return;

      // Custom Marker with Farmer Photo
      const icon = L.divIcon({
        className: "custom-map-marker",
        html: `
          <div class="marker-container group">
            <div class="marker-pulse"></div>
            <div class="marker-core overflow-hidden border-2 border-white shadow-lg transition-transform hover:scale-125">
              ${
                plot.petani_foto
                  ? `<img src="${plot.petani_foto}" class="w-full h-full object-cover" />`
                  : `<div class="w-full h-full bg-emerald-500 flex items-center justify-center text-white font-bold">${plot.nama_demoplot.charAt(0)}</div>`
              }
            </div>
            <div class="marker-label opacity-0 group-hover:opacity-100">${plot.nama_demoplot}</div>
          </div>
        `,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      });

      const marker = L.marker([plot.latitude, plot.longitude], {
        icon,
        zIndexOffset: 1000, // Keep farmers on top
      })
        .addTo(map)
        .on("click", () => selectPlot(plot));

      markers.push(marker);

      // Render Polygon if exists
      if (plot.polygon) {
        try {
          const geojson =
            typeof plot.polygon === "string"
              ? JSON.parse(plot.polygon)
              : plot.polygon;
          const poly = L.geoJSON(geojson, {
            style: {
              color: "#10b981",
              weight: 2,
              fillOpacity: 0.1,
              fillColor: "#10b981",
            },
          }).addTo(map);
          polygons.push(poly);
        } catch (e) {
          console.error("Error parsing polygon:", e);
        }
      }
    });

    // Render Monitoring Markers (Sprout/Trees/Leaf)
    console.log("Rendering Monitoring Markers:", monitoringData.length);
    monitoringData.forEach((m) => {
      if (!m.latitude || !m.longitude) return;

      // Kategori tanaman: tanaman utama -> Sprout, pohon penaung -> Trees, tanaman lainnya -> Leaf
      let IconComponent = Sprout;
      let colorClass = "emerald"; // Default

      if (m.kategori_tanaman === "pohon penaung") {
        IconComponent = Trees;
        colorClass = "indigo";
      } else if (m.kategori_tanaman === "tanaman lainnya") {
        IconComponent = Leaf;
        colorClass = "teal";
      }

      const iconContainer = document.createElement("div");
      mount(IconComponent, {
        target: iconContainer,
        props: { size: 18, strokeWidth: 2.5 },
      });

      const pulseColor = colorClass === "emerald" ? "bg-emerald-500/20" : colorClass === "indigo" ? "bg-indigo-500/20" : "bg-teal-500/20";
      const borderColor = colorClass === "emerald" ? "border-emerald-500" : colorClass === "indigo" ? "border-indigo-500" : "border-teal-500";
      const textColor = colorClass === "emerald" ? "text-emerald-700" : colorClass === "indigo" ? "text-indigo-700" : "text-teal-700";

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

      L.marker([m.latitude, m.longitude], {
        icon,
        zIndexOffset: 500, // Below farmers
      }).addTo(map).bindPopup(`
          <div class="p-4 min-w-[160px]">
            <p class="text-[9px] font-black ${textColor} uppercase tracking-widest mb-1">${m.kategori_tanaman || "tanaman utama"}</p>
            <h3 class="font-black text-slate-800 uppercase text-sm leading-tight mb-2">${m.jenis_tanaman || "Tanaman"}</h3>
            <div class="flex items-center gap-2 mb-3">
               <div class="w-6 h-6 rounded-lg bg-muted flex items-center justify-center text-slate-400">
                  <span class="text-[10px] font-bold text-slate-500">ID</span>
               </div>
               <p class="text-[10px] font-bold text-slate-600">${m.kode_tanaman || "-"}</p>
            </div>
            <div class="pt-3 border-t border-slate-100 flex items-center justify-between">
              <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Kondisi</span>
              <span class="px-2 py-0.5 bg-emerald-50 text-[8px] font-black text-emerald-600 rounded-full uppercase tracking-tighter">${m.kondisi_pertumbuhan || "Normal"}</span>
            </div>
          </div>
        `);
    });

    // Render HPG Markers (Bug/ShieldAlert/Flower)
    hpgData.forEach((h) => {
      if (!h.latitude || !h.longitude) return;

      // Differentiate icon & styling based on HPG category
      let IconComponent = Bug;
      let colorClass = "rose"; // Default

      if (h.kategori_gangguan === "penyakit") {
        IconComponent = ShieldAlert;
        colorClass = "amber";
      } else if (h.kategori_gangguan === "gulma") {
        IconComponent = Flower;
        colorClass = "green";
      } else if (h.kategori_gangguan === "hama") {
        IconComponent = Bug;
        colorClass = "rose";
      }

      const iconContainer = document.createElement("div");
      mount(IconComponent, {
        target: iconContainer,
        props: { size: 18, strokeWidth: 2.5 },
      });

      const pulseColor =
        colorClass === "rose"
          ? "bg-rose-500/20"
          : colorClass === "amber"
            ? "bg-amber-500/20"
            : "bg-emerald-500/20";
      const borderColor =
        colorClass === "rose"
          ? "border-rose-500"
          : colorClass === "amber"
            ? "border-amber-500"
            : "border-emerald-500";
      const textColor =
        colorClass === "rose"
          ? "text-rose-700"
          : colorClass === "amber"
            ? "text-amber-700"
            : "text-emerald-700";
      const popupTextHeaderColor =
        colorClass === "rose"
          ? "text-rose-600"
          : colorClass === "amber"
            ? "text-amber-600"
            : "text-emerald-600";

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

      L.marker([h.latitude, h.longitude], {
        icon,
        zIndexOffset: 500, // Below farmers
      }).addTo(map).bindPopup(`
          <div class="p-2">
            <h4 class="font-black text-[10px] uppercase ${popupTextHeaderColor} mb-1">HPG Monitoring</h4>
            <p class="text-xs font-bold">${h.nama_jenis || "Hama/Penyakit"}</p>
            <p class="text-[10px] text-slate-500">${h.kategori_gangguan || "-"} (${h.tingkat_serangan || "-"})</p>
          </div>
        `);
    });

    // Fit bounds if plots exist
    if (markers.length > 0) {
      const group = new L.featureGroup([...markers, ...polygons]);
      map.fitBounds(group.getBounds().pad(0.1));
    }
  }

  async function selectPlot(plot: Demoplot) {
    selectedPlot = plot;
    analitikLoading = true;
    soilSummary = null;
    climateSummary = null;

    if (map) {
      map.flyTo([plot.latitude, plot.longitude], 17, { duration: 1.5 });
    }

    try {
      const [ss, cs] = await Promise.all([
        getSoilSummary(plot.id),
        getClimateSummary(plot.id),
      ]);
      soilSummary = ss;
      climateSummary = cs;
    } catch (e) {
      console.error(e);
    } finally {
      analitikLoading = false;
    }
  }

  $effect(() => {
    if (currentBaseMap) updateTileLayer();
  });

  let filteredPlots = $derived(
    searchQuery
      ? demoplots.filter(
          (p) =>
            p.nama_demoplot.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (p.petani_nama &&
              p.petani_nama.toLowerCase().includes(searchQuery.toLowerCase())),
        )
      : demoplots,
  );

  let showBasemapDropdown = $state(false);

  function toggleBasemap(e: MouseEvent) {
    e.stopPropagation();
    showBasemapDropdown = !showBasemapDropdown;
  }

  function flyTo(plot: Demoplot) {
    if (!map) return;
    map.flyTo([plot.latitude, plot.longitude], 18, { duration: 2 });
    selectPlot(plot);
  }

  // Close dropdown on click outside
  onMount(() => {
    const handleOutside = () => {
      showBasemapDropdown = false;
    };
    window.addEventListener("click", handleOutside);
    return () => window.removeEventListener("click", handleOutside);
  });

  function zoomToAll() {
    if (!map || markers.length === 0) return;
    const group = new L.featureGroup([...markers, ...polygons]);
    map.fitBounds(group.getBounds().pad(0.1));
  }

  function getCurrentLocation() {
    if (!map) return;
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          map.flyTo([latitude, longitude], 16, { duration: 1.5 });

          // Optional: add a temporary marker for current location
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
          alert("Gagal mendapatkan lokasi. Pastikan izin lokasi aktif.");
        },
      );
    } else {
      alert("Browser Anda tidak mendukung geolokasi.");
    }
  }

  // Disable body scroll when drawer is open
  $effect(() => {
    if (selectedPlot) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
    return () => {
      document.body.style.overflow = "auto";
    };
  });
</script>

<div
  class="relative w-full h-[calc(100vh-5rem)] overflow-hidden bg-slate-950 font-sans text-slate-200"
>
  <!-- Map Container -->
  <div bind:this={mapContainer} class="absolute inset-0 z-0"></div>

  <!-- Top Search Bar (Aligned with Stats HUD) -->
  <div class="absolute top-8 left-8 z-10 w-64 flex flex-col gap-3">
    <div class="relative group w-full">
      <div
        class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-400 transition-colors"
      >
        <Search size={16} />
      </div>
      <input
        type="text"
        bind:value={searchQuery}
        placeholder="Cari Petani/Plot..."
        class="w-full bg-slate-900/40 backdrop-blur-3xl border border-white/10 rounded-2xl pl-11 pr-4 py-3.5 text-xs font-bold placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all shadow-2xl"
      />

      {#if searchQuery && filteredPlots.length > 0}
        <div
          class="absolute top-full left-0 right-0 mt-2 bg-slate-900/60 backdrop-blur-3xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl animate-in fade-in slide-in-from-top-2 duration-300"
        >
          <div class="max-h-60 overflow-y-auto no-scrollbar">
            {#each filteredPlots as plot}
              <button
                onclick={() => {
                  searchQuery = "";
                  flyTo(plot);
                }}
                class="w-full p-3 flex items-center gap-3 hover:bg-white/10 transition-colors text-left border-b border-white/5 last:border-0"
              >
                <div
                  class="w-8 h-8 rounded-full overflow-hidden bg-emerald-500 border border-white/20 flex-shrink-0"
                >
                  {#if plot.petani_foto}
                    <img
                      src={plot.petani_foto}
                      class="w-full h-full object-cover"
                      alt=""
                    />
                  {:else}
                    <div
                      class="w-full h-full flex items-center justify-center font-black text-[8px]"
                    >
                      {plot.nama_demoplot.charAt(0)}
                    </div>
                  {/if}
                </div>
                <div class="truncate">
                  <h4
                    class="text-[10px] font-black uppercase tracking-tight truncate"
                  >
                    {plot.nama_demoplot}
                  </h4>
                  <p class="text-[8px] text-slate-400 font-bold truncate">
                    {plot.petani_nama || "Petani Umum"}
                  </p>
                </div>
              </button>
            {/each}
          </div>
        </div>
      {/if}
    </div>
  </div>

  <!-- Bottom Left Stats HUD -->
  <div class="absolute left-8 bottom-8 z-10 hidden lg:block space-y-4">
    <div
      class="bg-slate-900/40 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-8 shadow-2xl space-y-8 w-64"
    >
      <div class="space-y-1">
        <h3
          class="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em]"
        >
          Total Demoplot
        </h3>
        <div class="flex items-baseline gap-2">
          <span class="text-4xl font-black">{demoplots.length}</span>
          <span class="text-[10px] font-bold text-slate-500 uppercase"
            >Lokasi</span
          >
        </div>
      </div>

      <div class="space-y-1">
        <h3
          class="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em]"
        >
          Luas Total
        </h3>
        <div class="flex items-baseline gap-2">
          <span class="text-4xl font-black"
            >{demoplots
              .reduce((acc, p) => acc + (p.luas_demoplot || 0), 0)
              .toFixed(1)}</span
          >
          <span class="text-[10px] font-bold text-slate-500 uppercase"
            >Hektar</span
          >
        </div>
      </div>
    </div>
  </div>

  <!-- Right Actions / Controls -->
  <div class="absolute right-8 top-8 z-10 flex items-center gap-3">
    <!-- Basemap Dropdown -->
    <div class="relative">
      <button
        onclick={toggleBasemap}
        class="h-12 px-6 bg-slate-900/40 backdrop-blur-3xl border border-white/10 rounded-2xl flex items-center gap-3 text-white hover:bg-white/10 transition-all shadow-2xl"
      >
        <Layers size={18} class="text-blue-400" />
        <span class="text-[10px] font-black uppercase tracking-widest"
          >{baseMaps[currentBaseMap as keyof typeof baseMaps].label}</span
        >
        <ChevronRight
          size={14}
          class="transition-transform {showBasemapDropdown
            ? 'rotate-[-90deg]'
            : 'rotate-90'}"
        />
      </button>

      {#if showBasemapDropdown}
        <div
          class="absolute top-full right-0 mt-2 w-48 bg-slate-900/60 backdrop-blur-3xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl z-50"
          in:fly={{ y: 10, duration: 300 }}
          out:fade={{ duration: 200 }}
        >
          {#each Object.entries(baseMaps) as [key, config]}
            <button
              onclick={() => {
                currentBaseMap = key;
                showBasemapDropdown = false;
              }}
              class="w-full px-5 py-3.5 text-left text-[10px] font-black uppercase tracking-widest transition-colors {currentBaseMap ===
              key
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:bg-white/10'}"
            >
              {config.label}
            </button>
          {/each}
        </div>
      {/if}
    </div>
  </div>

  <!-- Bottom Right Navigation Controls -->
  <div class="absolute right-8 bottom-8 z-10 flex flex-col gap-3">
    <button
      onclick={zoomToAll}
      class="w-12 h-12 bg-slate-900/40 backdrop-blur-3xl border border-white/10 rounded-2xl flex items-center justify-center text-white hover:bg-white/20 transition-all shadow-2xl group"
      title="Zoom ke Semua Plot"
    >
      <Home size={20} class="group-hover:text-emerald-400 transition-colors" />
    </button>
    <button
      onclick={getCurrentLocation}
      class="w-12 h-12 bg-slate-900/40 backdrop-blur-3xl border border-white/10 rounded-2xl flex items-center justify-center text-white hover:bg-white/20 transition-all shadow-2xl group"
      title="Cari Lokasi Saya"
    >
      <LocateFixed
        size={20}
        class="group-hover:text-blue-400 transition-colors"
      />
    </button>
  </div>

  <!-- Right Side Drawer -->
  {#if selectedPlot}
    <!-- Backdrop for mobile -->
    <button
      class="absolute inset-0 z-20 bg-black/40 lg:hidden backdrop-blur-sm"
      onclick={() => (selectedPlot = null)}
      in:fade
      out:fade
    ></button>

    <div
      class="absolute top-0 right-0 z-30 h-full w-full md:w-[450px] bg-slate-950/80 backdrop-blur-3xl border-l border-white/10 shadow-[-20px_0_50px_rgba(0,0,0,0.5)] overflow-y-auto no-scrollbar"
      in:fly={{ x: 450, duration: 600, opacity: 1 }}
      out:fly={{ x: 450, duration: 400, opacity: 1 }}
    >
      <div class="p-8 md:p-10 space-y-10">
        <!-- Header -->
        <div class="flex items-start justify-between">
          <div class="space-y-4">
            <div
              class="w-24 h-24 rounded-full bg-emerald-500 p-1 shadow-2xl transition-transform hover:scale-105"
            >
              <div
                class="w-full h-full rounded-full overflow-hidden border-4 border-white"
              >
                {#if selectedPlot.petani_foto}
                  <img
                    src={selectedPlot.petani_foto}
                    class="w-full h-full object-cover"
                    alt=""
                  />
                {:else}
                  <div
                    class="w-full h-full bg-emerald-500 flex items-center justify-center text-4xl font-black"
                  >
                    {selectedPlot.nama_demoplot.charAt(0)}
                  </div>
                {/if}
              </div>
            </div>
            <div>
              <div
                class="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/20 rounded-full text-[10px] font-black text-blue-400 uppercase tracking-widest mb-3"
              >
                <MapPin size={12} />
                {selectedPlot.lokasi || "Lokasi Belum Terdata"}
              </div>
              <h2
                class="text-3xl font-black tracking-tight uppercase leading-tight"
              >
                {selectedPlot.nama_demoplot}
              </h2>
              <p class="text-sm text-slate-400 font-bold tracking-tight">
                Dikelola oleh <span class="text-white"
                  >{selectedPlot.petani_nama || "Petani Umum"}</span
                >
              </p>
            </div>
          </div>
          <button
            onclick={() => (selectedPlot = null)}
            class="p-3 bg-white/5 hover:bg-white/10 rounded-full transition-colors text-slate-400"
          >
            <X size={20} />
          </button>
        </div>

        <!-- Core Stats -->
        <div class="grid grid-cols-2 gap-4">
          <div
            class="bg-white/5 border border-white/5 rounded-3xl p-6 space-y-4"
          >
            <div class="flex items-center justify-between">
              <div
                class="w-10 h-10 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500"
              >
                <CloudRain size={18} />
              </div>
              <span
                class="text-[10px] font-black text-slate-500 uppercase tracking-widest"
                >Presipitasi</span
              >
            </div>
            <div class="flex items-baseline gap-1">
              <span class="text-3xl font-black"
                >{climateSummary?.curah_hujan_tahunan ?? "---"}</span
              >
              <span class="text-xs font-bold text-slate-500 uppercase">mm</span>
            </div>
          </div>

          <div
            class="bg-white/5 border border-white/5 rounded-3xl p-6 space-y-4"
          >
            <div class="flex items-center justify-between">
              <div
                class="w-10 h-10 rounded-2xl bg-orange-500/10 flex items-center justify-center text-orange-500"
              >
                <Thermometer size={18} />
              </div>
              <span
                class="text-[10px] font-black text-slate-500 uppercase tracking-widest"
                >Suhu</span
              >
            </div>
            <div class="flex items-baseline gap-1">
              <span class="text-3xl font-black"
                >{climateSummary?.suhu_tahunan ?? "---"}</span
              >
              <span class="text-xs font-bold text-slate-500 uppercase">°C</span>
            </div>
          </div>
        </div>

        <!-- Detailed Stats List -->
        <div class="space-y-6">
          <h3
            class="text-xs font-black uppercase tracking-[0.2em] text-slate-500 border-l-4 border-emerald-500 pl-4"
          >
            Karakteristik Tanah
          </h3>

          <div class="space-y-4">
            <div
              class="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5"
            >
              <div class="flex items-center gap-4">
                <div
                  class="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500"
                >
                  <FlaskConical size={18} />
                </div>
                <span class="text-sm font-bold">Tingkat Keasaman</span>
              </div>
              <span class="font-black"
                >{soilSummary?.ph_rata_rata ?? "---"} pH</span
              >
            </div>

            <div
              class="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5"
            >
              <div class="flex items-center gap-4">
                <div
                  class="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500"
                >
                  <Leaf size={18} />
                </div>
                <span class="text-sm font-bold">C-Organic</span>
              </div>
              <span class="font-black"
                >{soilSummary?.c_organik_rata_rata ?? "---"} g/kg</span
              >
            </div>

            <div
              class="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5"
            >
              <div class="flex items-center gap-4">
                <div
                  class="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500"
                >
                  <CircleDotDashed size={18} />
                </div>
                <span class="text-sm font-bold">Nitrogen</span>
              </div>
              <span class="font-black"
                >{soilSummary?.nitrogen_rata_rata ?? "---"} g/kg</span
              >
            </div>
          </div>
        </div>

        <!-- Plot Info -->
        <div class="space-y-6">
          <h3
            class="text-xs font-black uppercase tracking-[0.2em] text-slate-500 border-l-4 border-blue-500 pl-4"
          >
            Informasi Plot
          </h3>
          <div class="grid grid-cols-2 gap-4">
            <div class="p-5 bg-white/5 rounded-3xl">
              <p
                class="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1"
              >
                Luas Demoplot
              </p>
              <p class="text-lg font-black">
                {selectedPlot.luas_demoplot || 0} Hektar
              </p>
            </div>
            <div class="p-5 bg-white/5 rounded-3xl">
              <p
                class="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1"
              >
                Total Tanaman
              </p>
              <p class="text-lg font-black">
                {selectedPlot.jumlah_tanaman_utama || 0} Pohon
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  {/if}

  <!-- Loading State -->
  {#if loading}
    <div
      class="absolute inset-0 z-[100] bg-slate-950 flex flex-col items-center justify-center gap-6"
      out:fade
    >
      <div class="relative w-24 h-24">
        <div
          class="absolute inset-0 border-4 border-blue-500/20 rounded-full"
        ></div>
        <div
          class="absolute inset-0 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"
        ></div>
        <div
          class="absolute inset-4 bg-blue-500/10 rounded-full flex items-center justify-center text-blue-500"
        >
          <MapIcon size={32} />
        </div>
      </div>
      <div class="text-center space-y-2">
        <h2 class="text-xl font-black uppercase tracking-[0.3em] animate-pulse">
          Menyiapkan Peta
        </h2>
        <p class="text-xs text-slate-500 font-bold uppercase tracking-widest">
          Sinkronisasi Data Geospatial...
        </p>
      </div>
    </div>
  {/if}
</div>

<style>
  :global(.leaflet-container) {
    background: #020617 !important;
  }

  :global(.marker-container) {
    position: relative;
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  :global(.marker-core) {
    width: 100%;
    height: 100%;
    border-radius: 9999px;
    background: #10b981;
    z-index: 2;
    position: relative;
  }

  :global(.marker-core img) {
    width: 100%;
    height: 100%;
    object-fit: cover;
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

  :global(.marker-label) {
    position: absolute;
    bottom: -30px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(15, 23, 42, 0.8);
    backdrop-filter: blur(8px);
    padding: 4px 8px;
    border-radius: 6px;
    font-size: 8px;
    font-weight: 900;
    text-transform: uppercase;
    white-space: nowrap;
    color: white;
    border: 1px solid rgba(255, 255, 255, 0.1);
    pointer-events: none;
    transition: all 0.3s ease;
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

  /* Hide scrollbar for Chrome, Safari and Opera */
  .no-scrollbar::-webkit-scrollbar {
    display: none;
  }

  /* Hide scrollbar for IE, Edge and Firefox */
  .no-scrollbar {
    -ms-overflow-style: none; /* IE and Edge */
    scrollbar-width: none; /* Firefox */
  }

  /* Scrollbar Customization (only for elements that need it, or keeping it hidden as requested) */
  ::-webkit-scrollbar {
    width: 0px;
    background: transparent;
  }
</style>
