<script lang="ts">
  import { onMount, tick } from "svelte";
  import {
    BotMessageSquare,
    Send,
    Trash2,
    ShieldAlert,
    Sparkles,
    X,
    CheckCircle2,
    AlertTriangle,
  } from "@lucide/svelte";
  import { goto } from "$app/navigation";
  import { fade, fly, scale } from "svelte/transition";
  import { marked } from "marked";
  import DOMPurify from "dompurify";
  import { browser } from "$app/environment";

  // Define types for our chat messages
  export type Message = {
    id: string;
    content: string;
    role: "user" | "assistant";
    timestamp: Date;
  };

  // Props
  let { onclose } = $props<{ onclose?: () => void }>();

  // State variables
  let messages = $state<Message[]>([]);
  let input = $state("");
  let isLoading = $state(false);
  let error = $state<string | null>(null);
  let isLoggedIn = $state(false);

  // Reference to the messages container for scrolling
  let messagesContainer = $state<HTMLDivElement | null>(null);

  // Initialize with a welcome message and check login status
  onMount(() => {
    const updateLoginStatus = () => {
      const authKey = Object.keys(localStorage).find(
        (key) => key.includes("sb-") && key.includes("-auth-token"),
      );
      if (authKey) {
        const session = localStorage.getItem(authKey);
        isLoggedIn = !!session && session !== "null";
      } else {
        isLoggedIn = false;
      }
    };

    updateLoginStatus();
    window.addEventListener("storage", updateLoginStatus);

    messages = [
      {
        id: "1",
        content:
          "Halo! Saya **AI-Gronomis**, asisten berbasis kecerdasan buatan. Saya siap membantu Anda mengoptimalkan praktik pertanian dengan data presisi.",
        role: "assistant",
        timestamp: new Date(),
      },
    ];

    return () => window.removeEventListener("storage", updateLoginStatus);
  });

  // Auto-scroll to bottom whenever messages change
  $effect(() => {
    if (messages && messagesContainer) {
      tick().then(() => {
        messagesContainer?.scrollTo({
          top: messagesContainer.scrollHeight,
          behavior: "smooth",
        });
      });
    }
  });

  async function sendMessage() {
    if (!isLoggedIn) {
      goto("/auth/login");
      return;
    }

    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: input,
      role: "user",
      timestamp: new Date(),
    };

    messages = [...messages, userMessage];
    const userInput = input;
    input = "";
    isLoading = true;
    error = null;

    try {
      const response = await fetch("/api/ai-gronomist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            ...messages
              .slice(0, -1)
              .map((msg) => ({ role: msg.role, content: msg.content })),
            { role: "user", content: userInput },
          ],
        }),
      });

      if (!response.ok) throw new Error("Gagal mendapatkan respon dari AI.");

      const data = await response.json();
      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        content: data.content,
        role: "assistant",
        timestamp: new Date(),
      };

      messages = [...messages, assistantMessage];
    } catch (e: any) {
      error = e.message || "Terjadi kesalahan sistem.";
    } finally {
      isLoading = false;
    }
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  function clearChat() {
    messages = [messages[0]];
    input = "";
  }

  function renderMarkdown(content: string) {
    const rawHtml = marked.parse(content) as string;
    return browser ? DOMPurify.sanitize(rawHtml) : rawHtml;
  }
</script>

<div
  class="flex flex-col h-full w-full bg-background relative border-none overflow-hidden shadow-2xl"
>
  <!-- Immersive Header (Unified) -->
  <div class="relative bg-emerald-900 px-8 py-6 overflow-hidden shrink-0">
    <div class="absolute inset-0 z-0 opacity-30">
      <div
        class="absolute top-0 right-0 w-32 h-32 bg-emerald-400 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2"
      ></div>
      <div
        class="absolute bottom-0 left-0 w-24 h-24 bg-blue-500 blur-3xl rounded-full -translate-x-1/2 translate-y-1/2"
      ></div>
    </div>

    <div class="relative z-10 flex items-center justify-between">
      <div class="flex items-center gap-4">
        <div
          class="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white"
        >
          <BotMessageSquare size={28} />
        </div>
        <div>
          <h3
            class="font-black text-white tracking-tighter text-lg leading-none mb-1 uppercase"
          >
            AI-Gronomis
          </h3>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <button
          onclick={clearChat}
          class="p-3 rounded-xl bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-all active:scale-95"
          title="Bersihkan percakapan"
        >
          <Trash2 size={18} />
        </button>
        {#if onclose}
          <button
            onclick={onclose}
            class="p-3 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all active:scale-95 border border-white/10"
            title="Tutup"
          >
            <X size={20} />
          </button>
        {/if}
      </div>
    </div>
  </div>

  <!-- Chat History -->
  <div
    class="flex-1 overflow-y-auto p-8 space-y-6 bg-transparent"
    bind:this={messagesContainer}
  >
    {#each messages as message (message.id)}
      <div
        class="flex flex-col {message.role === 'user'
          ? 'items-end'
          : 'items-start'}"
        in:fly={{ y: 10, duration: 300 }}
      >
        <div class="max-w-[90%] sm:max-w-[80%] space-y-1.5">
          <div
            class="px-6 py-4 rounded-3xl leading-relaxed text-sm shadow-sm
            {message.role === 'user'
              ? 'bg-emerald-600 text-white rounded-tr-none font-medium'
              : 'bg-card border border-border/80 backdrop-blur-md text-foreground rounded-tl-none'}"
          >
            <div class="markdown-container">
              {@html renderMarkdown(message.content)}
            </div>
          </div>
          <div class="flex items-center gap-2 px-1">
            {#if message.role === "assistant"}
              <div class="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
            {/if}
            <span
              class="text-[9px] font-black uppercase tracking-widest text-muted-foreground/50"
            >
              {message.timestamp.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
        </div>
      </div>
    {/each}

    {#if isLoading}
      <div class="flex items-start gap-3" in:fade>
        <div
          class="px-6 py-4 bg-card border border-border rounded-2xl rounded-tl-none flex gap-2 items-center shadow-sm"
        >
          <div
            class="w-2 h-2 rounded-full bg-emerald-500 animate-bounce [animation-delay:-0.3s]"
          ></div>
          <div
            class="w-2 h-2 rounded-full bg-emerald-500 animate-bounce [animation-delay:-0.15s]"
          ></div>
          <div class="w-2 h-2 rounded-full bg-emerald-500 animate-bounce"></div>
        </div>
      </div>
    {/if}

    {#if error}
      <div class="hidden"></div>
    {/if}
  </div>

  <!-- Input Area -->
  <div class="px-8 py-6 bg-card">
    {#if !isLoggedIn}
      <div
        class="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between gap-4"
        in:fly={{ y: 10 }}
      >
        <div class="flex items-center gap-4">
          <div
            class="p-3 bg-amber-500 text-white rounded-xl shadow-lg shadow-amber-500/20"
          >
            <BotMessageSquare size={18} />
          </div>
          <p
            class="text-[10px] font-black uppercase tracking-widest text-amber-600"
          >
            Otorisasi Diperlukan
          </p>
        </div>
        <button
          onclick={() => {
            onclose?.();
            goto("/auth/login");
          }}
          class="px-6 py-2 bg-amber-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all active:scale-95 shadow-lg shadow-amber-600/20"
          >Login</button
        >
      </div>
    {/if}

    <!-- Input Area Container -->
    <div
      class="relative group bg-gradient-to-t from-background via-background to-transparent pt-10"
    >
      <!-- Ambient Glow -->
      <div
        class="absolute -inset-1 bg-gradient-to-r from-emerald-500/20 to-blue-500/20 blur-3xl opacity-0 group-focus-within:opacity-100 transition-all duration-700 pointer-events-none"
      ></div>

      <div class="relative flex items-end gap-3">
        <!-- Main Textarea -->
        <textarea
          bind:value={input}
          onkeydown={handleKeyDown}
          placeholder="Tanyakan seputar pertanian anda..."
          class="flex-1 bg-transparent px-2 py-3.5 min-h-[52px] max-h-40 resize-none outline-none text-sm font-medium text-foreground placeholder:text-muted-foreground/50 scrollbar-hide leading-relaxed"
          disabled={!isLoggedIn || isLoading}
          rows={1}
        ></textarea>

        <!-- Send Button Container -->
        <button
          onclick={sendMessage}
          disabled={isLoading || !input.trim() || !isLoggedIn}
          class="relative w-12 h-12 bg-emerald-600 hover:bg-emerald-700 disabled:bg-muted/50 disabled:opacity-50 text-white rounded-xl transition-all duration-300 shadow-lg shadow-emerald-600/20 active:scale-90 flex items-center justify-center shrink-0 overflow-hidden group/btn"
        >
          <!-- Button Shine -->
          <div
            class="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent opacity-0 group-hover/btn:opacity-100 transition-opacity"
          ></div>

          {#if isLoading}
            <div
              class="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin"
            ></div>
          {:else}
            <Send
              size={18}
              class="group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform"
            />
          {/if}
        </button>
      </div>
    </div>
  </div>

  <!-- Success/Error Toast (Inside Component Context) -->
  {#if error}
    <div
      class="absolute bottom-32 left-1/2 -translate-x-1/2 z-[2000] w-[80%] px-6 py-4 bg-red-600 text-white rounded-2xl shadow-2xl flex items-center gap-3 font-black uppercase text-[10px] tracking-widest"
      in:fly={{ y: 20 }}
      out:fade
    >
      <AlertTriangle size={18} />
      <span class="flex-1">{error}</span>
      <button
        onclick={() => (error = null)}
        class="opacity-50 hover:opacity-100 transition-opacity"
        ><X size={14} /></button
      >
    </div>
  {/if}
</div>

<style>
  :global(.markdown-container p) {
    margin-bottom: 0.75rem;
  }
  :global(.markdown-container p:last-child) {
    margin-bottom: 0;
  }
  :global(.markdown-container ul, .markdown-container ol) {
    margin-bottom: 0.75rem;
    padding-left: 1.5rem;
  }
  :global(.markdown-container li) {
    list-style-type: disc;
  }
  :global(.markdown-container strong) {
    font-weight: 900;
  }

  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }
  .scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
</style>
