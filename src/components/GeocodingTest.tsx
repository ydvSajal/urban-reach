/**
 * Test component for verifying geocoding functionality
 * This component can be used to manually test the geocoding service
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, MapPin, Search, Navigation, CheckCircle, AlertCircle } from 'lucide-react';
import { useGeocoding } from '@/hooks/useGeocoding';
import { GeocodingService, type GeocodeResult } from '@/lib/geocoding';

const GeocodingTest: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [testCoordinates, setTestCoordinates] = useState({ lat: '', lng: '' });
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [reverseResult, setReverseResult] = useState<GeocodeResult | null>(null);
  
  const {
    isLoading,
    error,
    reverseGeocode,
    forwardGeocode,
    getCurrentLocation,
    formatAddress,
    getLocationDescription,
    isWithinIndia,
    clearError
  } = useGeocoding({ showToasts: false });

  // Test locations for India
  const testLocations = [
    { name: 'Mumbai', lat: 19.0760, lng: 72.8777 },
    { name: 'Delhi', lat: 28.6139, lng: 77.2090 },
    { name: 'Bangalore', lat: 12.9716, lng: 77.5946 },
    { name: 'Chennai', lat: 13.0827, lng: 80.2707 },
    { name: 'Kolkata', lat: 22.5726, lng: 88.3639 },
  ];

  const handleForwardGeocode = async () => {
    if (!searchQuery.trim()) return;
    
    const geocodeResults = await forwardGeocode(searchQuery);
    setResults(geocodeResults);
  };

  const handleReverseGeocode = async () => {
    const lat = parseFloat(testCoordinates.lat);
    const lng = parseFloat(testCoordinates.lng);
    
    if (isNaN(lat) || isNaN(lng)) {
      return;
    }
    
    const result = await reverseGeocode(lat, lng);
    setReverseResult(result);
  };

  const handleTestLocation = async (location: { name: string; lat: number; lng: number }) => {
    const result = await reverseGeocode(location.lat, location.lng);
    setReverseResult(result);
  };

  const handleGetCurrentLocation = async () => {
    const result = await getCurrentLocation();
    setReverseResult(result);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Geocoding Service Test
          </CardTitle>
          <CardDescription>
            Test the reverse geocoding service with various locations and addresses
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>{error.message} (Code: {error.code})</span>
            <Button variant="ghost" size="sm" onClick={clearError}>
              Dismiss
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Forward Geocoding Test */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Forward Geocoding (Address → Coordinates)</CardTitle>
          <CardDescription>
            Search for addresses and get their coordinates
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Enter address (e.g., Mumbai, Maharashtra)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleForwardGeocode()}
            />
            <Button 
              onClick={handleForwardGeocode} 
              disabled={isLoading || !searchQuery.trim()}
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Search
            </Button>
          </div>

          {results.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium">Search Results:</h4>
              {results.map((result, index) => (
                <div key={index} className="p-3 border rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{getLocationDescription(result)}</span>
                    <Badge variant={result.confidence > 0.8 ? "default" : "secondary"}>
                      {Math.round(result.confidence * 100)}% confidence
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {formatAddress(result, 'full')}
                  </p>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      {result.latitude.toFixed(6)}, {result.longitude.toFixed(6)}
                    </Badge>
                    {isWithinIndia(result.latitude, result.longitude) && (
                      <Badge variant="secondary">India</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reverse Geocoding Test */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Reverse Geocoding (Coordinates → Address)</CardTitle>
          <CardDescription>
            Convert coordinates to readable addresses
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Manual Coordinates Input */}
          <div className="space-y-2">
            <h4 className="font-medium">Manual Coordinates:</h4>
            <div className="flex gap-2">
              <Input
                placeholder="Latitude"
                value={testCoordinates.lat}
                onChange={(e) => setTestCoordinates(prev => ({ ...prev, lat: e.target.value }))}
              />
              <Input
                placeholder="Longitude"
                value={testCoordinates.lng}
                onChange={(e) => setTestCoordinates(prev => ({ ...prev, lng: e.target.value }))}
              />
              <Button 
                onClick={handleReverseGeocode} 
                disabled={isLoading || !testCoordinates.lat || !testCoordinates.lng}
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
                Geocode
              </Button>
            </div>
          </div>

          {/* Test Locations */}
          <div className="space-y-2">
            <h4 className="font-medium">Test with Known Locations:</h4>
            <div className="flex flex-wrap gap-2">
              {testLocations.map((location) => (
                <Button
                  key={location.name}
                  variant="outline"
                  size="sm"
                  onClick={() => handleTestLocation(location)}
                  disabled={isLoading}
                >
                  {location.name}
                </Button>
              ))}
            </div>
          </div>

          {/* GPS Location */}
          <div className="space-y-2">
            <h4 className="font-medium">Current Location:</h4>
            <Button 
              onClick={handleGetCurrentLocation} 
              disabled={isLoading}
              variant="outline"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Navigation className="h-4 w-4" />}
              Get Current Location
            </Button>
          </div>

          {/* Reverse Geocoding Result */}
          {reverseResult && (
            <div className="p-3 border rounded-lg space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="font-medium">Reverse Geocoding Result:</span>
              </div>
              <div className="space-y-1 text-sm">
                <p><strong>Description:</strong> {getLocationDescription(reverseResult)}</p>
                <p><strong>Full Address:</strong> {formatAddress(reverseResult, 'full')}</p>
                <p><strong>City:</strong> {reverseResult.city}</p>
                <p><strong>State:</strong> {reverseResult.state}</p>
                <p><strong>Country:</strong> {reverseResult.country}</p>
                {reverseResult.landmark && (
                  <p><strong>Landmark:</strong> {reverseResult.landmark}</p>
                )}
                <div className="flex items-center gap-2 pt-2">
                  <Badge variant="outline">
                    {reverseResult.latitude.toFixed(6)}, {reverseResult.longitude.toFixed(6)}
                  </Badge>
                  <Badge variant={reverseResult.confidence > 0.8 ? "default" : "secondary"}>
                    {Math.round(reverseResult.confidence * 100)}% confidence
                  </Badge>
                  {isWithinIndia(reverseResult.latitude, reverseResult.longitude) && (
                    <Badge variant="secondary">India</Badge>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Service Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Service Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p><strong>Provider:</strong> OpenStreetMap Nominatim</p>
          <p><strong>Timeout:</strong> 10 seconds</p>
          <p><strong>Retries:</strong> 2 attempts</p>
          <p><strong>Rate Limiting:</strong> Respectful usage with delays</p>
          <p><strong>Coverage:</strong> Global with focus on Indian locations</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default GeocodingTest;