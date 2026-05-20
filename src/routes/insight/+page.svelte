<script lang="ts">
  import { auth } from "$lib/supabase/auth";
  import { browser } from "$app/environment";
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import type { User } from "@supabase/supabase-js";
  import {
    BotMessageSquare,
    X,
    Map,
    Trees,
    GraduationCap,
    FileChartPie,
    Lightbulb,
    Sparkles,
    PackageOpen,
    BrainCircuit,
    Microscope,
    Compass,
    Earth,
    Footprints,
    Mountain,
    ArrowRight,
  } from "@lucide/svelte";
  import { fade, fly, scale } from "svelte/transition";
  import { backOut } from "svelte/easing";

  import menu1Img from "$lib/assets/images/kesesuaian.jpg";
  import menu2Img from "$lib/assets/images/sekolah.jpg";
  import menu3Img from "$lib/assets/images/rekomendasi.jpg";
  import menu4Img from "$lib/assets/images/carbon.jpg";
  import menu5Img from "$lib/assets/images/soil.jpg";
  import menu6Img from "$lib/assets/images/produktifitas.jpg";
  let user = $state<User | null>(null);
  let loading = $state(true);

  // Check authentication status on component mount
  onMount(() => {
    if (browser) {
      const unsub = auth.subscribe((authState) => {
        user = authState.user;
        loading = authState.loading;
        if (!authState.loading && !authState.user) goto("/auth/login");
      });
      return () => {
        if (typeof unsub === "function") unsub();
      };
    }
  });

  const insightItems = [
    {
      name: "Modul Edukasi",
      desc: "Materi sekolah lapangan & pelatihan pertanian berkelanjutan.",
      icon: GraduationCap,
      img: menu2Img,
      active: true,
      href: "/insight/modul_edukasi",
    },
    {
      name: "Tanah & Iklim",
      desc: "Informasi tanah & iklim berdasarkan sumber data terbuka ",
      icon: Mountain,
      img: menu5Img,
      active: true,
      href: "/insight/tanah-iklim",
    },
    {
      name: "Kesehatan Tanaman",
      desc: "Analisis kesehatan tanaman berdasarkan data geospasial.",
      icon: Trees,
      img: menu1Img,
      active: false,
    },

    {
      name: "Produktivitas",
      desc: "Analisis produktivitas kebun & efisiensi pengelolaan lahan.",
      icon: Lightbulb,
      img: menu6Img,
      active: false,
    },
    {
      name: "Jejak Karbon",
      desc: "Hitung emisi karbon pada lahan berdasarkan aktivitas kebun.",
      icon: Footprints,
      img: menu4Img,
      active: false,
    },
    {
      name: "Rekomendasi Teknis",
      desc: "Saran praktik budidaya terbaik dari ahli agronomis/akademisi.",
      icon: Lightbulb,
      img: menu3Img,
      active: false,
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
      Memuat Analisis
    </p>
  </div>
{:else if user}
  <div class="min-h-screen pb-24 px-6 max-w-7xl mx-auto space-y-12">
    <!-- Insight Hero -->
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
        class="relative z-10 p-10 md:p-16 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center"
      >
        <!-- Left Column: Branding -->
        <div class="space-y-6 text-center lg:text-left">
          <div
            class="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full border border-white/10 text-[10px] font-black text-blue-100 uppercase tracking-widest"
          >
            <Lightbulb size={12} class="text-blue-400" /> Analitik
          </div>
          <div class="space-y-4">
            <h1
              class="text-4xl md:text-7xl font-black tracking-tighter leading-[0.9]"
            >
              Deep <span class="text-blue-400">Insights</span>
            </h1>
            <p
              class="text-lg text-blue-50/70 font-medium max-w-xl mx-auto lg:mx-0"
            >
              Gunakan kekuatan data untuk mengoptimalkan potensi produktivitas
              dan efisiensi lahan.
            </p>
          </div>
        </div>

        <!-- Right Column: Visual Icon & Stats -->
        <div
          class="relative flex items-center justify-center lg:justify-end"
          in:scale={{ delay: 400 }}
        >
          <!-- Large Decorative Background Icon -->
          <div
            class="absolute lg:-right-12 text-blue-400/10 group-hover:text-blue-400/20 transition-all duration-700 blur-[1px]"
          >
            <Sparkles size={300} strokeWidth={1} />
          </div>
        </div>
      </div>
    </section>

    <!-- Grid Menu -->
    <section class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {#each insightItems as item, i}
        <div
          class="group relative bg-card/60 backdrop-blur-3xl border border-border shadow-2xl shadow-black/5 rounded-[2.5rem] overflow-hidden p-3 transition-all duration-500 hover:border-blue-500/50 hover:-translate-y-2"
          in:fly={{ y: 20, delay: 100 * i, easing: backOut }}
        >
          <div
            class="relative aspect-[16/10] overflow-hidden rounded-[2rem] mb-6 transition-all duration-700 {item.active
              ? 'grayscale-0'
              : 'grayscale group-hover:grayscale-0'}"
          >
            <img
              src={item.img}
              alt={item.name}
              class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            />
            <div
              class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60"
            ></div>

            <!-- Category Icon Overlay -->
            <div
              class="absolute bottom-4 left-4 p-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 text-white shadow-xl translate-y-2 group-hover:translate-y-0 transition-transform"
            >
              <svelte:component this={item.icon} size={20} />
            </div>

            <!-- Status Badge -->
            {#if !item.active}
              <div
                class="absolute top-4 right-4 px-3 py-1 bg-blue-500/20 backdrop-blur-md text-[8px] font-black text-blue-400 uppercase tracking-widest border border-blue-500/30 rounded-full"
              >
                Coming Soon
              </div>
            {:else}
              <div
                class="absolute top-4 right-4 px-3 py-1 bg-emerald-500/20 backdrop-blur-md text-[8px] font-black text-emerald-400 uppercase tracking-widest border border-emerald-500/30 rounded-full"
              >
                Tersedia
              </div>
            {/if}
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

            {#if item.active && item.href}
              <a
                href={item.href}
                class="relative w-full h-12 inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white border border-blue-500 rounded-2xl overflow-hidden transition-colors shadow-lg shadow-blue-600/20"
              >
                <span
                  class="text-[10px] font-black uppercase tracking-widest flex items-center gap-2"
                >
                  {item.name === "Modul Edukasi"
                    ? "Buka Modul"
                    : "Buka Analisis"}
                  <ArrowRight size={14} />
                </span>
              </a>
            {:else}
              <div
                class="relative w-full h-12 inline-flex items-center justify-center bg-muted/50 border border-border rounded-2xl overflow-hidden"
              >
                <div
                  class="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_2s_infinite]"
                ></div>
                <span
                  class="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 flex items-center gap-2"
                >
                  <Sparkles size={12} /> Dalam Pengembangan
                </span>
              </div>
            {/if}
          </div>
        </div>
      {/each}
    </section>
  </div>
{/if}

<style>
  @keyframes shimmer {
    100% {
      transform: translateX(100%);
    }
  }
</style>
