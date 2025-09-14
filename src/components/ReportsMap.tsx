import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { MapPin, Loader2 } from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix for default markers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDEiIGhlaWdodD0iNDEiIHZpZXdCb3g9IjAgMCA0MSA0MSIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGVsbGlwc2UgY3g9IjIwLjUiIGN5PSIyMC41IiByeD0iMjAuNSIgcnk9IjIwLjUiIGZpbGw9IiMwMDAwMDAiIGZpbGwtb3BhY2l0eT0iMC4xNSIvPgo8L3N2Zz4K',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

interface Report {
  id: string;
  report_number: string;
  title: string;
  description: string;
  category: string;
  status: string;
  priority: string;
  location_address: string;
  latitude: number;
  longitude: number;
  created_at: string;
}

interface ReportsMapProps {
  className?: string;
  height?: string;
}

const ReportsMap = ({ className = "", height = "400px" }: ReportsMapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;
    
    const map = L.map(mapRef.current).setView([20.5937, 78.9629], 5);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '\u00a9 OpenStreetMap contributors'
    }).addTo(map);
    
    mapInstanceRef.current = map;

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    loadReports();
  }, []);

  useEffect(() => {
    if (mapInstanceRef.current) {
      addMarkersToMap();
    }
  }, [reports]);

  const loadReports = async () => {
    try {
      const { data, error } = await supabase
        .from("reports")
        .select("*")
        .not("latitude", "is", null)
        .not("longitude", "is", null);
        
      if (error) throw error;
      setReports(data || []);
    } catch (error: any) {
      console.error("Error loading reports:", error);
      toast({
        title: "Error loading reports",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addMarkersToMap = () => {
    if (!mapInstanceRef.current) return;

    // Remove existing markers
    mapInstanceRef.current.eachLayer(layer => {
      if ((layer as any).options && (layer as any).options.pane === "markerPane") {
        mapInstanceRef.current!.removeLayer(layer);
      }
    });

    // Add new markers
    reports.forEach((report) => {
      if (report.latitude && report.longitude) {
        const marker = L.marker([report.latitude, report.longitude]);
        
        marker.bindPopup(`
          <div style='min-width:200px;'>
            <div style='font-weight:bold;'>#${report.report_number} - ${report.title}</div>
            <div style='margin-bottom:4px;'>${report.description.substring(0, 100)}${report.description.length > 100 ? '...' : ''}</div>
            <div style='font-size:12px;color:gray;'>${report.category.replace('_', ' ')} | ${report.priority} | ${report.status.replace('_', ' ')}</div>
            <div style='font-size:12px;color:gray;'>${report.location_address}</div>
          </div>
        `);
        
        marker.addTo(mapInstanceRef.current!);
      }
    });

    // Fit bounds to show all markers
    const validReports = reports.filter(r => r.latitude && r.longitude);
    if (validReports.length > 0) {
      const group = new L.FeatureGroup(validReports.map(r => L.marker([r.latitude, r.longitude])));
      mapInstanceRef.current!.fitBounds(group.getBounds().pad(0.1));
    }
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center h-[${height}] bg-muted rounded-lg ${className}`}>
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        <span className="text-sm text-muted-foreground">Loading map...</span>
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <div className={`flex items-center justify-center h-[${height}] bg-muted rounded-lg ${className}`}>
        <div className="text-center">
          <MapPin className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No reports with location data found</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`} style={{ height }}>
      <div ref={mapRef} className="h-full w-full rounded-lg overflow-hidden border" />
      <div className="absolute top-4 right-4 bg-background/90 backdrop-blur-sm rounded-lg p-2 text-xs text-muted-foreground">
        {reports.length} report{reports.length !== 1 ? 's' : ''} shown
      </div>
    </div>
  );
};

export default ReportsMap;