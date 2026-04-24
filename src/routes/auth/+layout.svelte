<script lang="ts">
  import { auth } from '$lib/supabase/auth';
  import { browser } from '$app/environment';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import type { User } from '@supabase/supabase-js';
  import { fade, scale } from 'svelte/transition';

  let user = $state<User | null>(null);
  let loading = $state(true);

  onMount(() => {
    if (browser) {
      const unsub = auth.subscribe((authState) => {
        user = authState.user;
        loading = authState.loading;

        if (!authState.loading && authState.user) {
          goto('/dashboard');
        }
      });
      return () => {
        if (typeof unsub === 'function') unsub();
      };
    }
  });
</script>

<div class="relative min-h-screen w-full overflow-hidden bg-background">
  <!-- Immersive Background Layer -->
  <div class="fixed inset-0 z-0 overflow-hidden">
    <div class="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-emerald-500/20 blur-[120px] rounded-full animate-pulse"></div>
    <div class="absolute top-[20%] -right-[5%] w-[35%] h-[35%] bg-blue-500/10 blur-[100px] rounded-full" style="animation-delay: 1s"></div>
    <div class="absolute -bottom-[10%] left-[20%] w-[50%] h-[50%] bg-emerald-600/15 blur-[150px] rounded-full" style="animation-delay: 2s"></div>
  </div>

  <div class="relative z-10 flex flex-col min-h-screen items-center justify-center p-6">
    {#if loading}
      <div 
        class="flex flex-col items-center gap-4"
        in:fade={{ duration: 400 }}
      >
        <div class="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-600 rounded-full animate-spin"></div>
        <p class="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground animate-pulse">Mempersiapkan Sesi</p>
      </div>
    {:else if !user}
      <div 
        class="w-full max-w-md"
        in:scale={{ start: 0.98, duration: 600 }}
      >
        <slot />
      </div>
    {:else}
      <div 
        class="flex flex-col items-center gap-2"
        in:fade
      >
        <div class="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></div>
        <p class="text-xs font-bold text-muted-foreground uppercase tracking-widest">Sesi Aktif Ditemukan</p>
      </div>
    {/if}
  </div>
</div>

<style>
  :global(body) {
    background: #000;
  }
</style>

