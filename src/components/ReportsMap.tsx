import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { MapPin, Loader2, Filter, Eye, MessageSquare, Check, X } from "lucide-react";
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
  const [filters, setFilters] = useState<MapFilters>({ status: "all", category: "all", priority: "all" });
  const [showFilters, setShowFilters] = useState(false);

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
  }, [filteredReports]);

  useEffect(() => {
    applyFilters();
  }, [reports, filters]);

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

    // Remove existing markers
    mapInstanceRef.current.eachLayer(layer => {
      if ((layer as any).options && (layer as any).options.pane === "markerPane") {
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
      const group = new L.FeatureGroup(filteredReports.map(r => r.latitude && r.longitude ? L.marker([r.latitude, r.longitude]) : null).filter(Boolean) as L.Marker[]);
      if (group.getBounds().isValid()) {
        mapInstanceRef.current!.fitBounds(group.getBounds().pad(0.1));
      }
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
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              {showFilters ? "Hide" : "Show"} Filters
            </Button>
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
      <div className="relative" style={{ height }}>
        <div ref={mapRef} className="h-full w-full rounded-lg overflow-hidden border" />
        <div className="absolute top-4 right-4 bg-background/90 backdrop-blur-sm rounded-lg p-2 text-xs text-muted-foreground">
          {filteredReports.length} of {reports.length} report{reports.length !== 1 ? 's' : ''} shown
        </div>
      </div>
    </div>
  );
};

export default ReportsMap;