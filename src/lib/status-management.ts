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
    const { data: historyData, error } = await supabase
      .from('report_status_history')
      .select('*')
      .eq('report_id', reportId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Manually fetch profile information for each entry
    const historyWithProfiles = await Promise.all(
      (historyData || []).map(async (entry) => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('user_id', entry.changed_by)
          .single();

        return {
          ...entry,
          profiles: profile || { full_name: 'Unknown User' }
        };
      })
    );

    return historyWithProfiles;
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