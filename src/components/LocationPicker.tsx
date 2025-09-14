import React, { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  MapPin, 
  Navigation, 
  Search, 
  Loader2, 
  CheckCircle, 
  AlertCircle,
  RotateCcw
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { GeocodingService, AddressFormatter, type GeocodeResult } from '@/lib/geocoding';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default markers in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

export interface LocationData {
  latitude: number;
  longitude: number;
  address: string;
  city: string;
  state: string;
  country: string;
  landmark?: string;
}

interface LocationPickerProps {
  initialLocation?: { lat: number; lng: number };
  onLocationSelect: (location: LocationData) => void;
  enableGPS?: boolean;
  enableSearch?: boolean;
  className?: string;
  height?: string;
}

// Component to handle map clicks
const MapClickHandler: React.FC<{ onLocationClick: (lat: number, lng: number) => void }> = ({ 
  onLocationClick 
}) => {
  useMapEvents({
    click: (e) => {
      onLocationClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
};

// Component to update map view
const MapViewController: React.FC<{ center: [number, number]; zoom: number }> = ({ 
  center, 
  zoom 
}) => {
  const map = useMap();
  
  useEffect(() => {
    map.setView(center, zoom);
  }, [map, center, zoom]);
  
  return null;
};

const LocationPicker: React.FC<LocationPickerProps> = ({
  initialLocation,
  onLocationSelect,
  enableGPS = true,
  enableSearch = true,
  className = '',
  height = '400px',
}) => {
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(
    initialLocation || null
  );
  const [locationData, setLocationData] = useState<LocationData | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingGPS, setIsLoadingGPS] = useState(false);
  const [isLoadingGeocode, setIsLoadingGeocode] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([
    initialLocation?.lat || 19.0760, // Default to Mumbai
    initialLocation?.lng || 72.8777
  ]);
  const [mapZoom, setMapZoom] = useState(13);

  // Reverse geocoding function using the new service
  const reverseGeocode = useCallback(async (lat: number, lng: number): Promise<LocationData | null> => {
    try {
      setIsLoadingGeocode(true);
      
      const result = await GeocodingService.reverseGeocode(lat, lng, {
        timeout: 10000,
        retries: 2,
        includeDetails: true
      });
      
      return {
        latitude: result.latitude,
        longitude: result.longitude,
        address: result.formattedAddress,
        city: result.city,
        state: result.state,
        country: result.country,
        landmark: result.landmark,
      };
    } catch (error: any) {
      console.error('Reverse geocoding error:', error);
      
      let errorMessage = "Could not get address for this location";
      if (error.code === 'TIMEOUT') {
        errorMessage = "Request timed out. Please try again.";
      } else if (error.code === 'NOT_FOUND') {
        errorMessage = "No address found for this location";
      } else if (error.code === 'SERVICE_ERROR') {
        errorMessage = "Geocoding service is temporarily unavailable";
      }
      
      toast({
        title: "Geocoding failed",
        description: errorMessage,
        variant: "destructive",
      });
      return null;
    } finally {
      setIsLoadingGeocode(false);
    }
  }, []);

  // Forward geocoding (search) function using the new service
  const searchLocation = useCallback(async (query: string): Promise<void> => {
    if (!query.trim()) return;
    
    // Validate address format
    if (!AddressFormatter.isValidAddressString(query)) {
      toast({
        title: "Invalid address",
        description: "Please enter a valid address with at least 5 characters",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setIsSearching(true);
      
      const results = await GeocodingService.forwardGeocode(query, {
        timeout: 10000,
        language: 'en'
      });
      
      if (results.length === 0) {
        toast({
          title: "Location not found",
          description: "Could not find the specified location",
          variant: "destructive",
        });
        return;
      }
      
      // Use the first (best) result
      const result = results[0];
      
      setSelectedLocation({ lat: result.latitude, lng: result.longitude });
      setMapCenter([result.latitude, result.longitude]);
      setMapZoom(16);
      
      // Convert to LocationData format
      const locationData: LocationData = {
        latitude: result.latitude,
        longitude: result.longitude,
        address: result.formattedAddress,
        city: result.city,
        state: result.state,
        country: result.country,
        landmark: result.landmark,
      };
      
      setLocationData(locationData);
      onLocationSelect(locationData);
      
      toast({
        title: "Location found",
        description: GeocodingService.getLocationDescription(result),
      });
      
    } catch (error: any) {
      console.error('Search error:', error);
      
      let errorMessage = "Could not search for location";
      if (error.code === 'TIMEOUT') {
        errorMessage = "Search request timed out. Please try again.";
      } else if (error.code === 'NOT_FOUND') {
        errorMessage = "No results found for the given address";
      } else if (error.code === 'SERVICE_ERROR') {
        errorMessage = "Search service is temporarily unavailable";
      }
      
      toast({
        title: "Search failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  }, [onLocationSelect]);

  // Get current GPS location
  const getCurrentLocation = useCallback(async (): Promise<void> => {
    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by this browser');
      return;
    }
    
    setIsLoadingGPS(true);
    setGpsError(null);
    
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        
        setSelectedLocation({ lat, lng });
        setMapCenter([lat, lng]);
        setMapZoom(16);
        
        // Get address for the GPS location
        const locationData = await reverseGeocode(lat, lng);
        if (locationData) {
          setLocationData(locationData);
          onLocationSelect(locationData);
        }
        
        setIsLoadingGPS(false);
        
        toast({
          title: "Location found",
          description: "Your current location has been detected",
        });
      },
      (error) => {
        setIsLoadingGPS(false);
        let errorMessage = 'Failed to get your location';
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location access denied by user';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information unavailable';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out';
            break;
        }
        
        setGpsError(errorMessage);
        toast({
          title: "GPS Error",
          description: errorMessage,
          variant: "destructive",
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  }, [reverseGeocode, onLocationSelect]);

  // Handle map click
  const handleMapClick = useCallback(async (lat: number, lng: number) => {
    setSelectedLocation({ lat, lng });
    
    const locationData = await reverseGeocode(lat, lng);
    if (locationData) {
      setLocationData(locationData);
      onLocationSelect(locationData);
    }
  }, [reverseGeocode, onLocationSelect]);

  // Handle search
  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    searchLocation(searchQuery);
  }, [searchQuery, searchLocation]);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Select Location
          </CardTitle>
          <CardDescription>
            Click on the map, use GPS, or search for a location
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* GPS Button */}
          {enableGPS && (
            <div className="flex items-center gap-2">
              <Button
                onClick={getCurrentLocation}
                disabled={isLoadingGPS}
                variant="outline"
                className="flex-1"
              >
                {isLoadingGPS ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Navigation className="mr-2 h-4 w-4" />
                )}
                Use Current Location
              </Button>
              
              {gpsError && (
                <Button
                  onClick={() => setGpsError(null)}
                  variant="ghost"
                  size="sm"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}

          {/* GPS Error */}
          {gpsError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{gpsError}</AlertDescription>
            </Alert>
          )}

          {/* Search */}
          {enableSearch && (
            <form onSubmit={handleSearch} className="flex gap-2">
              <Input
                placeholder="Search for a location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1"
              />
              <Button type="submit" disabled={isSearching || !searchQuery.trim()}>
                {isSearching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </Button>
            </form>
          )}

          {/* Selected Location Info */}
          {locationData && (
            <div className="p-3 bg-muted rounded-lg space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="font-medium">Location Selected</span>
                {isLoadingGeocode && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
              </div>
              <div className="text-sm space-y-1">
                <p><strong>Address:</strong> {AddressFormatter.cleanAddress(locationData.address)}</p>
                <p><strong>City:</strong> {locationData.city}</p>
                <p><strong>State:</strong> {locationData.state}</p>
                {locationData.landmark && (
                  <p><strong>Landmark:</strong> {locationData.landmark}</p>
                )}
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    {locationData.latitude.toFixed(6)}, {locationData.longitude.toFixed(6)}
                  </Badge>
                  {GeocodingService.isWithinIndia(locationData.latitude, locationData.longitude) && (
                    <Badge variant="secondary" className="text-xs">
                      India
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Map */}
      <Card>
        <CardContent className="p-0">
          <div style={{ height }} className="rounded-lg overflow-hidden">
            <MapContainer
              center={mapCenter}
              zoom={mapZoom}
              style={{ height: '100%', width: '100%' }}
              scrollWheelZoom={true}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              
              <MapViewController center={mapCenter} zoom={mapZoom} />
              <MapClickHandler onLocationClick={handleMapClick} />
              
              {selectedLocation && (
                <Marker position={[selectedLocation.lat, selectedLocation.lng]} />
              )}
            </MapContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LocationPicker;