<script lang="ts">
  import { auth } from "$lib/supabase/auth";
  import { supabase } from "$lib/supabase/client";
  import { browser } from "$app/environment";
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import type { User } from "@supabase/supabase-js";
  import {
    GraduationCap,
    BookOpen,
    FileText,
    Image as ImageIcon,
    Play,
    Search,
    Download,
    ExternalLink,
    ArrowLeft,
    Info,
    Sparkles,
    Filter,
    X,
    Maximize2,
    Calendar,
    BookMarked,
    ChevronLeft,
    ChevronRight,
  } from "@lucide/svelte";
  import { fade, fly, scale } from "svelte/transition";
  import { backOut } from "svelte/easing";

  // Type definitions for educational modules
  interface ModulEdukasi {
    id: number;
    kategori: 'Materi' | 'Panduan' | 'Poster' | 'Video';
    sumber: string;
    title: string;
    subtitle: string | null;
    image: string | null;
    file_url: string | null;
    created_at: string;
    updated_at: string;
  }

  // Auth & Page States
  let user = $state<User | null>(null);
  let loading = $state(true);
  let error = $state<string | null>(null);

  // Data States
  let modules = $state<ModulEdukasi[]>([]);
  let searchQuery = $state("");
  let activeTab = $state<"Semua" | "Materi" | "Panduan" | "Poster" | "Video">("Semua");

  // Lightbox States
  let selectedPoster = $state<string | null>(null);
  let selectedVideo = $state<{ url: string; title: string } | null>(null);

  // Load user auth and fetch database items
  onMount(() => {
    if (browser) {
      const unsub = auth.subscribe(async (authState) => {
        user = authState.user;
        if (!authState.loading && !authState.user) {
          goto("/auth/login");
          return;
        }
        
        if (authState.user) {
          await fetchModules();
        }
      });
      return () => {
        if (typeof unsub === "function") unsub();
      };
    }
  });

  async function fetchModules() {
    loading = true;
    error = null;
    try {
      const { data, error: dbError } = await supabase
        .from("modul_edukasi")
        .select("*")
        .order("created_at", { ascending: false });

      if (dbError) throw dbError;
      modules = data || [];
    } catch (e: any) {
      console.error("Gagal memuat modul edukasi:", e);
      error = e.message || "Gagal memuat modul edukasi dari database.";
    } finally {
      loading = false;
    }
  }

  // Derived filtered modules based on search and category filters
  let filteredModules = $derived.by(() => {
    let result = modules;
    
    // Category filtering
    if (activeTab !== "Semua") {
      result = result.filter(mod => mod.kategori === activeTab);
    }
    
    // Search query filtering
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(
        mod => 
          mod.title.toLowerCase().includes(query) || 
          (mod.subtitle && mod.subtitle.toLowerCase().includes(query)) ||
          mod.sumber.toLowerCase().includes(query)
      );
    }
    
    return result;
  });

  // Pagination state
  let pageIndex = $state(0);
  const pageSize = 6; // Shows 2 rows of 3 columns

  // Derived pagination values
  let totalPages = $derived(Math.ceil(filteredModules.length / pageSize));
  let paginatedModules = $derived(
    filteredModules.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize)
  );

  function canPreviousPage() {
    return pageIndex > 0;
  }
  function canNextPage() {
    return pageIndex < totalPages - 1;
  }
  function previousPage() {
    if (canPreviousPage()) pageIndex--;
  }
  function nextPage() {
    if (canNextPage()) pageIndex++;
  }

  // Reset to page 0 when activeTab or searchQuery changes
  $effect(() => {
    activeTab;
    searchQuery;
    pageIndex = 0;
  });

  // Get Lucide Icon dynamically based on Category
  function getCategoryIcon(kategori: string) {
    switch (kategori) {
      case "Materi": return BookOpen;
      case "Panduan": return FileText;
      case "Poster": return ImageIcon;
      case "Video": return Play;
      default: return BookMarked;
    }
  }

  // Get aesthetic Tailwind color classes for categories
  function getCategoryColor(kategori: string) {
    switch (kategori) {
      case "Materi":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "Panduan":
        return "bg-blue-500/10 text-blue-400 border-blue-500/20";
      case "Poster":
        return "bg-purple-500/10 text-purple-400 border-purple-500/20";
      case "Video":
        return "bg-rose-500/10 text-rose-400 border-rose-500/20";
      default:
        return "bg-slate-500/10 text-slate-400 border-slate-500/20";
    }
  }

  // Utility to handle video play or open action
  function handleVideoAction(url: string, title: string) {
    if (!url) return;
    
    // Detect youtube link
    const isYoutube = url.includes("youtube.com") || url.includes("youtu.be");
    if (isYoutube) {
      // Extract youtube video ID for embedding
      let embedId = "";
      const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
      const match = url.match(regExp);
      if (match && match[2].length === 11) {
        embedId = match[2];
        selectedVideo = {
          url: `https://www.youtube.com/embed/${embedId}?autoplay=1`,
          title
        };
        return;
      }
    }
    
    // Fallback: Open standard direct video file in full-screen iframe/html5 player or window tab
    if (url.endsWith(".mp4") || url.endsWith(".webm") || url.endsWith(".ogg")) {
      selectedVideo = { url, title };
    } else {
      window.open(url, "_blank");
    }
  }

  // Format date helper
  function formatDate(dateStr: string) {
    const d = new Date(dateStr);
    return d.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric"
    });
  }
</script>

<div class="min-h-screen pb-24 px-6 max-w-7xl mx-auto space-y-12">
  <!-- Top Navigation & Title Bar -->
  <div class="flex items-center justify-between mt-28 border-b border-border/40 pb-6" in:fly={{ y: -10, duration: 500 }}>
    <div class="flex items-center gap-4">
      <a
        href="/insight"
        class="p-3 rounded-2xl bg-card border border-border text-muted-foreground hover:text-foreground transition-all hover:border-emerald-500/30 active:scale-95 flex items-center justify-center shadow-sm"
        title="Kembali ke Insights"
      >
        <ArrowLeft size={20} />
      </a>
      <div>
        <div class="flex items-center gap-2 mb-1">
          <div class="p-1 rounded-lg bg-emerald-500/10 text-emerald-500">
            <GraduationCap size={16} />
          </div>
          <span class="text-[9px] font-black uppercase tracking-widest text-emerald-500">
            Insight & Edukasi
          </span>
        </div>
        <h1 class="text-3xl md:text-4xl font-black tracking-tight text-foreground uppercase">
          Modul Edukasi
        </h1>
      </div>
    </div>

    <!-- Sync Button -->
    <button
      onclick={fetchModules}
      class="px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-600/20 flex items-center gap-2"
    >
      <Sparkles size={14} /> Refresh Data
    </button>
  </div>

  <!-- Search and Tabs Filters Panel -->
  <div
    class="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2"
    in:fade={{ delay: 100 }}
  >
    <!-- Action Bar -->
    <div class="flex flex-wrap w-full items-center gap-3">
      <!-- Search Bar -->
      <div class="relative flex-1 w-full group">
        <Search
          size={18}
          class="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-emerald-500 transition-colors"
        />
        <input
          type="text"
          bind:value={searchQuery}
          placeholder="Cari judul, subjudul, atau sumber..."
          class="w-full bg-card/60 border border-border rounded-2xl pl-12 pr-12 py-3.5 text-sm font-medium focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500/50 transition-all"
        />
        {#if searchQuery}
          <button
            onclick={() => searchQuery = ""}
            class="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
          >
            <X size={14} />
          </button>
        {/if}
      </div>

      <!-- Category Filter Tabs inside a container pill -->
      <div
        class="flex flex-wrap items-center gap-2 bg-card border border-border rounded-2xl p-1.5"
      >
        {#each ["Semua", "Materi", "Panduan", "Poster", "Video"] as tab}
          <button
            onclick={() => activeTab = tab as any}
            class="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95
            {activeTab === tab
              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
              : 'hover:bg-muted text-muted-foreground'}"
          >
            <div class="flex items-center gap-2">
              {#if tab !== "Semua"}
                <svelte:component this={getCategoryIcon(tab)} size={12} />
              {/if}
              {tab}
            </div>
          </button>
        {/each}
      </div>
    </div>
  </div>

  <!-- Loading State (Shimmer skeleton) -->
  {#if loading}
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {#each Array(6) as _, i}
        <div class="bg-card/40 border border-border/50 rounded-[2.5rem] p-3 space-y-5 animate-pulse">
          <div class="w-full aspect-[16/10] bg-muted/65 rounded-[2rem]"></div>
          <div class="px-4 pb-4 space-y-3">
            <div class="h-4 bg-muted/70 rounded-md w-1/4"></div>
            <div class="h-6 bg-muted/80 rounded-md w-3/4"></div>
            <div class="h-4 bg-muted/50 rounded-md w-1/2"></div>
            <div class="h-10 bg-muted/60 rounded-xl w-full pt-2"></div>
          </div>
        </div>
      {/each}
    </div>

  <!-- Error Alert -->
  {:else if error}
    <div class="p-8 rounded-[2.5rem] bg-red-500/5 border border-red-500/20 flex flex-col items-center justify-center text-center gap-4 max-w-xl mx-auto" in:scale>
      <div class="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-500">
        <Info size={32} />
      </div>
      <div>
        <h3 class="text-lg font-black text-red-800 dark:text-red-300 uppercase tracking-tight mb-2">Terjadi Gangguan</h3>
        <p class="text-sm text-muted-foreground font-medium">{error}</p>
      </div>
      <button
        onclick={fetchModules}
        class="px-6 py-2.5 bg-red-600 hover:bg-red-700 active:scale-95 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
      >
        Coba Lagi
      </button>
    </div>

  <!-- Empty State -->
  {:else if filteredModules.length === 0}
    <div class="p-16 rounded-[3rem] bg-card/40 border border-border/50 flex flex-col items-center justify-center text-center gap-6 max-w-2xl mx-auto" in:scale>
      <div class="w-20 h-20 rounded-[2rem] bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 shadow-xl shadow-emerald-500/5 animate-pulse">
        <GraduationCap size={40} />
      </div>
      <div class="space-y-2">
        <h3 class="text-2xl font-black text-foreground uppercase tracking-tight">Belum Ada Modul</h3>
        <p class="text-sm text-muted-foreground font-medium max-w-md">
          {searchQuery 
            ? "Kami tidak menemukan modul edukasi yang cocok dengan kata pencarian Anda. Harap coba kata kunci lainnya." 
            : `Materi edukasi sekolah lapangan pertanian berkelanjutan untuk kategori "${activeTab}" belum tersedia saat ini.`}
        </p>
      </div>
      {#if searchQuery}
        <button
          onclick={() => searchQuery = ""}
          class="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
        >
          Bersihkan Pencarian
        </button>
      {/if}
    </div>

  <!-- Loaded Grid Grid Items -->
  {:else}
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {#each paginatedModules as item, i (item.id)}
        <div
          class="group relative bg-card/60 backdrop-blur-3xl border border-border shadow-2xl shadow-black/5 rounded-[2.5rem] overflow-hidden p-3 transition-all duration-500 hover:border-emerald-500/50 hover:-translate-y-2 flex flex-col"
          in:fly={{ y: 20, delay: 50 * i, easing: backOut }}
        >
          <!-- Card Thumbnail Overlay Area -->
          <div class="relative aspect-[16/10] overflow-hidden rounded-[2rem] mb-5 shrink-0 bg-slate-900 border border-border/40">
            {#if item.image}
              <img
                src={item.image}
                alt={item.title}
                class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-115"
              />
            {:else}
              <!-- Artistic Premium SVG Placeholder for Modul Missing Cover Images -->
              <div class="w-full h-full bg-gradient-to-br from-slate-900 via-emerald-950/40 to-slate-950 flex items-center justify-center relative p-6">
                <div class="absolute inset-0 opacity-10 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:16px_16px]"></div>
                
                <!-- Category Icon as dynamic overlay -->
                <div class="w-16 h-16 rounded-[1.25rem] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shadow-inner relative group-hover:scale-110 transition-transform duration-500">
                  <div class="absolute inset-0 bg-emerald-500/5 rounded-2xl animate-ping opacity-30"></div>
                  <svelte:component this={getCategoryIcon(item.kategori)} size={28} />
                </div>
              </div>
            {/if}
            <div class="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent opacity-70"></div>

            <!-- Dynamic Category Tag -->
            <div class="absolute top-4 left-4 flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border shadow-xl backdrop-blur-md text-[9px] font-black uppercase tracking-wider {getCategoryColor(item.kategori)}">
              <svelte:component this={getCategoryIcon(item.kategori)} size={10} />
              {item.kategori}
            </div>

            <!-- Date Tag -->
            <div class="absolute bottom-4 right-4 flex items-center gap-1 text-white/60 text-[9px] font-bold">
              <Calendar size={10} />
              {formatDate(item.created_at)}
            </div>
          </div>

          <!-- Card Content Body -->
          <div class="px-4 pb-4 space-y-4 flex-1 flex flex-col justify-between">
            <div class="space-y-2">
              <!-- Author / Source Pill -->
              <div class="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 flex items-center gap-1">
                <span>Sumber:</span>
                <span class="text-emerald-500 bg-emerald-500/5 px-2 py-0.5 border border-emerald-500/10 rounded-md">
                  {item.sumber || "Agrodemoplot"}
                </span>
              </div>

              <!-- Title & Description -->
              <h3 class="text-lg font-black text-foreground uppercase tracking-tight leading-tight group-hover:text-emerald-500 transition-colors line-clamp-2">
                {item.title}
              </h3>
              {#if item.subtitle}
                <p class="text-xs text-muted-foreground font-medium leading-relaxed line-clamp-2">
                  {item.subtitle}
                </p>
              {/if}
            </div>

            <!-- Card Bottom Action Button Grid -->
            <div class="pt-2">
              {#if item.kategori === "Video"}
                <button
                  onclick={() => handleVideoAction(item.file_url || "", item.title)}
                  disabled={!item.file_url}
                  class="w-full h-11 inline-flex items-center justify-center bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed text-white border border-rose-500 rounded-xl overflow-hidden transition-all duration-300 shadow-md shadow-rose-600/10 hover:shadow-lg active:scale-[0.98]"
                >
                  <span class="text-[9px] font-black uppercase tracking-widest flex items-center gap-2">
                    Putar Video <Play size={12} class="fill-white" />
                  </span>
                </button>
              {:else if item.kategori === "Poster" && item.file_url}
                <div class="grid grid-cols-2 gap-2">
                  <button
                    onclick={() => selectedPoster = item.file_url}
                    class="h-11 inline-flex items-center justify-center bg-purple-600 hover:bg-purple-700 text-white border border-purple-500 rounded-xl overflow-hidden transition-all duration-300 shadow-md shadow-purple-600/10 hover:shadow-lg active:scale-[0.98]"
                  >
                    <span class="text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5">
                      Lihat Poster <Maximize2 size={12} />
                    </span>
                  </button>
                  <a
                    href={item.file_url}
                    target="_blank"
                    class="h-11 inline-flex items-center justify-center bg-card hover:bg-card-hover border border-border text-muted-foreground hover:text-foreground rounded-xl overflow-hidden transition-all duration-300 shadow-sm active:scale-[0.98]"
                  >
                    <span class="text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5">
                      Buka Link <ExternalLink size={11} />
                    </span>
                  </a>
                </div>
              {:else if item.file_url}
                <div class="grid grid-cols-2 gap-2">
                  <a
                    href={item.file_url}
                    download
                    target="_blank"
                    class="h-11 inline-flex items-center justify-center bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-500 rounded-xl overflow-hidden transition-all duration-300 shadow-md shadow-emerald-600/10 hover:shadow-lg active:scale-[0.98]"
                  >
                    <span class="text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5">
                      Unduh <Download size={12} />
                    </span>
                  </a>
                  <a
                    href={item.file_url}
                    target="_blank"
                    class="h-11 inline-flex items-center justify-center bg-card hover:bg-card-hover border border-border text-muted-foreground hover:text-foreground rounded-xl overflow-hidden transition-all duration-300 shadow-sm active:scale-[0.98]"
                  >
                    <span class="text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5">
                      Buka <ExternalLink size={11} />
                    </span>
                  </a>
                </div>
              {:else}
                <div class="w-full h-11 inline-flex items-center justify-center bg-muted/40 border border-border/80 text-muted-foreground/50 rounded-xl text-[9px] font-black uppercase tracking-widest select-none">
                  Materi Segera Hadir
                </div>
              {/if}
            </div>
          </div>
        </div>
      {/each}
    </div>

    <!-- Pagination -->
    {#if totalPages > 1}
      <div class="pt-12 flex items-center justify-between border-t border-border/40">
        <div
          class="text-[10px] font-black uppercase tracking-widest text-muted-foreground"
        >
          Halaman <span class="text-foreground">{pageIndex + 1}</span> dari {totalPages}
        </div>
        <div class="flex gap-2">
          <button
            onclick={previousPage}
            disabled={!canPreviousPage()}
            class="p-3 bg-card border border-border rounded-xl disabled:opacity-30 hover:bg-muted transition-all text-foreground active:scale-95 flex items-center justify-center"
            title="Halaman Sebelumnya"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onclick={nextPage}
            disabled={!canNextPage()}
            class="p-3 bg-card border border-border rounded-xl disabled:opacity-30 hover:bg-muted transition-all text-foreground active:scale-95 flex items-center justify-center"
            title="Halaman Berikutnya"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>
    {/if}
  {/if}
</div>

<!-- ========================================== -->
<!-- LIGHTBOX & DIALOG POPUPS -->
<!-- ========================================== -->

<!-- Poster Image Lightbox Viewer -->
{#if selectedPoster}
  <div
    class="fixed inset-0 bg-black/95 backdrop-blur-md z-[5000] flex items-center justify-center p-4 overflow-hidden"
    onclick={() => selectedPoster = null}
    in:fade={{ duration: 250 }}
    out:fade={{ duration: 200 }}
  >
    <!-- Close Button -->
    <button
      onclick={() => selectedPoster = null}
      class="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 border border-white/10 text-white rounded-full transition-all active:scale-95"
      title="Tutup Viewer"
    >
      <X size={24} />
    </button>

    <!-- Poster Content Container -->
    <div
      class="max-w-full max-h-[85vh] flex flex-col items-center justify-center relative select-none rounded-[2rem] overflow-hidden border border-white/10"
      onclick={(e) => e.stopPropagation()}
      in:scale={{ duration: 300, easing: backOut }}
    >
      <img
        src={selectedPoster}
        alt="Poster Viewer"
        class="max-w-full max-h-[80vh] object-contain shadow-2xl"
      />
      <!-- Dynamic Helper overlay text -->
      <div class="w-full bg-slate-950/80 p-4 border-t border-white/5 text-center">
        <a
          href={selectedPoster}
          target="_blank"
          download
          class="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
        >
          <Download size={12} /> Unduh Poster Kualitas Tinggi
        </a>
      </div>
    </div>
  </div>
{/if}

<!-- Video Embed Lightbox Player -->
{#if selectedVideo}
  <div
    class="fixed inset-0 bg-black/95 backdrop-blur-md z-[5000] flex items-center justify-center p-4"
    onclick={() => selectedVideo = null}
    in:fade={{ duration: 250 }}
    out:fade={{ duration: 200 }}
  >
    <!-- Close Button -->
    <button
      onclick={() => selectedVideo = null}
      class="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 border border-white/10 text-white rounded-full transition-all active:scale-95"
      title="Tutup Pemutar Video"
    >
      <X size={24} />
    </button>

    <!-- Video Container -->
    <div
      class="w-full max-w-4xl aspect-video bg-black rounded-[2.5rem] overflow-hidden border border-white/10 shadow-2xl flex flex-col"
      onclick={(e) => e.stopPropagation()}
      in:scale={{ duration: 300, easing: backOut }}
    >
      <!-- Embed or Native HTML5 Video -->
      {#if selectedVideo.url.includes("youtube.com/embed/")}
        <iframe
          src={selectedVideo.url}
          title={selectedVideo.title}
          class="w-full h-full border-none"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowfullscreen
        ></iframe>
      {:else}
        <!-- Native video player -->
        <!-- svelte-ignore a11y_media_has_caption -->
        <video
          src={selectedVideo.url}
          class="w-full h-full"
          controls
          autoplay
        ></video>
      {/if}
    </div>
  </div>
{/if}
