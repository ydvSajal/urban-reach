import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { MapPin, Loader2, Filter, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./ReportsMap.css";

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

interface MapFilters {
  status: string;
  category: string;
  priority: string;
}

const ReportsMap = ({ className = "", height = "400px" }: ReportsMapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [filteredReports, setFilteredReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<MapFilters>({ status: "all", category: "all", priority: "all" });
  const [showFilters, setShowFilters] = useState(false);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    try {
      const map = L.map(mapRef.current, {
        zoomControl: true,
        attributionControl: true,
      }).setView([28.4645, 77.5173], 12);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
        crossOrigin: true,
      }).addTo(map);

      mapInstanceRef.current = map;

      // Important: make sure map resizes correctly
      setTimeout(() => {
        map.invalidateSize();
      }, 100);
    } catch (error) {
      console.error("Error initializing map:", error);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Load reports
  useEffect(() => {
    loadReports();
  }, []);

  // Add markers when filtered reports change
  useEffect(() => {
    if (mapInstanceRef.current && !loading) {
      // Small delay to ensure map is fully rendered
      setTimeout(() => {
        addMarkersToMap();
      }, 100);
    }
  }, [filteredReports, loading]);

  // Apply filters when reports or filters change
  useEffect(() => {
    applyFilters();
  }, [reports, filters]);

  const loadReports = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("council_id")
        .eq("user_id", user.id)
        .maybeSingle();

      let query = supabase
        .from("reports")
        .select("*")
        .not("latitude", "is", null)
        .not("longitude", "is", null);
      
      if (profile?.council_id) {
        query = query.eq("council_id", profile.council_id);
      }

      const { data, error } = await query;
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

  const applyFilters = () => {
    let filtered = reports;

    if (filters.status !== "all") {
      filtered = filtered.filter(report => report.status === filters.status);
    }

    if (filters.category !== "all") {
      filtered = filtered.filter(report => report.category === filters.category);
    }

    if (filters.priority !== "all") {
      filtered = filtered.filter(report => report.priority === filters.priority);
    }

    setFilteredReports(filtered);
  };

  const getMarkerColor = (status: string, priority: string) => {
    if (status === "resolved" || status === "closed") return "#22c55e";
    if (priority === "high") return "#ef4444";
    if (priority === "medium") return "#f59e0b";
    return "#3b82f6";
  };

  const addMarkersToMap = () => {
    if (!mapInstanceRef.current) {
      console.log('Map not ready for markers');
      return;
    }

    console.log('Adding markers for', filteredReports.length, 'filtered reports');

    // Clear existing markers
    mapInstanceRef.current.eachLayer(layer => {
      if (layer instanceof L.Marker) {
        mapInstanceRef.current!.removeLayer(layer);
      }
    });

    // Add markers for each report
    filteredReports.forEach((report) => {
      if (!report.latitude || !report.longitude) return;
      
      const color = getMarkerColor(report.status, report.priority);
      
      // Create custom colored marker icon
      const customIcon = L.divIcon({
        html: `<div style="background-color: ${color}; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
        className: 'custom-div-icon',
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      });

      const marker = L.marker([report.latitude, report.longitude], { icon: customIcon });
      
      // Create popup content
      const popupContent = `
        <div style='min-width: 280px; font-family: system-ui, -apple-system, sans-serif;'>
          <div style='font-weight: bold; margin-bottom: 8px; color: #1f2937; font-size: 14px;'>#${report.report_number} - ${report.title}</div>
          <div style='margin-bottom: 8px; color: #4b5563; font-size: 12px; line-height: 1.4;'>${report.description.substring(0, 100)}${report.description.length > 100 ? '...' : ''}</div>
          <div style='margin-bottom: 8px; display: flex; gap: 4px; flex-wrap: wrap;'>
            <span style='background: ${report.status === 'resolved' ? '#22c55e' : report.status === 'in_progress' ? '#3b82f6' : '#6b7280'}; color: white; padding: 2px 8px; border-radius: 12px; font-size: 10px; font-weight: 500; text-transform: uppercase;'>${report.status.replace('_', ' ')}</span>
            <span style='background: ${report.priority === 'high' ? '#ef4444' : report.priority === 'medium' ? '#f59e0b' : '#3b82f6'}; color: white; padding: 2px 8px; border-radius: 12px; font-size: 10px; font-weight: 500; text-transform: uppercase;'>${report.priority}</span>
            <span style='background: #6b7280; color: white; padding: 2px 8px; border-radius: 12px; font-size: 10px; font-weight: 500; text-transform: uppercase;'>${report.category.replace('_', ' ')}</span>
          </div>
          <div style='font-size: 11px; color: #6b7280; margin-bottom: 4px;'><strong>Location:</strong> ${report.location_address}</div>
          <div style='font-size: 11px; color: #6b7280; margin-bottom: 8px;'><strong>Created:</strong> ${new Date(report.created_at).toLocaleDateString()}</div>
          <div style='margin-top: 8px;'>
            <button onclick="window.open('/reports/${report.id}', '_blank')" style="background: #374151; color: white; border: none; padding: 6px 12px; border-radius: 4px; font-size: 11px; cursor: pointer; font-weight: 500;">View Details</button>
          </div>
        </div>
      `;
      
      marker.bindPopup(popupContent);
      marker.addTo(mapInstanceRef.current);
    });

    // Fit map bounds to show all markers
    if (filteredReports.length > 0) {
      const group = new L.FeatureGroup(
        filteredReports
          .filter(r => r.latitude && r.longitude)
          .map(r => L.marker([r.latitude, r.longitude]))
      );
      
      if (group.getBounds().isValid()) {
        mapInstanceRef.current.fitBounds(group.getBounds().pad(0.1));
      }
    } else {
      // Center on default location when no reports
      mapInstanceRef.current.setView([28.4645, 77.5173], 12);
    }
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center bg-muted rounded-lg ${className}`} style={{ height }}>
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        <span className="text-sm text-muted-foreground">Loading map...</span>
      </div>
    );
  }

  // Show empty map even when no reports

  const uniqueStatuses = [...new Set(reports.map(r => r.status))].filter(Boolean);
  const uniqueCategories = [...new Set(reports.map(r => r.category))].filter(Boolean);
  const uniquePriorities = [...new Set(reports.map(r => r.priority))].filter(Boolean);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Filters Section - Only show if we have reports */}
      {reports.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Map Filters
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowFilters(!showFilters)}
                >
                  <Filter className="h-4 w-4 mr-2" />
                  {showFilters ? "Hide Filters" : "Show Filters"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadReports}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </div>
          </CardHeader>
          {showFilters && (
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Status</label>
                  <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      {uniqueStatuses.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status.replace('_', ' ').toUpperCase()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Category</label>
                  <Select value={filters.category} onValueChange={(value) => setFilters(prev => ({ ...prev, category: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {uniqueCategories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category.replace('_', ' ').toUpperCase()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Priority</label>
                  <Select value={filters.priority} onValueChange={(value) => setFilters(prev => ({ ...prev, priority: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Priorities</SelectItem>
                      {uniquePriorities.map((priority) => (
                        <SelectItem key={priority} value={priority}>
                          {priority.toUpperCase()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="mt-4 text-sm text-muted-foreground">
                Showing {filteredReports.length} of {reports.length} reports
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* Map Section */}
      <div className="relative bg-background border rounded-lg overflow-hidden" style={{ height }}>
        <div 
          ref={mapRef} 
          className="w-full h-full"
          style={{ height: '100%', minHeight: '400px' }}
        />
        {reports.length === 0 && !loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/90 backdrop-blur-sm">
            <div className="text-center">
              <MapPin className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No reports with location data found</p>
              <p className="text-xs text-muted-foreground mt-1">Create some sample reports to see them on the map</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportsMap;