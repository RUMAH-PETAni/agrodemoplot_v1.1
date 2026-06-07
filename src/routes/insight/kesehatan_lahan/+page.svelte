<script lang="ts">
    import { onMount } from 'svelte';
    import { browser } from '$app/environment';
    import Chart from 'chart.js/auto';
    import { fly, fade, scale } from 'svelte/transition';
    import { AlertCircle, CheckCircle2, Trees, X, Layers, ChevronRight, Home, LocateFixed, ArrowLeft, Map, Satellite, Loader2 } from '@lucide/svelte';

    import 'leaflet-gesture-handling/dist/leaflet-gesture-handling.css';

    import { supabase } from '$lib/supabase/client';

    let demoplots: any[] = [];
    let selectedDemoplot: any = null;
    let loading = true;
    let error = "";
    let success = "";

    let mapElement: HTMLElement;
    let map: any;
    let polygonLayer: any;
    let imageOverlay: any;
    let droneOverlay: any;

    let lineChartElement: HTMLCanvasElement;
    let lineChart: any;

    let donutChartElement: HTMLCanvasElement;
    let donutChart: any;

    let isAnalyzing = false;

    // Map Controls
    let currentBaseMap = "esri";
    let showBasemapDropdown = false;
    let tileLayer: any = null;

    function toggleBasemap() {
        showBasemapDropdown = !showBasemapDropdown;
    }

    const baseMaps = {
        esri: {
            label: "Satelit (Esri)",
            url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
            subdomains: [],
            attribution: "© Esri",
            maxNativeZoom: 18,
            maxZoom: 20
        },
        osm: {
            label: "Street Map",
            url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
            subdomains: ['a', 'b', 'c'],
            attribution: '© OpenStreetMap',
            maxNativeZoom: 19,
            maxZoom: 20
        },
        drone: {
            label: "Foto Udara",
            url: "",
            attribution: "Drone Imagery",
            maxNativeZoom: 22,
            maxZoom: 22
        }
    };

    function switchBaseMap(type: string) {
        if (!map || !tileLayer) return;
        map.removeLayer(tileLayer);
        if (rasterLayer) { map.removeLayer(rasterLayer); rasterLayer = null; }
        currentBaseMap = type;

        if (type === 'drone') {
            if (!selectedDemoplot || !selectedDemoplot.foto_udara) {
                switchBaseMap('esri');
                return;
            }
            // Pasang basemap Esri di bawah, lalu renderDemoplot akan render foto udara di atasnya
            const config = baseMaps.esri;
            import('leaflet').then(L => {
                tileLayer = L.tileLayer(config.url, {
                    attribution: config.attribution,
                    maxNativeZoom: config.maxNativeZoom,
                    maxZoom: config.maxZoom
                }).addTo(map);
                tileLayer.bringToBack();
                renderDemoplot(L);
            });
            return;
        }

        const config = baseMaps[type as keyof typeof baseMaps];
        import('leaflet').then(L => {
            tileLayer = L.tileLayer(config.url, {
                attribution: config.attribution,
                maxNativeZoom: config.maxNativeZoom,
                maxZoom: config.maxZoom
            }).addTo(map);
            tileLayer.bringToBack();
            renderDemoplot(L);
        });
    }


    function zoomToAll() {
        if (!map || !polygonLayer) return;
        map.fitBounds(polygonLayer.getBounds(), { padding: [50, 50] });
    }

    function getCurrentLocation() {
        if (!map) return;
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    map.flyTo([latitude, longitude], 18, { duration: 2 });
                },
                (err) => {
                    error = "Gagal mendapatkan lokasi GPS.";
                    setTimeout(() => { error = ""; }, 3000);
                },
                { enableHighAccuracy: true },
            );
        } else {
            error = "Browser Anda tidak mendukung Geolocation.";
            setTimeout(() => { error = ""; }, 3000);
        }
    }

    // Inisialisasi peta
    function initMap() {
        if (!browser || !mapElement) return;

        import('leaflet').then(L => {
            import('leaflet-gesture-handling').then(() => {
                if (!map) {
                    map = L.map(mapElement, { 
                        zoomControl: false,
                        gestureHandling: true 
                    }).setView([-2.5489, 118.0149], 5);

                    // Buat pane khusus untuk raster/foto udara agar bisa diatur z-index
                    map.createPane('rasterPane');
                    map.getPane('rasterPane').style.zIndex = '450';

                    // Buat pane untuk GEE heatmap di atas foto udara
                    map.createPane('geePane');
                    map.getPane('geePane').style.zIndex = '460';

                    tileLayer = L.tileLayer(baseMaps.esri.url, {
                        maxNativeZoom: baseMaps.esri.maxNativeZoom,
                        maxZoom: baseMaps.esri.maxZoom,
                        attribution: baseMaps.esri.attribution
                    }).addTo(map);
                }
                renderDemoplot(L);
            });
        });
    }

    let rasterLayer: any = null;

    // Render demoplot di peta (mengikuti pola kebun)
    function renderDemoplot(L: any) {
        if (!map || !selectedDemoplot) return;

        // Bersihkan semua layer sebelumnya
        if (polygonLayer) { map.removeLayer(polygonLayer); polygonLayer = null; }
        if (imageOverlay) { map.removeLayer(imageOverlay); imageOverlay = null; }
        if (droneOverlay) { map.removeLayer(droneOverlay); droneOverlay = null; }
        if (rasterLayer)  { map.removeLayer(rasterLayer);  rasterLayer = null; }

        // --- Render Polygon ---
        if (selectedDemoplot.polygon) {
            try {
                const geojsonData = typeof selectedDemoplot.polygon === 'string'
                    ? JSON.parse(selectedDemoplot.polygon)
                    : selectedDemoplot.polygon;

                polygonLayer = L.geoJSON(geojsonData, {
                    style: {
                        color: '#ff7800',
                        weight: 2,
                        opacity: 1,
                        fillOpacity: 0.1
                    }
                }).addTo(map);
            } catch (e) {
                console.error('Error parsing polygon:', e);
            }
        }

        // --- Render Foto Udara (Drone) — sama persis dengan kebun ---
        if (selectedDemoplot.foto_udara && currentBaseMap === 'drone') {
            if (
                selectedDemoplot.foto_udara.includes('{z}') &&
                selectedDemoplot.foto_udara.includes('{x}') &&
                selectedDemoplot.foto_udara.includes('{y}')
            ) {
                // Format tile URL
                rasterLayer = L.tileLayer(selectedDemoplot.foto_udara, {
                    opacity: 0.85,
                    pane: 'rasterPane',
                    maxZoom: 22
                }).addTo(map);
            } else {
                // Format static image — bounds dari polygon atau titik koordinat
                const bounds = polygonLayer
                    ? polygonLayer.getBounds()
                    : [
                        [(selectedDemoplot.latitude || 0) - 0.002, (selectedDemoplot.longitude || 0) - 0.002],
                        [(selectedDemoplot.latitude || 0) + 0.002, (selectedDemoplot.longitude || 0) + 0.002]
                    ];
                rasterLayer = L.imageOverlay(selectedDemoplot.foto_udara, bounds, {
                    opacity: 0.85,
                    pane: 'rasterPane'
                }).addTo(map);
            }
        }

        // --- Render GEE Heatmap Overlay (selalu di atas foto udara) ---
        if (selectedDemoplot.latestAnalysis?.raster_overlay_url) {
            imageOverlay = L.tileLayer(selectedDemoplot.latestAnalysis.raster_overlay_url, {
                opacity: 0.7,
                maxZoom: 22,
                pane: 'geePane'
            }).addTo(map);
        }

        // --- Fit peta ke bounds ---
        if (polygonLayer) {
            map.fitBounds(polygonLayer.getBounds(), { padding: [40, 40], animate: true, duration: 1.2 });
        } else if (selectedDemoplot.latitude && selectedDemoplot.longitude) {
            map.setView([selectedDemoplot.latitude, selectedDemoplot.longitude], 17, { animate: true, duration: 1.2 });
        }
    }

    // Inisialisasi Chart
    function initCharts() {
        if (!browser || !selectedDemoplot) return;

        // 1. Line Chart (Tren NDVI & NDWI)
        if (lineChartElement) {
            if (lineChart) lineChart.destroy();
            
            const history = [...(selectedDemoplot.history || [])].reverse(); // Urutkan dari yang terlama
            const labels = history.map(h => h.periode_analisis);
            const ndviData = history.map(h => h.avg_ndvi);
            const ndwiData = history.map(h => h.avg_ndwi);

            lineChart = new Chart(lineChartElement, {
                type: 'line',
                data: {
                    labels: labels.length > 0 ? labels : ['Bulan Ini'],
                    datasets: [
                        {
                            label: 'NDVI (Kesehatan Tanaman)',
                            data: ndviData.length > 0 ? ndviData : [selectedDemoplot.latestAnalysis?.avg_ndvi || 0],
                            borderColor: 'rgb(34, 197, 94)', // Green
                            tension: 0.3
                        },
                        {
                            label: 'NDWI (Kadar Air)',
                            data: ndwiData.length > 0 ? ndwiData : [selectedDemoplot.latestAnalysis?.avg_ndwi || 0],
                            borderColor: 'rgb(59, 130, 246)', // Blue
                            tension: 0.3
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false
                }
            });
        }

        // 2. Donut Chart (Distribusi Kesehatan)
        if (donutChartElement && selectedDemoplot.latestAnalysis) {
            if (donutChart) donutChart.destroy();

            const analysis = selectedDemoplot.latestAnalysis;
            // Jika persentase belum ada, kita pakai mock data berdasarkan skor
            const sehat = analysis.pct_sehat || (analysis.skor_kesehatan > 80 ? 70 : 40);
            const normal = analysis.pct_normal || (analysis.skor_kesehatan > 80 ? 20 : 40);
            const stres = analysis.pct_stres || 10;

            donutChart = new Chart(donutChartElement, {
                type: 'doughnut',
                data: {
                    labels: ['Sehat (Vigor Tinggi)', 'Normal', 'Stres/Kritis'],
                    datasets: [{
                        data: [sehat, normal, stres],
                        backgroundColor: [
                            '#3E8601', // Hijau tua dari palet GEE (Sehat)
                            '#FCD163', // Kuning dari palet GEE (Normal)
                            '#DF923D'  // Oranye/Coklat dari palet GEE (Stres)
                        ]
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'bottom' }
                    }
                }
            });
        }
    }

    async function loadData() {
        loading = true;
        try {
            const { data: plotData, error: demoErr } = await supabase
                .from('demoplot')
                .select(`
                    id, 
                    nama_demoplot, 
                    luas_demoplot, 
                    polygon,
                    foto_udara,
                    petani_id,
                    petani ( nama_lengkap )
                `);

            if (demoErr) throw demoErr;

            const { data: analyses, error: analysisErr } = await supabase
                .from('analisis_kesehatan_lahan')
                .select('*')
                .order('periode_analisis', { ascending: false });

            if (analysisErr) throw analysisErr;

            demoplots = (plotData || []).map(plot => {
                const plotAnalyses = analyses?.filter(a => a.demoplot_id === plot.id) || [];
                const latestAnalysis = plotAnalyses.length > 0 ? plotAnalyses[0] : null;

                return {
                    ...plot,
                    latestAnalysis,
                    history: plotAnalyses
                };
            });

            if (demoplots.length > 0) {
                selectedDemoplot = demoplots[0];
            }
        } catch (err) {
            console.error("Gagal memuat data demoplot:", err);
            error = "Gagal memuat data dari database.";
        } finally {
            loading = false;
        }
    }

    onMount(() => {
        // Dynamic import leaflet CSS
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);

        loadData().then(() => {
            if (demoplots.length > 0) {
                initMap();
                initCharts();
            }
        });

        return () => {
            if (map) map.remove();
            if (lineChart) lineChart.destroy();
            if (donutChart) donutChart.destroy();
        };
    });

    // Reactive statement: ketika demoplot dipilih ulang, render ulang peta dan grafik
    $: if (selectedDemoplot && browser) {
        import('leaflet').then(L => renderDemoplot(L.default));
        initCharts();
    }

    async function reqAnalyze() {
        if (!selectedDemoplot || !selectedDemoplot.polygon) {
            error = "Pilih demoplot yang memiliki polygon lahan.";
            return;
        }

        isAnalyzing = true;
        error = "";
        success = "";
        try {
            const res = await fetch('/api/gee/analyze-lahan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    demoplot_id: selectedDemoplot.id,
                    polygon: selectedDemoplot.polygon,
                    periode: new Date().toISOString()
                })
            });

            const result = await res.json();
            if (res.ok) {
                // Simpan data ke Supabase dari sisi frontend (user harus memiliki role administrator)
                const { error: dbError } = await supabase
                    .from('analisis_kesehatan_lahan')
                    .upsert([result.data], { onConflict: 'demoplot_id, periode_analisis' });

                if (dbError) {
                    console.error("Gagal menyimpan ke database:", dbError);
                    error = "Analisis berhasil, tetapi gagal menyimpan ke database. Pastikan Anda memiliki hak akses.";
                    return;
                }

                // Update local state dengan analisis baru
                selectedDemoplot.latestAnalysis = result.data;
                selectedDemoplot.history = [result.data, ...(selectedDemoplot.history || [])];
                
                // Pancing reaktivitas Svelte
                selectedDemoplot = { ...selectedDemoplot };
                success = "Analisis satelit berhasil dan tersimpan di database!";
                setTimeout(() => { success = ""; }, 3000);
            } else {
                error = "Gagal: " + result.error;
            }
        } catch (err) {
            console.error(err);
            error = "Terjadi kesalahan jaringan.";
        } finally {
            isAnalyzing = false;
        }
    }
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

        <div class="relative z-10 p-10 md:p-16 grid grid-cols-1 md:grid-cols-2 items-center gap-12 md:gap-24">
            <div class="space-y-6 text-center md:text-left flex-1">
                <div class="flex items-center justify-center md:justify-start gap-3">
                    <a href="/insight" class="p-2 hover:bg-white/20 backdrop-blur-md rounded-xl transition-colors">
                        <ArrowLeft size={18} class="text-white" />
                    </a>
                    <div class="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full border border-white/10 text-[10px] font-black text-emerald-100 uppercase tracking-widest">
                        <Trees size={12} class="text-emerald-400" /> Kesehatan Lahan
                    </div>
                </div>

                <div class="space-y-2">
                    <h1 class="text-4xl md:text-6xl font-black tracking-tighter leading-[0.9]">
                        Crop & <span class="text-emerald-400">Vigor</span>
                    </h1>
                    <p class="text-lg text-emerald-50/70 font-medium max-w-xl mx-auto md:mx-0">
                        Analisis indeks vegetasi dan kelembapan berbasis citra satelit (Sentinel-2).
                    </p>
                </div>
            </div>

            <!-- Demoplot Selector Inside Hero -->
            <div class="w-full md:w-auto" in:scale={{ delay: 400 }}>
                <div class="bg-white/10 backdrop-blur-2xl p-6 rounded-[2rem] border border-white/10 shadow-2xl min-w-[300px]">
                    <label for="dplot-select" class="block text-[10px] font-black text-emerald-200 uppercase tracking-[0.2em] mb-3 ml-1">Pilih Lokasi Analisis</label>
                    <div class="relative group">
                        {#if loading}
                            <div class="w-full bg-slate-950/50 border border-white/10 rounded-2xl px-5 py-4 text-emerald-200/50 text-sm font-bold flex items-center gap-2">
                                <Loader2 size={16} class="animate-spin" /> Memuat demoplot...
                            </div>
                        {:else}
                            <select
                                id="dplot-select"
                                bind:value={selectedDemoplot}
                                class="w-full bg-slate-950/50 border border-white/10 rounded-2xl px-5 py-4 pr-12 text-white font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all cursor-pointer"
                            >
                                {#each demoplots as dp}
                                    <option value={dp} class="bg-slate-900">{dp.nama_demoplot}</option>
                                {/each}
                            </select>
                        {/if}
                    </div>

                    <button
                        on:click={reqAnalyze}
                        disabled={isAnalyzing || loading || !selectedDemoplot}
                        class="w-full mt-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-[10px] font-black text-emerald-200 uppercase tracking-widest transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {#if isAnalyzing}
                            <Loader2 size={14} class="animate-spin" /> Menganalisis GEE...
                        {:else}
                            <Satellite size={14} /> Jalankan Analisis Satelit
                        {/if}
                    </button>
                </div>
            </div>
        </div>
    </section>

    {#if loading}
        <div class="flex items-center justify-center min-h-[500px]">
            <div class="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-600 rounded-full animate-spin"></div>
        </div>
    {:else if selectedDemoplot}
        <div class="space-y-10" in:fade={{ duration: 600 }}>

            <!-- Split Screen: Map + Metrics -->
            <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">

                <!-- Left: Map -->
                <div class="lg:col-span-7 bg-card/60 backdrop-blur-3xl rounded-[2.5rem] border border-border shadow-xl overflow-hidden flex flex-col">
                    <div class="px-8 py-5 border-b border-border flex justify-between items-center">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
                                <Map size={20} />
                            </div>
                            <div>
                                <h2 class="text-base font-black text-foreground uppercase tracking-tight">Peta Geospasial</h2>
                                <p class="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">NDVI Heatmap · Sentinel-2</p>
                            </div>
                        </div>
                        
                    </div>

                    <div class="flex-grow w-full h-[500px] relative overflow-hidden">
                        <div bind:this={mapElement} class="w-full h-full z-0"></div>

                        <!-- HUD Controls (Basemap Dropdown) -->
                        <div class="absolute top-6 right-6 z-[1000] flex flex-col gap-3">
                            <div class="relative">
                                <button
                                    on:click={toggleBasemap}
                                    class="h-12 px-6 bg-slate-900/60 backdrop-blur-3xl border border-white/20 rounded-2xl flex items-center gap-3 text-white hover:bg-white/30 transition-all shadow-2xl"
                                >
                                    <Layers size={18} class="text-emerald-400" />
                                    <span class="text-[10px] font-black uppercase tracking-widest">
                                        {baseMaps[currentBaseMap as keyof typeof baseMaps]?.label || "Standard Map"}
                                    </span>
                                    <ChevronRight
                                        size={14}
                                        class="transition-transform {showBasemapDropdown ? 'rotate-[-90deg]' : 'rotate-90'}"
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
                                                on:click={() => { switchBaseMap(key); showBasemapDropdown = false; }}
                                                class="w-full px-5 py-3.5 text-left text-[10px] font-black uppercase tracking-widest transition-colors flex items-center justify-between {currentBaseMap === key ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:bg-white/10'}"
                                            >
                                                {config.label}
                                            </button>
                                        {/each}
                                    </div>
                                {/if}
                            </div>
                        </div>

                        <!-- Navigation Controls -->
                        <div class="absolute right-6 bottom-6 z-[1000] flex flex-col gap-3">
                            <button
                                on:click={zoomToAll}
                                class="w-12 h-12 bg-slate-900/60 backdrop-blur-3xl border border-white/20 rounded-2xl flex items-center justify-center text-white hover:bg-white/30 transition-all active:scale-95 shadow-2xl group"
                                title="Zoom ke Demoplot"
                            >
                                <Home size={20} class="group-hover:text-emerald-400 transition-colors" />
                            </button>
                            <button
                                on:click={getCurrentLocation}
                                class="w-12 h-12 bg-slate-900/60 backdrop-blur-3xl border border-white/20 rounded-2xl flex items-center justify-center text-white hover:bg-white/30 transition-all active:scale-95 shadow-2xl group"
                                title="Cari Lokasi Saya"
                            >
                                <LocateFixed size={20} class="group-hover:text-blue-400 transition-colors" />
                            </button>
                        </div>

                        {#if !selectedDemoplot.latestAnalysis}
                            <div class="absolute inset-0 z-[500] bg-background/60 backdrop-blur-sm flex flex-col items-center justify-center pointer-events-none">
                                <Satellite size={40} class="text-muted-foreground mb-3" />
                                <p class="text-foreground font-black uppercase tracking-tight">Belum ada analisis satelit</p>
                                <p class="text-sm text-muted-foreground mt-1">Klik tombol analisis di atas untuk memulai</p>
                            </div>
                        {/if}
                    </div>
                </div>

                <!-- Right: Metrics & Diagnostics -->
                <div class="lg:col-span-5 flex flex-col gap-5">

                    <!-- Skor Kesehatan Card -->
                    <div class="group relative bg-card/60 backdrop-blur-3xl border border-border rounded-[2.5rem] p-8 shadow-xl overflow-hidden transition-all hover:border-emerald-500/50 hover:-translate-y-1">
                        <div class="absolute -right-4 -bottom-4 text-emerald-500/5 group-hover:text-emerald-500/10 transition-colors">
                            <Satellite size={140} strokeWidth={1} />
                        </div>
                        <p class="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2">Skor Kesehatan Lahan</p>
                        <div class="flex items-baseline gap-3 mb-4">
                            <span class="text-6xl font-black {(selectedDemoplot.latestAnalysis?.skor_kesehatan ?? 0) > 70 ? 'text-emerald-500' : 'text-amber-500'}">
                                {selectedDemoplot.latestAnalysis?.skor_kesehatan ?? '--'}
                            </span>
                            <span class="text-sm font-bold text-muted-foreground">/ 100</span>
                        </div>
                        <div class="inline-flex px-3 py-1 {(selectedDemoplot.latestAnalysis?.skor_kesehatan ?? 0) > 70 ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600' : 'bg-amber-500/10 border-amber-500/20 text-amber-600'} border rounded-full text-[10px] font-black uppercase tracking-widest">
                            {(selectedDemoplot.latestAnalysis?.skor_kesehatan ?? 0) > 70 ? 'Sehat' : (selectedDemoplot.latestAnalysis?.skor_kesehatan ?? 0) > 40 ? 'Normal' : '--'}
                        </div>

                        <div class="mt-5 grid grid-cols-2 gap-3">
                            <div class="bg-background/50 border border-border rounded-2xl p-4">
                                <p class="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1">NDVI</p>
                                <p class="text-xl font-black text-emerald-500">{selectedDemoplot.latestAnalysis?.avg_ndvi ?? '--'}</p>
                            </div>
                            <div class="bg-background/50 border border-border rounded-2xl p-4">
                                <p class="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1">NDWI</p>
                                <p class="text-xl font-black text-cyan-500">{selectedDemoplot.latestAnalysis?.avg_ndwi ?? '--'}</p>
                            </div>
                        </div>
                    </div>

                    <!-- Donut Chart: Distribusi Vigor -->
                    <div class="group relative bg-card/60 backdrop-blur-3xl border border-border rounded-[2.5rem] p-8 shadow-xl transition-all hover:border-border/80 flex-grow">
                        <p class="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-5">Distribusi Vigor Tanaman</p>
                        <div class="h-48 relative">
                            {#if selectedDemoplot.latestAnalysis}
                                <canvas bind:this={donutChartElement}></canvas>
                            {:else}
                                <div class="absolute inset-0 flex items-center justify-center">
                                    <span class="text-muted-foreground text-sm font-medium">Data tidak tersedia</span>
                                </div>
                            {/if}
                        </div>
                    </div>

                    <!-- Rekomendasi Cerdas -->
                    <div class="bg-amber-500/10 border border-amber-500/20 rounded-[2.5rem] p-8 shadow-xl">
                        <div class="flex items-start gap-4">
                            <div class="w-10 h-10 rounded-2xl bg-amber-500/20 flex items-center justify-center text-amber-500 shrink-0">
                                <AlertCircle size={20} />
                            </div>
                            <div>
                                <h3 class="text-sm font-black text-amber-600 uppercase tracking-tight mb-2">Assessment Sementara</h3>
                                <p class="text-sm text-muted-foreground leading-relaxed">
                                    {#if !selectedDemoplot.latestAnalysis}
                                        Lakukan analisis GEE terlebih dahulu untuk mendapatkan rekomendasi.
                                    {:else if selectedDemoplot.latestAnalysis.avg_ndwi < 0.1}
                                        Terdeteksi tingkat stres air (NDWI rendah). Disarankan melakukan pengecekan irigasi pada lahan.
                                    {:else if selectedDemoplot.latestAnalysis.avg_ndvi < 0.4}
                                        Vigor tanaman relatif rendah. Pertimbangkan penambahan nutrisi/pupuk di area dengan reflektansi rendah pada peta.
                                    {:else}
                                        Kondisi lahan secara umum terpantau sehat dan optimal. Lanjutkan perawatan rutin.
                                    {/if}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Temporal Analytics -->
            <section class="space-y-8">
                <div class="flex items-center gap-4">
                    <div class="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-500">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"></path></svg>
                    </div>
                    <div>
                        <h2 class="text-2xl font-black text-foreground uppercase tracking-tight">Tren Historis</h2>
                        <p class="text-sm text-muted-foreground font-medium">Temporal Analytics · NDVI & NDWI</p>
                    </div>
                </div>
                <div class="bg-card/60 backdrop-blur-3xl border border-border rounded-[2.5rem] p-8 shadow-xl">
                    <div class="h-72 w-full">
                        <canvas bind:this={lineChartElement}></canvas>
                    </div>
                </div>
            </section>

            <!-- Metodologi Analisis -->
            <section class="space-y-8">
                <div class="flex items-center gap-4">
                    <div class="w-12 h-12 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-500">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>
                    </div>
                    <div>
                        <h2 class="text-2xl font-black text-foreground uppercase tracking-tight">Metodologi Analisis</h2>
                        <p class="text-sm text-muted-foreground font-medium">Referensi teknis · Sumber & Algoritma</p>
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <!-- Sumber Data -->
                    <div class="group relative bg-card/60 backdrop-blur-3xl border border-border rounded-[2.5rem] p-8 transition-all hover:border-blue-500/50 hover:-translate-y-1 shadow-xl">
                        <div class="w-10 h-10 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500 mb-5">
                            <Map size={20} />
                        </div>
                        <h4 class="text-sm font-black text-foreground uppercase tracking-tight mb-3">Sumber Citra</h4>
                        <p class="text-xs text-muted-foreground leading-relaxed">
                            Menggunakan citra satelit <span class="text-blue-500 font-bold">Sentinel-2 Level-2A (Surface Reflectance)</span> dari program Copernicus milik ESA. Resolusi spasial 10 meter per piksel, revisit time 5 hari.
                        </p>
                    </div>

                    <!-- NDVI -->
                    <div class="group relative bg-card/60 backdrop-blur-3xl border border-border rounded-[2.5rem] p-8 transition-all hover:border-emerald-500/50 hover:-translate-y-1 shadow-xl">
                        <div class="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 mb-5">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"></path></svg>
                        </div>
                        <h4 class="text-sm font-black text-foreground uppercase tracking-tight mb-3">NDVI</h4>
                        <p class="text-xs text-muted-foreground leading-relaxed">
                            <span class="text-emerald-500 font-bold">Normalized Difference Vegetation Index</span> mengukur tingkat kehijauan dan vigor tanaman. Formula: <code class="bg-muted px-1.5 py-0.5 rounded text-[10px] text-emerald-500">(B8 − B4) / (B8 + B4)</code>. Nilai mendekati 1 = vegetasi sehat.
                        </p>
                    </div>

                    <!-- NDWI -->
                    <div class="group relative bg-card/60 backdrop-blur-3xl border border-border rounded-[2.5rem] p-8 transition-all hover:border-cyan-500/50 hover:-translate-y-1 shadow-xl">
                        <div class="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-500 mb-5">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path></svg>
                        </div>
                        <h4 class="text-sm font-black text-foreground uppercase tracking-tight mb-3">NDWI</h4>
                        <p class="text-xs text-muted-foreground leading-relaxed">
                            <span class="text-cyan-500 font-bold">Normalized Difference Water Index</span> mengukur tingkat kelembapan vegetasi. Formula: <code class="bg-muted px-1.5 py-0.5 rounded text-[10px] text-cyan-500">(B3 − B8) / (B3 + B8)</code>. Nilai rendah = potensi stres kekeringan.
                        </p>
                    </div>

                    <!-- Skor Kesehatan -->
                    <div class="group relative bg-card/60 backdrop-blur-3xl border border-border rounded-[2.5rem] p-8 transition-all hover:border-amber-500/50 hover:-translate-y-1 shadow-xl">
                        <div class="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 mb-5">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
                        </div>
                        <h4 class="text-sm font-black text-foreground uppercase tracking-tight mb-3">Skor Kesehatan</h4>
                        <p class="text-xs text-muted-foreground leading-relaxed">
                            Skor dihitung berdasarkan rata-rata NDVI yang dinormalisasi ke skala <span class="text-amber-500 font-bold">0–100</span>. Skor &gt;70 = sehat, 40–70 = normal, &lt;40 = stres vegetasi yang perlu perhatian.
                        </p>
                    </div>

                    <!-- Pengolahan Data -->
                    <div class="group relative bg-card/60 backdrop-blur-3xl border border-border rounded-[2.5rem] p-8 transition-all hover:border-violet-500/50 hover:-translate-y-1 shadow-xl">
                        <div class="w-10 h-10 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-500 mb-5">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                        </div>
                        <h4 class="text-sm font-black text-foreground uppercase tracking-tight mb-3">Pengolahan Data</h4>
                        <p class="text-xs text-muted-foreground leading-relaxed">
                            Diproses via <span class="text-violet-500 font-bold">Google Earth Engine (GEE)</span>. Komposit median dari 3 bulan terakhir dengan filter tutupan awan &lt;60% untuk mereduksi noise atmosferik.
                        </p>
                    </div>

                    <!-- Heatmap -->
                    <div class="group relative bg-card/60 backdrop-blur-3xl border border-border rounded-[2.5rem] p-8 transition-all hover:border-rose-500/50 hover:-translate-y-1 shadow-xl">
                        <div class="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 mb-5">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"></path></svg>
                        </div>
                        <h4 class="text-sm font-black text-foreground uppercase tracking-tight mb-3">Peta Heatmap</h4>
                        <p class="text-xs text-muted-foreground leading-relaxed mb-4">
                            Overlay menampilkan <span class="text-rose-500 font-bold">heatmap NDVI</span> dengan palet 3 warna yang konsisten dengan grafik Distribusi Vigor di bawahnya:
                        </p>
                        <!-- Color Swatches — sesuai dengan palette GEE dan donut chart -->
                        <div class="space-y-2">
                            <div class="flex items-center gap-3">
                                <div class="w-5 h-5 rounded-md shrink-0" style="background-color: #3E8601;"></div>
                                <div>
                                    <span class="text-[10px] font-black uppercase tracking-widest" style="color: #3E8601;">Sehat / Vigor Tinggi</span>
                                    <span class="text-[9px] text-muted-foreground ml-1">(NDVI tinggi)</span>
                                </div>
                            </div>
                            <div class="flex items-center gap-3">
                                <div class="w-5 h-5 rounded-md shrink-0" style="background-color: #FCD163;"></div>
                                <div>
                                    <span class="text-[10px] font-black uppercase tracking-widest" style="color: #b8960a;">Normal / Sedang</span>
                                    <span class="text-[9px] text-muted-foreground ml-1">(NDVI menengah)</span>
                                </div>
                            </div>
                            <div class="flex items-center gap-3">
                                <div class="w-5 h-5 rounded-md shrink-0" style="background-color: #DF923D;"></div>
                                <div>
                                    <span class="text-[10px] font-black uppercase tracking-widest" style="color: #DF923D;">Stres / Kritis</span>
                                    <span class="text-[9px] text-muted-foreground ml-1">(NDVI rendah)</span>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>

                <!-- Disclaimer -->
                <div class="bg-slate-900/5 border border-border rounded-[3rem] p-10">
                    <p class="text-[11px] text-muted-foreground leading-relaxed">
                        <span class="text-foreground font-black uppercase tracking-tight">Disclaimer: </span>Hasil analisis ini merupakan pendekatan berbasis penginderaan jauh dan bersifat estimasi. Faktor seperti tutupan awan, fase fenologi tanaman, dan kondisi atmosfer dapat memengaruhi akurasi. Disarankan untuk melakukan verifikasi lapangan (<em>ground-truthing</em>) sebagai konfirmasi.
                    </p>
                </div>
            </section>
        </div>

    {:else}
        <div class="bg-card/60 backdrop-blur-3xl border border-border rounded-[2.5rem] p-16 text-center shadow-xl">
            <div class="w-16 h-16 rounded-3xl bg-muted border border-border flex items-center justify-center mx-auto mb-6">
                <Satellite size={28} class="text-muted-foreground" />
            </div>
            <h2 class="text-xl font-black text-foreground uppercase tracking-tight">Belum Ada Data Demoplot</h2>
            <p class="text-muted-foreground mt-2 max-w-md mx-auto text-sm font-medium">Silakan tambahkan data polygon demoplot petani terlebih dahulu pada modul lain untuk melihat analisis kesehatannya di sini.</p>
        </div>
    {/if}

    <!-- Alert Notification -->
    {#if error}
        <div
            class="fixed bottom-8 left-1/2 -translate-x-1/2 z-[9999]"
            in:fly={{ y: 20 }}
        >
            <div
                class="bg-red-600 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3"
            >
                <AlertCircle size={20} />
                <p class="text-sm font-bold uppercase tracking-widest">{error}</p>
                <button
                    on:click={() => (error = "")}
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

</div>
