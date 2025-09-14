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