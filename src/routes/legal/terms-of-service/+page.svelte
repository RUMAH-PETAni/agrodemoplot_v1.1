<script lang="ts">
  import { marked } from 'marked';
  import DOMPurify from 'isomorphic-dompurify';
  import { page } from '$app/stores';
  import { FileLock, Calendar, ArrowLeft } from '@lucide/svelte';
  import { fade, fly } from 'svelte/transition';

  let termsContent = $state('');

  $effect(() => {
    if ($page.data.termsContent) {
      const rawHtml = marked.parse($page.data.termsContent);
      termsContent = DOMPurify.sanitize(rawHtml as string);
    }
  });
</script>

<div class="min-h-screen pt-32 pb-20 px-6 max-w-4xl mx-auto">
  <!-- Nav Back -->
  <a href="/" class="inline-flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-emerald-600 transition-colors mb-12">
    <ArrowLeft size={16} /> Kembali ke Beranda
  </a>

  <!-- Header -->
  <header class="text-center mb-16" in:fly={{ y: -20, duration: 800 }}>
    <div class="w-20 h-20 bg-emerald-500/10 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-emerald-500/20">
      <FileLock size={40} />
    </div>
    <h1 class="text-4xl md:text-5xl font-black text-foreground tracking-tight mb-4 uppercase">
      Ketentuan <span class="text-emerald-600">Layanan</span>
    </h1>
    <div class="flex items-center justify-center gap-3 text-muted-foreground text-sm">
      <Calendar size={14} />
      <span class="font-bold tracking-widest uppercase">Pembaruan Terakhir: {new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}</span>
    </div>
  </header>

  <!-- Content Card -->
  <div 
    class="bg-card/50 backdrop-blur-xl border border-border rounded-[2.5rem] p-8 md:p-16 shadow-2xl shadow-emerald-900/5 dark:shadow-emerald-100/5"
    in:fade={{ duration: 1000, delay: 200 }}
  >
    {#if termsContent}
      <article class="prose prose-emerald dark:prose-invert max-w-none 
        prose-headings:text-foreground prose-headings:font-black prose-headings:tracking-tighter prose-headings:uppercase
        prose-p:text-muted-foreground prose-p:leading-relaxed prose-p:text-lg
        prose-strong:text-foreground prose-strong:font-black
        prose-ul:text-muted-foreground prose-li:marker:text-emerald-500">
        {@html termsContent}
      </article>
    {:else}
      <div class="space-y-6">
        <div class="h-8 bg-muted animate-pulse rounded-lg w-1/3"></div>
        <div class="space-y-3">
          <div class="h-4 bg-muted animate-pulse rounded-lg w-full"></div>
          <div class="h-4 bg-muted animate-pulse rounded-lg w-full"></div>
          <div class="h-4 bg-muted animate-pulse rounded-lg w-3/4"></div>
        </div>
      </div>
    {/if}
  </div>

  <!-- Support Footer -->
  <div class="mt-16 text-center">
    <p class="text-muted-foreground text-sm font-medium">
      Ada bagian yang kurang jelas?
      <a href="mailto:ikurniawan.consultant@gmail.com" class="text-emerald-600 font-bold hover:underline ml-1">Hubungi Tim Bantuan</a>
    </p>
  </div>
</div>