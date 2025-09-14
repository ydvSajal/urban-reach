import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { logError } from '@/lib/error-handling';
import { toast } from '@/hooks/use-toast';

export type DatabaseEvent = 'INSERT' | 'UPDATE' | 'DELETE';
export type TableName = 'reports' | 'report_status_history' | 'workers' | 'notifications';

export interface RealtimeSubscriptionOptions {
  table: TableName;
  event?: DatabaseEvent | '*';
  filter?: string;
  onInsert?: (payload: RealtimePostgresChangesPayload<any>) => void;
  onUpdate?: (payload: RealtimePostgresChangesPayload<any>) => void;
  onDelete?: (payload: RealtimePostgresChangesPayload<any>) => void;
  onError?: (error: any) => void;
  enabled?: boolean;
}

export const useRealtimeSubscription = (options: RealtimeSubscriptionOptions) => {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const channelRef = useRef<RealtimeChannel | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  const {
    table,
    event = '*',
    filter,
    onInsert,
    onUpdate,
    onDelete,
    onError,
    enabled = true,
  } = options;

  const cleanup = () => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  };

  const connect = async () => {
    if (!enabled) return;

    try {
      setConnectionStatus('connecting');
      cleanup();

      // Create channel name
      const channelName = `${table}_changes_${Date.now()}`;
      
      // Create new channel
      const channel = supabase.channel(channelName);

      // Configure postgres changes subscription
      let subscription = channel.on(
        'postgres_changes',
        {
          event: event as any,
          schema: 'public',
          table,
          filter,
        },
        (payload: RealtimePostgresChangesPayload<any>) => {
          try {
            switch (payload.eventType) {
              case 'INSERT':
                onInsert?.(payload);
                break;
              case 'UPDATE':
                onUpdate?.(payload);
                break;
              case 'DELETE':
                onDelete?.(payload);
                break;
            }
          } catch (error) {
            console.error('Error handling realtime payload:', error);
            onError?.(error);
          }
        }
      );

      // Subscribe to channel
      const subscriptionResult = await channel.subscribe((status) => {
        console.log(`Realtime subscription status for ${table}:`, status);
        
        switch (status) {
          case 'SUBSCRIBED':
            setIsConnected(true);
            setConnectionStatus('connected');
            reconnectAttempts.current = 0;
            break;
          case 'CHANNEL_ERROR':
          case 'TIMED_OUT':
            setIsConnected(false);
            setConnectionStatus('error');
            handleReconnect();
            break;
          case 'CLOSED':
            setIsConnected(false);
            setConnectionStatus('disconnected');
            break;
        }
      });

      channelRef.current = channel;

    } catch (error) {
      console.error('Error setting up realtime subscription:', error);
      logError(error, 'useRealtimeSubscription:connect', { table, event, filter });
      setConnectionStatus('error');
      onError?.(error);
      handleReconnect();
    }
  };

  const handleReconnect = () => {
    if (reconnectAttempts.current >= maxReconnectAttempts) {
      console.warn(`Max reconnection attempts reached for ${table} subscription`);
      setConnectionStatus('error');
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000); // Exponential backoff, max 30s
    reconnectAttempts.current++;

    console.log(`Attempting to reconnect ${table} subscription in ${delay}ms (attempt ${reconnectAttempts.current})`);

    reconnectTimeoutRef.current = setTimeout(() => {
      connect();
    }, delay);
  };

  const disconnect = () => {
    cleanup();
    setIsConnected(false);
    setConnectionStatus('disconnected');
  };

  const reconnect = () => {
    reconnectAttempts.current = 0;
    connect();
  };

  useEffect(() => {
    if (enabled) {
      connect();
    } else {
      disconnect();
    }

    return cleanup;
  }, [enabled, table, event, filter]);

  // Handle visibility change to reconnect when tab becomes active
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && enabled && !isConnected) {
        console.log('Tab became visible, attempting to reconnect realtime subscription');
        reconnect();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [enabled, isConnected]);

  return {
    isConnected,
    connectionStatus,
    reconnect,
    disconnect,
  };
};

// Hook for subscribing to report changes
export const useReportSubscription = (
  reportId?: string,
  onReportUpdate?: (report: any) => void,
  enabled: boolean = true
) => {
  return useRealtimeSubscription({
    table: 'reports',
    event: 'UPDATE',
    filter: reportId ? `id=eq.${reportId}` : undefined,
    onUpdate: (payload) => {
      if (onReportUpdate) {
        onReportUpdate(payload.new);
      }
    },
    enabled,
  });
};

// Hook for subscribing to status history changes
export const useStatusHistorySubscription = (
  reportId?: string,
  onStatusChange?: (entry: any) => void,
  enabled: boolean = true
) => {
  return useRealtimeSubscription({
    table: 'report_status_history',
    event: 'INSERT',
    filter: reportId ? `report_id=eq.${reportId}` : undefined,
    onInsert: (payload) => {
      if (onStatusChange) {
        onStatusChange(payload.new);
      }
    },
    enabled,
  });
};

// Hook for subscribing to worker assignment changes
export const useWorkerSubscription = (
  workerId?: string,
  onAssignmentChange?: (report: any) => void,
  enabled: boolean = true
) => {
  return useRealtimeSubscription({
    table: 'reports',
    event: 'UPDATE',
    filter: workerId ? `assigned_worker_id=eq.${workerId}` : undefined,
    onUpdate: (payload) => {
      if (onAssignmentChange) {
        onAssignmentChange(payload.new);
      }
    },
    enabled,
  });
};

// Hook for subscribing to new reports (for admins)
export const useNewReportsSubscription = (
  councilId?: string,
  onNewReport?: (report: any) => void,
  enabled: boolean = true
) => {
  return useRealtimeSubscription({
    table: 'reports',
    event: 'INSERT',
    filter: councilId ? `council_id=eq.${councilId}` : undefined,
    onInsert: (payload) => {
      if (onNewReport) {
        onNewReport(payload.new);
        
        // Show toast notification for new reports
        toast({
          title: "New Report Submitted",
          description: `Report #${payload.new.report_number} - ${payload.new.category.replace('_', ' ')}`,
        });
      }
    },
    enabled,
  });
};

// Hook for subscribing to notifications
export const useNotificationSubscription = (
  userId?: string,
  onNewNotification?: (notification: any) => void,
  enabled: boolean = true
) => {
  return useRealtimeSubscription({
    table: 'notifications',
    event: 'INSERT',
    filter: userId ? `user_id=eq.${userId}` : undefined,
    onInsert: (payload) => {
      if (onNewNotification) {
        onNewNotification(payload.new);
        
        // Show toast notification
        toast({
          title: payload.new.title,
          description: payload.new.message,
        });
      }
    },
    enabled,
  });
};

// Connection status indicator hook
export const useRealtimeConnectionStatus = () => {
  const [globalStatus, setGlobalStatus] = useState<'connected' | 'disconnected' | 'error'>('disconnected');
  const [activeConnections, setActiveConnections] = useState(0);

  useEffect(() => {
    // Listen to Supabase realtime connection status
    const channel = supabase.channel('connection_status');
    
    channel.subscribe((status) => {
      switch (status) {
        case 'SUBSCRIBED':
          setGlobalStatus('connected');
          break;
        case 'CHANNEL_ERROR':
        case 'TIMED_OUT':
          setGlobalStatus('error');
          break;
        case 'CLOSED':
          setGlobalStatus('disconnected');
          break;
      }
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    status: globalStatus,
    activeConnections,
    isOnline: globalStatus === 'connected',
  };
};