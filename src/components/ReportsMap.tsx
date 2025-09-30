import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { MapPin, Loader2, Filter, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import LeafletMap from "./LeafletMap";
import L from "leaflet";
import "./ReportsMap.css";

// India geographical bounds
const INDIA_BOUNDS: L.LatLngBoundsExpression = [
  [6.4627, 68.0000], // Southwest corner
  [37.6173, 97.4178]  // Northeast corner
];

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

type MapViewType = 'standard' | 'satellite' | 'terrain' | 'dark';

// Different map tile layers
const MAP_LAYERS = {
  standard: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
    label: 'Standard'
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri',
    label: 'Satellite'
  },
  terrain: {
    url: 'https://stamen-tiles-{s}.a.ssl.fastly.net/terrain/{z}/{x}/{y}.jpg',
    attribution: '&copy; Stamen Design',
    label: 'Terrain'
  },
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; CartoDB',
    label: 'Dark Mode'
  }
};

const ReportsMap = ({ className = "", height = "400px" }: ReportsMapProps) => {
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [filteredReports, setFilteredReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<MapFilters>({ status: "all", category: "all", priority: "all" });
  const [showFilters, setShowFilters] = useState(false);
  const [mapView, setMapView] = useState<MapViewType>('standard');

  // Handle map ready
  const handleMapReady = (map: L.Map) => {
    console.log('Map is ready!');
    mapInstanceRef.current = map;
    
    // Add initial tile layer
    const layerConfig = MAP_LAYERS[mapView];
    tileLayerRef.current = L.tileLayer(layerConfig.url, {
      attribution: layerConfig.attribution,
      maxZoom: 16,
      keepBuffer: 2,
      updateWhenZooming: false,
      updateWhenIdle: true,
    }).addTo(map);
    
    // Create markers layer group
    markersLayerRef.current = L.layerGroup().addTo(map);
    
    // Add markers if we have reports
    if (filteredReports.length > 0) {
      addMarkersToMap();
    }
  };

  // Handle map view change
  const changeMapView = (newView: MapViewType) => {
    setMapView(newView);
    
    if (mapInstanceRef.current && tileLayerRef.current) {
      // Remove old tile layer
      tileLayerRef.current.remove();
      
      // Add new tile layer
      const layerConfig = MAP_LAYERS[newView];
      tileLayerRef.current = L.tileLayer(layerConfig.url, {
        attribution: layerConfig.attribution,
        maxZoom: 16,
        keepBuffer: 2,
        updateWhenZooming: false,
        updateWhenIdle: true,
      }).addTo(mapInstanceRef.current);
    }
  };

  // Load reports
  useEffect(() => {
    loadReports();
  }, []);

  // Apply filters when reports or filters change
  useEffect(() => {
    applyFilters();
  }, [reports, filters]);

  // Add markers when filtered reports change
  useEffect(() => {
    if (mapInstanceRef.current && markersLayerRef.current) {
      addMarkersToMap();
    }
  }, [filteredReports]);

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
      
      console.log('Loaded reports:', data?.length || 0);
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

    console.log('Filtered reports:', filtered.length, 'of', reports.length);
    setFilteredReports(filtered);
  };

  const getMarkerColor = (status: string, priority: string) => {
    if (status === "resolved" || status === "closed") return "#22c55e";
    if (priority === "high") return "#ef4444";
    if (priority === "medium") return "#f59e0b";
    return "#3b82f6";
  };

  const addMarkersToMap = () => {
    if (!mapInstanceRef.current || !markersLayerRef.current) {
      return;
    }

    // Clear existing markers efficiently
    markersLayerRef.current.clearLayers();

    // Batch marker creation for better performance
    const markers: L.Marker[] = [];
    
    filteredReports.forEach((report) => {
      if (!report.latitude || !report.longitude) return;
      
      const color = getMarkerColor(report.status, report.priority);
      
      // Create optimized marker icon
      const customIcon = L.divIcon({
        html: `<div style="background-color: ${color}; width: 16px; height: 16px; border-radius: 50%; border: 2px solid white; box-shadow: 0 1px 3px rgba(0,0,0,0.3);"></div>`,
        className: 'custom-div-icon',
        iconSize: [16, 16],
        iconAnchor: [8, 8]
      });

      const marker = L.marker([report.latitude, report.longitude], { icon: customIcon });
      
      // Simplified popup content for better performance
      const popupContent = `
        <div style='min-width: 250px; font-family: system-ui, -apple-system, sans-serif;'>
          <div style='font-weight: bold; margin-bottom: 6px; color: #1f2937; font-size: 13px;'>#${report.report_number} - ${report.title}</div>
          <div style='margin-bottom: 6px; color: #4b5563; font-size: 11px; line-height: 1.4;'>${report.description.substring(0, 80)}${report.description.length > 80 ? '...' : ''}</div>
          <div style='margin-bottom: 6px; display: flex; gap: 3px; flex-wrap: wrap;'>
            <span style='background: ${report.status === 'resolved' ? '#22c55e' : report.status === 'in_progress' ? '#3b82f6' : '#6b7280'}; color: white; padding: 1px 6px; border-radius: 10px; font-size: 9px; font-weight: 500;'>${report.status.replace('_', ' ').toUpperCase()}</span>
            <span style='background: ${report.priority === 'high' ? '#ef4444' : report.priority === 'medium' ? '#f59e0b' : '#3b82f6'}; color: white; padding: 1px 6px; border-radius: 10px; font-size: 9px; font-weight: 500;'>${report.priority.toUpperCase()}</span>
          </div>
          <div style='font-size: 10px; color: #6b7280; margin-bottom: 6px;'><strong>Location:</strong> ${report.location_address.substring(0, 40)}${report.location_address.length > 40 ? '...' : ''}</div>
          <button onclick="window.location.hash = '#/reports/${report.id}'" style="background: #374151; color: white; border: none; padding: 4px 8px; border-radius: 3px; font-size: 10px; cursor: pointer;">View Details</button>
        </div>
      `;
      
      marker.bindPopup(popupContent);
      markers.push(marker);
    });

    // Add all markers at once for better performance
    if (markers.length > 0) {
      const markerGroup = L.featureGroup(markers);
      markersLayerRef.current.addLayer(markerGroup);
      
      // Optimized bounds fitting using existing markers
      if (mapInstanceRef.current) {
        const bounds = markerGroup.getBounds();
        if (bounds.isValid()) {
          const paddedBounds = bounds.pad(0.1);
          
          // Quick distance check for performance
          const boundsSize = bounds.getNorthEast().distanceTo(bounds.getSouthWest());
          if (boundsSize < 50000) { // Less than 50km spread, show India context
            mapInstanceRef.current.fitBounds(L.latLngBounds(INDIA_BOUNDS));
          } else {
            mapInstanceRef.current.fitBounds(paddedBounds, { maxZoom: 12, animate: false });
          }
        }
      }
    } else if (mapInstanceRef.current && filteredReports.length === 0) {
      // No reports, show full India
      mapInstanceRef.current.fitBounds(L.latLngBounds(INDIA_BOUNDS), { animate: false });
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

  const uniqueStatuses = [...new Set(reports.map(r => r.status))].filter(Boolean);
  const uniqueCategories = [...new Set(reports.map(r => r.category))].filter(Boolean);
  const uniquePriorities = [...new Set(reports.map(r => r.priority))].filter(Boolean);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Map View Controls */}
      <Card className="border-2 shadow-lg bg-gradient-to-br from-card to-card/80">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              Map View Controls
            </CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              {(Object.keys(MAP_LAYERS) as MapViewType[]).map((viewType) => (
                <Button
                  key={viewType}
                  variant={mapView === viewType ? "default" : "outline"}
                  size="sm"
                  onClick={() => changeMapView(viewType)}
                  className="transition-all"
                >
                  {MAP_LAYERS[viewType].label}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Filters Section - Only show if we have reports */}
      {reports.length > 0 && (
        <Card className="border-2 shadow-lg bg-gradient-to-br from-card to-card/80">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Filter className="h-5 w-5 text-primary" />
                Report Filters
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowFilters(!showFilters)}
                >
                  <Filter className="h-4 w-4 mr-2" />
                  {showFilters ? "Hide" : "Show"}
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
              
              <div className="mt-4 flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Showing <span className="font-semibold text-primary">{filteredReports.length}</span> of <span className="font-semibold">{reports.length}</span> reports
                </div>
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* Map Section */}
      <Card className="border-2 shadow-xl overflow-hidden">
        <div className="relative bg-muted" style={{ height }}>
          <LeafletMap
            className="w-full h-full"
            style={{ height: '100%', minHeight: '400px' }}
            center={[20.5937, 78.9629]} // Center of India
            zoom={5} // Show most of India
            onMapReady={handleMapReady}
          />
          {reports.length === 0 && !loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/95 backdrop-blur-sm">
              <div className="text-center p-8">
                <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-base font-medium text-foreground mb-1">No reports with location data found</p>
                <p className="text-sm text-muted-foreground">Reports will appear here once they include location information</p>
              </div>
            </div>
          )}
          
          {/* Map Legend */}
          {filteredReports.length > 0 && (
            <div className="absolute bottom-4 right-4 bg-background/95 backdrop-blur-sm p-3 rounded-lg shadow-lg border-2 z-[1000]">
              <div className="text-xs font-semibold mb-2">Legend</div>
              <div className="space-y-1 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#22c55e] border-2 border-white"></div>
                  <span>Resolved</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#ef4444] border-2 border-white"></div>
                  <span>High Priority</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#f59e0b] border-2 border-white"></div>
                  <span>Medium Priority</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#3b82f6] border-2 border-white"></div>
                  <span>Low Priority</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default ReportsMap;