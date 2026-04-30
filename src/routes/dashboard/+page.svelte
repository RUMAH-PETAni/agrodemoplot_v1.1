<script lang="ts">
  import { auth } from "$lib/supabase/auth";
  import { browser } from "$app/environment";
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import type { User } from "@supabase/supabase-js";
  import {
    Bug,
    Activity,
    Sprout,
    BarChart3,
    Sparkles,
    Users,
    LandPlot,
    LayoutDashboard,
    ClipboardClock,
    ArrowRight,
  } from "@lucide/svelte";
  import { fade, fly, scale } from "svelte/transition";
  import { backOut } from "svelte/easing";

  // Services
  import { getPetaniList } from "$lib/services/petani";
  import { getDemoplotList } from "$lib/services/demoplot";
  import { getMonitoringPenanaman } from "$lib/services/penanaman";
  import { getMonitoringHPG } from "$lib/services/hpg";
  import { getLogAktifitas } from "$lib/services/aktifitas";
  import { getProduktivitas } from "$lib/services/produktivitas";

  import menu1Img from "$lib/assets/images/petani.jpg";
  import menu2Img from "$lib/assets/images/polygon.jpg";
  import menu3Img from "$lib/assets/images/tanam.jpg";
  import menu4Img from "$lib/assets/images/hama.jpg";
  import menu6Img from "$lib/assets/images/panen.jpg";
  import menu7Img from "$lib/assets/images/aktivitas.jpg";

  let user = $state<User | null>(null);
  let loading = $state(true);
  let statsLoading = $state(true);

  // Dynamic Stats
  let totalPetani = $state(0);
  let totalLahan = $state(0);
  let totalTanaman = $state(0);
  let totalHpg = $state(0);
  let totalAktifitas = $state(0);
  let totalProduktivitas = $state(0);
  let lastSync = $state(new Date());

  async function loadSummaryData() {
    statsLoading = true;
    try {
      const [petani, demoplots, monitoring, hpg, logs, productivity] =
        await Promise.all([
          getPetaniList(),
          getDemoplotList(),
          getMonitoringPenanaman(),
          getMonitoringHPG(),
          getLogAktifitas(),
          getProduktivitas(),
        ]);
      totalPetani = petani.length;
      totalLahan = demoplots.length;

      // Count unique plants by kode_tanaman
      const uniquePlants = new Set(monitoring.map((m) => m.kode_tanaman));
      totalTanaman = uniquePlants.size;

      totalHpg = hpg.length;
      totalAktifitas = logs.length;
      totalProduktivitas = productivity?.length || 0;

      lastSync = new Date();
    } catch (err) {
      console.error("Error fetching dashboard summary:", err);
    } finally {
      statsLoading = false;
    }
  }

  onMount(() => {
    if (browser) {
      const unsub = auth.subscribe((authState) => {
        user = authState.user;
        loading = authState.loading;
        if (!authState.loading && !authState.user) goto("/auth/login");
        if (authState.user) loadSummaryData();
      });
      return () => {
        if (typeof unsub === "function") unsub();
      };
    }
  });

  const menuItems = [
    {
      name: "Profil Petani",
      desc: "Manajemen data pengelola lahan.",
      href: "/dashboard/petani",
      img: menu1Img,
      icon: Users,
      active: true,
    },
    {
      name: "Informasi Kebun",
      desc: "Karakteristik Lahan & Data Spasial.",
      href: "/dashboard/kebun",
      img: menu2Img,
      icon: LandPlot,
      active: true,
    },

    {
      name: "Pantau Tanaman",
      desc: "Kondisi pertumbuhan & inventaris.",
      href: "/dashboard/penanaman",
      img: menu3Img,
      icon: Sprout,
      active: true,
    },
    {
      name: "Identifikasi Gangguan",
      desc: "Monitoring hama, penyakit & gulma.",
      href: "/dashboard/hpg",
      img: menu4Img,
      icon: Bug,
      active: true,
    },
    {
      name: "Aktivitas Pengelola",
      desc: "Log Aktivitas kebun Pengelola Lahan",
      href: "/dashboard/aktifitas",
      img: menu7Img,
      icon: ClipboardClock,
      active: true,
    },

    {
      name: "Produktivitas",
      desc: "Lacak input, tenaga kerja & hasil panen.",
      href: "/dashboard/produktifitas",
      img: menu6Img,
      icon: BarChart3,
      active: true,
    },
  ];
</script>

{#if loading}
  <div
    class="fixed inset-0 flex flex-col items-center justify-center bg-background z-[3000]"
  >
    <div
      class="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-600 rounded-full animate-spin mb-4"
    ></div>
    <p
      class="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground animate-pulse"
    >
      Menyiapkan Dashboard
    </p>
  </div>
{:else if user}
  <div class="min-h-screen pb-24 px-6 max-w-7xl mx-auto space-y-12">
    <!-- Welcome Hero -->
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
        <!-- Left Column: Branding & Greeting -->
        <div class="space-y-6 text-center lg:text-left">
          <div
            class="inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 backdrop-blur-md rounded-full border border-white/10 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-100"
          >
            <LayoutDashboard size={12} class="text-emerald-400" /> Menu Dashboard
            <span class="w-1 h-1 bg-emerald-400 rounded-full animate-ping ml-2"
            ></span>
            <span class="opacity-50 ml-2"
              >Sync: {lastSync.toLocaleTimeString("id-ID", {
                hour: "2-digit",
                minute: "2-digit",
              })}</span
            >
          </div>
          <div class="space-y-4">
            <h1
              class="text-4xl md:text-7xl font-black tracking-tighter leading-[0.9]"
            >
              Halo, <span
                class="bg-gradient-to-r from-emerald-400 to-emerald-200 bg-clip-text text-transparent italic"
                >{user.email?.split("@")[0]}.</span
              >
            </h1>
            <p
              class="text-lg text-emerald-50/70 font-medium max-w-xl mx-auto lg:mx-0"
            >
              Mari pantau perkembangan lahan dan pengelola dalam satu antarmuka
              yang terpadu.
            </p>
          </div>
        </div>

        <!-- Right Column: Stats Sub-Grid -->
        <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
          <!-- Stat 1: Petani -->
          <div
            class="group relative p-6 bg-white/10 border border-white/10 rounded-[2.5rem] hover:bg-white/20 hover:-translate-y-1 hover:shadow-2xl hover:border-white/20 transition-all duration-300 overflow-hidden active:scale-95"
          >
            <div
              class="absolute -right-4 -bottom-4 text-emerald-400/20 group-hover:text-emerald-400/30 transition-colors"
            >
              <Users size={100} strokeWidth={1} />
            </div>
            <p
              class="text-[9px] font-black text-emerald-200/40 uppercase tracking-[0.2em] mb-1"
            >
              Petani
            </p>
            {#if statsLoading}
              <div class="h-8 bg-white/10 animate-pulse rounded-lg w-12"></div>
            {:else}
              <p class="text-2xl font-black">{totalPetani}</p>
            {/if}
          </div>

          <!-- Stat 2: Lahan -->
          <div
            class="group relative p-6 bg-white/10 border border-white/10 rounded-[2.5rem] hover:bg-white/20 hover:-translate-y-1 hover:shadow-2xl hover:border-white/20 transition-all duration-300 overflow-hidden active:scale-95"
          >
            <div
              class="absolute -right-4 -bottom-4 text-blue-400/20 group-hover:text-blue-400/30 transition-colors"
            >
              <LandPlot size={100} strokeWidth={1} />
            </div>
            <p
              class="text-[9px] font-black text-emerald-200/40 uppercase tracking-[0.2em] mb-1"
            >
              Demoplot
            </p>
            {#if statsLoading}
              <div class="h-8 bg-white/10 animate-pulse rounded-lg w-12"></div>
            {:else}
              <p class="text-2xl font-black">{totalLahan}</p>
            {/if}
          </div>
          <!-- Stat 3: Tanaman -->
          <div
            class="group relative p-6 bg-white/10 border border-white/10 rounded-[2.5rem] hover:bg-white/20 hover:-translate-y-1 hover:shadow-2xl hover:border-white/20 transition-all duration-300 overflow-hidden active:scale-95"
          >
            <div
              class="absolute -right-4 -bottom-4 text-amber-400/20 group-hover:text-amber-400/30 transition-colors"
            >
              <Sprout size={100} strokeWidth={1} />
            </div>
            <p
              class="text-[9px] font-black text-emerald-200/40 uppercase tracking-[0.2em] mb-1"
            >
              Populasi
            </p>
            {#if statsLoading}
              <div class="h-8 bg-white/10 animate-pulse rounded-lg w-12"></div>
            {:else}
              <p class="text-2xl font-black">{totalTanaman}</p>
            {/if}
          </div>

          <!-- Stat 4: HPG -->
          <div
            class="group relative p-6 bg-white/10 border border-white/10 rounded-[2.5rem] hover:bg-white/20 hover:-translate-y-1 hover:shadow-2xl hover:border-white/20 transition-all duration-300 overflow-hidden active:scale-95"
          >
            <div
              class="absolute -right-4 -bottom-4 text-rose-500/25 group-hover:text-rose-500/40 transition-colors"
            >
              <Bug size={100} strokeWidth={1} />
            </div>
            <p
              class="text-[9px] font-black text-emerald-200/40 uppercase tracking-[0.2em] mb-1"
            >
              Kasus HPG
            </p>
            {#if statsLoading}
              <div class="h-8 bg-white/10 animate-pulse rounded-lg w-12"></div>
            {:else}
              <p class="text-2xl font-black">{totalHpg}</p>
            {/if}
          </div>

          <!-- Stat 5: Aktivitas -->
          <div
            class="group relative p-6 bg-white/10 border border-white/10 rounded-[2.5rem] hover:bg-white/20 hover:-translate-y-1 hover:shadow-2xl hover:border-white/20 transition-all duration-300 overflow-hidden active:scale-95"
          >
            <div
              class="absolute -right-4 -bottom-4 text-purple-400/20 group-hover:text-purple-400/30 transition-colors"
            >
              <ClipboardClock size={100} strokeWidth={1} />
            </div>
            <p
              class="text-[9px] font-black text-emerald-200/40 uppercase tracking-[0.2em] mb-1"
            >
              Aktivitas
            </p>
            {#if statsLoading}
              <div class="h-8 bg-white/10 animate-pulse rounded-lg w-12"></div>
            {:else}
              <p class="text-2xl font-black">{totalAktifitas}</p>
            {/if}
          </div>

          <!-- Stat 6: Produktivitas -->
          <div
            class="group relative p-6 bg-white/10 border border-white/10 rounded-[2.5rem] hover:bg-white/20 hover:-translate-y-1 hover:shadow-2xl hover:border-white/20 transition-all duration-300 overflow-hidden active:scale-95"
          >
            <div
              class="absolute -right-4 -bottom-4 text-blue-400/20 group-hover:text-blue-400/30 transition-colors"
            >
              <BarChart3 size={100} strokeWidth={1} />
            </div>
            <p
              class="text-[9px] font-black text-emerald-200/40 uppercase tracking-[0.2em] mb-1"
            >
              Catatan Prod.
            </p>
            {#if statsLoading}
              <div class="h-8 bg-white/10 animate-pulse rounded-lg w-12"></div>
            {:else}
              <p class="text-2xl font-black">{totalProduktivitas}</p>
            {/if}
          </div>
        </div>
      </div>
    </section>

    <!-- Grid Menu -->
    <section class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {#each menuItems as item, i}
        <div
          class="group relative bg-card/60 backdrop-blur-3xl border border-border shadow-2xl shadow-black/5 rounded-[2.5rem] overflow-hidden p-3 transition-all duration-500 hover:border-emerald-500/50 hover:-translate-y-2"
          in:fly={{ y: 20, delay: 100 * i, easing: backOut }}
        >
          <div
            class="relative aspect-[16/10] overflow-hidden rounded-[2rem] mb-6"
          >
            <img
              src={item.img}
              alt={item.name}
              class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            />
            <div
              class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60"
            ></div>

            <!-- Category Icon Overlay -->
            <div
              class="absolute bottom-4 left-4 p-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 text-white shadow-xl translate-y-2 group-hover:translate-y-0 transition-transform"
            >
              <svelte:component this={item.icon} size={20} />
            </div>
          </div>

          <div class="px-5 pb-5 space-y-4">
            <div>
              <h3
                class="text-xl font-black text-foreground uppercase tracking-tight mb-1"
              >
                {item.name}
              </h3>
              <p class="text-sm text-muted-foreground font-medium">
                {item.desc}
              </p>
            </div>

            {#if item.active}
              <a
                href={item.href}
                class="w-full h-12 inline-flex items-center justify-center bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl transition-all shadow-lg shadow-emerald-600/20 active:scale-95"
              >
                <span
                  class="text-[10px] font-black uppercase tracking-widest flex items-center gap-2"
                >
                  Buka Modul <ArrowRight size={14} />
                </span>
              </a>
            {:else}
              <div
                class="w-full h-12 inline-flex items-center justify-center bg-muted text-muted-foreground font-black uppercase tracking-widest text-[10px] rounded-2xl cursor-not-allowed"
              >
                Segera Hadir
              </div>
            {/if}
          </div>
        </div>
      {/each}
    </section>
  </div>
{/if}
