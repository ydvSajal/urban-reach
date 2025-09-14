import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Activity, 
  Wifi, 
  Battery, 
  Smartphone, 
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react';
import { useMobileOptimization } from '@/hooks/useMobileOptimization';
import { useIsMobile } from '@/hooks/use-mobile';

interface PerformanceMetrics {
  loadTime: number;
  memoryUsage: number;
  batteryLevel?: number;
  connectionSpeed: string;
  isCharging?: boolean;
}

const MobilePerformanceMonitor: React.FC = () => {
  const isMobile = useIsMobile();
  const mobileOptimization = useMobileOptimization();
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    loadTime: 0,
    memoryUsage: 0,
    connectionSpeed: 'unknown',
  });
  const [showMonitor, setShowMonitor] = useState(false);

  useEffect(() => {
    if (!isMobile) return;

    // Show monitor only in development or if performance is poor
    const shouldShow = process.env.NODE_ENV === 'development' || 
                      mobileOptimization.isSlowConnection ||
                      mobileOptimization.isLowPowerMode;
    
    setShowMonitor(shouldShow);

    // Collect performance metrics
    const collectMetrics = async () => {
      // Navigation timing
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const loadTime = navigation ? navigation.loadEventEnd - navigation.loadEventStart : 0;

      // Memory usage (if available)
      const memory = (performance as any).memory;
      const memoryUsage = memory ? Math.round((memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100) : 0;

      // Battery API (if available)
      let batteryLevel, isCharging;
      if ('getBattery' in navigator) {
        try {
          const battery = await (navigator as any).getBattery();
          batteryLevel = Math.round(battery.level * 100);
          isCharging = battery.charging;
        } catch (error) {
          console.debug('Battery API not available');
        }
      }

      // Connection speed
      const connectionSpeed = mobileOptimization.networkInfo.effectiveType || 'unknown';

      setMetrics({
        loadTime,
        memoryUsage,
        batteryLevel,
        isCharging,
        connectionSpeed,
      });
    };

    collectMetrics();

    // Update metrics periodically
    const interval = setInterval(collectMetrics, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, [isMobile, mobileOptimization.isSlowConnection, mobileOptimization.isLowPowerMode, mobileOptimization.networkInfo.effectiveType]);

  if (!showMonitor || !isMobile) {
    return null;
  }

  const getPerformanceStatus = () => {
    if (mobileOptimization.isSlowConnection && metrics.memoryUsage > 80) {
      return { status: 'poor', color: 'destructive' as const, icon: AlertTriangle };
    } else if (mobileOptimization.isSlowConnection || metrics.memoryUsage > 60) {
      return { status: 'fair', color: 'secondary' as const, icon: Clock };
    } else {
      return { status: 'good', color: 'default' as const, icon: CheckCircle };
    }
  };

  const performanceStatus = getPerformanceStatus();

  return (
    <div className="fixed bottom-4 left-4 z-40 max-w-xs">
      <Card className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Performance Monitor
            <Badge variant={performanceStatus.color} className="ml-auto">
              <performanceStatus.icon className="h-3 w-3 mr-1" />
              {performanceStatus.status}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Connection Status */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Wifi className="h-3 w-3" />
              <span>Connection</span>
            </div>
            <Badge variant="outline" className="text-xs">
              {metrics.connectionSpeed.toUpperCase()}
            </Badge>
          </div>

          {/* Memory Usage */}
          {metrics.memoryUsage > 0 && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Smartphone className="h-3 w-3" />
                  <span>Memory</span>
                </div>
                <span>{metrics.memoryUsage}%</span>
              </div>
              <Progress value={metrics.memoryUsage} className="h-1" />
            </div>
          )}

          {/* Battery Status */}
          {metrics.batteryLevel !== undefined && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Battery className="h-3 w-3" />
                  <span>Battery</span>
                  {metrics.isCharging && <span className="text-xs text-green-600">⚡</span>}
                </div>
                <span>{metrics.batteryLevel}%</span>
              </div>
              <Progress value={metrics.batteryLevel} className="h-1" />
            </div>
          )}

          {/* Optimizations Status */}
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Active Optimizations:</div>
            <div className="flex flex-wrap gap-1">
              {mobileOptimization.config.lowDataMode && (
                <Badge variant="outline" className="text-xs">Low Data</Badge>
              )}
              {mobileOptimization.config.reduceAnimations && (
                <Badge variant="outline" className="text-xs">Reduced Motion</Badge>
              )}
              {mobileOptimization.config.optimizeImages && (
                <Badge variant="outline" className="text-xs">Image Opt</Badge>
              )}
              {mobileOptimization.config.enableLazyLoading && (
                <Badge variant="outline" className="text-xs">Lazy Load</Badge>
              )}
            </div>
          </div>

          {/* Performance Warnings */}
          {(mobileOptimization.isSlowConnection || metrics.memoryUsage > 80) && (
            <Alert variant="destructive" className="p-2">
              <AlertTriangle className="h-3 w-3" />
              <AlertDescription className="text-xs">
                {mobileOptimization.isSlowConnection && "Slow connection detected. "}
                {metrics.memoryUsage > 80 && "High memory usage. "}
                Optimizations active.
              </AlertDescription>
            </Alert>
          )}

          {/* Device Info */}
          {process.env.NODE_ENV === 'development' && (
            <div className="text-xs text-muted-foreground space-y-1">
              <div>Orientation: {mobileOptimization.orientation}</div>
              {mobileOptimization.deviceMemory && (
                <div>RAM: {mobileOptimization.deviceMemory}GB</div>
              )}
              <div>Touch: {mobileOptimization.touchSupport ? 'Yes' : 'No'}</div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MobilePerformanceMonitor;
