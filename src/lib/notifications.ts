import { supabase } from '@/integrations/supabase/client';
import { logError, handleAsyncError } from './error-handling';
import type { ReportStatus } from './status-management';

export interface NotificationData {
  reportId: string;
  oldStatus: ReportStatus;
  newStatus: ReportStatus;
  notes?: string;
  changedBy: string;
}

// Send status change notification via Edge Function
export const sendStatusChangeNotification = async (data: NotificationData): Promise<void> => {
  return handleAsyncError(async () => {
    const { error } = await supabase.functions.invoke('send-status-notification', {
      body: data,
    });

    if (error) {
      logError(error, 'sendStatusChangeNotification', data);
      // Don't throw error for notification failures - they shouldn't block status updates
      console.warn('Failed to send status change notification:', error);
    }
  }, 'sendStatusChangeNotification');
};

// Enhanced status update function that includes notifications
export const updateStatusWithNotification = async (
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
      .select('status')
      .eq('id', reportId)
      .single();

    if (reportError) {
      logError(reportError, 'updateStatusWithNotification:getReport', { reportId });
      throw reportError;
    }

    if (!report) {
      throw new Error('Report not found');
    }

    const oldStatus = report.status as ReportStatus;

    // Import and use the status management function
    const { updateReportStatus } = await import('./status-management');
    
    // Update the status first
    await updateReportStatus(reportId, newStatus, notes, userRole);

    // Send notification (don't await to avoid blocking)
    sendStatusChangeNotification({
      reportId,
      oldStatus,
      newStatus,
      notes,
      changedBy: user.id,
    }).catch(error => {
      console.warn('Notification sending failed:', error);
    });

  }, 'updateStatusWithNotification');
};

// In-app notification system (for future real-time notifications)
export interface InAppNotification {
  id: string;
  user_id: string;
  type: 'status_change' | 'assignment' | 'new_report' | 'system';
  title: string;
  message: string;
  data: Record<string, any>;
  read: boolean;
  created_at: string;
}

// Create in-app notification
export const createInAppNotification = async (
  userId: string,
  type: InAppNotification['type'],
  title: string,
  message: string,
  data: Record<string, any> = {}
): Promise<void> => {
  return handleAsyncError(async () => {
    const { error } = await supabase
      .from('notifications')
      .insert([{
        user_id: userId,
        type,
        title,
        message,
        data,
        read: false,
      }]);

    if (error) {
      logError(error, 'createInAppNotification', { userId, type, title });
      throw error;
    }
  }, 'createInAppNotification');
};

// Get user notifications
export const getUserNotifications = async (
  userId: string,
  limit: number = 50,
  unreadOnly: boolean = false
): Promise<InAppNotification[]> => {
  return handleAsyncError(async () => {
    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (unreadOnly) {
      query = query.eq('read', false);
    }

    const { data, error } = await query;

    if (error) {
      logError(error, 'getUserNotifications', { userId, limit, unreadOnly });
      throw error;
    }

    return data || [];
  }, 'getUserNotifications') || [];
};

// Mark notification as read
export const markNotificationAsRead = async (notificationId: string): Promise<void> => {
  return handleAsyncError(async () => {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId);

    if (error) {
      logError(error, 'markNotificationAsRead', { notificationId });
      throw error;
    }
  }, 'markNotificationAsRead');
};

// Mark all notifications as read for a user
export const markAllNotificationsAsRead = async (userId: string): Promise<void> => {
  return handleAsyncError(async () => {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false);

    if (error) {
      logError(error, 'markAllNotificationsAsRead', { userId });
      throw error;
    }
  }, 'markAllNotificationsAsRead');
};

// Delete old notifications (cleanup utility)
export const cleanupOldNotifications = async (
  userId: string,
  daysOld: number = 30
): Promise<void> => {
  return handleAsyncError(async () => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('user_id', userId)
      .lt('created_at', cutoffDate.toISOString());

    if (error) {
      logError(error, 'cleanupOldNotifications', { userId, daysOld });
      throw error;
    }
  }, 'cleanupOldNotifications');
};

// Notification preferences (for future implementation)
export interface NotificationPreferences {
  email_status_changes: boolean;
  email_assignments: boolean;
  email_new_reports: boolean;
  push_status_changes: boolean;
  push_assignments: boolean;
  push_new_reports: boolean;
  sms_urgent_only: boolean;
}

// Get user notification preferences
export const getNotificationPreferences = async (
  userId: string
): Promise<NotificationPreferences> => {
  return handleAsyncError(async () => {
    const { data, error } = await supabase
      .from('user_notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') { // Not found error
      logError(error, 'getNotificationPreferences', { userId });
      throw error;
    }

    // Return default preferences if none found
    return data || {
      email_status_changes: true,
      email_assignments: true,
      email_new_reports: false,
      push_status_changes: true,
      push_assignments: true,
      push_new_reports: false,
      sms_urgent_only: false,
    };
  }, 'getNotificationPreferences') || {
    email_status_changes: true,
    email_assignments: true,
    email_new_reports: false,
    push_status_changes: true,
    push_assignments: true,
    push_new_reports: false,
    sms_urgent_only: false,
  };
};

// Update user notification preferences
export const updateNotificationPreferences = async (
  userId: string,
  preferences: Partial<NotificationPreferences>
): Promise<void> => {
  return handleAsyncError(async () => {
    const { error } = await supabase
      .from('user_notification_preferences')
      .upsert([{
        user_id: userId,
        ...preferences,
      }]);

    if (error) {
      logError(error, 'updateNotificationPreferences', { userId, preferences });
      throw error;
    }
  }, 'updateNotificationPreferences');
};

// Utility functions for notification content
export const getStatusChangeNotificationContent = (
  reportNumber: string,
  oldStatus: ReportStatus,
  newStatus: ReportStatus
): { title: string; message: string } => {
  const statusLabels: Record<ReportStatus, string> = {
    pending: 'Pending',
    acknowledged: 'Acknowledged',
    in_progress: 'In Progress',
    resolved: 'Resolved',
    closed: 'Closed',
  };

  return {
    title: `Report #${reportNumber} Status Update`,
    message: `Status changed from ${statusLabels[oldStatus]} to ${statusLabels[newStatus]}`,
  };
};

export const getAssignmentNotificationContent = (
  reportNumber: string,
  workerName: string
): { title: string; message: string } => {
  return {
    title: `New Assignment - Report #${reportNumber}`,
    message: `You have been assigned to work on report #${reportNumber}`,
  };
};

export const getNewReportNotificationContent = (
  reportNumber: string,
  category: string,
  location: string
): { title: string; message: string } => {
  return {
    title: `New Report Submitted - #${reportNumber}`,
    message: `New ${category.replace('_', ' ')} report from ${location}`,
  };
};