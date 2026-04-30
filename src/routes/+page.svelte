<script lang="ts">
  import { auth } from "$lib/supabase/auth";
  import { browser } from "$app/environment";
  import { onMount } from "svelte";
  import type { User } from "@supabase/supabase-js";
  import AIGronomist from "$lib/components/AIGronomist.svelte";
  import {
    BotMessageSquare,
    X,
    MapPin,
    Calendar,
    CloudSun,
    Sun,
    Cloud,
    CloudRain,
    CloudLightning,
    CloudFog,
    CloudSnow,
    Wind,
    ChevronRight,
    ArrowUpRight,
    Leaf,
    ShieldCheck,
    Cpu,
    Globe,
  } from "@lucide/svelte";
  import { fade, fly, scale } from "svelte/transition";

  import bg3dimg from "$lib/assets/images/3d.webp";
  import welcomeImg from "$lib/assets/images/device.webp";
  import { backOut } from "svelte/easing";

  let user = $state<User | null>(null);
  let showAIGronomistModal = $state(false);
  let userLocation = $state("");
  let userCoords = $state({ lat: "", lng: "" });
  let currentDate = $state("");
  let currentWeather = $state({
    temp: "",
    condition: "",
    icon: CloudSun,
  });

  let greeting = $derived.by(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 11) return "Pagi";
    if (hour >= 11 && hour < 15) return "Siang";
    if (hour >= 15 && hour < 18) return "Sore";
    return "Malam";
  });

  const getUserLocation = async () => {
    if (browser && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          userCoords = { lat: latitude.toFixed(4), lng: longitude.toFixed(4) };
          try {
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
            );
            const data = await response.json();
            userLocation =
              data.address.city ||
              data.address.town ||
              data.address.village ||
              data.address.county ||
              "Lokasi tidak diketahui";
          } catch (error) {
            userLocation = "Lokasi tidak diketahui";
          }
        },
        () => {
          userLocation = "Jakarta (Default)";
          userCoords = { lat: "-6.2000", lng: "106.8166" };
        },
      );
    }
  };

  const getCurrentDate = () => {
    if (browser) {
      const now = new Date();
      currentDate = now.toLocaleDateString("id-ID", {
        weekday: "short",
        day: "numeric",
        month: "short",
      });
    }
  };

  const weatherConditions: Record<number, { label: string; icon: any }> = {
    0: { label: "Cerah", icon: Sun },
    1: { label: "Cerah Berawan", icon: CloudSun },
    2: { label: "Berawan", icon: CloudSun },
    3: { label: "Mendung", icon: Cloud },
    45: { label: "Kabut", icon: CloudFog },
    48: { label: "Kabut Rime", icon: CloudFog },
    51: { label: "Gerimis Ringan", icon: CloudRain },
    53: { label: "Gerimis", icon: CloudRain },
    55: { label: "Gerimis Lebat", icon: CloudRain },
    61: { label: "Hujan Ringan", icon: CloudRain },
    63: { label: "Hujan", icon: CloudRain },
    65: { label: "Hujan Lebat", icon: CloudRain },
    71: { label: "Salju Ringan", icon: CloudSnow },
    73: { label: "Salju", icon: CloudSnow },
    75: { label: "Salju Lebat", icon: CloudSnow },
    80: { label: "Hujan Deras", icon: CloudRain },
    81: { label: "Hujan Sangat Deras", icon: CloudRain },
    82: { label: "Hujan Badai", icon: CloudLightning },
    95: { label: "Badai Petir", icon: CloudLightning },
  };

  const getWeather = async (lat = -6.2, lng = 106.8166) => {
    if (browser) {
      try {
        const response = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current_weather=true`,
        );
        if (!response.ok) throw new Error("Weather API error");
        const data = await response.json();
        const info = data.current_weather;

        currentWeather.temp = `${Math.round(info.temperature)}°C`;
        const condition = weatherConditions[info.weathercode] || {
          label: "Berawan",
          icon: CloudSun,
        };
        currentWeather.condition = condition.label;
        currentWeather.icon = condition.icon;
      } catch (error) {
        console.error("Error fetching weather:", error);
        currentWeather = {
          temp: "--",
          condition: "Gagal memuat",
          icon: CloudSun,
        };
      }
    }
  };

  // Trigger weather update when location is found
  $effect(() => {
    if (userCoords.lat && userCoords.lng) {
      getWeather(parseFloat(userCoords.lat), parseFloat(userCoords.lng));
    }
  });

  onMount(() => {
    if (browser) {
      auth.subscribe((authState) => {
        user = authState.user ?? null;
      });
      getCurrentDate();
      getUserLocation();
      getWeather();
    }
  });
</script>

<div
  class="relative flex-1 h-full overflow-hidden bg-background font-jakarta flex flex-col"
>
  <!-- Immersive Mesh Background -->
  <div class="absolute inset-0 z-0 pointer-events-none opacity-40">
    <div
      class="absolute -top-[10%] -left-[10%] w-[60%] h-[60%] bg-emerald-500/10 blur-[150px] rounded-full"
    ></div>
    <div
      class="absolute top-[20%] -right-[10%] w-[40%] h-[60%] bg-blue-500/10 blur-[120px] rounded-full"
    ></div>
    <div
      class="absolute -bottom-[10%] left-[20%] w-[50%] h-[50%] bg-emerald-600/5 blur-[120px] rounded-full"
    ></div>
  </div>

  <main class="relative z-10 flex-1 flex items-center">
    <div class="container mx-auto px-6 max-w-7xl">
      <!-- COMPACT GRID HERO -->
      <div
        class="grid grid-cols-1 lg:grid-cols-2 items-center gap-12 lg:gap-20"
      >
        <!-- Left Column -->
        <div class="flex flex-col space-y-8" in:fly={{ x: -20, duration: 800 }}>
          {#if user}
            <div class="space-y-6">
              <div class="space-y-2">
                <h1
                  class="text-4xl md:text-7xl font-black tracking-tighter leading-[0.9]"
                >
                  Selamat
                  <span
                    class="bg-gradient-to-r from-emerald-600 to-emerald-400 bg-clip-text text-transparent"
                    >{greeting}</span
                  >
                </h1>

                <div class="flex items-center gap-3">
                  <div
                    class="flex items-center gap-2 text-muted-foreground bg-white/5 backdrop-blur-md px-4 py-2 rounded-xl border border-border"
                  >
                    <MapPin size={14} class="text-emerald-500" />
                    <span class="text-xs font-bold uppercase tracking-tight"
                      >{userLocation || "Syncing..."}</span
                    >
                  </div>
                </div>
              </div>

              <!-- Compact HUD -->
              <div class="grid grid-cols-2 gap-4">
                <div
                  class="bg-card/40 backdrop-blur-2xl p-5 rounded-[2rem] border border-border shadow-xl flex items-center gap-4"
                >
                  <div
                    class="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0"
                  >
                    <Calendar size={18} />
                  </div>
                  <div>
                    <p
                      class="text-[8px] font-black text-muted-foreground uppercase tracking-widest mb-0.5"
                    >
                      Hari ini
                    </p>
                    <p
                      class="text-sm font-black text-foreground whitespace-nowrap"
                    >
                      {currentDate}
                    </p>
                  </div>
                </div>

                <div
                  class="bg-card/40 backdrop-blur-2xl p-5 rounded-[2rem] border border-border shadow-xl flex items-center gap-4"
                >
                  <div
                    class="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 shrink-0"
                  >
                    <svelte:component this={currentWeather.icon} size={18} />
                  </div>
                  <div>
                    <p
                      class="text-[8px] font-black text-muted-foreground uppercase tracking-widest mb-0.5"
                    >
                      Cuaca
                    </p>
                    <div class="flex items-center gap-2">
                      <p class="text-sm font-black text-foreground">
                        {currentWeather.temp}
                      </p>
                      <p
                        class="text-[9px] text-muted-foreground font-bold uppercase"
                      >
                        {currentWeather.condition}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          {:else}
            <div class="space-y-6">
              <h1
                class="text-5xl md:text-6xl font-black text-foreground leading-[0.95] tracking-tighter"
              >
                <span
                  class="bg-gradient-to-r from-emerald-600 to-emerald-400 bg-clip-text text-transparent"
                  >Dari Lahan Pertanian <br /></span
                >
                Ke Ekosistem Digital
              </h1>
              <p
                class="text-base text-muted-foreground leading-relaxed font-medium max-w-md"
              >
                Optimalkan ekosistem pertanian dengan platform manajemen kebun
                terpadu berbasis data presisi.
              </p>
            </div>
          {/if}

          <!-- Actions -->
          <div class="flex flex-col gap-4">
            <div class="flex items-center gap-4 pt-2">
              {#if user}
                <a
                  href="/dashboard"
                  class="group bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-widest text-sm py-4 px-8 rounded-2xl transition-all shadow-xl shadow-emerald-500/20 flex items-center gap-2"
                >
                  Dashboard <ChevronRight size={16} />
                </a>
              {:else}
                <a
                  href="/auth/login"
                  class="bg-foreground text-background font-black uppercase tracking-widest text-sm py-4 px-8 rounded-2xl hover:opacity-90 transition-all shadow-lg"
                >
                  Mulai Sekarang
                </a>
              {/if}
            </div>

            <!-- Legal Links -->
            <div class="flex items-center gap-6 opacity-30 mt-16">
              <a
                href="/legal/privacy-policy"
                class="text-[10px] font-black uppercase tracking-[0.2em] hover:text-emerald-600 hover:opacity-100 transition-all"
                >Kebijakan Privasi</a
              >
              <a
                href="/legal/terms-of-service"
                class="text-[10px] font-black uppercase tracking-[0.2em] hover:text-emerald-600 hover:opacity-100 transition-all"
                >Ketentuan Layanan</a
              >
              <a
                href="/faq"
                class="text-[10px] font-black uppercase tracking-[0.2em] hover:text-emerald-600 hover:opacity-100 transition-all"
                >F.A.Q</a
              >
            </div>

            <!-- Copyright & Version -->
            <div
              class="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground"
            >
              &copy; {new Date().getFullYear()} | Web App Versi 1.1
            </div>
          </div>
        </div>

        <!-- Right Column (Borderless Full View) -->
        <div
          class="hidden lg:flex items-center justify-center h-full w-full relative"
          in:scale={{ start: 0.9, duration: 1000, delay: 200 }}
        >
          <div
            class="absolute inset-0 bg-gradient-to-tr from-emerald-500/5 to-blue-500/5 blur-[120px] opacity-40"
          ></div>
          <img
            src={bg3dimg}
            alt="Hero Visual"
            class="w-full h-full object-contain max-h-[75vh] drop-shadow-2xl"
          />
        </div>
      </div>
    </div>
  </main>
</div>

<style>
  :global(:root) {
    --font-jakarta: "Plus Jakarta Sans", sans-serif;
  }

  :global(body) {
    font-family: var(--font-jakarta);
    -webkit-font-smoothing: antialiased;
  }

  .font-black {
    font-weight: 900;
  }
</style>
