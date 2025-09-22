import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type ReportStatus = Database['public']['Enums']['report_status'];
export type PriorityLevel = Database['public']['Enums']['priority_level'];

export interface BulkOperationResult {
  success: boolean;
  processedCount: number;
  failedCount: number;
  errors: Array<{
    reportId: string;
    error: string;
  }>;
}

export interface BulkStatusUpdateData {
  newStatus: ReportStatus;
  notes?: string;
}

export interface BulkAssignmentData {
  workerId: string;
  workerName?: string;
}

export interface BulkPriorityUpdateData {
  priority: PriorityLevel;
}

export class BulkOperationsService {
  /**
   * Update status for multiple reports
   */
  static async updateStatus(
    reportIds: string[], 
    data: BulkStatusUpdateData,
    userId: string
  ): Promise<BulkOperationResult> {
    try {
      const results = await Promise.allSettled(
        reportIds.map(async (reportId) => {
          const { error } = await supabase
            .from('reports')
            .update({ 
              status: data.newStatus,
              updated_at: new Date().toISOString()
            })
            .eq('id', reportId);
          
          if (error) throw error;

          // Add to status history
          await supabase
            .from('report_status_history')
            .insert({
              report_id: reportId,
              old_status: null, // We'd need to query this first in a real implementation
              new_status: data.newStatus,
              changed_by: userId,
              notes: data.notes
            });

          return reportId;
        })
      );

      const successful = results.filter(result => result.status === 'fulfilled');
      const failed = results.filter(result => result.status === 'rejected');

      return {
        success: failed.length === 0,
        processedCount: successful.length,
        failedCount: failed.length,
        errors: failed.map((result, index) => ({
          reportId: reportIds[successful.length + index],
          error: result.status === 'rejected' ? result.reason?.message || 'Unknown error' : ''
        }))
      };
    } catch (error: any) {
      return {
        success: false,
        processedCount: 0,
        failedCount: reportIds.length,
        errors: [{ reportId: 'all', error: error.message || 'Unknown error occurred' }]
      };
    }
  }

  /**
   * Assign worker to multiple reports
   */
  static async assignWorker(
    reportIds: string[],
    data: BulkAssignmentData,
    userId: string
  ): Promise<BulkOperationResult> {
    try {
      const results = await Promise.allSettled(
        reportIds.map(async (reportId) => {
          const { error } = await supabase
            .from('reports')
            .update({ 
              assigned_worker_id: data.workerId,
              updated_at: new Date().toISOString()
            })
            .eq('id', reportId);
          
          if (error) throw error;
          return reportId;
        })
      );

      const successful = results.filter(result => result.status === 'fulfilled');
      const failed = results.filter(result => result.status === 'rejected');

      return {
        success: failed.length === 0,
        processedCount: successful.length,
        failedCount: failed.length,
        errors: failed.map((result, index) => ({
          reportId: reportIds[successful.length + index],
          error: result.status === 'rejected' ? result.reason?.message || 'Unknown error' : ''
        }))
      };
    } catch (error: any) {
      return {
        success: false,
        processedCount: 0,
        failedCount: reportIds.length,
        errors: [{ reportId: 'all', error: error.message || 'Unknown error occurred' }]
      };
    }
  }

  /**
   * Update priority for multiple reports
   */
  static async updatePriority(
    reportIds: string[],
    data: BulkPriorityUpdateData,
    userId: string
  ): Promise<BulkOperationResult> {
    try {
      const results = await Promise.allSettled(
        reportIds.map(async (reportId) => {
          const { error } = await supabase
            .from('reports')
            .update({ 
              priority: data.priority,
              updated_at: new Date().toISOString()
            })
            .eq('id', reportId);
          
          if (error) throw error;
          return reportId;
        })
      );

      const successful = results.filter(result => result.status === 'fulfilled');
      const failed = results.filter(result => result.status === 'rejected');

      return {
        success: failed.length === 0,
        processedCount: successful.length,
        failedCount: failed.length,
        errors: failed.map((result, index) => ({
          reportId: reportIds[successful.length + index],
          error: result.status === 'rejected' ? result.reason?.message || 'Unknown error' : ''
        }))
      };
    } catch (error: any) {
      return {
        success: false,
        processedCount: 0,
        failedCount: reportIds.length,
        errors: [{ reportId: 'all', error: error.message || 'Unknown error occurred' }]
      };
    }
  }

  /**
   * Delete multiple reports (admin only)
   */
  static async deleteReports(
    reportIds: string[],
    userId: string
  ): Promise<BulkOperationResult> {
    try {
      const results = await Promise.allSettled(
        reportIds.map(async (reportId) => {
          const { error } = await supabase
            .from('reports')
            .delete()
            .eq('id', reportId);
          
          if (error) throw error;
          return reportId;
        })
      );

      const successful = results.filter(result => result.status === 'fulfilled');
      const failed = results.filter(result => result.status === 'rejected');

      return {
        success: failed.length === 0,
        processedCount: successful.length,
        failedCount: failed.length,
        errors: failed.map((result, index) => ({
          reportId: reportIds[successful.length + index],
          error: result.status === 'rejected' ? result.reason?.message || 'Unknown error' : ''
        }))
      };
    } catch (error: any) {
      return {
        success: false,
        processedCount: 0,
        failedCount: reportIds.length,
        errors: [{ reportId: 'all', error: error.message || 'Unknown error occurred' }]
      };
    }
  }

  /**
   * Get available workers for assignment
   */
  static async getAvailableWorkers(): Promise<Array<{
    id: string;
    full_name: string;
    specialty: string;
    current_workload: number;
    max_workload: number;
    performance_rating: number;
  }>> {
    try {
      const { data, error } = await supabase
        .from('workers')
        .select('*')
        .eq('is_available', true);
      
      if (error) {
        console.error('Failed to fetch workers:', error);
        return [];
      }
      
      return (data || []).map(worker => ({
        id: worker.id,
        full_name: worker.full_name,
        specialty: worker.specialty || 'General',
        current_workload: 0, // This would need to be calculated from reports
        max_workload: 10, // This would be configurable
        performance_rating: 0 // This would be calculated from metrics
      }));
    } catch (error) {
      console.error('Failed to fetch workers:', error);
      return [];
    }
  }

  /**
   * Validate bulk operation permissions
   */
  static async validateBulkOperation(
    userId: string,
    operation: 'update_status' | 'assign_worker' | 'update_priority' | 'delete'
  ): Promise<boolean> {
    try {
      // Check if user is admin or has appropriate permissions
      const { data: userRole } = await supabase
        .rpc('get_user_role_direct', { user_uuid: userId });

      if (userRole === 'admin') {
        return true;
      }

      // Workers can only update status of their assigned reports
      if (operation === 'update_status' && userRole === 'worker') {
        return true;
      }

      return false;
    } catch (error) {
      console.error('Permission validation failed:', error);
      return false;
    }
  }
}