<script lang="ts">
  import { browser } from "$app/environment";
  import { page } from "$app/stores";
  import {
    LayoutDashboard,
    Map,
    Lightbulb,
    FileText,
    CircleHelp,
    Tractor,
    ChevronRight,
    BotMessageSquare,
    Leaf,
    Activity,
    History,
    Users,
    Sprout,
    LandPlot,
  } from "@lucide/svelte";

  import { fade, fly, scale } from "svelte/transition";
  import { spring } from "svelte/motion";

  import { auth } from "$lib/supabase/auth";
  import { onMount } from "svelte";
  import type { User } from "@supabase/supabase-js";

  interface Props {
    mobileMode: boolean;
    sidebarOpen?: boolean;
    mobileMenuOpen?: boolean;
    onAIAction?: () => void;
  }

  let {
    mobileMode = false,
    sidebarOpen = true,
    mobileMenuOpen = false,
    onAIAction,
  }: Props = $props();

  let user = $state<User | null>(null);

  onMount(() => {
    const unsub = auth.subscribe((state) => {
      user = state.user;
    });
    return unsub;
  });

  const menuItems = $derived([
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Peta", href: "/map", icon: Map },
    { name: "Analitik", href: "/insight", icon: Lightbulb },
    { name: "Laporan", href: "/report", icon: FileText },
    { name: "AI-Gronomis", href: "#", icon: BotMessageSquare, type: "action" },
  ]);

  let currentPath = $derived($page.url.pathname);
</script>

<!-- Desktop Sidebar -->
{#if !mobileMode}
  <aside
    id="sidebar"
    class="fixed left-0 top-0 h-screen z-[990] transition-all duration-500 ease-in-out border-r border-border/50 bg-background/80 backdrop-blur-xl
    {sidebarOpen
      ? 'w-20 opacity-100 translate-x-0'
      : 'w-0 opacity-0 -translate-x-full overflow-hidden'}"
  >
    <div class="flex flex-col items-center h-full py-24 gap-8">
      <nav class="flex-1">
        <ul class="flex flex-col items-center gap-4">
          {#each menuItems as item (item.name)}
            {@const isActive = currentPath.startsWith(item.href)}
            <li class="relative group">
              {#if item.type === "action"}
                <button
                  onclick={(e) => {
                    e.preventDefault();
                    onAIAction?.();
                  }}
                  class="relative flex items-center justify-center w-12 h-12 rounded-2xl transition-all duration-300 text-muted-foreground hover:bg-emerald-500/10 hover:text-emerald-600 hover:scale-105"
                >
                  <svelte:component
                    this={item.icon}
                    size={22}
                    strokeWidth={2}
                  />
                </button>
              {:else}
                <a
                  href={item.href}
                  class="relative flex items-center justify-center w-12 h-12 rounded-2xl transition-all duration-300
                  {isActive
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/30 scale-110'
                    : 'text-muted-foreground hover:bg-emerald-500/10 hover:text-emerald-600 hover:scale-105'}"
                >
                  <svelte:component
                    this={item.icon}
                    size={22}
                    strokeWidth={isActive ? 2.5 : 2}
                  />
                </a>
              {/if}

              <!-- Tooltip -->
              <div
                class="absolute left-full ml-4 px-3 py-1.5 bg-foreground text-background text-[10px] font-black uppercase tracking-widest rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 group-hover:translate-x-0 -translate-x-2 transition-all duration-200 whitespace-nowrap z-50 shadow-xl"
              >
                {item.name}
                <div
                  class="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-foreground rotate-45"
                ></div>
              </div>

              {#if isActive}
                <div
                  class="absolute -left-4 top-1/2 -translate-y-1/2 w-1.5 h-8 bg-emerald-500 rounded-r-full shadow-[4px_0_12px_rgba(16,185,129,0.4)]"
                  in:fade={{ duration: 200 }}
                ></div>
              {/if}
            </li>
          {/each}
        </ul>
      </nav>

      <!-- Bottom Decorative -->
      <div class="mt-auto pb-8">
        <div
          class="w-1.5 h-1.5 rounded-full bg-emerald-500/40 animate-pulse"
        ></div>
      </div>
    </div>
  </aside>
{/if}

<!-- Mobile Floating Dock -->
{#if mobileMode}
  <nav
    class="fixed bottom-6 left-1/2 -translate-x-1/2 z-[1001] w-[90%] max-w-sm transition-all duration-500
    {mobileMenuOpen ? 'translate-y-0 opacity-100' : 'translate-y-24 opacity-0'}"
  >
    <ul
      class="flex items-center justify-between p-2.5 bg-card/90 backdrop-blur-2xl border border-border/80 shadow-2xl rounded-[2rem]"
    >
      {#each menuItems as item (item.name)}
        {@const isActive = currentPath.startsWith(item.href)}
        <li class="flex-1">
          {#if item.type === "action"}
            <button
              onclick={(e) => {
                e.preventDefault();
                onAIAction?.();
              }}
              class="flex flex-col items-center justify-center py-2.5 rounded-[1.5rem] transition-all duration-300 relative text-muted-foreground hover:text-emerald-500 w-full"
            >
              <svelte:component
                this={item.icon}
                size={20}
                strokeWidth={2}
                class="relative z-10"
              />
              <span
                class="text-[9px] font-black uppercase tracking-tighter mt-1 relative z-10"
                >{item.name}</span
              >
            </button>
          {:else}
            <a
              href={item.href}
              class="flex flex-col items-center justify-center py-2.5 rounded-[1.5rem] transition-all duration-300 relative
              {isActive
                ? 'text-emerald-600'
                : 'text-muted-foreground hover:text-emerald-500'}"
            >
              {#if isActive}
                <div
                  in:scale={{ duration: 300, start: 0.8 }}
                  class="absolute inset-0 bg-emerald-500/10 rounded-[1.5rem]"
                ></div>
                <div
                  in:fly={{ y: 4, duration: 400 }}
                  class="absolute -bottom-1 w-1 h-1 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.8)]"
                ></div>
              {/if}
              <svelte:component
                this={item.icon}
                size={20}
                strokeWidth={isActive ? 2.5 : 2}
                class="relative z-10"
              />
              <span
                class="text-[9px] font-black uppercase tracking-tighter mt-1 relative z-10"
                >{item.name}</span
              >
            </a>
          {/if}
        </li>
      {/each}
    </ul>
  </nav>
{/if}

<style>
  /* Ensuring tooltips and overlays don't break the high-end feel */
  :global(.backdrop-blur-2xl) {
    backdrop-filter: blur(40px) saturate(150%);
  }
</style>
