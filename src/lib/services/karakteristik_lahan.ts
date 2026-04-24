import { supabase } from '$lib/supabase/client';
import type { KarakteristikLahan, KarakteristikLahanInsert, KarakteristikLahanUpdate } from '../../types/karakteristik_lahan';

export async function getKarakteristikLahanByDemoplotId(demoplotId: string): Promise<KarakteristikLahan | null> {
  const { data, error } = await supabase
    .from('karakteristik_lahan')
    .select('*')
    .eq('demoplot_id', demoplotId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // No rows found
    throw error;
  }
  return data;
}

export async function createKarakteristikLahan(data: KarakteristikLahanInsert): Promise<KarakteristikLahan> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data: result, error } = await supabase
    .from('karakteristik_lahan')
    .insert({ ...data, user_id: user.id })
    .select()
    .single();

  if (error) throw error;
  return result;
}

export async function updateKarakteristikLahan(id: string, updates: KarakteristikLahanUpdate): Promise<KarakteristikLahan> {
  const { data: result, error } = await supabase
    .from('karakteristik_lahan')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return result;
}

export async function deleteKarakteristikLahanByDemoplotId(demoplotId: string): Promise<void> {
  const { error } = await supabase
    .from('karakteristik_lahan')
    .delete()
    .eq('demoplot_id', demoplotId);

  if (error) throw error;
}
