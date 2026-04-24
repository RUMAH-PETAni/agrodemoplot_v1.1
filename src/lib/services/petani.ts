import { supabase } from '$lib/supabase/client';
import type { Petani, PetaniInsert, PetaniUpdate } from '../../types/petani';

export async function getPetaniList(): Promise<Petani[]> {
  const { data, error } = await supabase
    .from('petani')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getPetaniById(id: string): Promise<Petani | null> {
  const { data, error } = await supabase
    .from('petani')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // No rows found
    throw error;
  }
  return data;
}

export async function createPetani(petani: Omit<PetaniInsert, 'user_id'>): Promise<Petani> {
  // Get the current user's ID
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('petani')
    .insert({ ...petani, user_id: user.id })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updatePetani(id: string, updates: PetaniUpdate): Promise<Petani> {
  const { data, error } = await supabase
    .from('petani')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deletePetani(id: string): Promise<void> {
  const { error } = await supabase
    .from('petani')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function searchPetani(query: string): Promise<Petani[]> {
  const { data, error } = await supabase
    .from('petani')
    .select('*')
    .ilike('nama_lengkap', `%${query}%`)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function uploadFotoProfil(file: File, petaniId: string): Promise<string> {
  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Tipe file tidak didukung. Gunakan JPG, JPEG, PNG, atau WEBP');
  }

  // Validate file size (max 100KB)
  const maxSize = 100 * 1024; // 100KB in bytes
  if (file.size > maxSize) {
    throw new Error('Ukuran file maksimal 100KB');
  }

  // Generate unique filename
  const fileExt = file.name.split('.').pop();
  const fileName = `${petaniId}-${Date.now()}.${fileExt}`;

  // Upload to Supabase Storage
  const { data, error } = await supabase.storage
    .from('foto_profil')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: true
    });

  if (error) throw error;

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('foto_profil')
    .getPublicUrl(fileName);

  return publicUrl;
}

export async function deleteFotoProfil(url: string): Promise<void> {
  if (!url) return;

  // Extract filename from URL
  const urlParts = url.split('/');
  const fileName = urlParts[urlParts.length - 1];

  const { error } = await supabase.storage
    .from('foto_profil')
    .remove([fileName]);

  if (error) throw error;
}
