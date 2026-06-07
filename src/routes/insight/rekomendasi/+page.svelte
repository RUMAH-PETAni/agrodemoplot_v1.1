<script lang="ts">
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import { fly, fade, scale } from 'svelte/transition';
  import {
    ArrowLeft,
    Lightbulb,
    Bot,
    UserCheck,
    Sparkles,
    BrainCircuit,
    CheckCircle2,
    AlertTriangle,
    Loader2,
    Calendar,
    MessageSquareText,
    ChevronRight,
    Leaf,
    Send
  } from '@lucide/svelte';
  import { supabase } from '$lib/supabase/client';

  let demoplots: any[] = [];
  let selectedDemoplot: any = null;
  let loading = true;
  let error = "";
  
  let isGenerating = false;
  
  // Real DB state
  let currentRekomendasi: any = null;
  let currentUser: any = null;
  let currentUserRole: string = 'user';
  let expertFeedbackInput = '';
  let isSubmittingFeedback = false;

  async function loadData() {
    loading = true;
    try {
      // Get User and Profile Role
      const { data: authData } = await supabase.auth.getUser();
      if (authData?.user) {
        currentUser = authData.user;
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', currentUser.id).single();
        if (profile) currentUserRole = profile.role;
      }

      const { data, error: dbError } = await supabase
        .from('demoplot')
        .select('id, nama_demoplot, luas_demoplot, sistem_budidaya, tanaman_utama');
      
      if (dbError) throw dbError;
      
      demoplots = data || [];
      if (demoplots.length > 0) {
        selectedDemoplot = demoplots[0];
      }
    } catch (err) {
      console.error("Gagal memuat data demoplot:", err);
      error = "Gagal memuat data dari database.";
    } finally {
      loading = false;
    }
  }

  // Helper: fetch expert profile separately (expert_id → auth.users, not profiles)
  async function fetchExpertProfile(expertId: string | null): Promise<any> {
    if (!expertId) return null;
    const { data } = await supabase
      .from('profiles')
      .select('full_name, avatar_url, role')
      .eq('id', expertId)
      .single();
    return data || null;
  }

  async function loadRekomendasi(demoplotId: string) {
    currentRekomendasi = null;
    expertFeedbackInput = '';
    const { data, error: dbErr } = await supabase
      .from('rekomendasi_teknis')
      .select('*')
      .eq('demoplot_id', demoplotId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data) {
      const expertProfile = await fetchExpertProfile(data.expert_id);
      currentRekomendasi = { ...data, expert: expertProfile };
      expertFeedbackInput = data.expert_feedback || '';
    } else if (dbErr) {
      console.error("Error loading rekomendasi:", dbErr);
    }
  }

  onMount(() => {
    loadData();
  });

  $: if(selectedDemoplot && browser) {
      loadRekomendasi(selectedDemoplot.id);
  }

  async function generateAI() {
    if (!selectedDemoplot) return;
    isGenerating = true;
    try {
      // Fetch all available context from database in parallel
      const [prodRes, kesehatanRes, soilRes, climateRes, penanamanRes, hpgRes] = await Promise.all([
        supabase.from('produktivitas_summary').select('*').eq('demoplot_id', selectedDemoplot.id).maybeSingle(),
        supabase.from('analisis_kesehatan_lahan').select('*').eq('demoplot_id', selectedDemoplot.id).order('periode_analisis', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('soil_data_summary').select('*').eq('demoplot_id', selectedDemoplot.id).maybeSingle(),
        supabase.from('climate_data_summary').select('*').eq('demoplot_id', selectedDemoplot.id).maybeSingle(),
        supabase.from('monitoring_penanaman').select('kondisi_pertumbuhan, kategori_tanaman, jenis_tanaman, usia_tanaman, tinggi, dbh').eq('demoplot_id', selectedDemoplot.id).order('tanggal_monitoring', { ascending: false }).limit(30),
        supabase.from('monitoring_hpg').select('kategori_gangguan, nama_jenis, tingkat_serangan, bagian_terserang, cara_pengendalian, tanggal_monitoring').eq('demoplot_id', selectedDemoplot.id).order('tanggal_monitoring', { ascending: false }).limit(20)
      ]);

      const richContextData = {
        ...selectedDemoplot,
        produktivitas: prodRes.data || null,
        kesehatan_lahan: kesehatanRes.data || null,
        tanah: soilRes.data || null,
        iklim: climateRes.data || null,
        penanaman: penanamanRes.data || [],
        hpg: hpgRes.data || []
      };


      const response = await fetch('/api/generate-rekomendasi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contextData: richContextData })
      });
      
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Terjadi kesalahan saat memanggil AI');
      }

      const { recommendations } = await response.json();
      
      // Save to database
      const { data: inserted, error: insertErr } = await supabase
        .from('rekomendasi_teknis')
        .insert({
          demoplot_id: selectedDemoplot.id,
          user_id: currentUser.id,
          ai_recommendations: recommendations,
          status: 'pending'
        })
        .select('*')
        .single();
        
      if (insertErr) throw insertErr;
      currentRekomendasi = { ...inserted, expert: null };
      expertFeedbackInput = '';
      
    } catch (err: any) {
      console.error(err);
      alert('Gagal menghasilkan rekomendasi: ' + err.message);
    } finally {
      isGenerating = false;
    }
  }

  async function submitFeedback() {
    if (!currentRekomendasi || !expertFeedbackInput.trim()) return;
    isSubmittingFeedback = true;
    try {
      const { data, error: updateErr } = await supabase
        .from('rekomendasi_teknis')
        .update({
          expert_id: currentUser.id,
          expert_feedback: expertFeedbackInput,
          status: 'validated'
        })
        .eq('id', currentRekomendasi.id)
        .select('*')
        .single();
        
      if (updateErr) throw updateErr;
      const expertProfile = await fetchExpertProfile(currentUser.id);
      currentRekomendasi = { ...data, expert: expertProfile };
    } catch(err: any) {
       console.error(err);
       alert('Gagal menyimpan validasi: ' + err.message);
    } finally {
      isSubmittingFeedback = false;
    }
  }
</script>

<div class="min-h-screen pb-24 px-6 max-w-7xl mx-auto space-y-12">
  <!-- Hero Section -->
  <section
    class="relative mt-28 rounded-[2.5rem] bg-slate-900 overflow-hidden shadow-2xl shadow-blue-900/20 text-white"
    in:fly={{ y: -20, duration: 800 }}
  >
    <div class="absolute inset-0 z-0 opacity-40">
      <div class="absolute -top-[20%] -left-[10%] w-[60%] h-[120%] bg-violet-600 blur-[120px] rounded-full"></div>
      <div class="absolute top-[20%] -right-[10%] w-[40%] h-[80%] bg-blue-500/30 blur-[100px] rounded-full"></div>
    </div>

    <div class="relative z-10 p-10 md:p-16 grid grid-cols-1 md:grid-cols-2 items-center gap-12 md:gap-24">
      <div class="space-y-6 text-center md:text-left flex-1">
        <div class="flex items-center justify-center md:justify-start gap-3">
          <a href="/insight" class="p-2 hover:bg-white/20 backdrop-blur-md rounded-xl transition-colors">
            <ArrowLeft size={18} class="text-white" />
          </a>
          <div class="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full border border-white/10 text-[10px] font-black text-violet-200 uppercase tracking-widest">
            <BrainCircuit size={12} class="text-violet-400" /> AI & Pakar
          </div>
        </div>

        <div class="space-y-2">
          <h1 class="text-4xl md:text-6xl font-black tracking-tighter leading-[0.9]">
            Rekomendasi <span class="text-violet-400">Teknis</span>
          </h1>
          <p class="text-lg text-violet-50/70 font-medium max-w-xl mx-auto md:mx-0">
            Sinergi kecerdasan buatan "AI-gronomis" dengan validasi langsung dari pakar agrikultur.
          </p>
        </div>
      </div>

      <div class="w-full md:w-auto" in:scale={{ delay: 400 }}>
        <div class="bg-white/10 backdrop-blur-2xl p-6 rounded-[2rem] border border-white/10 shadow-2xl min-w-[300px]">
          <label for="dplot-select" class="block text-[10px] font-black text-violet-200 uppercase tracking-[0.2em] mb-3 ml-1">Pilih Lokasi Lahan</label>
          <div class="relative group">
            {#if loading}
              <div class="w-full bg-slate-950/50 border border-white/10 rounded-2xl px-5 py-4 text-violet-200/50 text-sm font-bold flex items-center gap-2">
                <Loader2 size={16} class="animate-spin" /> Memuat data...
              </div>
            {:else if demoplots.length === 0}
              <div class="w-full bg-slate-950/50 border border-white/10 rounded-2xl px-5 py-4 text-violet-200/50 text-sm font-bold">
                Belum ada data lahan
              </div>
            {:else}
              <select
                id="dplot-select"
                bind:value={selectedDemoplot}
                class="w-full bg-slate-950/50 border border-white/10 rounded-2xl px-5 py-4 pr-12 text-white font-bold focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all cursor-pointer"
                style="-webkit-appearance: none; -moz-appearance: none; appearance: none;"
              >
                {#each demoplots as dp}
                  <option value={dp} class="bg-slate-900">{dp.nama_demoplot}</option>
                {/each}
              </select>
              <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-white/50">
                <ChevronRight class="h-4 w-4 rotate-90" />
              </div>
            {/if}
          </div>
        </div>
      </div>
    </div>
  </section>

  {#if loading}
    <div class="flex items-center justify-center min-h-[400px]">
      <div class="w-12 h-12 border-4 border-violet-500/20 border-t-violet-600 rounded-full animate-spin"></div>
    </div>
  {:else if error}
    <div class="bg-red-500/10 border border-red-500/20 p-6 rounded-2xl text-center text-red-500 mt-8">
      {error}
    </div>
  {:else if selectedDemoplot}
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8" in:fade={{ duration: 600 }}>
      
      <!-- Bagian 1: AI-gronomis -->
      <div class="bg-card/60 backdrop-blur-3xl border border-border rounded-[2.5rem] p-8 shadow-xl flex flex-col h-full relative overflow-hidden transition-all hover:border-violet-500/30">
        <!-- Decoration -->
        <div class="absolute -right-10 -top-10 text-violet-500/5 pointer-events-none">
          <Bot size={200} />
        </div>

        <div class="relative z-10 flex flex-col h-full">
          <div class="flex items-center justify-between mb-8">
            <div class="flex items-center gap-4">
              <div class="w-14 h-14 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-500 shrink-0">
                <BrainCircuit size={28} />
              </div>
              <div>
                <h2 class="text-2xl font-black text-foreground uppercase tracking-tight">AI-Gronomis</h2>
                <p class="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2 mt-1">
                  <Sparkles size={12} class="text-violet-400" /> Asisten Analisa Data
                </p>
              </div>
            </div>
            
            {#if currentRekomendasi}
              <button
                on:click={generateAI}
                disabled={isGenerating}
                class="px-4 py-2 bg-violet-500/10 hover:bg-violet-500/20 text-violet-500 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <Sparkles size={14} /> Analisa Ulang
              </button>
            {/if}
          </div>

          {#if !currentRekomendasi && !isGenerating}
            <div class="flex-1 flex flex-col items-center justify-center text-center p-8 bg-background/50 border border-dashed border-border rounded-[2rem]">
              <Bot size={48} class="text-muted-foreground/50 mb-4" />
              <h3 class="text-lg font-bold text-foreground mb-2">Mulai Analisis Cerdas</h3>
              <p class="text-sm text-muted-foreground mb-6 max-w-sm">
                AI akan memproses data produktivitas, iklim, dan lahan Anda untuk memberikan rekomendasi spesifik.
              </p>
              <button
                on:click={generateAI}
                class="px-8 py-3 bg-violet-600 hover:bg-violet-700 text-white font-black text-xs uppercase tracking-widest rounded-full transition-all shadow-lg shadow-violet-600/20 flex items-center gap-2"
              >
                <Sparkles size={16} /> Generate Rekomendasi
              </button>
            </div>
          {:else if isGenerating}
            <div class="flex-1 flex flex-col items-center justify-center text-center p-8 bg-background/50 border border-violet-500/20 rounded-[2rem]">
              <div class="relative w-20 h-20 mb-6">
                <div class="absolute inset-0 rounded-full border-4 border-violet-500/20 border-t-violet-500 animate-spin"></div>
                <div class="absolute inset-0 flex items-center justify-center text-violet-500 animate-pulse">
                  <BrainCircuit size={24} />
                </div>
              </div>
              <p class="text-sm font-black text-violet-500 uppercase tracking-widest animate-pulse">Memproses Data Histori & Iklim...</p>
            </div>
          {:else if currentRekomendasi}
            <div class="space-y-4 flex-1 overflow-y-auto pr-2" in:fade>
              {#each currentRekomendasi.ai_recommendations as rec}
                <div class="p-5 rounded-[1.5rem] border 
                  {rec.type === 'warning' ? 'bg-amber-500/10 border-amber-500/20 text-amber-600' : 
                   rec.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600' : 
                   'bg-blue-500/10 border-blue-500/20 text-blue-600'}">
                  <div class="flex items-start gap-3">
                    <div class="mt-1 shrink-0">
                      {#if rec.type === 'warning'} <AlertTriangle size={18} />
                      {:else if rec.type === 'success'} <CheckCircle2 size={18} />
                      {:else} <Lightbulb size={18} /> {/if}
                    </div>
                    <div>
                      <h4 class="font-bold text-sm mb-1">{rec.title}</h4>
                      <p class="text-xs opacity-90 leading-relaxed">{rec.desc}</p>
                    </div>
                  </div>
                </div>
              {/each}
              <p class="text-[10px] text-muted-foreground text-center mt-4">Di-generate oleh AI pada {new Date(currentRekomendasi.created_at).toLocaleDateString('id-ID')}</p>
            </div>
          {/if}
        </div>
      </div>

      <!-- Bagian 2: Validasi Pakar -->
      <div class="bg-card/60 backdrop-blur-3xl border border-border rounded-[2.5rem] p-8 shadow-xl flex flex-col h-full relative overflow-hidden transition-all hover:border-blue-500/30">
        <!-- Decoration -->
        <div class="absolute -right-10 -top-10 text-blue-500/5 pointer-events-none">
          <UserCheck size={200} />
        </div>

        <div class="relative z-10 flex flex-col h-full">
          <div class="flex items-center gap-4 mb-8">
            <div class="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500 shrink-0">
              <UserCheck size={28} />
            </div>
            <div>
              <h2 class="text-2xl font-black text-foreground uppercase tracking-tight">Validasi Pakar</h2>
              <p class="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2 mt-1">
                <MessageSquareText size={12} class="text-blue-400" /> Umpan Balik Ahli Agronomis / Akademisi
              </p>
            </div>
          </div>

          {#if !currentRekomendasi}
             <div class="flex-1 flex flex-col items-center justify-center text-center p-8 bg-background/50 border border-dashed border-border rounded-[2rem] opacity-50">
                <UserCheck size={48} class="text-muted-foreground/30 mb-4" />
                <p class="text-sm text-muted-foreground">Pakar akan memberikan validasi setelah AI selesai menganalisis.</p>
             </div>
          {:else if currentRekomendasi.status === 'pending'}
             <!-- Menunggu Validasi -->
             {#if currentUserRole === 'expert' || currentUserRole === 'administrator'}
               <!-- Form untuk Pakar -->
               <div class="flex-1 flex flex-col" in:fade>
                 <div class="bg-blue-500/5 border border-blue-500/20 rounded-[2rem] p-6 flex-1 flex flex-col">
                   <label for="feedback" class="block text-[10px] font-black text-blue-500 uppercase tracking-widest mb-3">Masukkan Evaluasi Anda</label>
                   <textarea
                     id="feedback"
                     bind:value={expertFeedbackInput}
                     placeholder="Tuliskan catatan agronomi, koreksi, atau tambahan untuk rekomendasi AI ini..."
                     class="w-full flex-1 bg-background/50 border border-border rounded-xl p-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all resize-none mb-4"
                   ></textarea>
                   <button
                     on:click={submitFeedback}
                     disabled={isSubmittingFeedback || !expertFeedbackInput.trim()}
                     class="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 disabled:opacity-50"
                   >
                     {#if isSubmittingFeedback}
                       <Loader2 size={16} class="animate-spin" /> Menyimpan...
                     {:else}
                       <Send size={16} /> Simpan Validasi
                     {/if}
                   </button>
                 </div>
               </div>
             {:else}
               <!-- Tampilan user menunggu pakar -->
               <div class="flex-1 flex flex-col items-center justify-center text-center p-8 bg-blue-500/5 border border-blue-500/20 rounded-[2rem]">
                  <Loader2 size={48} class="text-blue-500/50 mb-4 animate-spin" />
                  <h3 class="text-lg font-bold text-foreground mb-2">Menunggu Validasi</h3>
                  <p class="text-sm text-muted-foreground">Rekomendasi AI telah dikirim ke pakar agronomis untuk ditinjau dan divalidasi. Mohon tunggu umpan balik dari mereka.</p>
               </div>
             {/if}
          {:else if currentRekomendasi.status === 'validated'}
            <!-- Tervalidasi -->
            <div class="flex-1 flex flex-col" in:fly={{ y: 20, delay: 300 }}>
              
              <div class="flex items-center gap-4 p-4 bg-background/80 border border-border rounded-2xl mb-6 shadow-sm">
                {#if currentRekomendasi.expert?.avatar_url}
                  <img src={currentRekomendasi.expert.avatar_url} alt="Pakar" class="w-12 h-12 rounded-full border-2 border-blue-500/50 object-cover" />
                {:else}
                  <div class="w-12 h-12 rounded-full border-2 border-blue-500/50 bg-blue-500/20 flex items-center justify-center text-blue-500 font-bold">
                    {currentRekomendasi.expert?.full_name?.charAt(0) || 'P'}
                  </div>
                {/if}
                <div>
                  <h4 class="font-black text-sm text-foreground">{currentRekomendasi.expert?.full_name || 'Pakar Agronomis'}</h4>
                  <p class="text-[10px] font-bold text-blue-500 uppercase tracking-widest">{currentRekomendasi.expert?.role || 'Expert'}</p>
                </div>
                <div class="ml-auto">
                  <div class="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-full text-[9px] font-black uppercase tracking-widest">
                    <CheckCircle2 size={10} /> Tervalidasi
                  </div>
                </div>
              </div>

              <div class="bg-blue-500/5 border border-blue-500/20 rounded-[2rem] p-6 relative flex-1 flex flex-col">
                <div class="absolute -top-3 left-8 text-blue-500 bg-card p-1 rounded-full">
                  <MessageSquareText size={20} />
                </div>

                {#if currentUserRole === 'expert' || currentUserRole === 'administrator'}
                   <textarea
                     bind:value={expertFeedbackInput}
                     class="w-full flex-1 bg-transparent border-none text-sm text-foreground italic relative z-10 mt-2 focus:outline-none resize-none leading-loose"
                   ></textarea>
                   <div class="mt-4 flex justify-end">
                      <button on:click={submitFeedback} disabled={isSubmittingFeedback} class="px-4 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors flex items-center gap-2">
                         {#if isSubmittingFeedback}
                           <Loader2 size={14} class="animate-spin" />
                         {:else}
                           <Send size={14} /> Update
                         {/if}
                      </button>
                   </div>
                {:else}
                   <p class="text-sm text-foreground leading-loose italic relative z-10 mt-2">
                     "{currentRekomendasi.expert_feedback}"
                   </p>
                {/if}
                
                <div class="mt-auto flex items-center justify-between border-t border-blue-500/10 pt-4">
                  <div class="flex items-center gap-2 text-muted-foreground">
                    <Calendar size={14} />
                    <span class="text-[10px] font-bold uppercase tracking-widest">{new Date(currentRekomendasi.updated_at).toLocaleDateString('id-ID')}</span>
                  </div>
                </div>
              </div>

            </div>
          {/if}

        </div>
      </div>

    </div>
  {/if}
</div>
