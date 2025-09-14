-- Notifications System
-- Create tables for in-app notifications and user preferences

-- Create notifications table for in-app notifications
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('status_change', 'assignment', 'new_report', 'system')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    data JSONB DEFAULT '{}',
    read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user notification preferences table
CREATE TABLE IF NOT EXISTS public.user_notification_preferences (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    email_status_changes BOOLEAN DEFAULT true,
    email_assignments BOOLEAN DEFAULT true,
    email_new_reports BOOLEAN DEFAULT false,
    push_status_changes BOOLEAN DEFAULT true,
    push_assignments BOOLEAN DEFAULT true,
    push_new_reports BOOLEAN DEFAULT false,
    sms_urgent_only BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(type);
CREATE INDEX IF NOT EXISTS idx_user_notification_preferences_user_id ON public.user_notification_preferences(user_id);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_notification_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notifications
CREATE POLICY "Users can view their own notifications" ON public.notifications
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications" ON public.notifications
FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "System can insert notifications" ON public.notifications
FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can delete their own notifications" ON public.notifications
FOR DELETE USING (user_id = auth.uid());

-- RLS Policies for user notification preferences
CREATE POLICY "Users can manage their own notification preferences" ON public.user_notification_preferences
FOR ALL USING (user_id = auth.uid());

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_user_notification_preferences_updated_at
    BEFORE UPDATE ON public.user_notification_preferences
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Function to create default notification preferences for new users
CREATE OR REPLACE FUNCTION public.create_default_notification_preferences()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_notification_preferences (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create default preferences when a user signs up
CREATE TRIGGER create_user_notification_preferences
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.create_default_notification_preferences();

-- Function to clean up old notifications
CREATE OR REPLACE FUNCTION public.cleanup_old_notifications(days_old INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.notifications
    WHERE created_at < (now() - INTERVAL '1 day' * days_old)
    AND read = true;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get notification statistics for a user
CREATE OR REPLACE FUNCTION public.get_user_notification_stats(user_uuid UUID)
RETURNS TABLE (
    total_notifications BIGINT,
    unread_notifications BIGINT,
    notifications_today BIGINT,
    notifications_this_week BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_notifications,
        COUNT(*) FILTER (WHERE read = false) as unread_notifications,
        COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE) as notifications_today,
        COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days') as notifications_this_week
    FROM public.notifications
    WHERE user_id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark all notifications as read for a user
CREATE OR REPLACE FUNCTION public.mark_all_notifications_read(user_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    UPDATE public.notifications
    SET read = true
    WHERE user_id = user_uuid AND read = false;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a view for notification summary
CREATE OR REPLACE VIEW public.notification_summary AS
SELECT 
    n.id,
    n.user_id,
    n.type,
    n.title,
    n.message,
    n.read,
    n.created_at,
    p.full_name as user_name,
    p.email as user_email
FROM public.notifications n
LEFT JOIN public.profiles p ON p.user_id = n.user_id
ORDER BY n.created_at DESC;

-- Grant necessary permissions
GRANT SELECT ON public.notification_summary TO authenticated;

-- Add comments for documentation
COMMENT ON TABLE public.notifications IS 'In-app notifications for users';
COMMENT ON TABLE public.user_notification_preferences IS 'User preferences for different types of notifications';
COMMENT ON FUNCTION public.cleanup_old_notifications(INTEGER) IS 'Cleans up old read notifications older than specified days';
COMMENT ON FUNCTION public.get_user_notification_stats(UUID) IS 'Returns notification statistics for a user';
COMMENT ON FUNCTION public.mark_all_notifications_read(UUID) IS 'Marks all notifications as read for a user';
COMMENT ON VIEW public.notification_summary IS 'Summary view of notifications with user information';