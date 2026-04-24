<script lang="ts">
  import { auth } from "$lib/supabase/auth";
  import { goto } from "$app/navigation";
  import { onMount, tick } from "svelte";
  import { browser } from "$app/environment";
  import { page } from "$app/stores";
  import type { User } from "@supabase/supabase-js";
  import {
    Mail,
    Lock,
    Eye,
    EyeOff,
    LogIn,
    Sparkles,
    AlertCircle,
    CheckCircle2,
    AlertTriangle,
    X,
  } from "@lucide/svelte";
  import { fade, fly, scale } from "svelte/transition";

  let email = $state("");
  let password = $state("");
  let showPassword = $state(false);
  let loading = $state(false);
  let error = $state("");
  let user = $state<User | null>(null);
  let showRegistrationSuccess = $state(false);

  onMount(() => {
    if (browser) {
      const searchParams = new URLSearchParams($page.url.search);
      showRegistrationSuccess = searchParams.get("registered") === "true";

      const unsub = auth.subscribe((authState) => {
        user = authState.user;
        if (authState.user) goto("/dashboard");
      });
      return () => {
        if (typeof unsub === "function") unsub();
      };
    }
  });

  const handleLogin = async (e: Event) => {
    e.preventDefault();
    loading = true;
    error = "";

    try {
      await auth.signIn(email, password);
      goto("/");
    } catch (err) {
      error = (err as Error).message || "Terjadi kesalahan sistem";
    } finally {
      loading = false;
    }
  };

  let isFormValid = $derived(email.includes("@") && password.length >= 6);
</script>

<div class="space-y-6">
  <!-- Branding Header -->
  <div class="text-center group">
    <h1
      class="text-3xl font-black text-foreground tracking-tighter uppercase mb-2"
    >
      Masuk <span class="text-emerald-600">Dashboard</span>
    </h1>
    <p
      class="text-sm font-bold text-muted-foreground uppercase tracking-widest opacity-60"
    >
      Sistem Monitoring Terpadu
    </p>
  </div>

  <!-- Form Card -->
  <div
    class="bg-card/50 backdrop-blur-3xl border border-border/80 rounded-[2rem] p-8 shadow-2xl shadow-emerald-900/10"
  >
    <form onsubmit={handleLogin} class="space-y-5">
      <!-- Email Input -->
      <div class="space-y-2">
        <label
          for="email"
          class="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1"
        >
          <Mail size={12} /> Email Pengguna
        </label>
        <div class="relative group/input">
          <input
            id="email"
            type="email"
            bind:value={email}
            class="w-full bg-background/50 border border-border/80 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm font-medium"
            placeholder="nama@agrodemoplot.id"
            required
          />
        </div>
      </div>

      <!-- Password Input -->
      <div class="space-y-2">
        <div class="flex items-center justify-between px-1">
          <label
            for="password"
            class="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground"
          >
            <Lock size={12} /> Kata Sandi
          </label>
          <a
            href="/auth/forgot-password"
            class="text-[10px] font-black uppercase tracking-widest text-emerald-600 hover:text-emerald-500"
            >Lupa?</a
          >
        </div>
        <div class="relative group/input">
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            bind:value={password}
            class="w-full bg-background/50 border border-border/80 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm font-medium tracking-widest"
            placeholder="••••••••"
            required
          />
          <button
            type="button"
            onclick={() => (showPassword = !showPassword)}
            class="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            {#if showPassword}
              <EyeOff size={18} />
            {:else}
              <Eye size={18} />
            {/if}
          </button>
        </div>
      </div>

      {#if error}
        <div class="hidden"></div>
      {/if}

      <button
        type="submit"
        disabled={!isFormValid || loading}
        class="relative w-full overflow-hidden group/btn"
      >
        <div
          class="absolute inset-0 bg-emerald-500 blur-xl opacity-0 group-hover/btn:opacity-30 transition-opacity"
        ></div>
        <div
          class="relative w-full h-14 bg-emerald-600 hover:bg-emerald-700 disabled:bg-muted text-white font-black uppercase tracking-widest text-xs rounded-2xl transition-all shadow-xl shadow-emerald-600/20 flex items-center justify-center gap-2 active:scale-[0.98]"
        >
          {#if loading}
            <div
              class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"
            ></div>
            <span>Memverifikasi...</span>
          {:else}
            <LogIn size={18} />
            <span>Masuk Sekarang</span>
          {/if}
        </div>
      </button>
    </form>
  </div>
</div>

<!-- Floating Alerts -->
{#if showRegistrationSuccess}
  <div
    class="fixed bottom-10 left-1/2 -translate-x-1/2 z-[2000] px-8 py-4 bg-emerald-600 text-white rounded-2xl shadow-2xl flex items-center gap-3 font-black uppercase text-[10px] tracking-widest"
    in:fly={{ y: 20 }}
    out:fade
  >
    <CheckCircle2 size={20} />
    Registrasi berhasil! Silakan periksa email Anda.
    <button onclick={() => (showRegistrationSuccess = false)} class="ml-4 opacity-50 hover:opacity-100 transition-opacity"
      ><X size={16} /></button
    >
  </div>
{/if}

{#if error}
  <div
    class="fixed bottom-10 left-1/2 -translate-x-1/2 z-[2000] px-8 py-4 bg-red-600 text-white rounded-2xl shadow-2xl flex items-center gap-3 font-black uppercase text-[10px] tracking-widest"
    in:fly={{ y: 20 }}
    out:fade
  >
    <AlertTriangle size={20} />
    {error}
    <button onclick={() => (error = "")} class="ml-4 opacity-50 hover:opacity-100 transition-opacity"
      ><X size={16} /></button
    >
  </div>
{/if}
