<script lang="ts">
  import { auth } from "$lib/supabase/auth";
  import { goto } from "$app/navigation";
  import {
    Mail,
    ArrowLeft,
    Send,
    CheckCircle2,
    AlertCircle,
    AlertTriangle,
    X,
  } from "@lucide/svelte";
  import { fade, fly, scale } from "svelte/transition";

  let email = $state("");
  let loading = $state(false);
  let success = $state(false);
  let error = $state("");

  const handleResetPassword = async (e: Event) => {
    e.preventDefault();
    loading = true;
    error = "";

    try {
      await auth.resetPassword(email);
      success = true;
      error = "";
    } catch (err) {
      error = (err as Error).message || "Terjadi kesalahan sistem";
    } finally {
      loading = false;
    }
  };

  const handleBackToLogin = () => {
    goto("/auth/login");
  };

  let isFormValid = $derived(email.includes("@") && email.includes("."));
</script>

<div class="space-y-6">
  <!-- Branding Header -->
  <div class="text-center group">
    <h1
      class="text-3xl font-black text-foreground tracking-tighter uppercase mb-2 text-center"
    >
      Atur Ulang <span class="text-emerald-600">Sandi</span>
    </h1>
    <p
      class="text-sm font-bold text-muted-foreground uppercase tracking-widest opacity-60 text-center"
    >
      Pulihkan Akses Akun Anda
    </p>
  </div>

  <!-- Form Card -->
  <div
    class="bg-card/50 backdrop-blur-3xl border border-border/80 rounded-[2rem] p-8 shadow-2xl shadow-emerald-900/10"
  >
    {#if success}
      <div class="text-center py-4 space-y-6" in:scale={{ start: 0.95 }}>
        <div
          class="w-20 h-20 bg-emerald-500/10 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-500/20"
        >
          <CheckCircle2 size={40} />
        </div>
        <div class="space-y-2">
          <h3
            class="text-xl font-black text-foreground uppercase tracking-tight"
          >
            Permintaan Terkirim!
          </h3>
          <p class="text-sm text-muted-foreground leading-relaxed">
            Instruksi pengaturan ulang telah dikirim ke <span
              class="font-bold text-emerald-600">{email}</span
            >. Silakan periksa email Anda.
          </p>
        </div>

        <button
          type="button"
          onclick={handleBackToLogin}
          class="w-full h-14 bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-widest text-xs rounded-2xl transition-all shadow-xl shadow-emerald-600/20 active:scale-[0.98] flex items-center justify-center gap-2"
        >
          <ArrowLeft size={18} />
          Kembali ke Login
        </button>
      </div>
    {:else}
      <p
        class="text-sm font-medium text-muted-foreground text-center mb-8 leading-relaxed"
      >
        Masukkan email terdaftar Anda. Kami akan mengirimkan tautan aman untuk
        mengatur ulang kata sandi Anda.
      </p>

      <form onsubmit={handleResetPassword} class="space-y-6">
        <div class="space-y-2">
          <label
            for="email"
            class="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1"
          >
            <Mail size={12} /> Email Terdaftar
          </label>
          <input
            id="email"
            type="email"
            bind:value={email}
            class="w-full bg-background/50 border border-border/80 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm font-medium"
            placeholder="nama@agrodemoplot.id"
            required
          />
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
              <span>Mengirim Tautan...</span>
            {:else}
              <Send size={18} />
              <span>Kirm Tautan Reset</span>
            {/if}
          </div>
        </button>
      </form>

      <div class="mt-8 text-center pt-2">
        <button
          onclick={handleBackToLogin}
          class="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-emerald-600 transition-colors"
        >
          <ArrowLeft size={12} /> Kembali ke Login
        </button>
      </div>
    {/if}
  </div>
</div>

<!-- Floating Error Toast -->
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
