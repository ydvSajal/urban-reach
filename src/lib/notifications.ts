import { supabase } from '@/integrations/supabase/client';

export interface InAppNotification {
  id: string;
  user_id: string;
  type: 'system' | 'status_change' | 'assignment' | 'new_report';
  title: string;
  message: string;
  data: Record<string, any>;
  read: boolean;
  created_at: string;
}

export const getUserNotifications = async (
  userId: string,
  limit: number = 50,
  unreadOnly: boolean = false
): Promise<InAppNotification[]> => {
  try {
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
    if (error) throw error;

    return (data || []).map(notification => ({
      ...notification,
      type: notification.type as 'system' | 'status_change' | 'assignment' | 'new_report',
      data: notification.data as Record<string, any> || {}
    }));
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return [];
  }
};

export const markNotificationAsRead = async (notificationId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId);

    return !error;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return false;
  }
};

export const createNotification = async (notification: Omit<InAppNotification, 'id' | 'created_at' | 'read'>): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('notifications')
      .insert([{
        ...notification,
        read: false
      }]);

    return !error;
  } catch (error) {
    console.error('Error creating notification:', error);
    return false;
  }
};

export const markAllNotificationsAsRead = async (userId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false);

    return !error;
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return false;
  }
};

export interface NotificationPreferences {
  email_status_changes: boolean;
  email_assignments: boolean;
  email_new_reports: boolean;
  push_status_changes: boolean;
  push_assignments: boolean;
  push_new_reports: boolean;
  sms_urgent_only: boolean;
}

export const getNotificationPreferences = async (userId: string): Promise<NotificationPreferences | null> => {
  try {
    const { data, error } = await supabase
      .from('user_notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      throw error;
    }

    // Return default preferences if none found
    if (!data) {
      return {
        email_status_changes: true,
        email_assignments: true,
        email_new_reports: true,
        push_status_changes: true,
        push_assignments: true,
        push_new_reports: true,
        sms_urgent_only: false
      };
    }

    return {
      email_status_changes: data.email_status_changes ?? true,
      email_assignments: data.email_assignments ?? true,
      email_new_reports: data.email_new_reports ?? true,
      push_status_changes: data.push_status_changes ?? true,
      push_assignments: data.push_assignments ?? true,
      push_new_reports: data.push_new_reports ?? true,
      sms_urgent_only: data.sms_urgent_only ?? false
    };
  } catch (error) {
    console.error('Error fetching notification preferences:', error);
    return null;
  }
};

export const updateNotificationPreferences = async (
  userId: string, 
  preferences: NotificationPreferences
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('user_notification_preferences')
      .upsert({
        user_id: userId,
        ...preferences
      });

    return !error;
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    return false;
  }
};

export const updateStatusWithNotification = async (
  reportId: string,
  newStatus: 'pending' | 'acknowledged' | 'in_progress' | 'resolved' | 'closed',
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
        old_status: null,
        new_status: newStatus,
        changed_by: userId,
        notes: notes || ''
      });

    return !historyError;
  } catch (error) {
    console.error('Error updating status with notification:', error);
    return false;
  }
};