<script lang="ts">
  import { Mail, Shield, FileLock, Map as MapIcon, HelpCircle, LayoutDashboard, Globe, Instagram, Github, Twitter, Linkedin } from '@lucide/svelte';

  const currentYear = new Date().getFullYear();

  const navLinks = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Pusat Bantuan', href: '/faq', icon: HelpCircle },
  ];

  const legalLinks = [
    { name: 'Ketentuan Layanan', href: '/legal/terms-of-service' },
    { name: 'Kebijakan Privasi', href: '/legal/privacy-policy' },
  ];
</script>

<footer class="relative z-10 border-t border-border mt-28 bg-card/30 backdrop-blur-3xl overflow-hidden">
  <!-- Immersive Footer Accent -->
  <div class="absolute bottom-0 right-0 w-[40%] h-[100%] bg-emerald-600/5 blur-[150px] rounded-full translate-x-1/2 translate-y-1/2 pointer-events-none"></div>
  <div class="absolute top-0 left-0 w-[20%] h-[50%] bg-blue-600/5 blur-[120px] rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>

  <div class="container mx-auto px-6 max-w-7xl pt-24 pb-12">
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-16 mb-24">
      
      <!-- Brand & Identity -->
      <div class="flex flex-col gap-8 md:col-span-1">
        <div class="space-y-4">
            <a href="/" class="flex items-center gap-3 group">
                <div class="w-12 h-12 rounded-2xl bg-emerald-600 flex items-center justify-center shadow-xl shadow-emerald-500/20 group-hover:scale-110 transition-all duration-500">
                    <span class="text-white font-black text-xl">A</span>
                </div>
                <span class="text-2xl font-black tracking-tighter text-foreground group-hover:text-emerald-600 transition-colors uppercase">
                    AGRO<span class="text-emerald-600">DEMOPLOT</span>
                </span>
            </a>
            <p class="text-sm font-medium text-muted-foreground leading-relaxed">
                Platform intelijen spasial terpadu untuk optimalisasi sistem pertanian berkelanjutan melalui data presisi dan AI.
            </p>
        </div>
        
        <div class="flex items-center gap-4">
          <a href="#" class="w-10 h-10 rounded-xl bg-muted hover:bg-emerald-600 hover:text-white flex items-center justify-center transition-all duration-300 shadow-sm"><Instagram size={18} /></a>
          <a href="#" class="w-10 h-10 rounded-xl bg-muted hover:bg-emerald-600 hover:text-white flex items-center justify-center transition-all duration-300 shadow-sm"><Twitter size={18} /></a>
          <a href="#" class="w-10 h-10 rounded-xl bg-muted hover:bg-emerald-600 hover:text-white flex items-center justify-center transition-all duration-300 shadow-sm"><Linkedin size={18} /></a>
          <a href="#" class="w-10 h-10 rounded-xl bg-muted hover:bg-emerald-600 hover:text-white flex items-center justify-center transition-all duration-300 shadow-sm"><Mail size={18} /></a>
        </div>
      </div>

      <!-- Links Grid -->
      <div class="grid grid-cols-2 lg:grid-cols-3 md:col-span-3 gap-12">
          <!-- Navigation -->
          <div>
            <h4 class="text-[10px] font-black uppercase tracking-[0.3em] text-foreground mb-8">Ekosistem</h4>
            <ul class="space-y-5">
              {#each navLinks as link}
                <li>
                  <a href={link.href} class="text-sm font-bold text-muted-foreground hover:text-emerald-600 transition-all flex items-center gap-2 group">
                    <span class="w-0 group-hover:w-2 h-0.5 bg-emerald-500 transition-all"></span>
                    {link.name}
                  </a>
                </li>
              {/each}
              <li>
                  <a href="/insight" class="text-sm font-bold text-muted-foreground hover:text-emerald-600 transition-all flex items-center gap-2 group">
                      <span class="w-0 group-hover:w-2 h-0.5 bg-emerald-500 transition-all"></span>
                      Analitik & Insight
                  </a>
              </li>
            </ul>
          </div>

          <!-- Resources -->
          <div>
            <h4 class="text-[10px] font-black uppercase tracking-[0.3em] text-foreground mb-8">Layanan</h4>
            <ul class="space-y-5">
              <li><a href="/map" class="text-sm font-bold text-muted-foreground hover:text-emerald-600 transition-all">Peta Interaktif</a></li>
              <li><a href="/dashboard/kebun" class="text-sm font-bold text-muted-foreground hover:text-emerald-600 transition-all">Manajemen Lahan</a></li>
              <li><a href="/reports" class="text-sm font-bold text-muted-foreground hover:text-emerald-600 transition-all">Sistem Pelaporan</a></li>
            </ul>
          </div>

          <!-- Legal -->
          <div>
            <h4 class="text-[10px] font-black uppercase tracking-[0.3em] text-foreground mb-8">Informasi</h4>
            <ul class="space-y-5">
              {#each legalLinks as link}
                <li>
                  <a href={link.href} class="text-sm font-bold text-muted-foreground hover:text-emerald-600 transition-all flex items-center gap-2 group">
                    {#if link.name.includes('Ketentuan')}<FileLock size={14} />{:else}<Shield size={14} />{/if}
                    {link.name}
                  </a>
                </li>
              {/each}
            </ul>
          </div>
      </div>
    </div>

    <!-- Bottom Signature -->
    <div class="pt-12 border-t border-border flex flex-col md:flex-row justify-between items-center gap-8">
      <div class="flex items-center gap-3">
        <div class="px-3 py-1 bg-emerald-500/10 text-emerald-600 rounded-full text-[9px] font-black uppercase tracking-widest border border-emerald-500/10">v2.4 LTS</div>
        <p class="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40">Spatial Intelligence Platform</p>
      </div>
      
      <p class="text-[10px] font-black text-muted-foreground/60 uppercase tracking-[0.1em]">
        © {currentYear} Agrodemoplot Spatial Intelligence • <span class="text-emerald-600/50 italic">Designed for Sustainability</span>
      </p>
    </div>
  </div>
</footer>