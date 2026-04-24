import { supabase } from '../supabase/client';
import type { LogAktifitas } from '../../types/log_aktifitas';

export async function getLogAktifitasByDemoplotId(demoplotId: string): Promise<LogAktifitas[]> {
  const { data, error } = await supabase
    .from('log_aktifitas')
    .select('*')
    .eq('demoplot_id', demoplotId)
    .order('tanggal', { ascending: false });

  if (error) {
    console.error('Error fetching log aktifitas:', error);
    throw error;
  }

  return data || [];
}

export async function createLogAktifitas(log: Partial<LogAktifitas>): Promise<LogAktifitas> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('log_aktifitas')
    .insert({ ...log, user_id: user.id })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateLogAktifitas(id: string, updates: Partial<LogAktifitas>): Promise<LogAktifitas> {
  const { data, error } = await supabase
    .from('log_aktifitas')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteLogAktifitas(id: string): Promise<void> {
  const { error } = await supabase
    .from('log_aktifitas')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function uploadFotoAktifitas(file: File, logId: string): Promise<string> {
  const fileExt = file.name.split('.').pop();
  const fileName = `${logId}-${Date.now()}.${fileExt}`;
  const filePath = `${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('foto_aktifitas')
    .upload(filePath, file);

  if (uploadError) {
    throw uploadError;
  }

  const { data } = supabase.storage
    .from('foto_aktifitas')
    .getPublicUrl(filePath);

  return data.publicUrl;
}

export async function deleteFotoAktifitas(publicUrl: string): Promise<void> {
  try {
    const url = new URL(publicUrl);
    const pathParts = url.pathname.split('/');
    const fileName = pathParts[pathParts.length - 1];

    const { error } = await supabase.storage
      .from('foto_aktifitas')
      .remove([fileName]);

    if (error) throw error;
  } catch (err) {
    console.error('Error deleting activity photo:', err);
  }
}

