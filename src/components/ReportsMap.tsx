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
    // eslint-disable-next-line
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
    // Fit bounds
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
      const [statusFilter, setStatusFilter] = useState<string>("all");
      const [categoryFilter, setCategoryFilter] = useState<string>("all");
      const [priorityFilter, setPriorityFilter] = useState<string>("all");
      const [showFiltersPanel, setShowFiltersPanel] = useState(false);
export default ReportsMap;
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
    // eslint-disable-next-line
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
    // Fit bounds
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
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-2 block">Status</label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="All statuses" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="acknowledged">Acknowledged</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-2 block">Category</label>
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="All categories" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {getUniqueCategories().map((category) => (
                          <SelectItem key={category} value={category}>
                            {category.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase())}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-2 block">Priority</label>
                    <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="All priorities" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Priorities</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
      <div className="relative" style={{ height }}>
        {loading ? (
          <div className="h-full w-full flex items-center justify-center bg-muted rounded-lg">
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm text-muted-foreground">Loading map...</span>
            </div>
          </div>
        ) : reports.length === 0 ? (
          <div className="h-full w-full flex items-center justify-center bg-muted rounded-lg">
            <div className="text-center">
              <MapPin className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No reports with location data found</p>
            </div>
          </div>
        ) : (
          <MapContainer center={[20.5937, 78.9629]} zoom={5} style={{ height: "100%", width: "100%", borderRadius: "0.5rem" }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' />
            <MapContent reports={filteredReports} />
          </MapContainer>
        )}
      </div>
      <div className="absolute top-4 right-4 bg-background/90 backdrop-blur-sm rounded-lg p-3 text-xs">
        <div className="space-y-1">
          <div className="font-medium">{filteredReports.length} of {reports.length} reports shown</div>
          {getActiveFiltersCount() > 0 && (
            <div className="text-muted-foreground">{getActiveFiltersCount()} filter{getActiveFiltersCount() !== 1 ? "s" : ""} applied</div>
          )}
        </div>
      </div>
      <div className="absolute bottom-4 left-4 bg-background/90 backdrop-blur-sm rounded-lg p-3 text-xs">
        <div className="font-medium mb-2">Legend</div>
        <div className="space-y-1">
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-yellow-500"></div><span>Pending</span></div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-blue-500"></div><span>Acknowledged</span></div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-orange-500"></div><span>In Progress</span></div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-green-500"></div><span>Resolved</span></div>
        </div>
        <div className="mt-2 pt-2 border-t border-border">
          <div className="text-muted-foreground mb-1">Priority (border)</div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-gray-300 border-2 border-red-500"></div><span>High</span></div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-gray-300 border-2 border-yellow-500"></div><span>Medium</span></div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-gray-300 border-2 border-green-500"></div><span>Low</span></div>
        </div>
      </div>
    </div>
  );
};

export default ReportsMap;
import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { MapPin, Loader2, Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
  // ... existing code for the component ...
}

export default ReportsMap;
  const [reports, setReports] = useState<Report[]>([]);
  const [filteredReports, setFilteredReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  // Filter states
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);

  useEffect(() => {
    loadReports();
  }, []);

  useEffect(() => {
    filterReports();
  }, [reports, statusFilter, categoryFilter, priorityFilter]);

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

  const filterReports = () => {
    let filtered = reports;
    if (statusFilter !== "all") {
      filtered = filtered.filter(report => report.status === statusFilter);
    }
    if (categoryFilter !== "all") {
      filtered = filtered.filter(report => report.category === categoryFilter);
    }
    if (priorityFilter !== "all") {
      filtered = filtered.filter(report => report.priority === priorityFilter);
    }
    setFilteredReports(filtered);
  };

  }

  export default ReportsMap;

  const clearFilters = () => {
    setStatusFilter("all");
    setCategoryFilter("all");
    setPriorityFilter("all");
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (statusFilter !== "all") count++;
    if (categoryFilter !== "all") count++;
    if (priorityFilter !== "all") count++;
    return count;
  };

  return (
    <div className={`relative ${className}`}>
      {/* Filters Panel */}
      {showFilters && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-medium">Map Filters</h3>
              {getActiveFiltersCount() > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {getActiveFiltersCount()} active
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              {getActiveFiltersCount() > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="text-xs h-7"
                >
                  <X className="h-3 w-3 mr-1" />
                  Clear
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFiltersPanel(!showFiltersPanel)}
                className="text-xs h-7"
              >
                <Filter className="h-3 w-3 mr-1" />
                Filters
              </Button>
            </div>
          </div>

          {showFiltersPanel && (
            <Card>
              <CardContent className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-2 block">
                      Status
                    </label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="All statuses" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="acknowledged">Acknowledged</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-2 block">
                      Category
                    </label>
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="All categories" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {getUniqueCategories().map((category) => (
                          <SelectItem key={category} value={category}>
                            {category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-2 block">
                      Priority
                    </label>
                    <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="All priorities" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Priorities</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Map Container */}
      <div className="relative" style={{ height }}>
        {loading ? (
          <div className="h-full w-full flex items-center justify-center bg-muted rounded-lg">
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm text-muted-foreground">Loading map...</span>
            </div>
          </div>
        ) : reports.length === 0 ? (
          <div className="h-full w-full flex items-center justify-center bg-muted rounded-lg">
            <div className="text-center">
              <MapPin className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No reports with location data found</p>
            </div>
          </div>
        ) : (
          <MapContainer
            center={[20.5937, 78.9629]} // Center of India
            zoom={5}
            style={{ height: '100%', width: '100%', borderRadius: '0.5rem' }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            <MapContent reports={filteredReports} />
          </MapContainer>
        )}
      </div>

      {/* Map Info Overlay */}
      <div className="absolute top-4 right-4 bg-background/90 backdrop-blur-sm rounded-lg p-3 text-xs">
        <div className="space-y-1">
          <div className="font-medium">
            {filteredReports.length} of {reports.length} reports shown
          </div>
          {getActiveFiltersCount() > 0 && (
            <div className="text-muted-foreground">
              {getActiveFiltersCount()} filter{getActiveFiltersCount() !== 1 ? 's' : ''} applied
            </div>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-background/90 backdrop-blur-sm rounded-lg p-3 text-xs">
        <div className="font-medium mb-2">Legend</div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <span>Pending</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span>Acknowledged</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-orange-500"></div>
            <span>In Progress</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span>Resolved</span>
          </div>
        </div>
        <div className="mt-2 pt-2 border-t border-border">
          <div className="text-muted-foreground mb-1">Priority (border)</div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-gray-300 border-2 border-red-500"></div>
            <span>High</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-gray-300 border-2 border-yellow-500"></div>
            <span>Medium</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-gray-300 border-2 border-green-500"></div>
            <span>Low</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ReportsMap;
import { useEffect, useRef, useState, useMemo } from "react";
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { MapPin, Loader2, Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
interface ReportsMapProps {
  className?: string;
  showFilters?: boolean;
  height?: string;
}

const ReportsMap = ({ className = "", showFilters = true, height = "400px" }: ReportsMapProps) => {
  const [reports, setReports] = useState<Report[]>([]);
  const [filteredReports, setFilteredReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  // Filter states
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);

  useEffect(() => {
    loadReports();
  }, []);

  useEffect(() => {
    filterReports();
  }, [reports, statusFilter, categoryFilter, priorityFilter]);

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

  const filterReports = () => {
    let filtered = reports;
    if (statusFilter !== "all") {
      filtered = filtered.filter(report => report.status === statusFilter);
    }
    if (categoryFilter !== "all") {
      filtered = filtered.filter(report => report.category === categoryFilter);
    }
    if (priorityFilter !== "all") {
      filtered = filtered.filter(report => report.priority === priorityFilter);
    }
    setFilteredReports(filtered);
  };

  // Subcomponent for map and markers
  const MapContent = ({ reports }: { reports: Report[] }) => {
    const map = useMap();
    const markerClusterGroup = useRef<L.MarkerClusterGroup | null>(null);

    useEffect(() => {
      if (!reports.length) return;

      // Clear existing markers
      if (markerClusterGroup.current) {
        markerClusterGroup.current.clearLayers();
      } else {
        markerClusterGroup.current = L.markerClusterGroup();
        map.addLayer(markerClusterGroup.current);
      }

      reports.forEach((report) => {
        if (report.latitude && report.longitude) {
          const statusColor = getStatusColor(report.status);
          const priorityColor = getPriorityColor(report.priority);
          const customIcon = L.divIcon({
            html: `
              <div class=\"custom-marker\" style=\"
                background-color: ${statusColor}; 
                border: 3px solid ${priorityColor};
                width: 20px; 
                height: 20px; 
                border-radius: 50%; 
                position: relative;
              \">
                <div style=\"
                  position: absolute;
                  top: 50%;
                  left: 50%;
                  transform: translate(-50%, -50%);
                  width: 8px;
                  height: 8px;
                  background-color: white;
                  border-radius: 50%;
                \"></div>
              </div>
            `,
            className: 'custom-div-icon',
            iconSize: [20, 20],
            iconAnchor: [10, 10],
            popupAnchor: [0, -10]
          });
          const marker = L.marker([report.latitude, report.longitude], { icon: customIcon });
          const popupContent = `
            <div class=\"report-popup\" style=\"min-width: 280px; font-family: system-ui;\">
              <!-- Popup content remains the same as before -->
            </div>
          `;
          marker.bindPopup(popupContent, {
            maxWidth: 300,
            className: 'custom-popup'
          });
          markerClusterGroup.current.addLayer(marker);
        }
      });

      // Fit map to show all markers
      if (reports.length > 0) {
        const bounds = L.latLngBounds(
          reports
            .filter(r => r.latitude && r.longitude)
            .map(r => [r.latitude, r.longitude] as [number, number])
        );
        map.fitBounds(bounds.pad(0.1));
      }

      return () => {
        if (markerClusterGroup.current) {
          map.removeLayer(markerClusterGroup.current);
          markerClusterGroup.current = null;
        }
      };
    }, [reports, map]);
    return null;
  };
          });
          const marker = L.marker([report.latitude, report.longitude], { icon: customIcon });
          const popupContent = `
            <div class="report-popup" style="min-width: 280px; font-family: system-ui;">
              <!-- Popup content remains the same as before -->
            </div>
          `;
          marker.bindPopup(popupContent, {
            maxWidth: 300,
            className: 'custom-popup'
          });
          markerClusterGroup.current.addLayer(marker);
        }
      });

      // Fit map to show all markers
      if (reports.length > 0) {
        const bounds = L.latLngBounds(
          reports
            .filter(r => r.latitude && r.longitude)
            .map(r => [r.latitude, r.longitude] as [number, number])
        );
        map.fitBounds(bounds.pad(0.1));
      }

      return () => {
        if (markerClusterGroup.current) {
          map.removeLayer(markerClusterGroup.current);
          markerClusterGroup.current = null;
        }
      };
    }, [reports, map]);
    return null;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#f59e0b';
      case 'acknowledged': return '#3b82f6';
      case 'in_progress': return '#f97316';
      case 'resolved': return '#10b981';
      case 'closed': return '#6b7280';
      default: return '#6b7280';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return '#dc2626';
      case 'medium': return '#f59e0b';
      case 'low': return '#10b981';
      default: return '#6b7280';
    }
  };

  const getUniqueCategories = () => {
    const categories = [...new Set(reports.map(r => r.category))];
    return categories.sort();
  };

  const clearFilters = () => {
    setStatusFilter("all");
    setCategoryFilter("all");
    setPriorityFilter("all");
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (statusFilter !== "all") count++;
    if (categoryFilter !== "all") count++;
    if (priorityFilter !== "all") count++;
    return count;
  };

  return (
    <div className={`relative ${className}`}>
      {/* Filters Panel */}
      {showFilters && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-medium">Map Filters</h3>
              {getActiveFiltersCount() > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {getActiveFiltersCount()} active
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              {getActiveFiltersCount() > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="text-xs h-7"
                >
                  <X className="h-3 w-3 mr-1" />
                  Clear
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFiltersPanel(!showFiltersPanel)}
                className="text-xs h-7"
              >
                <Filter className="h-3 w-3 mr-1" />
                Filters
              </Button>
            </div>
          </div>

          {showFiltersPanel && (
            <Card>
              <CardContent className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-2 block">
                      Status
                    </label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="All statuses" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="acknowledged">Acknowledged</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-2 block">
                      Category
                    </label>
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="All categories" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {getUniqueCategories().map((category) => (
                          <SelectItem key={category} value={category}>
                            {category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-2 block">
                      Priority
                    </label>
                    <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="All priorities" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Priorities</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Map Container */}
      <div className="relative" style={{ height }}>
        {loading ? (
          <div className="h-full w-full flex items-center justify-center bg-muted rounded-lg">
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm text-muted-foreground">Loading map...</span>
            </div>
          </div>
        ) : reports.length === 0 ? (
          <div className="h-full w-full flex items-center justify-center bg-muted rounded-lg">
            <div className="text-center">
              <MapPin className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No reports with location data found</p>
            </div>
          </div>
        ) : (
          <MapContainer
            center={[20.5937, 78.9629]} // Center of India
            zoom={5}
            style={{ height: '100%', width: '100%', borderRadius: '0.5rem' }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            <MapContent reports={filteredReports} />
          </MapContainer>
        )}
      </div>

      {/* Map Info Overlay */}
      <div className="absolute top-4 right-4 bg-background/90 backdrop-blur-sm rounded-lg p-3 text-xs">
        <div className="space-y-1">
          <div className="font-medium">
            {filteredReports.length} of {reports.length} reports shown
          </div>
          {getActiveFiltersCount() > 0 && (
            <div className="text-muted-foreground">
              {getActiveFiltersCount()} filter{getActiveFiltersCount() !== 1 ? 's' : ''} applied
            </div>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-background/90 backdrop-blur-sm rounded-lg p-3 text-xs">
        <div className="font-medium mb-2">Legend</div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <span>Pending</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span>Acknowledged</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-orange-500"></div>
            <span>In Progress</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span>Resolved</span>
          </div>
        </div>
        <div className="mt-2 pt-2 border-t border-border">
          <div className="text-muted-foreground mb-1">Priority (border)</div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-gray-300 border-2 border-red-500"></div>
            <span>High</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-gray-300 border-2 border-yellow-500"></div>
            <span>Medium</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-gray-300 border-2 border-green-500"></div>
            <span>Low</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ReportsMap;