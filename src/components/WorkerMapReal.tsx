import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Icon } from 'leaflet';
import { MapPin, Navigation } from 'lucide-react';
import { Button } from '@/components/ui/button';
import 'leaflet/dist/leaflet.css';

// India geographical bounds
const INDIA_CENTER: [number, number] = [20.5937, 78.9629];
const INDIA_BOUNDS: [[number, number], [number, number]] = [
  [6.4627, 68.0000], // Southwest corner
  [37.6173, 97.4178]  // Northeast corner
];

interface Report {
  id: string;
  title: string;
  location_address: string;
  latitude: number | null;
  longitude: number | null;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'acknowledged' | 'in_progress' | 'resolved' | 'closed';
}

interface WorkerMapRealProps {
  reports: Report[];
}

const WorkerMapReal: React.FC<WorkerMapRealProps> = ({ reports }) => {
  const mapRef = useRef<any>(null);

  const openInMaps = (address: string, lat?: number, lng?: number) => {
    const query = lat && lng ? `${lat},${lng}` : encodeURIComponent(address);
    const url = `https://www.google.com/maps/search/?api=1&query=${query}`;
    window.open(url, '_blank');
  };

  const getPriorityIcon = (priority: string) => {
    let color = '#6b7280'; // gray-500
    switch (priority) {
      case 'critical': color = '#ef4444'; break; // red-500
      case 'high': color = '#f97316'; break; // orange-500
      case 'medium': color = '#eab308'; break; // yellow-500
      case 'low': color = '#22c55e'; break; // green-500
    }
    
    return new Icon({
      iconUrl: `data:image/svg+xml;base64,${btoa(`
        <svg width="25" height="41" viewBox="0 0 25 41" xmlns="http://www.w3.org/2000/svg">
          <path d="M12.5 0C5.59644 0 0 5.59644 0 12.5C0 19.4036 12.5 41 12.5 41C12.5 41 25 19.4036 25 12.5C25 5.59644 19.4036 0 12.5 0Z" fill="${color}"/>
          <circle cx="12.5" cy="12.5" r="6" fill="white"/>
        </svg>
      `)}`,
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
    });
  };

  // Filter reports with valid coordinates
  const validReports = reports.filter(report => 
    report.latitude !== null && 
    report.longitude !== null &&
    !isNaN(report.latitude) &&
    !isNaN(report.longitude)
  );

  if (validReports.length === 0) {
    return (
      <div className="h-80 w-full rounded-lg overflow-hidden relative">
        <MapContainer
          center={INDIA_CENTER}
          zoom={5}
          style={{ height: '100%', width: '100%' }}
          maxBounds={INDIA_BOUNDS}
          maxBoundsViscosity={1.0}
          minZoom={4}
          maxZoom={18}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
        </MapContainer>
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="text-center">
            <MapPin className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <p className="text-muted-foreground">No location data available for your assignments</p>
          </div>
        </div>
      </div>
    );
  }

  // Calculate center point from all valid locations, default to India center
  let centerLat = INDIA_CENTER[0];
  let centerLng = INDIA_CENTER[1];
  let zoomLevel = 5; // Default to show most of India
  
  if (validReports.length > 0) {
    centerLat = validReports.reduce((sum, report) => sum + (report.latitude || 0), 0) / validReports.length;
    centerLng = validReports.reduce((sum, report) => sum + (report.longitude || 0), 0) / validReports.length;
    
    // Ensure center is within India bounds
    centerLat = Math.max(INDIA_BOUNDS[0][0], Math.min(INDIA_BOUNDS[1][0], centerLat));
    centerLng = Math.max(INDIA_BOUNDS[0][1], Math.min(INDIA_BOUNDS[1][1], centerLng));
    
    zoomLevel = validReports.length === 1 ? 12 : 8;
  }

  return (
    <div className="h-80 w-full rounded-lg overflow-hidden">
      <MapContainer
        center={[centerLat, centerLng]}
        zoom={zoomLevel}
        style={{ height: '100%', width: '100%' }}
        maxBounds={INDIA_BOUNDS}
        maxBoundsViscosity={1.0}
        minZoom={4}
        maxZoom={18}
        ref={mapRef}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        
        {validReports.map((report) => (
          <Marker
            key={report.id}
            position={[report.latitude!, report.longitude!]}
            icon={getPriorityIcon(report.priority)}
          >
            <Popup>
              <div className="p-2 min-w-48">
                <h3 className="font-semibold text-sm mb-1">{report.title}</h3>
                <p className="text-xs text-muted-foreground mb-2">{report.location_address}</p>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-xs px-2 py-1 rounded ${
                    report.priority === 'critical' ? 'bg-red-100 text-red-800' :
                    report.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                    report.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {report.priority.toUpperCase()}
                  </span>
                  <span className="text-xs text-muted-foreground capitalize">
                    {report.status.replace('_', ' ')}
                  </span>
                </div>
                <Button 
                  size="sm" 
                  className="w-full text-xs"
                  onClick={() => openInMaps(report.location_address, report.latitude!, report.longitude!)}
                >
                  <Navigation className="h-3 w-3 mr-1" />
                  Get Directions
                </Button>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};

export default WorkerMapReal;