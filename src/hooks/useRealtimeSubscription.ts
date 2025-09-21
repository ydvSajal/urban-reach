import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { logError } from '@/lib/error-handling';
import { toast } from '@/hooks/use-toast';

export type DatabaseEvent = 'INSERT' | 'UPDATE' | 'DELETE';
export type TableName = 'reports' | 'report_status_history' | 'workers' | 'notifications';

// Global subscription manager to prevent duplicates
class SubscriptionManager {
  private static instance: SubscriptionManager;
  private subscriptions = new Map<string, RealtimeChannel>();
  private subscribers = new Map<string, Set<string>>();
  private callbacks = new Map<string, Map<string, (payload: any) => void>>();

  static getInstance() {
    if (!SubscriptionManager.instance) {
      SubscriptionManager.instance = new SubscriptionManager();
    }
    return SubscriptionManager.instance;
  }

  subscribe(key: string, subscriberId: string, channel: RealtimeChannel, callback?: (payload: any) => void) {
    // If subscription exists, add subscriber
    if (this.subscriptions.has(key)) {
      if (!this.subscribers.has(key)) {
        this.subscribers.set(key, new Set());
      }
      this.subscribers.get(key)!.add(subscriberId);
      
      // Add callback if provided
      if (callback) {
        if (!this.callbacks.has(key)) {
          this.callbacks.set(key, new Map());
        }
        this.callbacks.get(key)!.set(subscriberId, callback);
      }
      
      return this.subscriptions.get(key)!;
    }

    // Create new subscription
    this.subscriptions.set(key, channel);
    this.subscribers.set(key, new Set([subscriberId]));
    
    if (callback) {
      this.callbacks.set(key, new Map([[subscriberId, callback]]));
    }
    
    return channel;
  }

  unsubscribe(key: string, subscriberId: string) {
    const subscribers = this.subscribers.get(key);
    if (subscribers) {
      subscribers.delete(subscriberId);
      
      // Remove callback
      const callbacks = this.callbacks.get(key);
      if (callbacks) {
        callbacks.delete(subscriberId);
      }
      
      // If no more subscribers, remove the subscription
      if (subscribers.size === 0) {
        const channel = this.subscriptions.get(key);
        if (channel) {
          supabase.removeChannel(channel);
          this.subscriptions.delete(key);
          this.subscribers.delete(key);
          this.callbacks.delete(key);
        }
      }
    }
  }

  getCallbacks(key: string): Map<string, (payload: any) => void> | undefined {
    return this.callbacks.get(key);
  }

  cleanup() {
    this.subscriptions.forEach((channel) => {
      supabase.removeChannel(channel);
    });
    this.subscriptions.clear();
    this.subscribers.clear();
    this.callbacks.clear();
  }
}

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

// Enhanced useRealtimeSubscription with subscription manager
export const useRealtimeSubscription = (options: RealtimeSubscriptionOptions) => {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const subscriberIdRef = useRef(`${Date.now()}-${Math.random()}`);
  const manager = SubscriptionManager.getInstance();

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

  const createCallback = useCallback((
    onInsert?: (payload: RealtimePostgresChangesPayload<any>) => void,
    onUpdate?: (payload: RealtimePostgresChangesPayload<any>) => void,
    onDelete?: (payload: RealtimePostgresChangesPayload<any>) => void,
    onError?: (error: any) => void
  ) => {
    return (payload: RealtimePostgresChangesPayload<any>) => {
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
    };
  }, []);

  useEffect(() => {
    if (!enabled) {
      // Cleanup if disabled
      const subscriptionKey = `${table}${filter ? `-${filter}` : ''}${event !== '*' ? `-${event}` : ''}`;
      manager.unsubscribe(subscriptionKey, subscriberIdRef.current);
      setIsConnected(false);
      setConnectionStatus('disconnected');
      return;
    }

    const subscriptionKey = `${table}${filter ? `-${filter}` : ''}${event !== '*' ? `-${event}` : ''}`;
    const subscriberId = subscriberIdRef.current;

    const callback = createCallback(onInsert, onUpdate, onDelete, onError);

    // Check if subscription already exists
    let channel = manager.subscriptions.get(subscriptionKey);

    if (!channel) {
      setConnectionStatus('connecting');
      
      // Create new subscription
      const channelName = `realtime-${subscriptionKey}-${Date.now()}`;
      channel = supabase.channel(channelName);

      channel.on('postgres_changes', 
        { 
          event: event as any, 
          schema: 'public', 
          table,
          ...(filter && { filter })
        }, 
        (payload: RealtimePostgresChangesPayload<any>) => {
          // Execute all callbacks for this subscription
          const callbacks = manager.getCallbacks(subscriptionKey);
          if (callbacks) {
            callbacks.forEach(cb => cb(payload));
          }
        }
      );

      // Subscribe to channel
      channel.subscribe((status) => {
        console.log(`Realtime subscription status for ${table}:`, status);
        
        switch (status) {
          case 'SUBSCRIBED':
            setIsConnected(true);
            setConnectionStatus('connected');
            break;
          case 'CHANNEL_ERROR':
          case 'TIMED_OUT':
            setIsConnected(false);
            setConnectionStatus('error');
            break;
          case 'CLOSED':
            setIsConnected(false);
            setConnectionStatus('disconnected');
            break;
        }
      });
    } else {
      // Use existing subscription
      setIsConnected(true);
      setConnectionStatus('connected');
    }

    manager.subscribe(subscriptionKey, subscriberId, channel, callback);

    // Cleanup function
    return () => {
      manager.unsubscribe(subscriptionKey, subscriberId);
    };
  }, [table, filter, event, enabled, createCallback, onInsert, onUpdate, onDelete, onError]);

  // Global cleanup on unmount
  useEffect(() => {
    return () => {
      const subscriberId = subscriberIdRef.current;
      // Clean up all subscriptions for this component
      manager.subscriptions.forEach((_, key) => {
        manager.unsubscribe(key, subscriberId);
      });
    };
  }, []);

  const reconnect = useCallback(() => {
    // Force reconnection by temporarily disabling and re-enabling
    const subscriptionKey = `${table}${filter ? `-${filter}` : ''}${event !== '*' ? `-${event}` : ''}`;
    manager.unsubscribe(subscriptionKey, subscriberIdRef.current);
    
    setTimeout(() => {
      if (enabled) {
        // Re-trigger the effect
        subscriberIdRef.current = `${Date.now()}-${Math.random()}`;
      }
    }, 100);
  }, [table, filter, event, enabled]);

  const disconnect = useCallback(() => {
    const subscriptionKey = `${table}${filter ? `-${filter}` : ''}${event !== '*' ? `-${event}` : ''}`;
    manager.unsubscribe(subscriptionKey, subscriberIdRef.current);
    setIsConnected(false);
    setConnectionStatus('disconnected');
  }, [table, filter, event]);

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

// Export cleanup function for app-level cleanup
export const cleanupRealtimeSubscriptions = () => {
  SubscriptionManager.getInstance().cleanup();
};