import { useState, useEffect, useCallback } from 'react';
import { useIsMobile } from './use-mobile';

interface MobileOptimizationConfig {
  enableLazyLoading: boolean;
  reduceAnimations: boolean;
  optimizeImages: boolean;
  enableTouchGestures: boolean;
  lowDataMode: boolean;
}

interface NetworkInfo {
  effectiveType: '2g' | '3g' | '4g' | 'slow-2g' | undefined;
  downlink: number;
  saveData: boolean;
}

interface MobileOptimizationState {
  config: MobileOptimizationConfig;
  networkInfo: NetworkInfo;
  isLowPowerMode: boolean;
  orientation: 'portrait' | 'landscape';
  touchSupport: boolean;
  deviceMemory: number | undefined;
}

export const useMobileOptimization = () => {
  const isMobile = useIsMobile();
  const [optimizationState, setOptimizationState] = useState<MobileOptimizationState>({
    config: {
      enableLazyLoading: true,
      reduceAnimations: false,
      optimizeImages: true,
      enableTouchGestures: true,
      lowDataMode: false,
    },
    networkInfo: {
      effectiveType: undefined,
      downlink: 0,
      saveData: false,
    },
    isLowPowerMode: false,
    orientation: 'portrait',
    touchSupport: false,
    deviceMemory: undefined,
  });

  // Detect network conditions
  const updateNetworkInfo = useCallback(() => {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      const networkInfo: NetworkInfo = {
        effectiveType: connection?.effectiveType,
        downlink: connection?.downlink || 0,
        saveData: connection?.saveData || false,
      };
      
      setOptimizationState(prev => ({
        ...prev,
        networkInfo,
        config: {
          ...prev.config,
          lowDataMode: networkInfo.saveData || networkInfo.effectiveType === '2g' || networkInfo.effectiveType === 'slow-2g',
          optimizeImages: networkInfo.saveData || networkInfo.downlink < 1.5,
        }
      }));
    }
  }, []);

  // Detect orientation changes
  const updateOrientation = useCallback(() => {
    const orientation = window.screen?.orientation?.type?.includes('portrait') ? 'portrait' : 'landscape';
    setOptimizationState(prev => ({
      ...prev,
      orientation,
    }));
  }, []);

  // Detect device capabilities
  const updateDeviceCapabilities = useCallback(() => {
    const touchSupport = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const deviceMemory = (navigator as any).deviceMemory;
    const isLowPowerMode = deviceMemory && deviceMemory < 4;

    setOptimizationState(prev => ({
      ...prev,
      touchSupport,
      deviceMemory,
      isLowPowerMode,
      config: {
        ...prev.config,
        reduceAnimations: isLowPowerMode || prev.config.lowDataMode,
        enableTouchGestures: touchSupport,
      }
    }));
  }, []);

  // Setup event listeners
  useEffect(() => {
    if (!isMobile) return;

    // Initial setup
    updateNetworkInfo();
    updateOrientation();
    updateDeviceCapabilities();

    // Network change listener
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      connection?.addEventListener('change', updateNetworkInfo);
    }

    // Orientation change listener
    window.addEventListener('orientationchange', updateOrientation);
    screen?.orientation?.addEventListener('change', updateOrientation);

    // Cleanup
    return () => {
      if ('connection' in navigator) {
        const connection = (navigator as any).connection;
        connection?.removeEventListener('change', updateNetworkInfo);
      }
      window.removeEventListener('orientationchange', updateOrientation);
      screen?.orientation?.removeEventListener('change', updateOrientation);
    };
  }, [isMobile, updateNetworkInfo, updateOrientation, updateDeviceCapabilities]);

  // Image optimization helper
  const getOptimizedImageUrl = useCallback((originalUrl: string, options?: {
    width?: number;
    height?: number;
    quality?: number;
  }) => {
    if (!optimizationState.config.optimizeImages) return originalUrl;
    
    const { width, height, quality = 80 } = options || {};
    const params = new URLSearchParams();
    
    if (width) params.set('w', width.toString());
    if (height) params.set('h', height.toString());
    if (optimizationState.config.lowDataMode) {
      params.set('q', Math.min(quality, 60).toString());
    } else {
      params.set('q', quality.toString());
    }
    
    // For mobile, reduce default quality
    if (isMobile && !params.has('q')) {
      params.set('q', '70');
    }
    
    // If using a CDN like Supabase Storage, append optimization parameters
    if (originalUrl.includes('supabase.co') || originalUrl.includes('storage')) {
      const separator = originalUrl.includes('?') ? '&' : '?';
      return `${originalUrl}${separator}${params.toString()}`;
    }
    
    return originalUrl;
  }, [optimizationState.config.optimizeImages, optimizationState.config.lowDataMode, isMobile]);

  // CSS class helper for animations
  const getAnimationClasses = useCallback((normalClasses: string, reducedClasses?: string) => {
    if (optimizationState.config.reduceAnimations) {
      return reducedClasses || 'motion-reduce:transition-none motion-reduce:transform-none';
    }
    return normalClasses;
  }, [optimizationState.config.reduceAnimations]);

  // Touch gesture helper
  const createTouchHandler = useCallback((handlers: {
    onTouchStart?: (e: TouchEvent) => void;
    onTouchMove?: (e: TouchEvent) => void;
    onTouchEnd?: (e: TouchEvent) => void;
    onSwipeLeft?: () => void;
    onSwipeRight?: () => void;
    onSwipeUp?: () => void;
    onSwipeDown?: () => void;
  }) => {
    if (!optimizationState.touchSupport) return {};

    let startX = 0;
    let startY = 0;
    let endX = 0;
    let endY = 0;

    const handleTouchStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      handlers.onTouchStart?.(e);
    };

    const handleTouchMove = (e: TouchEvent) => {
      handlers.onTouchMove?.(e);
    };

    const handleTouchEnd = (e: TouchEvent) => {
      endX = e.changedTouches[0].clientX;
      endY = e.changedTouches[0].clientY;
      
      const deltaX = endX - startX;
      const deltaY = endY - startY;
      const minSwipeDistance = 50;

      if (Math.abs(deltaX) > minSwipeDistance || Math.abs(deltaY) > minSwipeDistance) {
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
          // Horizontal swipe
          if (deltaX > 0) {
            handlers.onSwipeRight?.();
          } else {
            handlers.onSwipeLeft?.();
          }
        } else {
          // Vertical swipe
          if (deltaY > 0) {
            handlers.onSwipeDown?.();
          } else {
            handlers.onSwipeUp?.();
          }
        }
      }

      handlers.onTouchEnd?.(e);
    };

    return {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    };
  }, [optimizationState.touchSupport]);

  // Lazy loading observer
  const createLazyLoadObserver = useCallback((callback: (element: Element) => void) => {
    if (!optimizationState.config.enableLazyLoading) return null;

    return new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            callback(entry.target);
          }
        });
      },
      {
        rootMargin: '50px',
        threshold: 0.1,
      }
    );
  }, [optimizationState.config.enableLazyLoading]);

  // Performance monitoring
  const measurePerformance = useCallback((label: string, fn: () => void | Promise<void>) => {
    const start = performance.now();
    
    const result = fn();
    
    if (result instanceof Promise) {
      return result.finally(() => {
        const end = performance.now();
        console.debug(`Performance: ${label} took ${end - start}ms`);
      });
    } else {
      const end = performance.now();
      console.debug(`Performance: ${label} took ${end - start}ms`);
      return result;
    }
  }, []);

  // Debounce helper for touch/scroll events
  const debounce = useCallback((func: Function, wait: number) => {
    let timeout: NodeJS.Timeout;
    return function executedFunction(...args: any[]) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }, []);

  // Throttle helper for high-frequency events
  const throttle = useCallback((func: Function, limit: number) => {
    let inThrottle: boolean;
    return function executedFunction(...args: any[]) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }, []);

  return {
    isMobile,
    ...optimizationState,
    
    // Helpers
    getOptimizedImageUrl,
    getAnimationClasses,
    createTouchHandler,
    createLazyLoadObserver,
    measurePerformance,
    debounce,
    throttle,
    
    // Quick access to common checks
    shouldReduceAnimations: optimizationState.config.reduceAnimations,
    shouldOptimizeImages: optimizationState.config.optimizeImages,
    isSlowConnection: optimizationState.networkInfo.effectiveType === '2g' || 
                     optimizationState.networkInfo.effectiveType === 'slow-2g' ||
                     optimizationState.networkInfo.downlink < 0.5,
    isPortrait: optimizationState.orientation === 'portrait',
    isLandscape: optimizationState.orientation === 'landscape',
  };
};

export default useMobileOptimization;
