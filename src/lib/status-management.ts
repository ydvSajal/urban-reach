import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

export type ReportStatus = Database['public']['Enums']['report_status'];

export interface StatusHistoryEntry {
  id: string;
  report_id: string;
  old_status: ReportStatus | null;
  new_status: ReportStatus;
  changed_by: string;
  notes: string;
  created_at: string;
  profiles: { full_name: string };
}

export const getStatusHistory = async (reportId: string): Promise<StatusHistoryEntry[]> => {
  try {
    const { data, error } = await supabase
      .from('report_status_history')
      .select(`
        *,
        profiles:changed_by (
          full_name
        )
      `)
      .eq('report_id', reportId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(entry => {
      // Safely handle profiles data
      let profileData = { full_name: 'Unknown User' };
      if (entry.profiles && typeof entry.profiles === 'object' && entry.profiles !== null) {
        const p = entry.profiles as any;
        if (p.full_name) {
          profileData = { full_name: p.full_name };
        }
      }

      return {
        ...entry,
        profiles: profileData
      };
    });
  } catch (error) {
    console.error('Error fetching status history:', error);
    return [];
  }
};

export const updateReportStatus = async (
  reportId: string,
  newStatus: ReportStatus,
  userId: string,
  notes?: string
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('reports')
      .update({ 
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', reportId);

    if (error) throw error;

    // Add to status history
    const { error: historyError } = await supabase
      .from('report_status_history')
      .insert({
        report_id: reportId,
        old_status: null, // We'd need to fetch this first
        new_status: newStatus,
        changed_by: userId,
        notes: notes || ''
      });

    return !historyError;
  } catch (error) {
    console.error('Error updating report status:', error);
    return false;
  }
};