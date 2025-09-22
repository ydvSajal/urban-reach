import { cleanupRealtimeSubscriptions } from "@/hooks/useRealtimeSubscription";
import { sessionManager } from "@/lib/session-manager";

export const performFullCleanup = () => {
  try {
    console.log('Starting full cleanup...');
    
    // Cleanup subscriptions
    cleanupRealtimeSubscriptions();
    console.log('Realtime subscriptions cleaned up');
    
    // Cleanup session storage
    sessionManager.cleanup();
    console.log('Session storage cleaned up');
    
    // Clear any pending timeouts/intervals
    const highestTimeoutId = Number(setTimeout(() => {}, 0));
    for (let i = 0; i < highestTimeoutId; i++) {
      clearTimeout(i);
      clearInterval(i);
    }
    console.log('Timeouts and intervals cleared');
    
    // Force garbage collection if available
    if ((window as any).gc) {
      (window as any).gc();
      console.log('Garbage collection triggered');
    }
    
    console.log('Full cleanup completed');
  } catch (error) {
    console.error('Cleanup failed:', error);
  }
};

// Graceful cleanup on page unload
export const setupGlobalCleanup = () => {
  // Add beforeunload cleanup
  const handleBeforeUnload = () => {
    performFullCleanup();
  };

  // Add visibility change cleanup (when tab becomes hidden)
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'hidden') {
      // Partial cleanup when tab becomes hidden
      try {
        // Reduce subscription activity but don't fully cleanup
        console.log('Tab hidden, reducing activity...');
      } catch (error) {
        console.error('Visibility change cleanup failed:', error);
      }
    }
  };

  // Add error handler for unhandled errors
  const handleUnhandledError = (event: ErrorEvent) => {
    console.error('Unhandled error detected, performing cleanup:', event.error);
    performFullCleanup();
  };

  // Add promise rejection handler
  const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
    console.error('Unhandled promise rejection detected:', event.reason);
    // Don't cleanup on promise rejections as they might be recoverable
  };

  // Setup event listeners
  window.addEventListener('beforeunload', handleBeforeUnload);
  document.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener('error', handleUnhandledError);
  window.addEventListener('unhandledrejection', handleUnhandledRejection);

  // Return cleanup function to remove listeners
  return () => {
    window.removeEventListener('beforeunload', handleBeforeUnload);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('error', handleUnhandledError);
    window.removeEventListener('unhandledrejection', handleUnhandledRejection);
  };
};

// Resource monitoring utility
export const monitorResourceUsage = () => {
  const checkResourceUsage = () => {
    try {
      // Memory usage check
      const memory = (performance as any).memory;
      if (memory) {
        const memoryUsage = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
        if (memoryUsage > 90) {
          console.warn('High memory usage detected:', memoryUsage + '%');
          // Trigger cleanup on high memory usage
          sessionManager.cleanup();
        }
      }

      // Check for excessive DOM nodes
      const domNodes = document.querySelectorAll('*').length;
      if (domNodes > 10000) {
        console.warn('High DOM node count detected:', domNodes);
      }

      // Check for excessive event listeners
      const events = (window as any).getEventListeners?.(window) || {};
      let eventCount = 0;
      try {
        eventCount = Object.values(events).reduce<number>((sum: number, arr: unknown) => {
          const length = Array.isArray(arr) ? arr.length : 0;
          return sum + length;
        }, 0);
      } catch (e) {
        eventCount = 0;
      }
      if (eventCount > 100) {
        console.warn('High event listener count detected:', eventCount);
      }

    } catch (error) {
      console.debug('Resource monitoring error:', error);
    }
  };

  // Check every 30 seconds
  const interval = setInterval(checkResourceUsage, 30000);
  
  // Initial check
  checkResourceUsage();

  return () => clearInterval(interval);
};

// Session conflict detection
export const detectSessionConflicts = () => {
  try {
    const currentSessionId = sessionManager.getSessionId();
    const keys = Object.keys(localStorage);
    const sessionKeys = keys.filter(key => key.startsWith('ur_session-'));
    
    if (sessionKeys.length > 3) {
      console.warn('Multiple sessions detected:', sessionKeys.length);
      
      // Clean up old sessions (keep only the 2 most recent)
      const sessionData = sessionKeys.map(key => {
        const id = key.replace('ur_', '').replace('_', '');
        const timestamp = parseInt(id.split('-')[1]) || 0;
        return { key, timestamp, id };
      }).sort((a, b) => b.timestamp - a.timestamp);

      // Remove old sessions
      sessionData.slice(2).forEach(({ key }) => {
        try {
          localStorage.removeItem(key);
        } catch (error) {
          console.debug('Failed to remove old session:', error);
        }
      });

      return true; // Conflicts detected and resolved
    }
  } catch (error) {
    console.debug('Session conflict detection failed:', error);
  }
  
  return false;
};

// Initialize all cleanup utilities
export const initializeCleanupSystem = () => {
  const globalCleanup = setupGlobalCleanup();
  const resourceMonitor = monitorResourceUsage();
  
  // Check for session conflicts on init
  detectSessionConflicts();
  
  // Return master cleanup function
  return () => {
    globalCleanup();
    resourceMonitor();
    performFullCleanup();
  };
};