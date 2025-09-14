import { useState, useEffect } from 'react';
import { toast } from '@/hooks/use-toast';

interface NetworkStatus {
  online: boolean;
  downlink?: number;
  effectiveType?: string;
  rtt?: number;
}

export const useNetworkStatus = () => {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
    online: navigator.onLine,
  });

  useEffect(() => {
    const updateNetworkStatus = () => {
      const connection = (navigator as any).connection || 
                        (navigator as any).mozConnection || 
                        (navigator as any).webkitConnection;

      setNetworkStatus({
        online: navigator.onLine,
        downlink: connection?.downlink,
        effectiveType: connection?.effectiveType,
        rtt: connection?.rtt,
      });
    };

    const handleOnline = () => {
      updateNetworkStatus();
      toast({
        title: "Connection restored",
        description: "You're back online!",
      });
    };

    const handleOffline = () => {
      updateNetworkStatus();
      toast({
        title: "Connection lost",
        description: "You're currently offline. Some features may not work.",
        variant: "destructive",
      });
    };

    const handleConnectionChange = () => {
      updateNetworkStatus();
    };

    // Initial status
    updateNetworkStatus();

    // Event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const connection = (navigator as any).connection || 
                      (navigator as any).mozConnection || 
                      (navigator as any).webkitConnection;

    if (connection) {
      connection.addEventListener('change', handleConnectionChange);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      
      if (connection) {
        connection.removeEventListener('change', handleConnectionChange);
      }
    };
  }, []);

  return networkStatus;
};

// Hook to check if network is suitable for heavy operations
export const useNetworkQuality = () => {
  const networkStatus = useNetworkStatus();

  const isGoodConnection = () => {
    if (!networkStatus.online) return false;
    
    // If we don't have connection info, assume it's good
    if (!networkStatus.effectiveType) return true;
    
    // Consider 3g and above as good
    return ['4g', '3g'].includes(networkStatus.effectiveType);
  };

  const isSlowConnection = () => {
    if (!networkStatus.online) return false;
    
    return networkStatus.effectiveType === '2g' || 
           networkStatus.effectiveType === 'slow-2g';
  };

  return {
    ...networkStatus,
    isGoodConnection: isGoodConnection(),
    isSlowConnection: isSlowConnection(),
  };
};