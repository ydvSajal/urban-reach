import { supabase } from '@/integrations/supabase/client';
import { logError, handleAsyncError } from './error-handling';

export type ReportStatus = 'pending' | 'acknowledged' | 'in_progress' | 'resolved' | 'closed';

export interface StatusChangeData {
  reportId: string;
  oldStatus: ReportStatus;
  newStatus: ReportStatus;
  notes?: string;
  changedBy?: string;
}

export interface StatusHistoryEntry {
  id: string;
  report_id: string;
  old_status: ReportStatus | null;
  new_status: ReportStatus;
  notes: string | null;
  changed_by: string;
  created_at: string;
  profiles?: {
    full_name: string | null;
  } | null;
}

// Status transition validation rules
const STATUS_TRANSITIONS: Record<ReportStatus, ReportStatus[]> = {
  pending: ['acknowledged', 'closed'],
  acknowledged: ['in_progress', 'resolved', 'pending'],
  in_progress: ['resolved', 'acknowledged'],
  resolved: ['closed', 'in_progress'], // Allow reopening if needed
  closed: [], // Closed reports cannot be changed (except by admins)
};

// Role-based status change permissions
const ROLE_PERMISSIONS: Record<string, {
  canChange: ReportStatus[];
  canChangeTo: Record<ReportStatus, ReportStatus[]>;
}> = {
  admin: {
    canChange: ['pending', 'acknowledged', 'in_progress', 'resolved', 'closed'],
    canChangeTo: {
      pending: ['acknowledged', 'closed'],
      acknowledged: ['pending', 'in_progress', 'resolved', 'closed'],
      in_progress: ['acknowledged', 'resolved', 'closed'],
      resolved: ['in_progress', 'closed'],
      closed: ['resolved'], // Admins can reopen closed reports
    },
  },
  worker: {
    canChange: ['acknowledged', 'in_progress', 'resolved'],
    canChangeTo: {
      pending: [], // Workers don't handle pending reports
      acknowledged: ['in_progress'],
      in_progress: ['resolved', 'acknowledged'],
      resolved: [], // Workers can't change resolved reports
      closed: [], // Workers can't change closed reports
    },
  },
  citizen: {
    canChange: [], // Citizens cannot change status
    canChangeTo: {},
  },
};

// Validate status transition
export const validateStatusTransition = (
  currentStatus: ReportStatus,
  newStatus: ReportStatus,
  userRole: string
): { valid: boolean; error?: string } => {
  // Check if user role can make status changes
  const rolePermissions = ROLE_PERMISSIONS[userRole];
  if (!rolePermissions) {
    return { valid: false, error: 'Invalid user role' };
  }

  // Check if user can change from current status
  if (!rolePermissions.canChange.includes(currentStatus)) {
    return { valid: false, error: `${userRole} cannot modify reports with status: ${currentStatus}` };
  }

  // Check if transition is allowed for this role
  const allowedTransitions = rolePermissions.canChangeTo[currentStatus] || [];
  if (!allowedTransitions.includes(newStatus)) {
    return { valid: false, error: `Cannot change from ${currentStatus} to ${newStatus}` };
  }

  // Check general transition rules
  const generalTransitions = STATUS_TRANSITIONS[currentStatus] || [];
  if (!generalTransitions.includes(newStatus)) {
    return { valid: false, error: `Invalid status transition: ${currentStatus} → ${newStatus}` };
  }

  return { valid: true };
};

// Log status change to history table
export const logStatusChange = async (data: StatusChangeData): Promise<void> => {
  return handleAsyncError(async () => {
    const { error } = await supabase
      .from('report_status_history')
      .insert([{
        report_id: data.reportId,
        old_status: data.oldStatus,
        new_status: data.newStatus,
        notes: data.notes || null,
        changed_by: data.changedBy || '',
      }]);

    if (error) {
      logError(error, 'logStatusChange', data);
      throw error;
    }
  }, 'logStatusChange');
};

// Update report status with validation and logging
export const updateReportStatus = async (
  reportId: string,
  newStatus: ReportStatus,
  notes?: string,
  userRole: string = 'citizen'
): Promise<void> => {
  return handleAsyncError(async () => {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    // Get current report status
    const { data: report, error: reportError } = await supabase
      .from('reports')
      .select('status, assigned_worker_id')
      .eq('id', reportId)
      .single();

    if (reportError) {
      logError(reportError, 'updateReportStatus:getReport', { reportId });
      throw reportError;
    }

    if (!report) {
      throw new Error('Report not found');
    }

    const currentStatus = report.status as ReportStatus;

    // Validate transition
    const validation = validateStatusTransition(currentStatus, newStatus, userRole);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Additional validation for workers - they can only update assigned reports
    if (userRole === 'worker') {
      const { data: worker, error: workerError } = await supabase
        .from('workers')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (workerError || !worker) {
        throw new Error('Worker profile not found');
      }

      if (report.assigned_worker_id !== worker.id) {
        throw new Error('You can only update reports assigned to you');
      }
    }

    // Prepare update data
    const updateData: any = { status: newStatus };
    
    // Set resolved_at timestamp when resolving
    if (newStatus === 'resolved' && currentStatus !== 'resolved') {
      updateData.resolved_at = new Date().toISOString();
    }
    
    // Clear resolved_at if moving away from resolved
    if (currentStatus === 'resolved' && newStatus !== 'resolved') {
      updateData.resolved_at = null;
    }

    // Update report status
    const { error: updateError } = await supabase
      .from('reports')
      .update(updateData)
      .eq('id', reportId);

    if (updateError) {
      logError(updateError, 'updateReportStatus:updateReport', { reportId, newStatus });
      throw updateError;
    }

    // Log status change
    await logStatusChange({
      reportId,
      oldStatus: currentStatus,
      newStatus,
      notes,
      changedBy: user.id,
    });

  }, 'updateReportStatus');
};

// Get status history for a report
export const getStatusHistory = async (reportId: string): Promise<StatusHistoryEntry[]> => {
  return handleAsyncError(async () => {
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

    if (error) {
      logError(error, 'getStatusHistory', { reportId });
      throw error;
    }

    return data || [];
  }, 'getStatusHistory') || [];
};

// Get status statistics for reports
export const getStatusStatistics = async (filters?: {
  councilId?: string;
  workerId?: string;
  dateFrom?: string;
  dateTo?: string;
}): Promise<Record<ReportStatus, number>> => {
  return handleAsyncError(async () => {
    let query = supabase
      .from('reports')
      .select('status');

    // Apply filters
    if (filters?.councilId) {
      query = query.eq('council_id', filters.councilId);
    }
    
    if (filters?.workerId) {
      query = query.eq('assigned_worker_id', filters.workerId);
    }
    
    if (filters?.dateFrom) {
      query = query.gte('created_at', filters.dateFrom);
    }
    
    if (filters?.dateTo) {
      query = query.lte('created_at', filters.dateTo);
    }

    const { data, error } = await query;

    if (error) {
      logError(error, 'getStatusStatistics', filters);
      throw error;
    }

    // Count statuses
    const stats: Record<ReportStatus, number> = {
      pending: 0,
      acknowledged: 0,
      in_progress: 0,
      resolved: 0,
      closed: 0,
    };

    data?.forEach(report => {
      const status = report.status as ReportStatus;
      if (status in stats) {
        stats[status]++;
      }
    });

    return stats;
  }, 'getStatusStatistics') || {
    pending: 0,
    acknowledged: 0,
    in_progress: 0,
    resolved: 0,
    closed: 0,
  };
};

// Get average resolution time by status
export const getResolutionTimeStats = async (filters?: {
  councilId?: string;
  workerId?: string;
  category?: string;
}): Promise<{
  averageHours: number;
  medianHours: number;
  totalResolved: number;
}> => {
  return handleAsyncError(async () => {
    let query = supabase
      .from('reports')
      .select('created_at, resolved_at')
      .not('resolved_at', 'is', null);

    // Apply filters
    if (filters?.councilId) {
      query = query.eq('council_id', filters.councilId);
    }
    
    if (filters?.workerId) {
      query = query.eq('assigned_worker_id', filters.workerId);
    }
    
    if (filters?.category) {
      query = query.eq('category', filters.category);
    }

    const { data, error } = await query;

    if (error) {
      logError(error, 'getResolutionTimeStats', filters);
      throw error;
    }

    if (!data || data.length === 0) {
      return { averageHours: 0, medianHours: 0, totalResolved: 0 };
    }

    // Calculate resolution times in hours
    const resolutionTimes = data.map(report => {
      const created = new Date(report.created_at);
      const resolved = new Date(report.resolved_at!);
      return (resolved.getTime() - created.getTime()) / (1000 * 60 * 60); // hours
    });

    // Calculate average
    const averageHours = resolutionTimes.reduce((sum, time) => sum + time, 0) / resolutionTimes.length;

    // Calculate median
    const sortedTimes = [...resolutionTimes].sort((a, b) => a - b);
    const mid = Math.floor(sortedTimes.length / 2);
    const medianHours = sortedTimes.length % 2 === 0
      ? (sortedTimes[mid - 1] + sortedTimes[mid]) / 2
      : sortedTimes[mid];

    return {
      averageHours: Math.round(averageHours * 100) / 100,
      medianHours: Math.round(medianHours * 100) / 100,
      totalResolved: data.length,
    };
  }, 'getResolutionTimeStats') || { averageHours: 0, medianHours: 0, totalResolved: 0 };
};

// Bulk status update for multiple reports
export const bulkUpdateStatus = async (
  reportIds: string[],
  newStatus: ReportStatus,
  notes?: string,
  userRole: string = 'admin'
): Promise<{ success: string[]; failed: string[] }> => {
  const results = { success: [], failed: [] };

  for (const reportId of reportIds) {
    try {
      await updateReportStatus(reportId, newStatus, notes, userRole);
      results.success.push(reportId);
    } catch (error) {
      console.error(`Failed to update report ${reportId}:`, error);
      results.failed.push(reportId);
    }
  }

  return results;
};

// Status change notifications (placeholder for future implementation)
export const sendStatusChangeNotification = async (
  reportId: string,
  oldStatus: ReportStatus,
  newStatus: ReportStatus,
  recipientType: 'citizen' | 'worker' | 'admin'
): Promise<void> => {
  // This will be implemented when we add the notification system
  console.log(`Status change notification: ${reportId} ${oldStatus} → ${newStatus} for ${recipientType}`);
};

// Utility functions
export const getStatusLabel = (status: ReportStatus): string => {
  const labels: Record<ReportStatus, string> = {
    pending: 'Pending',
    acknowledged: 'Acknowledged',
    in_progress: 'In Progress',
    resolved: 'Resolved',
    closed: 'Closed',
  };
  return labels[status] || status;
};

export const getStatusColor = (status: ReportStatus): string => {
  const colors: Record<ReportStatus, string> = {
    pending: 'text-yellow-600',
    acknowledged: 'text-blue-600',
    in_progress: 'text-orange-600',
    resolved: 'text-green-600',
    closed: 'text-gray-600',
  };
  return colors[status] || 'text-gray-600';
};

export const isStatusFinal = (status: ReportStatus): boolean => {
  return status === 'closed';
};

export const canUserChangeStatus = (userRole: string, currentStatus: ReportStatus): boolean => {
  const rolePermissions = ROLE_PERMISSIONS[userRole];
  return rolePermissions ? rolePermissions.canChange.includes(currentStatus) : false;
};