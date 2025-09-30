import { useEffect, useRef, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix for default markers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

interface LeafletMapProps {
  className?: string;
  style?: React.CSSProperties;
  center?: [number, number];
  zoom?: number;
  onMapReady?: (map: L.Map) => void;
  children?: React.ReactNode;
}

// India geographical bounds - restricts map to India only
const INDIA_BOUNDS: L.LatLngBoundsExpression = [
  [6.4627, 68.0000], // Southwest corner (near Kanyakumari)
  [37.6173, 97.4178]  // Northeast corner (Kashmir/Arunachal Pradesh)
];

const LeafletMap = ({ 
  className = "", 
  style = {}, 
  center = [20.5937, 78.9629], // Center of India
  zoom = 5, // Show most of India
  onMapReady
}: LeafletMapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const initializingRef = useRef(false);

  const initializeMap = useCallback(() => {
    if (!mapRef.current || mapInstanceRef.current || initializingRef.current) {
      return;
    }

    initializingRef.current = true;

    try {
      // Ensure container has dimensions
      const container = mapRef.current;
      const rect = container.getBoundingClientRect();
      
      // Force container to have minimum dimensions if needed
      if (rect.height === 0) {
        container.style.height = '400px';
      }
      if (rect.width === 0) {
        container.style.width = '100%';
      }

      const map = L.map(container, {
        zoomControl: true,
        attributionControl: true,
        preferCanvas: true, // Use canvas for better performance
        maxBounds: INDIA_BOUNDS,
        maxBoundsViscosity: 1.0,
        minZoom: 4,
        maxZoom: 16, // Reduced max zoom for better performance
        zoomAnimation: true,
        fadeAnimation: true,
        markerZoomAnimation: true
      }).setView(center, zoom);

      // Note: Tile layer is now added from parent component (ReportsMap)
      // This allows for dynamic layer switching

      mapInstanceRef.current = map;
      
      // Single initialization callback
      setTimeout(() => {
        if (map && mapRef.current) {
          map.invalidateSize(false); // false = no animation for performance
          onMapReady?.(map);
        }
      }, 100);

    } catch (error) {
      console.error('Failed to initialize map:', error);
    } finally {
      initializingRef.current = false;
    }
  }, [center, zoom, onMapReady]);

  // Initialize map when component mounts - single attempt for performance
  useEffect(() => {
    const timer = setTimeout(initializeMap, 50);
    return () => clearTimeout(timer);
  }, [initializeMap]);

  // Optimized container visibility handling
  useEffect(() => {
    if (!mapRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting && mapInstanceRef.current) {
            mapInstanceRef.current.invalidateSize(false); // No animation for performance
          }
        });
      },
      { threshold: 0.1 } // Only trigger when 10% visible
    );

    observer.observe(mapRef.current);
    return () => observer.disconnect();
  }, []);

  // Optimized window resize handler with debouncing
  useEffect(() => {
    let resizeTimeout: NodeJS.Timeout;
    
    const handleResize = () => {
      if (resizeTimeout) clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize(false);
        }
      }, 150); // Debounced resize
    };

    window.addEventListener('resize', handleResize, { passive: true });
    return () => {
      window.removeEventListener('resize', handleResize);
      if (resizeTimeout) clearTimeout(resizeTimeout);
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  return (
    <div 
      ref={mapRef} 
      className={`leaflet-map-container ${className}`}
      style={{ 
        width: '100%', 
        height: '400px', 
        minHeight: '400px',
        position: 'relative',
        zIndex: 0,
        ...style 
      }}
    />
  );
};

export default LeafletMap;
export { type LeafletMapProps };