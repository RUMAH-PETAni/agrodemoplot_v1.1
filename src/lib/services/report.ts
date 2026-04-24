import { supabase } from '$lib/supabase/client';

export interface ReportArchive {
  id: string;
  user_id: string;
  title: string;
  category: string;
  format: string;
  file_url: string;
  file_size_bytes: number;
  status: 'Selesai' | 'Diproses' | 'Gagal';
  created_at: string;
}

export async function getReportArchives(): Promise<ReportArchive[]> {
  const { data, error } = await supabase
    .from('report_archives')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function createReportArchive(report: Omit<ReportArchive, 'id' | 'created_at' | 'user_id'>): Promise<ReportArchive> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('report_archives')
    .insert({ ...report, user_id: user.id })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteReport(id: string, fileUrl: string): Promise<void> {
  // 1. Delete record from database
  const { error: dbError } = await supabase
    .from('report_archives')
    .delete()
    .eq('id', id);

  if (dbError) throw dbError;

  // 2. Delete file from storage
  if (fileUrl) {
    const urlParts = fileUrl.split('/');
    const fileName = urlParts[urlParts.length - 1];
    
    const { error: storageError } = await supabase.storage
      .from('reports')
      .remove([fileName]);

    if (storageError) console.error('Failed to delete report file from storage:', storageError);
  }
}

/**
 * Sends a request to the server API to generate a PDF report
 */
export async function generateReportRequest(payload: {
  template: string;
  startDate: string;
  endDate: string;
  demoplotIds: string[];
}) {
  // Get the session to pass the token
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  const response = await fetch('/api/generate-report', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Gagal generate laporan');
  }

  return await response.json();
}
