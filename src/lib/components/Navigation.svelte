<script lang="ts">
  import { auth } from "$lib/supabase/auth";
  import { browser } from "$app/environment";
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { page } from "$app/stores";
  import type { User } from "@supabase/supabase-js";
  import {
    LogIn,
    LogOut,
    Menu,
    ChevronLeft,
    User as UserIcon,
    Settings,
    Bell,
    AlertCircle,
  } from "@lucide/svelte";
  import { fade, fly, scale } from "svelte/transition";

  interface Props {
    isSidebarOpen?: boolean;
    mobileMenuOpen?: boolean;
    toggleSidebar?: () => void;
  }

  let {
    isSidebarOpen = true,
    mobileMenuOpen = false,
    toggleSidebar,
  }: Props = $props();

  let user = $state<User | null>(null);
  let loading = $state(true);
  let scrolled = $state(false);
  let lastScrollY = $state(0);
  let hideNav = $state(false);
  let showDropdown = $state(false);
  let showLogoutConfirm = $state(false);
  let showNotifications = $state(false);

  onMount(() => {
    if (browser) {
      const unsub = auth.subscribe((authState) => {
        user = authState.user;
        loading = authState.loading;
      });

      const handleScroll = () => {
        const currentScrollY = window.scrollY;
        if (currentScrollY > lastScrollY && currentScrollY > 100) {
          hideNav = true;
          showDropdown = false;
          document.documentElement.style.setProperty("--nav-height", "0px");
        } else {
          hideNav = false;
          document.documentElement.style.setProperty("--nav-height", "5rem");
        }
        lastScrollY = currentScrollY;
        scrolled = currentScrollY > 20;
      };

      // Initialize nav height
      document.documentElement.style.setProperty("--nav-height", "5rem");


      const handleClickOutside = (event: MouseEvent) => {
        if (showDropdown) {
          const dropdown = document.querySelector(".dropdown-container");
          if (dropdown && !dropdown.contains(event.target as Node)) {
            showDropdown = false;
          }
        }
        if (showNotifications) {
          const notifContainer = document.querySelector(".notification-container");
          if (notifContainer && !notifContainer.contains(event.target as Node)) {
            showNotifications = false;
          }
        }
      };

      window.addEventListener("scroll", handleScroll, { passive: true });
      document.addEventListener("click", handleClickOutside);

      return () => {
        if (typeof unsub === "function") unsub();
        window.removeEventListener("scroll", handleScroll);
        document.removeEventListener("click", handleClickOutside);
      };
    }
  });

  const handleSignOut = async () => {
    try {
      await auth.signOut();
      if (browser) goto("/auth/login");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const initiateLogout = () => {
    showLogoutConfirm = true;
    showDropdown = false;
  };
</script>

<nav
  class="fixed top-0 left-0 right-0 z-[1000] px-6 h-20 flex items-center transition-all duration-500 ease-in-out border-b border-border/50
  {hideNav ? '-translate-y-full opacity-0' : 'translate-y-0 opacity-100'}
  {scrolled
    ? 'bg-background/80 backdrop-blur-xl shadow-[0_4px_20px_-10px_rgba(0,0,0,0.1)]'
    : 'bg-transparent border-transparent'}
  {isSidebarOpen ? 'md:pl-20' : 'md:pl-6'}"
>
  <div class="container mx-auto flex justify-between items-center group/nav">
    <div class="flex items-center gap-6">
      <!-- Sidebar Toggle (Desktop & Mobile) -->
      <button
        onclick={toggleSidebar}
        class="p-2.5 rounded-xl bg-card hover:bg-muted transition-all active:scale-95 group/toggle"
        aria-label="Toggle side navigation"
      >
        {#if isSidebarOpen}
          <ChevronLeft
            class="w-5 h-5 text-muted-foreground group-hover/toggle:text-emerald-600 transition-colors"
          />
        {:else}
          <Menu
            class="w-5 h-5 text-muted-foreground group-hover/toggle:text-emerald-600 transition-colors"
          />
        {/if}
      </button>

      <a href="/" class="flex items-center gap-2 group/logo">
        <span
          class="text-xl font-black tracking-tighter text-foreground group-hover:text-emerald-600 transition-colors"
        >
          AGRO<span class="text-emerald-600 dark:text-emerald-400"
            >DEMOPLOT</span
          >
        </span>
      </a>
    </div>

    <div class="flex items-center gap-3">
      {#if loading}
        <div class="w-20 h-8 bg-muted animate-pulse rounded-lg"></div>
      {:else if user}
        <!-- Notifications -->
        <div class="relative notification-container">
          <button
            onclick={() => {
              showNotifications = !showNotifications;
              showDropdown = false;
            }}
            class="hidden sm:flex p-2 rounded-xl hover:bg-muted text-muted-foreground transition-all relative active:scale-95"
            aria-label="Notifikasi"
          >
            <Bell class="w-5 h-5" />
            <span
              class="absolute top-2 right-2 w-2.5 h-2.5 bg-amber-500 border-2 border-background rounded-full animate-pulse"
            ></span>
          </button>

          {#if showNotifications}
            <div
              class="absolute right-0 mt-3 w-80 bg-card border border-border rounded-2xl shadow-2xl p-4 z-50 overflow-hidden space-y-4"
              in:fly={{ y: 10, duration: 200 }}
              out:fade={{ duration: 150 }}
            >
              <div class="flex items-center justify-between pb-2 border-b border-border/50">
                <span class="text-xs font-black uppercase tracking-wider text-foreground">Notifikasi</span>
                <span class="px-2 py-0.5 bg-amber-500/10 text-amber-600 text-[8px] font-black uppercase tracking-widest rounded-full">1 Baru</span>
              </div>

              <div class="space-y-3">
                <div class="p-3 bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-start gap-3">
                  <div class="p-2 bg-amber-500/20 text-amber-600 rounded-xl shrink-0">
                    <AlertCircle size={16} />
                  </div>
                  <div class="space-y-1">
                    <h4 class="text-xs font-black text-amber-800 dark:text-amber-300 uppercase tracking-wide">AI-Gronomis Nonaktif</h4>
                    <p class="text-[11px] text-muted-foreground leading-normal font-medium">
                      Fitur chat AI-Gronomis saat ini belum berfungsi sementara waktu karena masalah koneksi provider.
                    </p>
                    <span class="text-[8px] text-slate-400 font-bold block pt-1">Baru Saja</span>
                  </div>
                </div>
              </div>
            </div>
          {/if}
        </div>

        <!-- User Profile Dropdown -->
        <div class="relative dropdown-container">
          <button
            onclick={() => (showDropdown = !showDropdown)}
            class="flex items-center gap-3 p-1.5 pl-3 rounded-2xl bg-card border border-border/80 hover:border-emerald-500/50 hover:shadow-lg hover:shadow-emerald-500/5 transition-all"
          >
            <span
              class="hidden sm:block text-xs font-bold text-muted-foreground truncate max-w-[120px]"
            >
              {user.email?.split("@")[0]}
            </span>
            <div
              class="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 border border-emerald-500/20 overflow-hidden flex items-center justify-center"
            >
              {#if user.user_metadata?.avatar_url?.startsWith("/avatar/")}
                <img
                  src={user.user_metadata.avatar_url}
                  alt="User"
                  class="w-full h-full object-cover"
                />
              {:else}
                <span
                  class="text-emerald-700 dark:text-emerald-400 font-black text-sm uppercase"
                >
                  {user.email?.[0] || "U"}
                </span>
              {/if}
            </div>
          </button>

          {#if showDropdown}
            <div
              class="absolute right-0 mt-3 w-56 bg-card border border-border rounded-2xl shadow-2xl p-2 z-50 overflow-hidden"
              in:fly={{ y: 10, duration: 200 }}
              out:fade={{ duration: 150 }}
            >
              <div class="px-3 py-3 border-b border-border/50 mb-1">
                <p
                  class="text-xs font-bold text-muted-foreground uppercase tracking-widest leading-none mb-1"
                >
                  Akun Saya
                </p>
                <p class="text-sm font-semibold truncate leading-none">
                  {user.email}
                </p>
              </div>

              <a
                href="/profile"
                class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium hover:bg-emerald-50 dark:hover:bg-emerald-900/10 hover:text-emerald-600 transition-all"
                onclick={() => (showDropdown = false)}
              >
                <Settings class="w-4 h-4" />
                Pengaturan
              </a>

              <button
                onclick={initiateLogout}
                class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 transition-all mt-1"
              >
                <LogOut class="w-4 h-4" />
                Keluar Akun
              </button>
            </div>
          {/if}
        </div>
      {:else}
        <a
          href="/auth/login"
          class="flex items-center gap-2 bg-foreground text-background font-bold py-2.5 px-6 rounded-xl hover:opacity-90 transition-all shadow-lg shadow-black/10 active:scale-95"
        >
          <LogIn class="w-4 h-4" />
        </a>
      {/if}
    </div>
  </div>
</nav>

<!-- Logout Confirmation Modal -->
{#if showLogoutConfirm}
  <div
    class="fixed inset-0 bg-background/60 backdrop-blur-sm flex items-center justify-center z-[1100] p-6"
    onclick={() => (showLogoutConfirm = false)}
    in:fade={{ duration: 200 }}
  >
    <div
      class="bg-card w-full max-w-sm rounded-[2rem] border border-border shadow-2xl overflow-hidden"
      onclick={(e) => e.stopPropagation()}
      in:scale={{ start: 0.95, duration: 300 }}
    >
      <div class="p-8 text-center">
        <div
          class="w-20 h-20 bg-red-100 dark:bg-red-900/20 text-red-600 rounded-3xl flex items-center justify-center mx-auto mb-6"
        >
          <LogOut size={40} />
        </div>
        <h3 class="text-2xl font-black text-foreground mb-3 leading-tight">
          Konfirmasi Keluar
        </h3>
        <p class="text-muted-foreground">
          Apakah Anda yakin ingin mengakhiri sesi dashboard saat ini?
        </p>
      </div>

      <div class="flex flex-col gap-2 p-6 pt-0">
        <button
          onclick={handleSignOut}
          class="w-full py-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-2xl transition-all shadow-lg shadow-red-600/20 active:scale-[0.98]"
        >
          Ya, Keluar Sesi
        </button>
        <button
          onclick={() => (showLogoutConfirm = false)}
          class="w-full py-4 bg-muted hover:bg-muted/80 text-foreground font-bold rounded-2xl transition-all active:scale-[0.98]"
        >
          Batalkan
        </button>
      </div>
    </div>
  </div>
{/if}
