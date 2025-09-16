import React from 'react';
import { MapPin, Navigation } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Report {
  id: string;
  title: string;
  location_address: string;
  latitude: number | null;
  longitude: number | null;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'acknowledged' | 'in_progress' | 'resolved' | 'closed';
}

interface WorkerMapProps {
  reports: Report[];
}

const WorkerMap: React.FC<WorkerMapProps> = ({ reports }) => {
  const openInMaps = (address: string, lat?: number, lng?: number) => {
    const query = lat && lng ? `${lat},${lng}` : encodeURIComponent(address);
    const url = `https://www.google.com/maps/search/?api=1&query=${query}`;
    window.open(url, '_blank');
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  if (reports.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500">
        <div className="text-center">
          <MapPin className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p>No location data available for your assignments</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-gray-100 rounded-lg relative overflow-hidden">
      {/* Map placeholder with assignment pins */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-100 to-green-100">
        <div className="relative h-full w-full">
          {/* Simulated map pins */}
          {reports.slice(0, 6).map((report, index) => (
            <div
              key={report.id}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer"
              style={{
                left: `${20 + (index % 3) * 30}%`,
                top: `${25 + Math.floor(index / 3) * 40}%`,
              }}
              onClick={() => openInMaps(report.location_address, report.latitude || undefined, report.longitude || undefined)}
            >
              <div className="relative">
                <div className={`w-4 h-4 rounded-full ${getPriorityColor(report.priority)} border-2 border-white shadow-lg`}>
                </div>
                <div className="absolute top-6 left-1/2 transform -translate-x-1/2 bg-white rounded-lg shadow-lg p-2 min-w-48 z-10 opacity-0 hover:opacity-100 transition-opacity">
                  <p className="font-semibold text-sm">{report.title}</p>
                  <p className="text-xs text-gray-600 mb-2">{report.location_address}</p>
                  <Button 
                    size="sm" 
                    className="w-full text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      openInMaps(report.location_address, report.latitude || undefined, report.longitude || undefined);
                    }}
                  >
                    <Navigation className="h-3 w-3 mr-1" />
                    Navigate
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Map controls overlay */}
      <div className="absolute top-4 right-4 bg-white rounded-lg shadow-md p-2">
        <div className="text-xs text-gray-600">
          <div className="flex items-center space-x-1 mb-1">
            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
            <span>Critical</span>
          </div>
          <div className="flex items-center space-x-1 mb-1">
            <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
            <span>High</span>
          </div>
          <div className="flex items-center space-x-1 mb-1">
            <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
            <span>Medium</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>Low</span>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="absolute bottom-4 left-4 right-4 bg-white/90 rounded-lg p-3">
        <p className="text-sm text-gray-700">
          <MapPin className="h-4 w-4 inline mr-1" />
          Click on any pin to get directions to that location
        </p>
      </div>
    </div>
  );
};

export default WorkerMap;