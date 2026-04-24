<script lang="ts">
  import { auth } from '$lib/supabase/auth';
  import { browser } from '$app/environment';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import type { User } from '@supabase/supabase-js';

  let user = $state<User | null>(null);
  let loading = $state(true);

  // Check authentication status on component mount
  onMount(() => {
    if (browser) {
      const unsub = auth.subscribe((authState) => {
        user = authState.user;
        loading = authState.loading;

        // If user is not authenticated, redirect to login
        if (!authState.loading && !authState.user) {
          goto('/auth/login');
        }
      });
      // In Svelte 5, we need to return a cleanup function that runs when the component is destroyed
      return () => {
        if (typeof unsub === 'function') {
          unsub();
        }
      };
    }
  });
</script>

{#if loading}
  <div class="flex justify-center items-center h-64">
    <p>Memuat...</p>
  </div>
{:else}
  {#if user}
    <slot />
  {:else}
    <div class="flex justify-center items-center h-64">
      <p>Access denied. Redirecting to login...</p>
    </div>
  {/if}
{/if}