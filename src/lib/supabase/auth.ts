import { writable, type Writable } from 'svelte/store';
import { supabase } from '$lib/supabase/client';
import type { Session, User } from '@supabase/supabase-js';

export interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
}

const createAuthStore = () => {
  const { subscribe, set, update }: Writable<AuthState> = writable({
    user: null,
    session: null,
    loading: true
  });

  // Initialize auth state
  const init = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user || null;

    set({ user, session, loading: false });

    // Listen for auth changes
    const { data: { subscription } } = await supabase.auth.onAuthStateChange(
      (_event, session) => {
        const user = session?.user || null;
        update(prev => ({ ...prev, user, session, loading: false }));
      }
    );

    return subscription;
  };

  const signIn = async (email: string, password: string) => {
    const { error, data } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      throw error;
    }

    return data;
  };

  const signUp = async (email: string, password: string) => {
    const { error, data } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/profile?email_confirmed=true`
      }
    });

    if (error) {
      throw error;
    }

    return data;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw error;
    }
    // State will be reset by onAuthStateChange listener
  };

  const updateProfile = async (updates: any) => {
    // Get current session to get user ID
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;

    if (!userId) {
      throw new Error('No user ID available');
    }

    const { error } = await supabase.from('profiles').upsert({
      id: userId,
      ...updates,
      updated_at: new Date().toISOString()
    }, { onConflict: 'id' });

    if (error) {
      console.error('Error in updateProfile (profiles table):', error);
      // Don't throw - the user_metadata update is the primary storage
    }
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`
    });

    if (error) {
      throw error;
    }
  };

  return {
    subscribe,
    init,
    signIn,
    signUp,
    signOut,
    updateProfile,
    resetPassword
  };
};

export const auth = createAuthStore();