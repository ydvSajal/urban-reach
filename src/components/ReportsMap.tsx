import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { MapPin, Loader2 } from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix for default markers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjUiIGhlaWdodD0iNDEiIHZpZXdCb3g9IjAgMCAyNSA0MSIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyLjUgMEMxOS40MDM2IDAgMjUgNS41OTY0NCAyNSAxMi41QzI1IDIyLjUgMTIuNSA0MSAxMi41IDQxQzEyLjUgNDEgMCAyMi41IDAgMTIuNUMwIDUuNTk2NDQgNS41OTY0NCAwIDEyLjUgMFoiIGZpbGw9IiNEQzI2MjYiLz4KPGNpcmNsZSBjeD0iMTIuNSIgY3k9IjEyLjUiIHI9IjQuNSIgZmlsbD0id2hpdGUiLz4KPC9zdmc+Cg==',
  iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjUiIGhlaWdodD0iNDEiIHZpZXdCb3g9IjAgMCAyNSA0MSIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyLjUgMEMxOS40MDM2IDAgMjUgNS41OTY0NCAyNSAxMi41QzI1IDIyLjUgMTIuNSA0MSAxMi41IDQxQzEyLjUgNDEgMCAyMi41IDAgMTIuNUMwIDUuNTk2NDQgNS41OTY0NCAwIDEyLjUgMFoiIGZpbGw9IiNEQzI2MjYiLz4KPGNpcmNsZSBjeD0iMTIuNSIgY3k9IjEyLjUiIHI9IjQuNSIgZmlsbD0id2hpdGUiLz4KPC9zdmc+Cg==',
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
}

const ReportsMap = ({ className = "" }: ReportsMapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Initialize map
    const map = L.map(mapRef.current).setView([20.5937, 78.9629], 5); // Center of India

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
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
    if (mapInstanceRef.current && reports.length > 0) {
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

    reports.forEach((report) => {
      if (report.latitude && report.longitude) {
        const marker = L.marker([report.latitude, report.longitude])
          .addTo(mapInstanceRef.current!);

        const statusColor = getStatusColor(report.status);
        const priorityIcon = getPriorityIcon(report.priority);

        marker.bindPopup(`
          <div class="p-2 min-w-[200px]">
            <div class="flex items-center gap-2 mb-2">
              <span class="font-semibold text-sm">#${report.report_number}</span>
              <span class="px-2 py-1 text-xs rounded-full bg-${statusColor}-100 text-${statusColor}-700">
                ${report.status.replace('_', ' ')}
              </span>
            </div>
            <h3 class="font-medium mb-1">${report.title}</h3>
            <p class="text-sm text-gray-600 mb-2">${report.description.substring(0, 100)}${report.description.length > 100 ? '...' : ''}</p>
            <div class="flex items-center gap-2 text-xs text-gray-500">
              <span class="capitalize">${report.category.replace('_', ' ')}</span>
              <span>•</span>
              <span class="capitalize">${report.priority} priority</span>
            </div>
            <p class="text-xs text-gray-500 mt-1">${report.location_address}</p>
          </div>
        `);
      }
    });

    // Fit map to show all markers if there are any
    if (reports.length > 0) {
      const group = new L.FeatureGroup(
        reports
          .filter(r => r.latitude && r.longitude)
          .map(r => L.marker([r.latitude, r.longitude]))
      );
      mapInstanceRef.current.fitBounds(group.getBounds().pad(0.1));
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'yellow';
      case 'acknowledged': return 'blue';
      case 'in_progress': return 'orange';
      case 'resolved': return 'green';
      case 'closed': return 'gray';
      default: return 'gray';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return '🔴';
      case 'medium': return '🟡';
      case 'low': return '🟢';
      default: return '⚪';
    }
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center h-[400px] bg-muted rounded-lg ${className}`}>
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm text-muted-foreground">Loading map...</span>
        </div>
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <div className={`flex items-center justify-center h-[400px] bg-muted rounded-lg ${className}`}>
        <div className="text-center">
          <MapPin className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No reports with location data found</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <div ref={mapRef} className="h-[400px] w-full rounded-lg overflow-hidden border" />
      <div className="absolute top-4 right-4 bg-background/90 backdrop-blur-sm rounded-lg p-2 text-xs text-muted-foreground">
        {reports.length} report{reports.length !== 1 ? 's' : ''} shown
      </div>
    </div>
  );
};

export default ReportsMap;