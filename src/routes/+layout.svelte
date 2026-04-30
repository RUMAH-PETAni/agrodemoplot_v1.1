<script>
// @ts-nocheck
  import '../app.css';
  import Navigation from '$lib/components/Navigation.svelte';

  import Sidebar from '$lib/components/Sidebar.svelte';
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import AIGronomist from '$lib/components/AIGronomist.svelte';
  import { X } from '@lucide/svelte';
  import { fade, fly } from 'svelte/transition';
  import { backOut } from 'svelte/easing';
  import { auth } from '$lib/supabase/auth';

  let mobileMode = $state(false);
  let sidebarOpen = $state(false);
  let mobileMenuOpen = $state(false);
  let showAIDrawer = $state(false);

  // Check if we are on an auth-related page
  let isAuthPage = $derived(
    $page.url.pathname.startsWith('/auth') || 
    $page.url.pathname.startsWith('/reset-password')
  );

  let isLandingPage = $derived($page.url.pathname === '/');


  onMount(() => {
    auth.init();
    const checkScreenSize = () => {
      mobileMode = window.innerWidth < 768;
    };
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => {
      window.removeEventListener('resize', checkScreenSize);
    };
  });

  function toggleSidebar() {
    if (!mobileMode) {
      sidebarOpen = !sidebarOpen;
    } else {
      mobileMenuOpen = !mobileMenuOpen;
    }
  }
  let isMapPage = $derived($page.url.pathname === '/map');
</script>

<div class="min-h-screen flex flex-col bg-background relative {(isLandingPage || isMapPage) ? 'overflow-hidden' : ''}">

  {#if !isAuthPage}
    <Navigation
      {toggleSidebar}
      isSidebarOpen={sidebarOpen}
      mobileMenuOpen={mobileMenuOpen}
    />
  {/if}

  <div class="flex flex-1">
    {#if !isAuthPage}
      <Sidebar
        {mobileMode}
        {sidebarOpen}
        mobileMenuOpen={mobileMenuOpen}
        onAIAction={() => showAIDrawer = true}
        toggleMobileMenu={() => mobileMenuOpen = !mobileMenuOpen}
      />
    {/if}
    
    <main
      class="grow container mx-auto max-w-full transition-all duration-300
      {!isAuthPage ? (mobileMode ? 'pt-20 pb-0' : (sidebarOpen ? 'pt-20 md:pl-20' : 'pt-20 md:pl-0')) : 'pt-0'}"
    >
      <slot />
    </main>
  </div>

  <!-- AI Agronomist Global Drawer -->
  {#if showAIDrawer}
    <!-- Backdrop -->
    <div 
      class="fixed inset-0 bg-black/20 backdrop-blur-sm z-[1100]" 
      onclick={() => showAIDrawer = false}
      in:fade={{ duration: 300 }}
      out:fade={{ duration: 300 }}
    ></div>

    <!-- Drawer Container -->
    <div 
      class="fixed top-0 right-0 h-full w-full md:w-1/2 bg-card border-l border-border shadow-[-20px_0_50px_-20px_rgba(0,0,0,0.3)] z-[1200] flex flex-col"
      in:fly={{ x: 1000, duration: 500, easing: backOut }}
      out:fly={{ x: 1000, duration: 400 }}
    >
      <div class="grow overflow-hidden flex flex-col">
        <AIGronomist onclose={() => showAIDrawer = false} />
      </div>
    </div>
  {/if}
</div>


<style>
  :global(body) {
    margin: 0;
    padding: 0;
  }
</style>