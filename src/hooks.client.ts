import { auth } from '$lib/supabase/auth';
import { browser } from '$app/environment';

// Initialize auth store when the app starts
if (browser) {
  auth.init();
}

export async function handleError({ error, event }) {
  console.error('Unhandled error in +layout.ts:', error, event);
  return {
    message: 'An unexpected error occurred'
  };
}