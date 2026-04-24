<script lang="ts">
  import { auth } from '$lib/supabase/auth';
  import { supabase } from '$lib/supabase/client';
  import { goto } from '$app/navigation';
  import { browser } from '$app/environment';

  let newPassword = $state('');
  let confirmNewPassword = $state('');
  let loading = $state(false);
  let success = $state(false);
  let error = $state('');
  let pageReady = $state(false);

  const handlePasswordReset = async (e: Event) => {
    e.preventDefault();
    loading = true;
    error = '';

    // Validate passwords match
    if (newPassword !== confirmNewPassword) {
      error = 'Kata sandi baru dan konfirmasi kata sandi tidak cocok';
      loading = false;
      return;
    }

    if (newPassword.length < 6) {
      error = 'Kata sandi baru harus minimal 6 karakter';
      loading = false;
      return;
    }

    try {
      // Update the password
      const { error: resetError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (resetError) {
        error = resetError.message;
        return;
      }

      // Sign out the user after password change
      await auth.signOut();

      // Password successfully updated
      success = true;
      setTimeout(() => {
        goto('/auth/login?password_reset=success');
      }, 5000);
    } catch (err) {
      console.error('Password reset error:', err);
      error = (err as Error).message || 'Terjadi kesalahan saat mengatur ulang kata sandi';
    } finally {
      loading = false;
    }
  };

  // Check if user has arrived here after token verification by Supabase
  // Supabase will redirect to this page with auth parameters in the hash
  if (browser) {
    // Parse the URL hash to check if this is a recovery redirect
    const hash = window.location.hash.substring(1); // Remove the '#'
    const hashParams = new URLSearchParams(hash);

    const type = hashParams.get('type');

    // If this is a recovery type, the token has been processed by Supabase
    // and the user has a valid session
    if (type === 'recovery') {
      // The session is already valid, user can change password
      pageReady = true;
    } else {
      // Check if there's an active session regardless
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          pageReady = true;
        } else {
          // If no session, redirect back to login
          goto('/auth/login');
        }
      });
    }
  }

  // Simple form validation
  let isFormValid = $derived(
    newPassword.length >= 6 &&
    newPassword === confirmNewPassword
  );
</script>

<div class="min-h-screen bg-gray-50 flex items-center justify-center p-6">
  <div class="max-w-md w-full">
    <div class="bg-white rounded-lg shadow p-6">
      <h1 class="text-2xl font-bold mb-6 text-center text-gray-900">Atur Ulang Kata Sandi</h1>

      {#if !pageReady}
        <div class="mb-6 p-4 bg-yellow-50 border border-yellow-200 text-yellow-700 rounded-lg">
          <p>Mengalihkan... Silakan tunggu.</p>
        </div>
      {:else if success}
        <div class="mb-6 p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg">
          <p>Kata sandi Anda telah berhasil diatur ulang.</p>
        </div>
      {:else}
        <p class="text-gray-600 mb-6">Silakan masukkan kata sandi baru Anda</p>

        <form onsubmit={handlePasswordReset}>
          <div class="mb-4">
            <label for="newPassword" class="block text-sm font-medium text-gray-700 mb-1">Kata Sandi Baru</label>
            <input
              id="newPassword"
              type="password"
              bind:value={newPassword}
              class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="••••••••"
              required
            />
          </div>

          <div class="mb-6">
            <label for="confirmNewPassword" class="block text-sm font-medium text-gray-700 mb-1">Konfirmasi Kata Sandi Baru</label>
            <input
              id="confirmNewPassword"
              type="password"
              bind:value={confirmNewPassword}
              class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="••••••••"
              required
            />
          </div>

          {#if error}
            <div class="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
              {error}
            </div>
          {/if}

          <button
            type="submit"
            disabled={!isFormValid || loading}
            class="w-full bg-green-700 hover:bg-green-800 text-white font-semibold py-2 px-4 rounded-lg focus:outline-none disabled:opacity-50"
          >
            {loading ? 'Mengatur Ulang...' : 'Atur Ulang Kata Sandi'}
          </button>
        </form>
      {/if}
    </div>
  </div>
</div>