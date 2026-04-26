<script lang="ts">
  import { auth } from "$lib/supabase/auth";
  import { browser } from "$app/environment";
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { supabase } from "$lib/supabase/client";
  import type { User } from "@supabase/supabase-js";
  import {
    User as UserIcon,
    Mail,
    Phone,
    MapPin,
    ShieldCheck,
    KeyRound,
    Calendar,
    Camera,
    X,
    CheckCircle2,
    AlertCircle,
    AlertTriangle,
    Save,
    LogOut,
    Sparkles,
    RefreshCw,
  } from "@lucide/svelte";
  import { fade, fly, scale } from "svelte/transition";
  import { backOut } from "svelte/easing";

  let user = $state<User | null>(null);
  let loading = $state(true);
  let showVerificationNotice = $state(false);
  let showEmailConfirmedNotice = $state(false);
  let profile = $state({
    full_name: "",
    address: "",
    phone: "",
    email: "",
    role: "",
    created_at: "",
    avatar_url: "",
  });
  let isEditing = $state(false);
  let fullName = $state("");
  let address = $state("");
  let phone = $state("");
  let isChangingPassword = $state(false);
  let newPassword = $state("");
  let confirmNewPassword = $state("");
  let passwordError = $state("");
  let passwordSuccess = $state("");
  let profileError = $state("");
  let profileSuccess = $state("");
  let showAvatarModal = $state(false);
  let selectedAvatar = $state("");

  const avatarImages = [
    "female.webp",
    "female1.webp",
    "female2.webp",
    "female3.webp",
    "female4.webp",
    "male.webp",
    "male1.webp",
    "male2.webp",
    "male3.webp",
    "male4.webp",
  ];

  const loadProfileFromDB = async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) {
      console.error("Error loading profile from database:", error);
      return null;
    }
    return data;
  };

  onMount(() => {
    if (browser) {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get("registered") === "true") showVerificationNotice = true;
      if (urlParams.get("email_confirmed") === "true")
        showEmailConfirmedNotice = true;

      const unsub = auth.subscribe(async (authState) => {
        user = authState.user;
        loading = authState.loading;

        if (!authState.loading && !authState.user) {
          goto("/auth/login");
        } else if (authState.user) {
          const profileData = await loadProfileFromDB(authState.user.id);

          if (profileData) {
            fullName = profileData.full_name || "";
            address = profileData.address || "";
            phone = profileData.phone || "";
            profile = {
              full_name: profileData.full_name || "",
              address: profileData.address || "",
              phone: profileData.phone || "",
              email: profileData.email || authState.user.email || "",
              role: profileData.role || "user",
              created_at:
                profileData.created_at || authState.user.created_at || "",
              avatar_url: profileData.avatar_url || "",
            };
          } else {
            fullName = authState.user.user_metadata?.full_name || "";
            address = authState.user.user_metadata?.address || "";
            phone = authState.user.user_metadata?.phone || "";
            profile = {
              full_name: authState.user.user_metadata?.full_name || "",
              address: authState.user.user_metadata?.address || "",
              phone: authState.user.user_metadata?.phone || "",
              email: authState.user.email || "",
              role: authState.user.user_metadata?.role || "user",
              created_at: authState.user.created_at || "",
              avatar_url: authState.user.user_metadata?.avatar_url || "",
            };
          }
        }
      });
      return () => {
        if (typeof unsub === "function") unsub();
      };
    }
  });

  const handleUpdateProfile = async () => {
    profileError = "";
    profileSuccess = "";
    try {
      if (!fullName?.trim()) {
        profileError = "Nama lengkap harus diisi";
        return;
      }
      const { error: metadataError } = await supabase.auth.updateUser({
        data: { full_name: fullName, address: address, phone: phone },
      });
      if (metadataError) throw metadataError;

      try {
        await auth.updateProfile({
          full_name: fullName,
          address: address,
          phone: phone,
          email: profile.email,
        });
      } catch (e) {
        console.warn("Profiles table update skipped:", e);
      }

      profile.full_name = fullName;
      profile.address = address;
      profile.phone = phone;
      profileSuccess = "Profil berhasil diperbarui";
      isEditing = false;
      setTimeout(() => (profileSuccess = ""), 3000);
    } catch (error) {
      profileError =
        error instanceof Error ? error.message : "Gagal memperbarui profil";
    }
  };

  const handleChangePassword = async () => {
    passwordError = "";
    passwordSuccess = "";
    if (newPassword !== confirmNewPassword) {
      passwordError = "Konfirmasi kata sandi tidak cocok";
      return;
    }
    if (newPassword.length < 6) {
      passwordError = "Kata sandi minimal 6 karakter";
      return;
    }
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) throw error;
      passwordSuccess = "Kata sandi berhasil diubah";
      newPassword = "";
      confirmNewPassword = "";
      setTimeout(() => {
        isChangingPassword = false;
        passwordSuccess = "";
      }, 3000);
    } catch (err) {
      passwordError =
        err instanceof Error ? err.message : "Gagal mengubah kata sandi";
    }
  };

  const handleSaveAvatar = async () => {
    try {
      await auth.updateProfile({ avatar_url: selectedAvatar });
      await supabase.auth.updateUser({ data: { avatar_url: selectedAvatar } });
      profile.avatar_url = selectedAvatar;
      showAvatarModal = false;
    } catch (error) {
      console.error("Error updating avatar:", error);
    }
  };
</script>

<div class="min-h-screen pb-24 px-6 max-w-7xl mx-auto space-y-12">
  {#if loading}
    <div
      class="fixed inset-0 flex flex-col items-center justify-center bg-background z-[1000]"
    >
      <div
        class="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-600 rounded-full animate-spin mb-4"
      ></div>
      <p
        class="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground animate-pulse"
      >
        Memuat Profil
      </p>
    </div>
  {:else if user}
    <!-- Profile Hero -->
    <section
      class="relative mt-28 rounded-[2.5rem] bg-emerald-900 overflow-hidden shadow-2xl shadow-emerald-900/20"
      in:fly={{ y: -20, duration: 800 }}
    >
      <div class="absolute inset-0 z-0 opacity-40">
        <div
          class="absolute -top-[20%] -left-[10%] w-[60%] h-[120%] bg-emerald-400 blur-[120px] rounded-full"
        ></div>
        <div
          class="absolute top-[20%] -right-[10%] w-[40%] h-[80%] bg-blue-500/30 blur-[100px] rounded-full"
        ></div>
      </div>

      <div
        class="relative z-10 p-10 md:p-16 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center text-white"
      >
        <!-- Left Column: Identity & Info -->
        <div class="grow text-center lg:text-left space-y-6">
          <div
            class="inline-flex items-center gap-3 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full border border-white/10 text-[10px] font-black uppercase tracking-widest text-emerald-100"
          >
            <ShieldCheck size={12} class="text-emerald-400" /> Role: {profile.role ||
              "User"}
            <span
              class="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse ml-2"
            ></span>
          </div>
          <div class="space-y-4">
            <h1
              class="text-4xl md:text-7xl font-black tracking-tighter leading-[0.9]"
            >
              {profile.full_name || user.email?.split("@")[0]}
            </h1>
            <div
              class="flex flex-wrap justify-center lg:justify-start gap-6 text-emerald-50/70 font-medium pt-2"
            >
              <div
                class="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-xl border border-white/5"
              >
                <Mail size={16} class="text-emerald-400" />
                {profile.email}
              </div>
              <div
                class="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-xl border border-white/5"
              >
                <Calendar size={16} class="text-emerald-400" /> Bergabung {new Date(
                  profile.created_at,
                ).toLocaleDateString("id-ID", {
                  month: "long",
                  year: "numeric",
                })}
              </div>
            </div>
          </div>
        </div>

        <!-- Right Column: Avatar Section -->
        <div class="flex justify-center lg:justify-end">
          <div class="relative group">
            <div
              class="w-48 h-48 md:w-64 md:h-64 rounded-[3.5rem] overflow-hidden border-4 border-white/20 shadow-2xl transition-transform duration-500 group-hover:scale-105 rotate-2 group-hover:rotate-0"
            >
              {#if profile.avatar_url}
                <img
                  src={profile.avatar_url}
                  alt="Profile"
                  class="w-full h-full object-cover"
                />
              {:else}
                <div
                  class="w-full h-full bg-white/10 flex items-center justify-center text-6xl font-black"
                >
                  {profile.email?.charAt(0).toUpperCase()}
                </div>
              {/if}
            </div>

            <button
              onclick={() => {
                showAvatarModal = true;
                selectedAvatar = profile.avatar_url || "";
              }}
              class="absolute -bottom-4 -right-4 p-5 bg-emerald-600 text-white rounded-[2rem] shadow-2xl shadow-emerald-500/40 hover:scale-110 active:scale-95 transition-all z-20"
              title="Ubah Avatar"
            >
              <UserIcon size={24} />
            </button>

            <!-- Decorative Glow behind avatar -->
            <div
              class="absolute inset-0 bg-emerald-400/20 blur-[60px] rounded-full -z-10 animate-pulse"
            ></div>
          </div>
        </div>
      </div>
    </section>

    <!-- Notices (Toasts) -->
    {#if profileSuccess || passwordSuccess}
      <div
        class="fixed bottom-10 left-1/2 -translate-x-1/2 z-[2000] px-8 py-4 bg-emerald-600 text-white rounded-2xl shadow-2xl flex items-center gap-3 font-black uppercase text-[10px] tracking-widest"
        in:fly={{ y: 20 }}
        out:fade
      >
        <CheckCircle2 size={20} />
        {profileSuccess || passwordSuccess}
      </div>
    {/if}

    {#if profileError || passwordError || showVerificationNotice}
      <div
        class="fixed bottom-10 left-1/2 -translate-x-1/2 z-[2000] px-8 py-4 bg-red-600 text-white rounded-2xl shadow-2xl flex items-center gap-3 font-black uppercase text-[10px] tracking-widest"
        in:fly={{ y: 20 }}
        out:fade
      >
        <AlertTriangle size={20} />
        {profileError ||
          passwordError ||
          (showVerificationNotice ? "Cek email Anda untuk verifikasi" : "")}
        <button
          onclick={() => {
            profileError = "";
            passwordError = "";
            showVerificationNotice = false;
          }}
          class="ml-4 opacity-50 hover:opacity-100 transition-opacity"
        >
          <X size={16} />
        </button>
      </div>
    {/if}

    {#if showEmailConfirmedNotice}
      <div
        class="fixed bottom-10 left-1/2 -translate-x-1/2 z-[2000] px-8 py-4 bg-blue-600 text-white rounded-2xl shadow-2xl flex items-center gap-3 font-black uppercase text-[10px] tracking-widest"
        in:fly={{ y: 20 }}
        out:fade
      >
        <CheckCircle2 size={20} />
        Email berhasil dikonfirmasi!
        <button
          onclick={() => (showEmailConfirmedNotice = false)}
          class="ml-4 opacity-50"
        >
          <X size={16} />
        </button>
      </div>
    {/if}

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <!-- Left Column: Personal Info -->
      <div class="lg:col-span-2 space-y-8">
        <div
          class="bg-card/60 backdrop-blur-3xl border border-border shadow-2xl rounded-[2.5rem] overflow-hidden p-8 space-y-8"
        >
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-4">
              <div
                class="w-12 h-12 bg-emerald-500/10 text-emerald-600 rounded-2xl flex items-center justify-center"
              >
                <UserIcon size={24} />
              </div>
              <h2 class="text-xl font-black uppercase tracking-tight">
                Informasi Personal
              </h2>
            </div>
            {#if !isEditing}
              <button
                onclick={() => {
                  isEditing = true;
                }}
                class="px-6 py-2 bg-emerald-600/10 text-emerald-600 font-black uppercase tracking-widest text-[10px] rounded-xl hover:bg-emerald-600 hover:text-white transition-all"
                >Edit Profil</button
              >
            {/if}
          </div>

          {#if isEditing}
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6" in:fade>
              <div class="space-y-2">
                <label
                  class="text-[10px] font-black uppercase tracking-widest text-muted-foreground"
                  >Nama Lengkap</label
                >
                <div class="relative">
                  <UserIcon
                    size={16}
                    class="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
                  />
                  <input
                    type="text"
                    bind:value={fullName}
                    class="w-full bg-muted/30 border-border focus:border-emerald-500/50 rounded-2xl p-4 pl-12 text-sm font-medium transition-all"
                  />
                </div>
              </div>
              <div class="space-y-2">
                <label
                  class="text-[10px] font-black uppercase tracking-widest text-muted-foreground"
                  >No. Telepon</label
                >
                <div class="relative">
                  <Phone
                    size={16}
                    class="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
                  />
                  <input
                    type="tel"
                    bind:value={phone}
                    class="w-full bg-muted/30 border-border rounded-2xl p-4 pl-12 text-sm font-medium"
                  />
                </div>
              </div>
              <div class="space-y-2 md:col-span-2">
                <label
                  class="text-[10px] font-black uppercase tracking-widest text-muted-foreground"
                  >Alamat</label
                >
                <div class="relative">
                  <MapPin
                    size={16}
                    class="absolute left-4 top-4 text-muted-foreground"
                  />
                  <textarea
                    bind:value={address}
                    rows="3"
                    class="w-full bg-muted/30 border-border rounded-2xl p-4 pl-12 text-sm font-medium"
                  ></textarea>
                </div>
              </div>
              <div class="flex gap-3 pt-4 md:col-span-2">
                <button
                  onclick={() => (isEditing = false)}
                  class="flex-1 py-4 bg-muted text-foreground font-black uppercase tracking-widest text-[10px] rounded-2xl"
                  >Batal</button
                >
                <button
                  onclick={handleUpdateProfile}
                  class="flex-1 py-4 bg-emerald-600 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl shadow-lg shadow-emerald-600/20"
                  >Simpan Perubahan</button
                >
              </div>
            </div>
          {:else}
            <div class="grid grid-cols-1 md:grid-cols-2 gap-8" in:fade>
              <div class="p-6 bg-muted/30 rounded-3xl border border-border/50">
                <p
                  class="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-2"
                >
                  Nama Lengkap
                </p>
                <p class="font-black text-lg">{profile.full_name || "-"}</p>
              </div>
              <div class="p-6 bg-muted/30 rounded-3xl border border-border/50">
                <p
                  class="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-2"
                >
                  Ponsel
                </p>
                <p class="font-black text-lg">{profile.phone || "-"}</p>
              </div>
              <div
                class="p-6 bg-muted/30 rounded-3xl border border-border/50 md:col-span-2"
              >
                <p
                  class="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-2"
                >
                  Alamat Domisili
                </p>
                <p class="font-medium text-muted-foreground">
                  {profile.address || "-"}
                </p>
              </div>
            </div>
          {/if}
        </div>
      </div>

      <!-- Right Column: Security -->
      <div class="space-y-8">
        <div
          class="bg-card/60 backdrop-blur-3xl border border-border shadow-2xl rounded-[2.5rem] p-8 space-y-8"
        >
          <div class="flex items-center gap-4">
            <div
              class="w-12 h-12 bg-blue-500/10 text-blue-600 rounded-2xl flex items-center justify-center"
            >
              <ShieldCheck size={24} />
            </div>
            <h2 class="text-xl font-black uppercase tracking-tight">
              Keamanan
            </h2>
          </div>

          <div class="space-y-6">
            <div
              class="p-6 bg-muted/30 rounded-3xl border border-border/50 space-y-4"
            >
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm font-black uppercase tracking-tight">
                    Kata Sandi
                  </p>
                  <p class="text-[10px] text-muted-foreground font-medium">
                    Terakhir diubah: -
                  </p>
                </div>
                <button
                  onclick={() => (isChangingPassword = !isChangingPassword)}
                  class="p-2 hover:bg-muted rounded-xl transition-all"
                  ><KeyRound size={20} class="text-blue-500" /></button
                >
              </div>

              {#if isChangingPassword}
                <div class="space-y-4 pt-4" in:fly={{ y: 10 }}>
                  <input
                    type="password"
                    bind:value={newPassword}
                    placeholder="Kata Sandi Baru"
                    class="w-full bg-white border-border rounded-xl p-3 text-sm font-medium"
                  />
                  <input
                    type="password"
                    bind:value={confirmNewPassword}
                    placeholder="Ulangi Kata Sandi"
                    class="w-full bg-white border-border rounded-xl p-3 text-sm font-medium"
                  />
                  {#if passwordError || passwordSuccess}
                    <div class="hidden"></div>
                  {/if}
                  <button
                    onclick={handleChangePassword}
                    class="w-full py-3 bg-blue-600 text-white font-black uppercase tracking-widest text-[10px] rounded-xl shadow-lg shadow-blue-600/20"
                    >Perbarui Sandi</button
                  >
                </div>
              {/if}
            </div>

            <button
              onclick={() => auth.signOut().then(() => goto("/auth/login"))}
              class="w-full py-4 bg-red-500/10 text-red-500 font-black uppercase tracking-widest text-[10px] rounded-2xl flex items-center justify-center gap-3 hover:bg-red-500 hover:text-white transition-all shadow-xl shadow-red-500/5 group"
            >
              <LogOut
                size={16}
                class="group-hover:-translate-x-1 transition-transform"
              /> Keluar dari Akun
            </button>
          </div>
        </div>

        <div
          class="p-8 bg-emerald-950 rounded-[2.5rem] shadow-2xl relative overflow-hidden group"
        >
          <div
            class="absolute inset-0 bg-gradient-to-br from-emerald-500/20 to-transparent"
          ></div>
          <div class="relative z-10 space-y-4 text-white">
            <h3 class="text-lg font-black uppercase tracking-tight">
              Butuh Bantuan?
            </h3>
            <p class="text-xs text-emerald-100/60 font-medium leading-relaxed">
              Hubungi admin Agrodemoplot jika Anda mengalami kesulitan dalam
              mengelola data profil Anda.
            </p>
            <button
              class="px-6 py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl text-[10px] font-black uppercase tracking-widest group-hover:bg-white group-hover:text-emerald-900 transition-all"
              >Support Center</button
            >
          </div>
        </div>
      </div>
    </div>
  {/if}
</div>

<!-- Avatar Modal -->
{#if showAvatarModal}
  <div
    class="fixed inset-0 bg-background/60 backdrop-blur-xl z-[2000] flex items-center justify-center p-6"
    transition:fade
    onclick={() => (showAvatarModal = false)}
  >
    <div
      class="w-full max-w-2xl bg-card border border-border shadow-2xl rounded-[2.5rem] overflow-hidden flex flex-col max-h-[90vh]"
      in:fly={{ y: 20, duration: 400 }}
      onclick={(e) => e.stopPropagation()}
    >
      <div
        class="p-8 h-20 border-b border-border flex items-center justify-between bg-muted/30"
      >
        <div>
          <h2 class="text-2xl font-black uppercase tracking-tight">
            Pilih Avatar
          </h2>
        </div>
        <button
          onclick={() => (showAvatarModal = false)}
          class="p-3 bg-white border border-border rounded-2xl hover:bg-red-50 hover:text-red-500 transition-all"
          ><X size={24} /></button
        >
      </div>

      <div class="p-8 overflow-y-auto">
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-6">
          {#each avatarImages as avatar (avatar)}
            <button
              class="relative group aspect-square rounded-[2rem] overflow-hidden border-2 transition-all duration-500 {selectedAvatar ===
              `/avatar/${avatar}`
                ? 'border-emerald-500 ring-4 ring-emerald-500/20 scale-105'
                : 'border-border hover:border-emerald-500/50'}"
              onclick={() => (selectedAvatar = `/avatar/${avatar}`)}
            >
              <img
                src={`/avatar/${avatar}`}
                alt="Avatar"
                class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              />
              {#if selectedAvatar === `/avatar/${avatar}`}
                <div
                  class="absolute inset-0 bg-emerald-500/20 flex items-center justify-center"
                  in:scale
                >
                  <CheckCircle2 size={32} class="text-white drop-shadow-lg" />
                </div>
              {/if}
            </button>
          {/each}
        </div>
      </div>

      <div
        class="p-8 h-20 bg-muted/30 border-t border-border flex items-center justify-end gap-3"
      >
        <button
          onclick={() => (showAvatarModal = false)}
          class="p-3 bg-white border border-border font-black uppercase tracking-widest text-[10px] rounded-xl hover:bg-muted transition-all"
          >Batal</button
        >
        <button
          onclick={handleSaveAvatar}
          class="p-3 bg-emerald-600 text-white font-black uppercase tracking-widest text-[10px] rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20"
          >Terapkan Avatar</button
        >
      </div>
    </div>
  </div>
{/if}
