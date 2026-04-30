<script lang="ts">
  import { onMount } from "svelte";
  import { fade, fly, scale, slide } from "svelte/transition";
  import {
    Thermometer,
    Droplets,
    CloudRain,
    Wind,
    Sun,
    Layers,
    Info,
    MapPin,
    Calendar,
    ArrowLeft,
    Loader2,
    AlertCircle,
    FlaskConical,
    Mountain,
    Lightbulb,
    ChevronRight,
    ChevronDown,
    Box,
    Shapes,
    Activity,
    Compass,
    Microscope,
    Leaf,
    CircleDotDashed,
    Shuffle,
    GitCompareArrows,
  } from "@lucide/svelte";

  import { getDemoplotList } from "$lib/services/demoplot";
  import {
    getSoilSummary,
    getSoilDetail,
    phLabel,
    cOrganikLabel,
    nitrogenLabel,
    triggerSoilFetch,
  } from "$lib/services/soil_data";
  import {
    getClimateMonthly,
    getClimateSummary,
    NAMA_BULAN,
    curahHujanLabel,
    suhuKopiLabel,
    triggerClimateFetch,
  } from "$lib/services/climate_data";
  import type { Demoplot } from "../../../types/demoplot";
  import type {
    SoilDataSummary,
    SoilDataDetail,
  } from "$lib/services/soil_data";
  import type {
    ClimateDataSummary,
    ClimateDataDetail,
  } from "$lib/services/climate_data";

  import Chart from "chart.js/auto";

  let demoplots = $state<Demoplot[]>([]);
  let selectedId = $state("");
  let selectedDemoplot = $state<Demoplot | null>(null);

  let soilSummary = $state<SoilDataSummary | null>(null);
  let soilDetails = $state<SoilDataDetail[]>([]);
  let climateSummary = $state<ClimateDataSummary | null>(null);
  let climateMonths = $state<ClimateDataDetail[]>([]);

  let loading = $state(true);
  let error = $state("");

  // Chart instances
  let rainChart: Chart | null = null;
  let tempChart: Chart | null = null;
  let rainCanvas = $state<HTMLCanvasElement>();
  let tempCanvas = $state<HTMLCanvasElement>();
  let syncing = $state(false);

  onMount(async () => {
    try {
      demoplots = await getDemoplotList();
      if (demoplots.length > 0) {
        selectedId = demoplots[0].id;
        await loadData(selectedId);
      } else {
        loading = false;
      }
    } catch (e: any) {
      error = e.message;
      loading = false;
    }
  });

  async function loadData(id: string) {
    loading = true;
    error = "";
    try {
      selectedDemoplot = demoplots.find((d) => d.id === id) || null;

      const [ss, sd, cs, cm] = await Promise.all([
        getSoilSummary(id),
        getSoilDetail(id),
        getClimateSummary(id),
        getClimateMonthly(id),
      ]);

      soilSummary = ss;
      soilDetails = sd;
      climateSummary = cs;
      climateMonths = cm;
    } catch (e: any) {
      error = e.message;
    } finally {
      loading = false;
    }
  }

  async function syncData() {
    if (!selectedId || syncing) return;
    syncing = true;
    try {
      await Promise.all([
        triggerSoilFetch(selectedId),
        triggerClimateFetch(selectedId),
      ]);
      await loadData(selectedId);
    } catch (e: any) {
      error = e.message;
    } finally {
      syncing = false;
    }
  }

  $effect(() => {
    if (selectedId) {
      loadData(selectedId);
    }
  });

  function getMaxValue(arr: any[], key: string) {
    if (!arr || arr.length === 0) return 1;
    const vals = arr.map((i) => Number(i[key]) || 0);
    const max = Math.max(...vals);
    return max > 0 ? max : 1;
  }

  // --- Chart.js Logic ---
  $effect(() => {
    if (!loading && climateMonths.length > 0 && rainCanvas && tempCanvas) {
      // Cleanup previous instances
      if (rainChart) rainChart.destroy();
      if (tempChart) tempChart.destroy();

      const labels = climateMonths.map((m) =>
        NAMA_BULAN[m.bulan - 1].substring(0, 3),
      );

      // Rain Chart
      rainChart = new Chart(rainCanvas, {
        type: "bar",
        data: {
          labels,
          datasets: [
            {
              label: "Curah Hujan (mm)",
              data: climateMonths.map((m) => m.curah_hujan_total || 0),
              backgroundColor: "rgba(59, 130, 246, 0.7)",
              borderColor: "#3b82f6",
              borderWidth: 2,
              borderRadius: 8,
              hoverBackgroundColor: "#3b82f6",
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: "#0f172a",
              titleFont: { size: 12, weight: "bold" },
              bodyFont: { size: 12 },
              padding: 12,
              displayColors: false,
              callbacks: {
                label: (ctx) => `${ctx.raw} mm`,
              },
            },
          },
          scales: {
            y: {
              beginAtZero: true,
              grid: { color: "rgba(255,255,255,0.05)" },
              ticks: { color: "#64748b", font: { size: 10, weight: "bold" } },
            },
            x: {
              grid: { display: false },
              ticks: { color: "#64748b", font: { size: 10, weight: "bold" } },
            },
          },
        },
      });

      // Temp Chart
      tempChart = new Chart(tempCanvas, {
        type: "line",
        data: {
          labels,
          datasets: [
            {
              label: "Max",
              data: climateMonths.map((m) => m.suhu_maks || 0),
              borderColor: "#f97316",
              backgroundColor: "rgba(249, 115, 22, 0.1)",
              borderWidth: 3,
              tension: 0.4,
              fill: true,
              pointBackgroundColor: "#f97316",
              pointRadius: 4,
            },
            {
              label: "Min",
              data: climateMonths.map((m) => m.suhu_min || 0),
              borderColor: "#3b82f6",
              backgroundColor: "rgba(59, 130, 246, 0.1)",
              borderWidth: 3,
              tension: 0.4,
              fill: true,
              pointBackgroundColor: "#3b82f6",
              pointRadius: 4,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: "#0f172a",
              padding: 12,
              callbacks: {
                label: (ctx) => `${ctx.dataset.label}: ${ctx.raw}°C`,
              },
            },
          },
          scales: {
            y: {
              grid: { color: "rgba(255,255,255,0.05)" },
              ticks: { color: "#64748b", font: { size: 10, weight: "bold" } },
            },
            x: {
              grid: { display: false },
              ticks: { color: "#64748b", font: { size: 10, weight: "bold" } },
            },
          },
        },
      });
    }

    return () => {
      if (rainChart) rainChart.destroy();
      if (tempChart) tempChart.destroy();
    };
  });
</script>

<div class="min-h-screen pb-24 px-6 max-w-7xl mx-auto space-y-12">
  <!-- Hero Section (Aligned with Parent) -->
  <section
    class="relative mt-28 rounded-[2.5rem] bg-slate-900 overflow-hidden shadow-2xl shadow-blue-900/20 text-white"
    in:fly={{ y: -20, duration: 800 }}
  >
    <!-- Deep Mesh Background -->
    <div class="absolute inset-0 z-0 opacity-40">
      <div
        class="absolute -top-[20%] -left-[10%] w-[60%] h-[120%] bg-blue-600 blur-[120px] rounded-full"
      ></div>
      <div
        class="absolute top-[20%] -right-[10%] w-[40%] h-[80%] bg-emerald-500/30 blur-[100px] rounded-full"
      ></div>
    </div>

    <div
      class="relative z-10 p-10 md:p-16 grid grid-cols-1 md:grid-cols-2 items-center gap-12 md:gap-24"
    >
      <div class="space-y-6 text-center md:text-left flex-1">
        <div class="flex items-center justify-center md:justify-start gap-3">
          <a
            href="/insight"
            class="p-2 hover:bg-white/20 backdrop-blur-md rounded-xl transition-colors"
          >
            <ArrowLeft size={18} class="text-white" />
          </a>
          <div
            class="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full border border-white/10 text-[10px] font-black text-blue-100 uppercase tracking-widest"
          >
            <Mountain size={12} class="text-blue-400" /> Tanah & Iklim
          </div>
        </div>

        <div class="space-y-2">
          <h1
            class="text-4xl md:text-6xl font-black tracking-tighter leading-[0.9]"
          >
            Soil & <span class="text-emerald-400">Climate</span>
          </h1>
          <p
            class="text-lg text-blue-50/70 font-medium max-w-xl mx-auto md:mx-0"
          >
            Analisis parameter biofisik dan klimatologi untuk optimasi lahan
            demoplot Anda.
          </p>
        </div>
      </div>

      <!-- Demoplot Selector Inside Hero -->
      <div class="w-full md:w-auto" in:scale={{ delay: 400 }}>
        <div
          class="bg-white/10 backdrop-blur-2xl p-6 rounded-[2rem] border border-white/10 shadow-2xl min-w-[300px]"
        >
          <label
            for="dplot-select"
            class="block text-[10px] font-black text-blue-200 uppercase tracking-[0.2em] mb-3 ml-1"
            >Pilih Lokasi Analisis</label
          >
          <div class="relative group">
            <select
              id="dplot-select"
              bind:value={selectedId}
              class="w-full bg-slate-950/50 border border-white/10 rounded-2xl px-5 py-4 pr-12 text-white font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all cursor-pointer"
            >
              {#each demoplots as d}
                <option value={d.id}>{d.nama_demoplot}</option>
              {/each}
            </select>
          </div>

          <button
            onclick={syncData}
            disabled={syncing}
            class="w-full mt-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-[10px] font-black text-blue-200 uppercase tracking-widest transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {#if syncing}
              <Loader2 size={14} class="animate-spin" /> Sinkronisasi...
            {:else}
              <Activity size={14} /> Perbarui Data
            {/if}
          </button>
        </div>
      </div>
    </div>
  </section>

  {#if loading}
    <div class="flex flex-col items-center justify-center py-20" out:fade>
      <div
        class="w-12 h-12 border-4 border-blue-500/20 border-t-blue-600 rounded-full animate-spin mb-4"
      ></div>
      <p
        class="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground animate-pulse"
      >
        Menghitung Data Geospasial
      </p>
    </div>
  {:else if error}
    <div
      class="bg-red-500/10 border border-red-500/20 rounded-[2rem] p-10 text-center backdrop-blur-xl"
    >
      <AlertCircle size={40} class="text-red-500 mx-auto mb-4" />
      <h3 class="text-lg font-black text-red-400 uppercase tracking-tight">
        Gagal Memuat Data
      </h3>
      <p class="text-red-300/60 text-sm mt-2">{error}</p>
    </div>
  {:else if selectedDemoplot}
    <div class="space-y-16" in:fade={{ duration: 800 }}>
      <!-- Section 1: Soil Characteristics -->
      <section class="space-y-8">
        <div class="flex items-center gap-4">
          <div
            class="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500"
          >
            <Microscope size={24} />
          </div>
          <div>
            <h2
              class="text-2xl font-black text-foreground uppercase tracking-tight"
            >
              Karakteristik Tanah
            </h2>
            <p class="text-sm text-muted-foreground font-medium">
              Parameter kimia & fisika tanah berdasarkan SoilGrids 2.0
            </p>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <!-- pH Card -->
          <div
            class="group relative bg-card/60 backdrop-blur-3xl border border-border rounded-[2.5rem] p-8 transition-all hover:border-emerald-500/50 hover:-translate-y-1 shadow-xl"
          >
            <div
              class="absolute -right-4 -bottom-4 text-emerald-500/5 group-hover:text-emerald-500/10 transition-colors"
            >
              <FlaskConical size={140} strokeWidth={1} />
            </div>
            <p
              class="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2"
            >
              Keasaman (pH)
            </p>
            <div class="flex items-baseline gap-2 mb-4">
              <span class="text-5xl font-black text-foreground"
                >{soilSummary?.ph_rata_rata ?? "---"}</span
              >
              <span class="text-sm font-bold text-muted-foreground">H₂O</span>
            </div>
            <div
              class="inline-flex px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-[10px] font-black text-emerald-600 uppercase tracking-widest"
            >
              {phLabel(soilSummary?.ph_rata_rata ?? null)}
            </div>
          </div>

          <!-- C-Organik Card -->
          <div
            class="group relative bg-card/60 backdrop-blur-3xl border border-border rounded-[2.5rem] p-8 transition-all hover:border-blue-500/50 hover:-translate-y-1 shadow-xl"
          >
            <div
              class="absolute -right-4 -bottom-4 text-blue-500/5 group-hover:text-blue-500/10 transition-colors"
            >
              <Leaf size={140} strokeWidth={1} />
            </div>
            <p
              class="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2"
            >
              Bahan Organik
            </p>
            <div class="flex items-baseline gap-2 mb-4">
              <span class="text-5xl font-black text-foreground"
                >{soilSummary?.c_organik_rata_rata ?? "---"}</span
              >
              <span class="text-sm font-bold text-muted-foreground">g/kg</span>
            </div>
            <div
              class="inline-flex px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full text-[10px] font-black text-blue-600 uppercase tracking-widest"
            >
              {cOrganikLabel(soilSummary?.c_organik_rata_rata ?? null)}
            </div>
          </div>

          <!-- Nitrogen Card -->
          <div
            class="group relative bg-card/60 backdrop-blur-3xl border border-border rounded-[2.5rem] p-8 transition-all hover:border-amber-500/50 hover:-translate-y-1 shadow-xl"
          >
            <div
              class="absolute -right-4 -bottom-4 text-amber-500/5 group-hover:text-amber-500/10 transition-colors"
            >
              <CircleDotDashed size={140} strokeWidth={1} />
            </div>
            <p
              class="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2"
            >
              Total Nitrogen
            </p>
            <div class="flex items-baseline gap-2 mb-4">
              <span class="text-5xl font-black text-foreground"
                >{soilSummary?.nitrogen_rata_rata ?? "---"}</span
              >
              <span class="text-sm font-bold text-muted-foreground">g/kg</span>
            </div>
            <div
              class="inline-flex px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full text-[10px] font-black text-amber-600 uppercase tracking-widest"
            >
              {nitrogenLabel(soilSummary?.nitrogen_rata_rata ?? null)}
            </div>
          </div>

          <!-- Texture Card -->
          <div
            class="group relative bg-card/60 backdrop-blur-3xl border border-border rounded-[2.5rem] p-8 transition-all hover:border-indigo-500/50 hover:-translate-y-1 shadow-xl overflow-hidden"
          >
            <div
              class="absolute -right-4 -bottom-4 text-indigo-500/5 group-hover:text-indigo-500/10 transition-colors"
            >
              <Shapes size={140} strokeWidth={1} />
            </div>
            <p
              class="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2"
            >
              Tekstur Dominan
            </p>
            <h3
              class="text-2xl font-black text-foreground uppercase tracking-tight mb-4 leading-tight"
            >
              {soilSummary?.tekstur_tanah ?? "---"}
            </h3>
            <div class="grid grid-cols-3 gap-2">
              <div class="text-center">
                <p
                  class="text-[8px] font-bold text-muted-foreground uppercase tracking-tighter"
                >
                  Liat
                </p>
                <p class="text-xs font-black text-indigo-600">
                  {soilSummary?.liat_rata_rata ?? "---"}%
                </p>
              </div>
              <div class="text-center border-x border-border">
                <p
                  class="text-[8px] font-bold text-muted-foreground uppercase tracking-tighter"
                >
                  Debu
                </p>
                <p class="text-xs font-black text-indigo-600">
                  {soilSummary?.debu_rata_rata ?? "---"}%
                </p>
              </div>
              <div class="text-center">
                <p
                  class="text-[8px] font-bold text-muted-foreground uppercase tracking-tighter"
                >
                  Pasir
                </p>
                <p class="text-xs font-black text-indigo-600">
                  {soilSummary?.pasir_rata_rata ?? "---"}%
                </p>
              </div>
            </div>
          </div>

          <!-- KTK (CEC) Card -->
          <div
            class="group relative bg-card/60 backdrop-blur-3xl border border-border rounded-[2.5rem] p-8 transition-all hover:border-fuchsia-500/50 hover:-translate-y-1 shadow-xl"
          >
            <div
              class="absolute -right-4 -bottom-4 text-fuchsia-500/5 group-hover:text-fuchsia-500/10 transition-colors"
            >
              <GitCompareArrows size={140} strokeWidth={1} />
            </div>
            <p
              class="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2"
            >
              KTK (CEC)
            </p>
            <div class="flex items-baseline gap-2 mb-4">
              <span class="text-5xl font-black text-foreground"
                >{soilSummary?.ktk_rata_rata ?? "---"}</span
              >
              <span
                class="text-[10px] font-bold text-muted-foreground uppercase"
                >cmol/kg</span
              >
            </div>
            <div
              class="inline-flex px-3 py-1 bg-fuchsia-500/10 border border-fuchsia-500/20 rounded-full text-[10px] font-black text-fuchsia-600 uppercase tracking-widest"
            >
              {soilSummary?.ktk_rata_rata && soilSummary.ktk_rata_rata < 16
                ? "Rendah"
                : soilSummary?.ktk_rata_rata && soilSummary.ktk_rata_rata < 25
                  ? "Sedang"
                  : soilSummary?.ktk_rata_rata
                    ? "Tinggi"
                    : "---"}
            </div>
          </div>

          <!-- Bulk Density Card -->
          <div
            class="group relative bg-card/60 backdrop-blur-3xl border border-border rounded-[2.5rem] p-8 transition-all hover:border-slate-500/50 hover:-translate-y-1 shadow-xl"
          >
            <div
              class="absolute -right-4 -bottom-4 text-slate-500/5 group-hover:text-slate-500/10 transition-colors"
            >
              <Box size={140} strokeWidth={1} />
            </div>
            <p
              class="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2"
            >
              Kerapatan Isi (BD)
            </p>
            <div class="flex items-baseline gap-2 mb-4">
              <span class="text-5xl font-black text-foreground"
                >{soilSummary?.bdod_rata_rata ?? "---"}</span
              >
              <span
                class="text-[10px] font-bold text-muted-foreground uppercase"
                >kg/dm³</span
              >
            </div>
            <div
              class="inline-flex px-3 py-1 bg-slate-500/10 border border-slate-500/20 rounded-full text-[10px] font-black text-slate-600 uppercase tracking-widest"
            >
              {soilSummary?.bdod_rata_rata !== null &&
              soilSummary?.bdod_rata_rata !== undefined
                ? soilSummary.bdod_rata_rata > 1.4
                  ? "Padat"
                  : "Gembur"
                : "---"}
            </div>
          </div>
        </div>

        <!-- Soil Depth Profile -->
        <div
          class="bg-slate-900/5 border border-border rounded-[3rem] p-10 relative overflow-hidden"
        >
          <div
            class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-12"
          >
            <div>
              <h3
                class="text-xl font-black text-foreground uppercase tracking-tight"
              >
                Profil Kedalaman Tanah
              </h3>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-10">
            {#each soilDetails as layer, i}
              <div class="space-y-8 relative group">
                <div class="flex items-center justify-between">
                  <span
                    class="text-sm font-black text-muted-foreground uppercase tracking-[0.2em]"
                    >{layer.depth_label}</span
                  >
                  <span
                    class="px-2 py-0.5 bg-muted rounded-md text-[8px] font-black text-muted-foreground uppercase tracking-widest border border-border"
                    >Layer {i + 1}</span
                  >
                </div>

                <div class="space-y-6">
                  <!-- pH Bar -->
                  <div class="space-y-2">
                    <div class="flex justify-between items-end">
                      <span
                        class="text-[9px] font-black text-muted-foreground uppercase tracking-widest"
                        >Keasaman</span
                      >
                      <span class="text-sm font-black text-emerald-600"
                        >{layer.phh2o_mean}</span
                      >
                    </div>
                    <div class="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        class="h-full bg-emerald-500 rounded-full transition-all duration-1000 delay-300"
                        style="width: {(layer.phh2o_mean || 0) * 10}%"
                      ></div>
                    </div>
                  </div>

                  <!-- Nitrogen Bar -->
                  <div class="space-y-2">
                    <div class="flex justify-between items-end">
                      <span
                        class="text-[9px] font-black text-muted-foreground uppercase tracking-widest"
                        >Nitrogen</span
                      >
                      <span class="text-sm font-black text-blue-600"
                        >{layer.nitrogen_mean}
                        <span class="text-[10px]">g/kg</span></span
                      >
                    </div>
                    <div class="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        class="h-full bg-blue-500 rounded-full transition-all duration-1000 delay-500"
                        style="width: {(layer.nitrogen_mean || 0) * 20}%"
                      ></div>
                    </div>
                  </div>

                  <!-- SOC Bar -->
                  <div class="space-y-2">
                    <div class="flex justify-between items-end">
                      <span
                        class="text-[9px] font-black text-muted-foreground uppercase tracking-widest"
                        >C-Organik</span
                      >
                      <span class="text-sm font-black text-amber-600"
                        >{layer.soc_mean}
                        <span class="text-[10px]">g/kg</span></span
                      >
                    </div>
                    <div class="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        class="h-full bg-amber-500 rounded-full transition-all duration-1000 delay-700"
                        style="width: {(layer.soc_mean || 0) * 2}%"
                      ></div>
                    </div>
                  </div>

                  <!-- KTK Bar -->
                  <div class="space-y-2">
                    <div class="flex justify-between items-end">
                      <span
                        class="text-[9px] font-black text-muted-foreground uppercase tracking-widest"
                        >KTK (CEC)</span
                      >
                      <span class="text-sm font-black text-fuchsia-600"
                        >{layer.cec_mean}</span
                      >
                    </div>
                    <div class="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        class="h-full bg-fuchsia-500 rounded-full transition-all duration-1000 delay-900"
                        style="width: {(layer.cec_mean || 0) * 2}%"
                      ></div>
                    </div>
                  </div>
                </div>

                {#if i < 2}
                  <div
                    class="hidden md:block absolute -right-5 top-0 bottom-0 w-[1px] bg-gradient-to-b from-border via-border/50 to-transparent"
                  ></div>
                {/if}
              </div>
            {/each}
          </div>
        </div>
      </section>

      <!-- Section 2: Climatology -->
      <section class="space-y-8">
        <div class="flex items-center gap-4 pt-8">
          <div
            class="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500"
          >
            <CloudRain size={24} />
          </div>
          <div>
            <h2
              class="text-2xl font-black text-foreground uppercase tracking-tight"
            >
              Kondisi Klimatologi
            </h2>
            <p class="text-sm text-muted-foreground font-medium">
              Data historis cuaca 12 bulan terakhir dari Open-Meteo Archive
            </p>
          </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <!-- Left: Annual Summary Cards -->
          <div class="space-y-6">
            <div
              class="bg-card/60 backdrop-blur-3xl border border-border rounded-[2.5rem] p-10 shadow-xl space-y-10"
            >
              <h3
                class="text-xl font-black text-foreground uppercase tracking-tight"
              >
                Statistik Tahunan
              </h3>

              <div class="space-y-8">
                <!-- Suhu -->
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-4">
                    <div
                      class="w-12 h-12 rounded-2xl bg-orange-500/10 flex items-center justify-center text-orange-500"
                    >
                      <Thermometer size={20} />
                    </div>
                    <div>
                      <p
                        class="text-[8px] font-black text-muted-foreground uppercase tracking-widest"
                      >
                        Suhu Rerata
                      </p>
                      <p class="text-xl font-black text-foreground">
                        {climateSummary?.suhu_tahunan ?? "---"}°C
                      </p>
                    </div>
                  </div>
                  <span
                    class="px-2 py-1 bg-muted rounded-lg text-[9px] font-black text-muted-foreground uppercase tracking-widest"
                    >{suhuKopiLabel(climateSummary?.suhu_tahunan ?? null)}</span
                  >
                </div>

                <!-- Hujan -->
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-4">
                    <div
                      class="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500"
                    >
                      <CloudRain size={20} />
                    </div>
                    <div>
                      <p
                        class="text-[8px] font-black text-muted-foreground uppercase tracking-widest"
                      >
                        Total Presipitasi
                      </p>
                      <p class="text-xl font-black text-foreground">
                        {climateSummary?.curah_hujan_tahunan ?? "---"} mm
                      </p>
                    </div>
                  </div>
                  <span
                    class="text-[9px] font-black text-blue-600 uppercase tracking-widest"
                    >Tahun Ini</span
                  >
                </div>

                <!-- Humid -->
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-4">
                    <div
                      class="w-12 h-12 rounded-2xl bg-teal-500/10 flex items-center justify-center text-teal-500"
                    >
                      <Droplets size={20} />
                    </div>
                    <div>
                      <p
                        class="text-[8px] font-black text-muted-foreground uppercase tracking-widest"
                      >
                        Kelembapan Rerata
                      </p>
                      <p class="text-xl font-black text-foreground">
                        {climateSummary?.kelembapan_tahunan ?? "---"}%
                      </p>
                    </div>
                  </div>
                </div>

                <!-- Angin -->
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-4">
                    <div
                      class="w-12 h-12 rounded-2xl bg-slate-500/10 flex items-center justify-center text-slate-500"
                    >
                      <Wind size={20} />
                    </div>
                    <div>
                      <p
                        class="text-[8px] font-black text-muted-foreground uppercase tracking-widest"
                      >
                        Kecepatan Angin
                      </p>
                      <p class="text-xl font-black text-foreground">
                        {climateSummary?.angin_tahunan ?? "---"}
                        <span class="text-xs">km/h</span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div class="pt-10 border-t border-border grid grid-cols-2 gap-4">
                <div
                  class="p-4 bg-blue-500/5 rounded-2xl border border-blue-500/10"
                >
                  <p
                    class="text-[8px] font-black text-muted-foreground uppercase tracking-widest mb-1"
                  >
                    Bulan Terbasah
                  </p>
                  <p class="text-sm font-black text-blue-600">
                    {climateSummary?.bulan_terbasah
                      ? NAMA_BULAN[climateSummary.bulan_terbasah - 1]
                      : "---"}
                  </p>
                </div>
                <div
                  class="p-4 bg-orange-500/5 rounded-2xl border border-orange-500/10"
                >
                  <p
                    class="text-[8px] font-black text-muted-foreground uppercase tracking-widest mb-1"
                  >
                    Bulan Terkering
                  </p>
                  <p class="text-sm font-black text-orange-600">
                    {climateSummary?.bulan_terkering
                      ? NAMA_BULAN[climateSummary.bulan_terkering - 1]
                      : "---"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <!-- Right: Charts -->
          <div class="lg:col-span-2 space-y-8">
            <!-- Precipitation Chart -->
            <div
              class="bg-card/60 backdrop-blur-3xl border border-border rounded-[2.5rem] p-10 shadow-xl"
            >
              <div class="flex justify-between items-center mb-10">
                <h3
                  class="text-lg font-black text-foreground uppercase tracking-tight flex items-center gap-3"
                >
                  <CloudRain size={18} class="text-blue-500" />
                  Histori Curah Hujan
                </h3>
                <div
                  class="px-3 py-1 bg-muted rounded-full text-[9px] font-black text-muted-foreground uppercase tracking-widest"
                >
                  12 Bulan Terakhir
                </div>
              </div>

              <div class="h-[300px] w-full relative">
                {#if climateMonths.length > 0}
                  <canvas bind:this={rainCanvas}></canvas>
                {:else}
                  <div
                    class="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground opacity-50"
                  >
                    <CloudRain size={32} class="mb-2" />
                    <p class="text-[10px] font-black uppercase tracking-widest">
                      Data Bulanan Belum Tersedia
                    </p>
                  </div>
                {/if}
              </div>
            </div>

            <!-- Temperature Line Chart -->
            <div
              class="bg-card/60 backdrop-blur-3xl border border-border rounded-[2.5rem] p-10 shadow-xl overflow-hidden"
            >
              <div class="flex justify-between items-center mb-10">
                <h3
                  class="text-lg font-black text-foreground uppercase tracking-tight flex items-center gap-3"
                >
                  <Thermometer size={18} class="text-orange-500" />
                  Fluktuasi Suhu Rerata
                </h3>
                <div class="flex gap-6">
                  <div
                    class="flex items-center gap-2 text-[9px] font-black text-muted-foreground uppercase tracking-widest"
                  >
                    <div
                      class="w-2.5 h-2.5 rounded-full bg-orange-500 shadow-md shadow-orange-500/40"
                    ></div>
                    Max
                  </div>
                  <div
                    class="flex items-center gap-2 text-[9px] font-black text-muted-foreground uppercase tracking-widest"
                  >
                    <div
                      class="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-md shadow-blue-500/40"
                    ></div>
                    Min
                  </div>
                </div>
              </div>

              <div class="h-[250px] w-full relative">
                {#if climateMonths.length > 0}
                  <canvas bind:this={tempCanvas}></canvas>
                {:else}
                  <div
                    class="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground opacity-50"
                  >
                    <Thermometer size={32} class="mb-2" />
                    <p class="text-[10px] font-black uppercase tracking-widest">
                      Data Bulanan Belum Tersedia
                    </p>
                  </div>
                {/if}
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Section 3: Data Methodology & Sources -->
      <section class="space-y-8 pt-8">
        <div class="flex items-center gap-4">
          <div
            class="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500"
          >
            <Info size={24} />
          </div>
          <div>
            <h2
              class="text-2xl font-black text-foreground uppercase tracking-tight"
            >
              Metodologi & Sumber Data
            </h2>
            <p class="text-sm text-muted-foreground font-medium">
              Transparansi mengenai asal-usul dan cara pengolahan data.
            </p>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
          <!-- Soil Data Info -->
          <div
            class="bg-card/60 backdrop-blur-3xl border border-border rounded-[2.5rem] p-10 space-y-6 relative overflow-hidden group"
          >
            <div
              class="absolute -right-8 -top-8 text-indigo-500/5 group-hover:text-indigo-500/10 transition-colors"
            >
              <Layers size={180} />
            </div>
            <h3
              class="text-xl font-black text-foreground uppercase tracking-tight flex items-center gap-3"
            >
              <FlaskConical size={20} class="text-emerald-500" />
              Data Tanah (SoilGrids)
            </h3>
            <div
              class="space-y-4 text-sm text-muted-foreground leading-relaxed relative z-10"
            >
              <p>
                Data karakteristik tanah diperoleh dari <strong
                  >SoilGrids 2.0</strong
                >, sistem pemetaan tanah digital global yang dikelola oleh
                <strong>ISRIC — World Soil Information</strong>.
              </p>
              <ul class="space-y-2 list-disc pl-5">
                <li>
                  <strong>Metode:</strong> Menggunakan model
                  <em>Machine Learning</em> (Random Forest) untuk menginterpolasi
                  data dari 240.000 titik sampel tanah di seluruh dunia.
                </li>
                <li>
                  <strong>Input:</strong> Integrasi data satelit (MODIS, Sentinel),
                  topografi (SRTM), dan variabel lingkungan lainnya.
                </li>
                <li>
                  <strong>Resolusi:</strong> Memiliki resolusi spasial 250 meter
                  per piksel.
                </li>
              </ul>
              <div class="pt-4 flex items-center gap-2">
                <span
                  class="px-3 py-1 bg-muted rounded-full text-[10px] font-black uppercase tracking-widest text-muted-foreground"
                  >Source: ISRIC.org</span
                >
              </div>
            </div>
          </div>

          <!-- Climate Data Info -->
          <div
            class="bg-card/60 backdrop-blur-3xl border border-border rounded-[2.5rem] p-10 space-y-6 relative overflow-hidden group"
          >
            <div
              class="absolute -right-8 -top-8 text-blue-500/5 group-hover:text-blue-500/10 transition-colors"
            >
              <CloudRain size={180} />
            </div>
            <h3
              class="text-xl font-black text-foreground uppercase tracking-tight flex items-center gap-3"
            >
              <CloudRain size={20} class="text-blue-500" />
              Data Iklim (Open-Meteo)
            </h3>
            <div
              class="space-y-4 text-sm text-muted-foreground leading-relaxed relative z-10"
            >
              <p>
                Data klimatologi historis bersumber dari API <strong
                  >Open-Meteo</strong
                > yang mengintegrasikan model cuaca numerik global.
              </p>
              <ul class="space-y-2 list-disc pl-5">
                <li>
                  <strong>Model:</strong> Menggunakan data reanalisis
                  <strong>ERA5</strong>
                  dari ECMWF dan <strong>GFS/HRRR</strong> dari NOAA.
                </li>
                <li>
                  <strong>Akurasi:</strong> Data reanalisis menggabungkan observasi
                  stasiun cuaca darat, radar, dan satelit untuk menghasilkan estimasi
                  kondisi cuaca masa lalu yang presisi.
                </li>
                <li>
                  <strong>Cakupan:</strong> Menyediakan data historis per jam sejak
                  tahun 1940 dengan rentang resolusi 1 hingga 11km.
                </li>
              </ul>
              <div class="pt-4 flex items-center gap-2">
                <span
                  class="px-3 py-1 bg-muted rounded-full text-[10px] font-black uppercase tracking-widest text-muted-foreground"
                  >Source: Open-Meteo.com</span
                >
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  {/if}
</div>

<style>
  :global(body) {
    background-color: var(--background);
  }

  select option {
    background-color: #0f172a;
    color: white;
  }

  /* Shimmer for progress bars */
  .transition-all {
    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  }
</style>
