/**
 * Custom hook for geocoding operations
 * Provides easy-to-use geocoding functionality with error handling and loading states
 */

import { useState, useCallback } from 'react';
import { GeocodingService, AddressFormatter, type GeocodeResult, type GeocodeError } from '@/lib/geocoding';
import { toast } from '@/hooks/use-toast';

interface UseGeocodingOptions {
  showToasts?: boolean;
  timeout?: number;
  retries?: number;
}

interface GeocodingState {
  isLoading: boolean;
  error: GeocodeError | null;
  lastResult: GeocodeResult | null;
}

export const useGeocoding = (options: UseGeocodingOptions = {}) => {
  const { showToasts = true, timeout = 10000, retries = 2 } = options;
  
  const [state, setState] = useState<GeocodingState>({
    isLoading: false,
    error: null,
    lastResult: null
  });

  const showErrorToast = useCallback((error: GeocodeError) => {
    if (!showToasts) return;

    let title = "Geocoding Error";
    let description = error.message;

    switch (error.code) {
      case 'TIMEOUT':
        title = "Request Timeout";
        description = "The request took too long. Please try again.";
        break;
      case 'NOT_FOUND':
        title = "Location Not Found";
        description = "Could not find the specified location.";
        break;
      case 'SERVICE_ERROR':
        title = "Service Unavailable";
        description = "The geocoding service is temporarily unavailable.";
        break;
      case 'INVALID_COORDINATES':
        title = "Invalid Coordinates";
        description = "The provided coordinates are not valid.";
        break;
      case 'INVALID_ADDRESS':
        title = "Invalid Address";
        description = "Please provide a valid address.";
        break;
    }

    toast({
      title,
      description,
      variant: "destructive",
    });
  }, [showToasts]);

  const showSuccessToast = useCallback((result: GeocodeResult, operation: 'reverse' | 'forward') => {
    if (!showToasts) return;

    const description = operation === 'reverse' 
      ? GeocodingService.getLocationDescription(result)
      : `Found: ${GeocodingService.formatAddressForDisplay(result, 'medium')}`;

    toast({
      title: "Location Found",
      description,
    });
  }, [showToasts]);

  const reverseGeocode = useCallback(async (
    latitude: number, 
    longitude: number
  ): Promise<GeocodeResult | null> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const result = await GeocodingService.reverseGeocode(latitude, longitude, {
        timeout,
        retries,
        includeDetails: true
      });

      setState(prev => ({ ...prev, lastResult: result, isLoading: false }));
      showSuccessToast(result, 'reverse');
      return result;
    } catch (error) {
      const geocodeError = error as GeocodeError;
      setState(prev => ({ ...prev, error: geocodeError, isLoading: false }));
      showErrorToast(geocodeError);
      return null;
    }
  }, [timeout, retries, showErrorToast, showSuccessToast]);

  const forwardGeocode = useCallback(async (
    address: string
  ): Promise<GeocodeResult[]> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    // Validate address
    if (!AddressFormatter.isValidAddressString(address)) {
      const error: GeocodeError = {
        code: 'INVALID_ADDRESS',
        message: 'Invalid address format',
        retryable: false
      };
      setState(prev => ({ ...prev, error, isLoading: false }));
      showErrorToast(error);
      return [];
    }

    try {
      const results = await GeocodingService.forwardGeocode(address, {
        timeout,
        language: 'en'
      });

      if (results.length > 0) {
        setState(prev => ({ ...prev, lastResult: results[0], isLoading: false }));
        showSuccessToast(results[0], 'forward');
      } else {
        setState(prev => ({ ...prev, isLoading: false }));
      }

      return results;
    } catch (error) {
      const geocodeError = error as GeocodeError;
      setState(prev => ({ ...prev, error: geocodeError, isLoading: false }));
      showErrorToast(geocodeError);
      return [];
    }
  }, [timeout, showErrorToast, showSuccessToast]);

  const getCurrentLocation = useCallback(async (): Promise<GeocodeResult | null> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    if (!navigator.geolocation) {
      const error: GeocodeError = {
        code: 'SERVICE_ERROR',
        message: 'Geolocation is not supported by this browser',
        retryable: false
      };
      setState(prev => ({ ...prev, error, isLoading: false }));
      showErrorToast(error);
      return null;
    }

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const result = await reverseGeocode(
            position.coords.latitude,
            position.coords.longitude
          );
          resolve(result);
        },
        (geoError) => {
          let errorMessage = 'Failed to get your location';
          
          switch (geoError.code) {
            case geoError.PERMISSION_DENIED:
              errorMessage = 'Location access denied by user';
              break;
            case geoError.POSITION_UNAVAILABLE:
              errorMessage = 'Location information unavailable';
              break;
            case geoError.TIMEOUT:
              errorMessage = 'Location request timed out';
              break;
          }

          const error: GeocodeError = {
            code: 'SERVICE_ERROR',
            message: errorMessage,
            retryable: true
          };
          
          setState(prev => ({ ...prev, error, isLoading: false }));
          showErrorToast(error);
          resolve(null);
        },
        {
          enableHighAccuracy: true,
          timeout: timeout,
          maximumAge: 60000,
        }
      );
    });
  }, [reverseGeocode, timeout, showErrorToast]);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  const reset = useCallback(() => {
    setState({
      isLoading: false,
      error: null,
      lastResult: null
    });
  }, []);

  return {
    // State
    isLoading: state.isLoading,
    error: state.error,
    lastResult: state.lastResult,
    
    // Actions
    reverseGeocode,
    forwardGeocode,
    getCurrentLocation,
    clearError,
    reset,
    
    // Utilities
    formatAddress: GeocodingService.formatAddressForDisplay,
    getLocationDescription: GeocodingService.getLocationDescription,
    isWithinIndia: GeocodingService.isWithinIndia,
    getDistance: GeocodingService.getDistance,
    cleanAddress: AddressFormatter.cleanAddress,
    standardizeAddress: AddressFormatter.standardizeAddress,
    isValidAddress: AddressFormatter.isValidAddressString
  };
};

export default useGeocoding;