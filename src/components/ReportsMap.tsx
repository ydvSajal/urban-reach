import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { MapPin, Loader2, Filter, Eye, MessageSquare, Check, X, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  const [mapReady, setMapReady] = useState(false);
  const [filters, setFilters] = useState<MapFilters>({ status: "all", category: "all", priority: "all" });
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;
    
    // Wait for the container to be visible and have dimensions
    const initializeMap = () => {
      if (!mapRef.current) return;
      
      const container = mapRef.current;
      const rect = container.getBoundingClientRect();
      
      // Only initialize if container has dimensions
      if (rect.width === 0 || rect.height === 0) {
        setTimeout(initializeMap, 100);
        return;
      }
      
      console.log('Initializing map with container size:', rect.width, 'x', rect.height);
      
      const map = L.map(container, {
        preferCanvas: false,
        zoomControl: true,
        attributionControl: true,
        // Ensure proper initialization
        renderer: L.svg()
      }).setView([28.4509, 77.5847], 13);
      
      // Add tile layer with proper configuration
      const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
        subdomains: ['a', 'b', 'c'],
        errorTileUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
        // Add additional options for better reliability
        crossOrigin: true,
        timeout: 10000
      });
      
      tileLayer.addTo(map);
      
      // Add event listeners to debug tile loading
      tileLayer.on('loading', () => console.log('Tiles loading...'));
      tileLayer.on('load', () => {
        console.log('Tiles loaded successfully');
        // Force a resize after tiles load
        setTimeout(() => map.invalidateSize(), 50);
      });
      tileLayer.on('tileerror', (e) => {
        console.error('Tile error:', e);
        // Try alternative tile server if primary fails
        console.log('Attempting to use alternative tile server...');
      });
      
      // Ensure proper sizing
      setTimeout(() => {
        map.invalidateSize();
        console.log('Map initialized and resized');
        setMapReady(true);
      }, 200);
      
      mapInstanceRef.current = map;
    };
    
    // Start initialization
    initializeMap();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      setMapReady(false);
    };
  }, []);

  useEffect(() => {
    loadReports();
  }, []);

  // Debug effect to check map container dimensions
  useEffect(() => {
    if (mapRef.current) {
      const checkDimensions = () => {
        const rect = mapRef.current?.getBoundingClientRect();
        console.log('Map container dimensions:', rect);
        if (mapInstanceRef.current && rect) {
          mapInstanceRef.current.invalidateSize();
        }
      };
      
      checkDimensions();
      
      // Check again after a delay
      const timer = setTimeout(checkDimensions, 500);
      
      return () => clearTimeout(timer);
    }
  }, [loading, reports.length]);

  useEffect(() => {
    if (mapInstanceRef.current) {
      addMarkersToMap();
    }
  }, [filteredReports]);

  useEffect(() => {
    applyFilters();
  }, [reports, filters]);

  const loadReports = async () => {
    try {
      // Get current user and their council
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("council_id")
        .eq("user_id", user.id)
        .single();

      const userCouncilId = profile?.council_id;

      // Load reports with location data, filtered by council
      let reportsQuery = supabase
        .from("reports")
        .select("*")
        .not("latitude", "is", null)
        .not("longitude", "is", null);
      
      if (userCouncilId) {
        reportsQuery = reportsQuery.eq("council_id", userCouncilId);
      }

      const { data, error } = await reportsQuery;
        
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
    if (status === "resolved" || status === "closed") return "green";
    if (priority === "high") return "red";
    if (priority === "medium") return "orange";
    return "blue";
  };

  const handleQuickAction = async (reportId: string, action: string) => {
    try {
      let newStatus: "pending" | "acknowledged" | "in_progress" | "resolved" | "closed";
      switch (action) {
        case "acknowledge":
          newStatus = "acknowledged";
          break;
        case "progress":
          newStatus = "in_progress";
          break;
        case "resolve":
          newStatus = "resolved";
          break;
        default:
          return;
      }

      const { error } = await supabase
        .from("reports")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", reportId);

      if (error) throw error;

      // Reload reports to reflect changes
      loadReports();
      
      toast({
        title: "Status updated",
        description: `Report status changed to ${newStatus.replace('_', ' ')}`,
      });
    } catch (error: any) {
      console.error("Error updating report:", error);
      toast({
        title: "Error updating report",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const addMarkersToMap = () => {
    if (!mapInstanceRef.current) return;

    // Remove existing markers by clearing all layers except tile layers
    mapInstanceRef.current.eachLayer(layer => {
      if (layer instanceof L.Marker || layer instanceof L.FeatureGroup) {
        mapInstanceRef.current!.removeLayer(layer);
      }
    });

    // Add new markers for filtered reports
    filteredReports.forEach((report) => {
      if (report.latitude && report.longitude) {
        const color = getMarkerColor(report.status, report.priority);
        
        // Create custom colored marker
        const customIcon = L.divIcon({
          html: `<div style="background-color: ${color}; width: 25px; height: 25px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
          className: 'custom-div-icon',
          iconSize: [25, 25],
          iconAnchor: [12, 12]
        });

        const marker = L.marker([report.latitude, report.longitude], { icon: customIcon });
        
        const statusBadgeColor = report.status === 'resolved' || report.status === 'closed' ? 'green' : 
                                report.status === 'in_progress' ? 'blue' : 
                                report.status === 'acknowledged' ? 'orange' : 'gray';
        
        const priorityBadgeColor = report.priority === 'high' ? 'red' : 
                                  report.priority === 'medium' ? 'orange' : 'blue';

        const quickActions = report.status !== 'resolved' && report.status !== 'closed' ? `
          <div style="margin-top: 8px; display: flex; gap: 4px; flex-wrap: wrap;">
            ${report.status === 'pending' ? `<button onclick="handleQuickAction('${report.id}', 'acknowledge')" style="background: #10b981; color: white; border: none; padding: 4px 8px; border-radius: 4px; font-size: 11px; cursor: pointer;">Acknowledge</button>` : ''}
            ${report.status === 'acknowledged' || report.status === 'pending' ? `<button onclick="handleQuickAction('${report.id}', 'progress')" style="background: #3b82f6; color: white; border: none; padding: 4px 8px; border-radius: 4px; font-size: 11px; cursor: pointer;">Start Work</button>` : ''}
            ${report.status === 'in_progress' ? `<button onclick="handleQuickAction('${report.id}', 'resolve')" style="background: #059669; color: white; border: none; padding: 4px 8px; border-radius: 4px; font-size: 11px; cursor: pointer;">Resolve</button>` : ''}
            <button onclick="window.open('/reports/${report.id}', '_blank')" style="background: #6b7280; color: white; border: none; padding: 4px 8px; border-radius: 4px; font-size: 11px; cursor: pointer;">View Details</button>
          </div>
        ` : `
          <div style="margin-top: 8px;">
            <button onclick="window.open('/reports/${report.id}', '_blank')" style="background: #6b7280; color: white; border: none; padding: 4px 8px; border-radius: 4px; font-size: 11px; cursor: pointer;">View Details</button>
          </div>
        `;

        marker.bindPopup(`
          <div style='min-width: 250px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;'>
            <div style='font-weight: bold; margin-bottom: 8px; color: #1f2937;'>#${report.report_number} - ${report.title}</div>
            <div style='margin-bottom: 8px; color: #4b5563; font-size: 13px;'>${report.description.substring(0, 120)}${report.description.length > 120 ? '...' : ''}</div>
            <div style='margin-bottom: 8px; display: flex; gap: 4px; flex-wrap: wrap;'>
              <span style='background: ${statusBadgeColor}; color: white; padding: 2px 6px; border-radius: 12px; font-size: 10px; font-weight: 500;'>${report.status.replace('_', ' ').toUpperCase()}</span>
              <span style='background: ${priorityBadgeColor}; color: white; padding: 2px 6px; border-radius: 12px; font-size: 10px; font-weight: 500;'>${report.priority.toUpperCase()}</span>
              <span style='background: #6b7280; color: white; padding: 2px 6px; border-radius: 12px; font-size: 10px; font-weight: 500;'>${report.category.replace('_', ' ').toUpperCase()}</span>
            </div>
            <div style='font-size: 11px; color: #6b7280; margin-bottom: 4px;'><strong>Location:</strong> ${report.location_address}</div>
            <div style='font-size: 11px; color: #6b7280;'><strong>Created:</strong> ${new Date(report.created_at).toLocaleDateString()}</div>
            ${quickActions}
          </div>
        `);
        
        marker.addTo(mapInstanceRef.current!);
      }
    });

    // Fit bounds to show all markers
    if (filteredReports.length > 0) {
      const markers = filteredReports
        .filter(r => r.latitude && r.longitude)
        .map(r => L.marker([r.latitude, r.longitude]));
      
      if (markers.length > 0) {
        const group = new L.FeatureGroup(markers);
        if (group.getBounds().isValid()) {
          mapInstanceRef.current!.fitBounds(group.getBounds().pad(0.1));
        } else if (markers.length === 1) {
          // If only one marker, center on it
          mapInstanceRef.current!.setView([markers[0].getLatLng().lat, markers[0].getLatLng().lng], 15);
        }
      }
    } else {
      // If no filtered reports, center on Bennett University
      mapInstanceRef.current!.setView([28.4509, 77.5847], 13);
    }
  };

  // Make handleQuickAction available globally for popup buttons
  useEffect(() => {
    (window as any).handleQuickAction = handleQuickAction;
    return () => {
      delete (window as any).handleQuickAction;
    };
  }, []);

  if (loading) {
    return (
      <div className={`flex items-center justify-center bg-muted rounded-lg ${className}`} style={{ height }}>
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        <span className="text-sm text-muted-foreground">Loading map...</span>
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <div className={`space-y-4 ${className}`}>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Map Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <MapPin className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No reports with location data found</p>
              <p className="text-xs text-muted-foreground mt-2">
                Submit a report with location information to see it on the map
              </p>
            </div>
          </CardContent>
        </Card>
        
        <div className="bg-muted rounded-lg flex items-center justify-center" style={{ height }}>
          <div className="text-center">
            <MapPin className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Map will appear here when reports are available</p>
          </div>
        </div>
      </div>
    );
  }

  const uniqueStatuses = [...new Set(reports.map(r => r.status))];
  const uniqueCategories = [...new Set(reports.map(r => r.category))];
  const uniquePriorities = [...new Set(reports.map(r => r.priority))];

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Filter Controls */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Map Filters
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={loadReports}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                {showFilters ? "Hide" : "Show"} Filters
              </Button>
            </div>
          </div>
        </CardHeader>
        {showFilters && (
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Status</label>
                <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {uniqueStatuses.map(status => (
                      <SelectItem key={status} value={status}>
                        {status.replace('_', ' ').toUpperCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Category</label>
                <Select value={filters.category} onValueChange={(value) => setFilters(prev => ({ ...prev, category: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {uniqueCategories.map(category => (
                      <SelectItem key={category} value={category}>
                        {category.replace('_', ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Priority</label>
                <Select value={filters.priority} onValueChange={(value) => setFilters(prev => ({ ...prev, priority: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Priorities" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priorities</SelectItem>
                    {uniquePriorities.map(priority => (
                      <SelectItem key={priority} value={priority}>
                        {priority.toUpperCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <span>High Priority</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                  <span>Medium Priority</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  <span>Low Priority</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span>Resolved</span>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFilters({ status: "all", category: "all", priority: "all" })}
              >
                Clear All
              </Button>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Map Container */}
      <div className="relative rounded-lg overflow-hidden border" style={{ height }}>
        <div 
          ref={mapRef} 
          className="h-full w-full" 
          style={{ 
            minHeight: height,
            backgroundColor: '#f3f4f6' // Light gray background while loading
          }}
        />
        <div className="absolute top-4 right-4 bg-background/90 backdrop-blur-sm rounded-lg p-2 text-xs text-muted-foreground">
          {filteredReports.length} of {reports.length} report{reports.length !== 1 ? 's' : ''} shown
        </div>
        {!mapReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80">
            <div className="text-center">
              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Loading map tiles...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportsMap;