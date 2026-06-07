<script lang="ts">
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import { fly, fade, scale } from 'svelte/transition';
  import {
    ArrowLeft,
    Lightbulb,
    TrendingUp,
    Sprout,
    Target,
    Coins,
    Users,
    Scale,
    Loader2,
    Calendar,
    PackageOpen
  } from '@lucide/svelte';
  import { supabase } from '$lib/supabase/client';

  let summaries: any[] = [];
  let selectedSummary: any = null;
  let loading = true;
  let error = "";

  async function loadData() {
    loading = true;
    try {
      const [summaryRes, demoplotRes] = await Promise.all([
        supabase.from('produktivitas_summary').select('*'),
        supabase.from('demoplot').select('id, luas_demoplot')
      ]);
      
      if (summaryRes.error) throw summaryRes.error;
      if (demoplotRes.error) throw demoplotRes.error;
      
      // Merge luas_demoplot and calculate new KPI
      summaries = (summaryRes.data || []).map(s => {
        const dp = demoplotRes.data?.find(d => d.id === s.demoplot_id);
        const luas = dp?.luas_demoplot || 0; // Luas is in Hectares (NUMERIC(3,2))
        
        return {
          ...s,
          luas_demoplot: luas,
          kg_per_hektar: luas > 0 ? (s.total_panen_basah_kg || 0) / luas : 0
        };
      });

      if (summaries.length > 0) {
        selectedSummary = summaries[0];
      }
    } catch (err) {
      console.error("Gagal memuat data produktivitas:", err);
      error = "Gagal memuat data dari database.";
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    loadData();
  });

  function formatCurrency(val: number) {
    if (!val) return "Rp 0";
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);
  }

  function formatNumber(val: number, suffix: string = "") {
    if (val === null || val === undefined) return `0 ${suffix}`;
    return `${new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(val)} ${suffix}`;
  }
</script>

<div class="min-h-screen pb-24 px-6 max-w-7xl mx-auto space-y-12">
  <!-- Hero Section -->
  <section
    class="relative mt-28 rounded-[2.5rem] bg-slate-900 overflow-hidden shadow-2xl shadow-blue-900/20 text-white"
    in:fly={{ y: -20, duration: 800 }}
  >
    <div class="absolute inset-0 z-0 opacity-40">
      <div class="absolute -top-[20%] -left-[10%] w-[60%] h-[120%] bg-blue-600 blur-[120px] rounded-full"></div>
      <div class="absolute top-[20%] -right-[10%] w-[40%] h-[80%] bg-amber-500/30 blur-[100px] rounded-full"></div>
    </div>

    <div class="relative z-10 p-10 md:p-16 grid grid-cols-1 md:grid-cols-2 items-center gap-12 md:gap-24">
      <div class="space-y-6 text-center md:text-left flex-1">
        <div class="flex items-center justify-center md:justify-start gap-3">
          <a href="/insight" class="p-2 hover:bg-white/20 backdrop-blur-md rounded-xl transition-colors">
            <ArrowLeft size={18} class="text-white" />
          </a>
          <div class="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full border border-white/10 text-[10px] font-black text-amber-100 uppercase tracking-widest">
            <Target size={12} class="text-amber-400" /> Produktivitas Lahan
          </div>
        </div>

        <div class="space-y-2">
          <h1 class="text-4xl md:text-6xl font-black tracking-tighter leading-[0.9]">
            Yield & <span class="text-amber-400">Efficiency</span>
          </h1>
          <p class="text-lg text-amber-50/70 font-medium max-w-xl mx-auto md:mx-0">
            Analisis metrik produktivitas kebun dan efisiensi pengelolaan lahan Anda.
          </p>
        </div>
      </div>

      <div class="w-full md:w-auto" in:scale={{ delay: 400 }}>
        <div class="bg-white/10 backdrop-blur-2xl p-6 rounded-[2rem] border border-white/10 shadow-2xl min-w-[300px]">
          <label for="dplot-select" class="block text-[10px] font-black text-amber-200 uppercase tracking-[0.2em] mb-3 ml-1">Pilih Lokasi Lahan</label>
          <div class="relative group">
            {#if loading}
              <div class="w-full bg-slate-950/50 border border-white/10 rounded-2xl px-5 py-4 text-amber-200/50 text-sm font-bold flex items-center gap-2">
                <Loader2 size={16} class="animate-spin" /> Memuat data...
              </div>
            {:else if summaries.length === 0}
              <div class="w-full bg-slate-950/50 border border-white/10 rounded-2xl px-5 py-4 text-amber-200/50 text-sm font-bold">
                Belum ada data produktivitas
              </div>
            {:else}
              <select
                id="dplot-select"
                bind:value={selectedSummary}
                class="w-full bg-slate-950/50 border border-white/10 rounded-2xl px-5 py-4 pr-12 text-white font-bold focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all cursor-pointer appearance-none"
              >
                {#each summaries as summary}
                  <option value={summary} class="bg-slate-900">{summary.nama_demoplot}</option>
                {/each}
              </select>
              <!-- Custom arrow for select since appearance-none is used -->
              <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-white/50">
                <svg class="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
              </div>
            {/if}
          </div>
        </div>
      </div>
    </div>
  </section>

  {#if loading}
    <div class="flex items-center justify-center min-h-[400px]">
      <div class="w-12 h-12 border-4 border-amber-500/20 border-t-amber-600 rounded-full animate-spin"></div>
    </div>
  {:else if error}
    <div class="bg-red-500/10 border border-red-500/20 p-6 rounded-2xl text-center text-red-500 mt-8">
      {error}
    </div>
  {:else if summaries.length === 0}
    <div class="bg-card/60 backdrop-blur-3xl border border-border p-12 rounded-[2.5rem] shadow-xl text-center flex flex-col items-center justify-center space-y-4 mt-8">
      <PackageOpen size={48} class="text-muted-foreground/50" />
      <h3 class="text-xl font-black text-foreground">Data Produktivitas Kosong</h3>
      <p class="text-muted-foreground max-w-md">Belum ada pencatatan input, tenaga kerja, atau hasil panen pada lahan Anda. Silakan mulai pencatatan terlebih dahulu untuk melihat insight produktivitas.</p>
    </div>
  {:else if selectedSummary}
    <div class="space-y-8" in:fade={{ duration: 600 }}>
      
      <!-- Primary KPIs: Land vs Labor Productivity -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        <!-- KPI 1: Produktivitas Lahan -->
        <div class="group relative bg-emerald-500/10 backdrop-blur-3xl border border-emerald-500/20 rounded-[2.5rem] p-8 shadow-xl transition-all hover:border-emerald-500/50 hover:-translate-y-1 overflow-hidden">
          <div class="absolute -right-4 -bottom-4 text-emerald-500/10 group-hover:text-emerald-500/20 transition-colors">
            <Scale size={140} strokeWidth={1} />
          </div>
          <div class="relative z-10">
            <div class="flex items-center gap-3 mb-6">
              <div class="w-12 h-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center text-emerald-500">
                <Sprout size={24} />
              </div>
              <div>
                <h3 class="text-xl font-black text-emerald-500 uppercase tracking-tight">Produktivitas Lahan</h3>
                <p class="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Indikator Kesehatan Tanaman / Lahan</p>
              </div>
            </div>
            
            <div class="flex items-baseline gap-3 mb-2">
              <span class="text-6xl font-black text-emerald-400">{formatNumber(selectedSummary.kg_per_hektar)}</span>
              <span class="text-lg font-bold text-emerald-500/70">Kg / Hektar</span>
            </div>
            <p class="text-sm text-muted-foreground/80 font-medium">Hasil panen basah dibagi dengan luas lahan ({selectedSummary.luas_demoplot} Ha).</p>
          </div>
        </div>

        <!-- KPI 2: Produktivitas Tenaga Kerja -->
        <div class="group relative bg-amber-500/10 backdrop-blur-3xl border border-amber-500/20 rounded-[2.5rem] p-8 shadow-xl transition-all hover:border-amber-500/50 hover:-translate-y-1 overflow-hidden">
          <div class="absolute -right-4 -bottom-4 text-amber-500/10 group-hover:text-amber-500/20 transition-colors">
            <Users size={140} strokeWidth={1} />
          </div>
          <div class="relative z-10">
            <div class="flex items-center gap-3 mb-6">
              <div class="w-12 h-12 rounded-2xl bg-amber-500/20 flex items-center justify-center text-amber-500">
                <TrendingUp size={24} />
              </div>
              <div>
                <h3 class="text-xl font-black text-amber-500 uppercase tracking-tight">Produktivitas Tenaga Kerja</h3>
                <p class="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Indikator Efisiensi Finansial / Bisnis</p>
              </div>
            </div>
            
            <div class="flex items-baseline gap-3 mb-2">
              <span class="text-6xl font-black text-amber-400">{formatNumber(selectedSummary.kg_per_jam_kerja)}</span>
              <span class="text-lg font-bold text-amber-500/70">Kg / Jam Kerja</span>
            </div>
            <p class="text-sm text-muted-foreground/80 font-medium">Hasil panen per jam kerja (Yield per Man-Hour).</p>
          </div>
        </div>
      </div>

      <!-- Secondary KPIs (Financial & Operational Totals) -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
        
        <div class="group relative bg-card/60 backdrop-blur-3xl border border-border rounded-[2rem] p-6 shadow-xl transition-all hover:border-blue-500/50 hover:-translate-y-1">
          <div class="flex items-center gap-4 mb-4">
            <div class="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500">
              <Coins size={24} />
            </div>
            <div>
              <p class="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Total Pengeluaran</p>
              <h3 class="text-xl font-black text-foreground">{formatCurrency(selectedSummary.total_pengeluaran)}</h3>
            </div>
          </div>
        </div>

        <div class="group relative bg-card/60 backdrop-blur-3xl border border-border rounded-[2rem] p-6 shadow-xl transition-all hover:border-indigo-500/50 hover:-translate-y-1">
          <div class="flex items-center gap-4 mb-4">
            <div class="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500">
              <Scale size={24} />
            </div>
            <div>
              <p class="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Total Panen Basah</p>
              <h3 class="text-xl font-black text-foreground">{formatNumber(selectedSummary.total_panen_basah_kg, 'Kg')}</h3>
            </div>
          </div>
        </div>

        <div class="group relative bg-card/60 backdrop-blur-3xl border border-border rounded-[2rem] p-6 shadow-xl transition-all hover:border-rose-500/50 hover:-translate-y-1">
          <div class="flex items-center gap-4 mb-4">
            <div class="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500">
              <TrendingUp size={24} />
            </div>
            <div>
              <p class="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Biaya per Kg (Basah)</p>
              <h3 class="text-xl font-black text-foreground">{formatCurrency(selectedSummary.biaya_per_kg)}</h3>
            </div>
          </div>
        </div>

      </div>

      <!-- Detailed Breakdown -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <!-- Input & Material -->
        <div class="lg:col-span-1 bg-card/60 backdrop-blur-3xl border border-border rounded-[2.5rem] p-8 shadow-xl">
          <div class="flex items-center gap-3 mb-6">
            <div class="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500">
              <Sprout size={20} />
            </div>
            <h3 class="text-lg font-black text-foreground uppercase tracking-tight">Input & Material</h3>
          </div>

          <div class="space-y-4">
            <div class="bg-background/50 border border-border rounded-2xl p-5">
              <p class="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Total Biaya Input</p>
              <p class="text-2xl font-black text-indigo-500">{formatCurrency(selectedSummary.total_biaya_input)}</p>
            </div>
            <div class="bg-background/50 border border-border rounded-2xl p-5">
              <p class="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Jumlah Pencatatan</p>
              <p class="text-2xl font-black text-foreground">{formatNumber(selectedSummary.jumlah_catatan_input, 'Kali')}</p>
            </div>
          </div>
        </div>

        <!-- Tenaga Kerja -->
        <div class="lg:col-span-1 bg-card/60 backdrop-blur-3xl border border-border rounded-[2.5rem] p-8 shadow-xl">
          <div class="flex items-center gap-3 mb-6">
            <div class="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500">
              <Users size={20} />
            </div>
            <h3 class="text-lg font-black text-foreground uppercase tracking-tight">Tenaga Kerja</h3>
          </div>

          <div class="space-y-4">
            <div class="bg-background/50 border border-border rounded-2xl p-5">
              <p class="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Total Biaya TK</p>
              <p class="text-2xl font-black text-rose-500">{formatCurrency(selectedSummary.total_biaya_tk)}</p>
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div class="bg-background/50 border border-border rounded-2xl p-4">
                <p class="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Jam Kerja</p>
                <p class="text-xl font-black text-foreground">{formatNumber(selectedSummary.total_jam_kerja, 'Jam')}</p>
              </div>
              <div class="bg-background/50 border border-border rounded-2xl p-4">
                <p class="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Aktivitas</p>
                <p class="text-xl font-black text-foreground">{formatNumber(selectedSummary.jumlah_catatan_tk, 'Kali')}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Hasil Panen -->
        <div class="lg:col-span-1 bg-card/60 backdrop-blur-3xl border border-border rounded-[2.5rem] p-8 shadow-xl">
          <div class="flex items-center gap-3 mb-6">
            <div class="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
              <PackageOpen size={20} />
            </div>
            <h3 class="text-lg font-black text-foreground uppercase tracking-tight">Hasil Panen</h3>
          </div>

          <div class="space-y-4">
            <div class="bg-background/50 border border-border rounded-2xl p-5">
              <p class="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Panen Kering (Gabah/Green Bean)</p>
              <p class="text-2xl font-black text-emerald-500">{formatNumber(selectedSummary.total_panen_kering_kg, 'Kg')}</p>
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div class="bg-background/50 border border-border rounded-2xl p-4">
                <p class="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Panen Basah</p>
                <p class="text-xl font-black text-foreground">{formatNumber(selectedSummary.total_panen_basah_kg, 'Kg')}</p>
              </div>
              <div class="bg-background/50 border border-border rounded-2xl p-4">
                <p class="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Frekuensi</p>
                <p class="text-xl font-black text-foreground">{formatNumber(selectedSummary.jumlah_catatan_panen, 'Kali')}</p>
              </div>
            </div>
          </div>
        </div>

      </div>

      <!-- Date Info -->
      {#if selectedSummary.tanggal_mulai && selectedSummary.tanggal_terakhir}
        <div class="flex items-center justify-center gap-2 text-muted-foreground mt-8 bg-slate-900/5 border border-border py-4 px-6 rounded-full inline-flex mx-auto">
          <Calendar size={16} />
          <span class="text-sm font-medium">
            Data mencakup dari {new Date(selectedSummary.tanggal_mulai).toLocaleDateString('id-ID')} hingga {new Date(selectedSummary.tanggal_terakhir).toLocaleDateString('id-ID')}
          </span>
        </div>
      {/if}

    </div>
  {/if}
</div>
