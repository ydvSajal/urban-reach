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
   * Update status for multiple reports using stored procedure
   */
  static async updateStatus(
    reportIds: string[], 
    data: BulkStatusUpdateData,
    userId: string
  ): Promise<BulkOperationResult> {
    try {
      const { data: result, error } = await supabase.rpc('bulk_update_status', {
        report_ids: reportIds,
        new_status: data.newStatus,
        update_notes: data.notes || '',
        performed_by_user: userId
      });
      
      if (error) {
        throw error;
      }
      
      const response = result[0];
      return {
        success: response.success,
        processedCount: response.processed_count,
        failedCount: response.failed_count,
        errors: response.errors || []
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
   * Assign worker to multiple reports using stored procedure
   */
  static async assignWorker(
    reportIds: string[],
    data: BulkAssignmentData,
    userId: string
  ): Promise<BulkOperationResult> {
    try {
      const { data: result, error } = await supabase.rpc('bulk_assign_worker', {
        report_ids: reportIds,
        worker_id: data.workerId,
        performed_by_user: userId
      });
      
      if (error) {
        throw error;
      }
      
      const response = result[0];
      return {
        success: response.success,
        processedCount: response.processed_count,
        failedCount: response.failed_count,
        errors: response.errors || []
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
   * Update priority for multiple reports using stored procedure
   */
  static async updatePriority(
    reportIds: string[],
    data: BulkPriorityUpdateData,
    userId: string
  ): Promise<BulkOperationResult> {
    try {
      const { data: result, error } = await supabase.rpc('bulk_update_priority', {
        report_ids: reportIds,
        new_priority: data.priority,
        performed_by_user: userId
      });
      
      if (error) {
        throw error;
      }
      
      const response = result[0];
      return {
        success: response.success,
        processedCount: response.processed_count,
        failedCount: response.failed_count,
        errors: response.errors || []
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
   * Delete multiple reports (admin only) using stored procedure
   */
  static async deleteReports(
    reportIds: string[],
    userId: string
  ): Promise<BulkOperationResult> {
    try {
      const { data: result, error } = await supabase.rpc('bulk_delete_reports', {
        report_ids: reportIds,
        performed_by_user: userId
      });
      
      if (error) {
        throw error;
      }
      
      const response = result[0];
      return {
        success: response.success,
        processedCount: response.processed_count,
        failedCount: response.failed_count,
        errors: response.errors || []
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
   * Get available workers for assignment using stored procedure
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
      const { data, error } = await supabase.rpc('get_available_workers');
      
      if (error) {
        console.error('Failed to fetch workers:', error);
        return [];
      }
      
      return data || [];
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
        .rpc('get_user_role', { user_uuid: userId });

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
