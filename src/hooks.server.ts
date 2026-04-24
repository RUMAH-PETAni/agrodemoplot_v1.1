import type { Handle } from '@sveltejs/kit';
import { supabase } from '$lib/supabase/client';

// Define a type for our session
interface AppSession {
  session: any; // You can be more specific with the type if needed
}

export const handle: Handle = async ({ event, resolve }) => {
  // Get session from Supabase
  const { data: { session } } = await supabase.auth.getSession();

  // Add session to event locals
  (event.locals as any).session = session;

  const response = await resolve(event);
  return response;
};