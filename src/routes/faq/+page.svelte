<script lang="ts">
  import {
    ChevronDown,
    Search,
    CircleHelp,
    Laptop,
    CreditCard,
    MessageCircle,
    Info,
    ArrowLeft,
  } from "@lucide/svelte";
  import { slide, fade, fly } from "svelte/transition";

  interface FAQItem {
    question: string;
    answer: string;
    category: "General" | "Platform" | "Billing" | "Support";
  }

  let searchQuery = $state("");
  let activeCategory = $state("All");
  let activeIndex = $state(-1);

  const categories = ["All", "General", "Platform", "Billing", "Support"];

  const faqs: FAQItem[] = [
    {
      category: "General",
      question: "Apa itu Agrodemoplot?",
      answer:
        "Agrodemoplot adalah platform terpadu untuk mengelola, memantau, dan mengoptimalkan sistem manajemen kebun yang berkelanjutan. Kami menggabungkan data presisi dengan alat manajemen yang mudah digunakan.",
    },
    {
      category: "General",
      question: "Bagaimana cara memulainya?",
      answer:
        "Anda dapat memulai dengan membuat akun dan menjelajahi fitur-fitur kami. Setelah terdaftar, Anda akan memiliki akses ke alat sistem monitoring, serta perpustakaan data untuk membantu mengelola pertanian Anda secara efisien.",
    },
    {
      category: "Billing",
      question: "Apakah ada biaya untuk menggunakan platform?",
      answer:
        "Platform ini menawarkan berbagai fitur gratis dan premium. Akses dasar ke alat-alat kami gratis, sementara fitur dan layanan lanjutan mungkin memerlukan langganan atau pembayaran.",
    },
    {
      category: "Platform",
      question: "Dapatkah saya menggunakan platform ini di perangkat mobile?",
      answer:
        "Ya, platform ini dirancang untuk bekerja di berbagai perangkat dengan desain responsif yang bekerja dengan baik di tablet dan smartphone. Namun untuk saat ini terbatas hanya untuk penggunaan daring saja.",
    },
    {
      category: "Support",
      question: "Bagaimana cara menghubungi kami?",
      answer:
        "Anda dapat menghubungi tim dukungan kami melalui email ke Administrator: ikurniawan.consultant@gmail.com. Kami biasanya merespons dalam waktu 24 jam kerja.",
    },
  ];

  let filteredFaqs = $derived(
    faqs.filter((faq) => {
      const matchesSearch =
        faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory =
        activeCategory === "All" || faq.category === activeCategory;
      return matchesSearch && matchesCategory;
    }),
  );

  function toggleFAQ(index: number) {
    activeIndex = activeIndex === index ? -1 : index;
  }

  function getCategoryIcon(category: string) {
    switch (category) {
      case "General":
        return Info;
      case "Platform":
        return Laptop;
      case "Billing":
        return CreditCard;
      case "Support":
        return MessageCircle;
      default:
        return CircleHelp;
    }
  }
</script>

<div class="min-h-screen pt-32 pb-20 px-6 max-w-4xl mx-auto">
  <div class="max-w-4xl mx-auto">
    <!-- Nav Back -->
    <a
      href="/"
      class="inline-flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-emerald-600 transition-colors mb-12"
    >
      <ArrowLeft size={16} /> Kembali ke Beranda
    </a>
    <!-- Header Section -->
    <div class="text-center mb-16" in:fly={{ y: -20, duration: 800 }}>
      <h1
        class="text-4xl md:text-5xl font-extrabold text-foreground mb-4 tracking-tight"
      >
        Pusat <span class="text-emerald-600 dark:text-emerald-400">Bantuan</span
        >
      </h1>
      <p class="text-lg text-muted-foreground max-w-2xl mx-auto">
        Temukan jawaban atas pertanyaan yang sering diajukan untuk memaksimalkan
        penggunaan platform Agrodemoplot Anda.
      </p>
    </div>

    <!-- Search & Filters -->
    <div class="mb-10 space-y-6" in:fade={{ duration: 1000, delay: 200 }}>
      <!-- Search Bar -->

      <!-- Category Pills -->
      <div class="flex flex-wrap items-center justify-center gap-2">
        {#each categories as category}
          <button
            class="px-5 py-2 rounded-full text-sm font-semibold transition-all duration-200 border
              {activeCategory === category
              ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-600/20 scale-105'
              : 'bg-card text-muted-foreground border-border hover:border-emerald-500/50 hover:bg-emerald-50/5'}"
            onclick={() => (activeCategory = category)}
          >
            {category}
          </button>
        {/each}
      </div>
    </div>

    <!-- FAQ Items -->
    <div class="space-y-4" in:fade={{ duration: 1000, delay: 300 }}>
      {#each filteredFaqs as faq, index (faq.question)}
        <div
          class="group border border-border rounded-2xl overflow-hidden transition-all duration-300 bg-card hover:shadow-xl hover:shadow-emerald-900/5 dark:hover:shadow-emerald-100/5
          {activeIndex === index
            ? 'ring-2 ring-emerald-500/50 border-transparent shadow-lg'
            : ''}"
          in:fade={{ duration: 300, delay: index * 50 }}
        >
          <button
            class="w-full flex items-center justify-between p-6 text-left transition-colors"
            onclick={() => toggleFAQ(index)}
            aria-expanded={activeIndex === index}
          >
            <div class="flex items-center gap-4">
              <div
                class="p-2 rounded-lg bg-emerald-100/10 text-emerald-600 dark:text-emerald-400"
              >
                <svelte:component
                  this={getCategoryIcon(faq.category)}
                  class="w-5 h-5"
                />
              </div>
              <span
                class="text-lg font-semibold text-foreground leading-tight group-hover:text-emerald-600 transition-colors"
              >
                {faq.question}
              </span>
            </div>
            <div class="flex items-center gap-3">
              <span
                class="hidden sm:inline text-xs font-bold uppercase tracking-wider text-muted-foreground bg-muted px-2 py-1 rounded"
              >
                {faq.category}
              </span>
              <ChevronDown
                class="w-5 h-5 text-muted-foreground transition-transform duration-300 {activeIndex ===
                index
                  ? 'rotate-180 text-emerald-500'
                  : ''}"
              />
            </div>
          </button>

          {#if activeIndex === index}
            <div transition:slide={{ duration: 300 }}>
              <div class="px-6 pb-6 pt-0 ml-13">
                <div
                  class="h-px bg-gradient-to-r from-emerald-500/50 to-transparent mb-4"
                ></div>
                <p class="text-muted-foreground leading-relaxed text-lg">
                  {faq.answer}
                </p>
              </div>
            </div>
          {/if}
        </div>
      {:else}
        <div
          class="text-center py-20 bg-card/30 rounded-3xl border border-dashed border-border"
          in:fade
        >
          <CircleHelp
            class="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-20"
          />
          <h3 class="text-xl font-semibold text-foreground">
            Tidak menemukan hasil
          </h3>
          <p class="text-muted-foreground pt-2">
            Coba gunakan kata kunci lain atau ubah kategori filter.
          </p>
        </div>
      {/each}
    </div>

    <!-- Contact CTA -->
    <div
      class="mt-16 p-8 rounded-3xl bg-gradient-to-br from-emerald-600 to-emerald-800 text-white shadow-2xl relative overflow-hidden"
    >
      <div
        class="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-white/10 rounded-full blur-2xl"
      ></div>
      <div
        class="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6"
      >
        <div>
          <h2 class="text-2xl font-bold mb-2">Masih punya pertanyaan?</h2>
          <p class="text-emerald-50/80">
            Tim kami siap membantu Anda menyelesaikan kendala teknis maupun
            operasional.
          </p>
        </div>
        <a
          href="mailto:ikurniawan.consultant@gmail.com"
          class="px-8 py-4 bg-white text-emerald-700 font-bold rounded-2xl hover:bg-emerald-50 transition-colors shadow-lg active:scale-95"
        >
          Hubungi Dukungan
        </a>
      </div>
    </div>
  </div>
</div>

<style>
  /* Optional: Smooth backdrop blur for premium feel */
  :global(.backdrop-blur-md) {
    backdrop-filter: blur(12px);
  }
</style>
