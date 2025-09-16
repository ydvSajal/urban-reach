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

const LeafletMap = ({ 
  className = "", 
  style = {}, 
  center = [28.4645, 77.5173], 
  zoom = 12,
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
      
      console.log('Initializing map with container rect:', rect);
      
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
        preferCanvas: false
      }).setView(center, zoom);

      // Add tile layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
        keepBuffer: 4,
        updateWhenZooming: false,
        updateWhenIdle: true
      }).addTo(map);

      mapInstanceRef.current = map;
      
      // Force map to resize and render
      setTimeout(() => {
        if (map && mapRef.current) {
          map.invalidateSize(true);
          console.log('Map initialized and sized successfully');
          onMapReady?.(map);
        }
      }, 100);

    } catch (error) {
      console.error('Failed to initialize map:', error);
    } finally {
      initializingRef.current = false;
    }
  }, [center, zoom, onMapReady]);

  // Initialize map when component mounts
  useEffect(() => {
    // Multiple initialization attempts with different timings
    const timeouts = [0, 100, 500, 1000].map(delay => 
      setTimeout(initializeMap, delay)
    );

    // Cleanup timeouts on unmount
    return () => {
      timeouts.forEach(clearTimeout);
    };
  }, [initializeMap]);

  // Handle container visibility changes
  useEffect(() => {
    if (!mapRef.current) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && mapInstanceRef.current) {
          setTimeout(() => {
            mapInstanceRef.current?.invalidateSize(true);
          }, 50);
        }
      });
    });

    observer.observe(mapRef.current);

    return () => observer.disconnect();
  }, []);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (mapInstanceRef.current) {
        setTimeout(() => {
          mapInstanceRef.current?.invalidateSize(true);
        }, 100);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Get map instance
  const getMapInstance = useCallback(() => mapInstanceRef.current, []);

  // Expose map instance via ref callback
  useEffect(() => {
    if (mapInstanceRef.current && onMapReady) {
      onMapReady(mapInstanceRef.current);
    }
  }, [onMapReady]);

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