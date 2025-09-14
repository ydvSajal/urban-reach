import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  browserNotificationService,
  requestNotificationPermission,
  getNotificationPermissionState,
  type NotificationPermissionState 
} from '@/lib/browser-notifications';
import { 
  useNotificationSubscription,
  useNewReportsSubscription,
  useWorkerSubscription,
  useStatusHistorySubscription 
} from '@/hooks/useRealtimeSubscription';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Bell, BellOff } from 'lucide-react';

interface NotificationContextType {
  permissionState: NotificationPermissionState;
  requestPermission: () => Promise<NotificationPermission>;
  isEnabled: boolean;
  toggleNotifications: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: React.ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [permissionState, setPermissionState] = useState<NotificationPermissionState>(
    getNotificationPermissionState()
  );
  const [isEnabled, setIsEnabled] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [councilId, setCouncilId] = useState<string | null>(null);
  const [workerId, setWorkerId] = useState<string | null>(null);

  // Get user info on mount
  useEffect(() => {
    const getUserInfo = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        setUserId(user.id);

        // Get user profile and role
        const { data: profile } = await supabase
          .from('profiles')
          .select('role, council_id')
          .eq('user_id', user.id)
          .single();

        if (profile) {
          setUserRole(profile.role);
          setCouncilId(profile.council_id);

          // If user is a worker, get worker ID
          if (profile.role === 'worker') {
            const { data: worker } = await supabase
              .from('workers')
              .select('id')
              .eq('user_id', user.id)
              .single();
            
            if (worker) {
              setWorkerId(worker.id);
            }
          }
        }
      } catch (error) {
        console.error('Error getting user info:', error);
      }
    };

    getUserInfo();
  }, []);

  // Update enabled state based on permission
  useEffect(() => {
    setIsEnabled(permissionState.permission === 'granted' && permissionState.supported);
  }, [permissionState]);

  const handleRequestPermission = async (): Promise<NotificationPermission> => {
    try {
      const permission = await requestNotificationPermission();
      setPermissionState(getNotificationPermissionState());
      
      if (permission === 'granted') {
        toast({
          title: "Notifications enabled",
          description: "You'll now receive browser notifications for important updates",
        });
      } else {
        toast({
          title: "Notifications disabled",
          description: "You can enable notifications later in your browser settings",
          variant: "destructive",
        });
      }
      
      return permission;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      toast({
        title: "Error enabling notifications",
        description: "Failed to request notification permission",
        variant: "destructive",
      });
      throw error;
    }
  };

  const toggleNotifications = () => {
    if (permissionState.permission !== 'granted') {
      handleRequestPermission();
    } else {
      // Can't actually revoke permission programmatically
      // Show instructions to user
      toast({
        title: "Disable notifications",
        description: "To disable notifications, please use your browser settings",
      });
    }
  };

  // Set up realtime subscriptions with browser notifications

  // Subscribe to in-app notifications
  useNotificationSubscription(
    userId || undefined,
    (notification) => {
      if (isEnabled) {
        browserNotificationService.showSystemNotification(
          notification.title,
          notification.message,
          { notificationId: notification.id, type: notification.type }
        );
      }
    },
    !!userId && isEnabled
  );

  // Subscribe to new reports (for admins)
  useNewReportsSubscription(
    userRole === 'admin' ? councilId || undefined : undefined,
    (report) => {
      if (isEnabled && userRole === 'admin') {
        browserNotificationService.showNewReportNotification(
          report.report_number,
          report.category,
          report.location_address,
          report.id
        );
      }
    },
    userRole === 'admin' && isEnabled
  );

  // Subscribe to worker assignments
  useWorkerSubscription(
    userRole === 'worker' ? workerId || undefined : undefined,
    (report) => {
      if (isEnabled && userRole === 'worker') {
        browserNotificationService.showAssignmentNotification(
          report.report_number,
          report.title,
          report.id
        );
      }
    },
    userRole === 'worker' && isEnabled
  );

  const contextValue: NotificationContextType = {
    permissionState,
    requestPermission: handleRequestPermission,
    isEnabled,
    toggleNotifications,
  };

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
    </NotificationContext.Provider>
  );
};

// Notification permission prompt component
export const NotificationPermissionPrompt: React.FC = () => {
  const { permissionState, requestPermission, isEnabled } = useNotifications();
  const [dismissed, setDismissed] = useState(false);

  // Don't show if already granted, not supported, or dismissed
  if (
    permissionState.permission === 'granted' || 
    !permissionState.supported || 
    dismissed ||
    permissionState.permission === 'denied'
  ) {
    return null;
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bell className="h-5 w-5 text-blue-600" />
          <div>
            <h4 className="font-medium text-blue-900">Enable Notifications</h4>
            <p className="text-sm text-blue-700">
              Get instant updates about your reports and assignments
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDismissed(true)}
          >
            Later
          </Button>
          <Button
            size="sm"
            onClick={requestPermission}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Enable
          </Button>
        </div>
      </div>
    </div>
  );
};

// Notification status indicator component
export const NotificationStatusIndicator: React.FC<{ className?: string }> = ({ 
  className = '' 
}) => {
  const { permissionState, isEnabled, toggleNotifications } = useNotifications();

  if (!permissionState.supported) {
    return null;
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleNotifications}
      className={`${className} ${isEnabled ? 'text-green-600' : 'text-gray-400'}`}
      title={isEnabled ? 'Notifications enabled' : 'Notifications disabled'}
    >
      {isEnabled ? (
        <Bell className="h-4 w-4" />
      ) : (
        <BellOff className="h-4 w-4" />
      )}
    </Button>
  );
};