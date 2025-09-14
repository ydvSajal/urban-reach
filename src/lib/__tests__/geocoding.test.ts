/**
 * Tests for the Geocoding Service
 * Tests reverse geocoding, address formatting, and error handling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  GeocodingService, 
  AddressFormatter, 
  GEOCODING_ERRORS,
  type GeocodeResult 
} from '../geocoding';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('GeocodingService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('reverseGeocode', () => {
    it('should successfully reverse geocode valid coordinates', async () => {
      const mockResponse = {
        lat: '19.0760',
        lon: '72.8777',
        display_name: 'Mumbai, Maharashtra, India',
        address: {
          city: 'Mumbai',
          state: 'Maharashtra',
          country: 'India',
          road: 'Marine Drive',
          house_number: '123',
          neighbourhood: 'Nariman Point',
          postcode: '400001'
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await GeocodingService.reverseGeocode(19.0760, 72.8777);

      expect(result).toMatchObject({
        latitude: 19.0760,
        longitude: 72.8777,
        city: 'Mumbai',
        state: 'Maharashtra',
        country: 'India',
        streetName: 'Marine Drive',
        streetNumber: '123',
        neighborhood: 'Nariman Point',
        postalCode: '400001'
      });
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it('should handle coordinates with minimal address data', async () => {
      const mockResponse = {
        lat: '19.0760',
        lon: '72.8777',
        display_name: 'Mumbai, Maharashtra, India',
        address: {
          city: 'Mumbai',
          state: 'Maharashtra',
          country: 'India'
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await GeocodingService.reverseGeocode(19.0760, 72.8777);

      expect(result.city).toBe('Mumbai');
      expect(result.state).toBe('Maharashtra');
      expect(result.confidence).toBeLessThan(0.8);
    });

    it('should throw error for invalid coordinates', async () => {
      await expect(
        GeocodingService.reverseGeocode(91, 181) // Invalid lat/lng
      ).rejects.toMatchObject({
        code: GEOCODING_ERRORS.INVALID_COORDINATES,
        retryable: false
      });
    });

    it('should handle service errors with retry', async () => {
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            lat: '19.0760',
            lon: '72.8777',
            address: { city: 'Mumbai', state: 'Maharashtra', country: 'India' }
          })
        });

      const result = await GeocodingService.reverseGeocode(19.0760, 72.8777, { retries: 2 });
      expect(result.city).toBe('Mumbai');
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('should handle timeout errors', async () => {
      mockFetch.mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 2000))
      );

      await expect(
        GeocodingService.reverseGeocode(19.0760, 72.8777, { timeout: 100 })
      ).rejects.toMatchObject({
        code: GEOCODING_ERRORS.TIMEOUT,
        retryable: true
      });
    });

    it('should handle not found errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ error: 'Unable to geocode' })
      });

      await expect(
        GeocodingService.reverseGeocode(0, 0)
      ).rejects.toMatchObject({
        code: GEOCODING_ERRORS.NOT_FOUND,
        retryable: false
      });
    });

    it('should handle HTTP error responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500
      });

      await expect(
        GeocodingService.reverseGeocode(19.0760, 72.8777)
      ).rejects.toMatchObject({
        code: GEOCODING_ERRORS.SERVICE_ERROR,
        retryable: true
      });
    });
  });

  describe('forwardGeocode', () => {
    it('should successfully geocode a valid address', async () => {
      const mockResponse = [{
        lat: '19.0760',
        lon: '72.8777',
        display_name: 'Mumbai, Maharashtra, India',
        address: {
          city: 'Mumbai',
          state: 'Maharashtra',
          country: 'India'
        }
      }];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const results = await GeocodingService.forwardGeocode('Mumbai, Maharashtra');
      
      expect(results).toHaveLength(1);
      expect(results[0].city).toBe('Mumbai');
      expect(results[0].state).toBe('Maharashtra');
    });

    it('should throw error for invalid address', async () => {
      await expect(
        GeocodingService.forwardGeocode('ab') // Too short
      ).rejects.toMatchObject({
        code: GEOCODING_ERRORS.INVALID_ADDRESS,
        retryable: false
      });
    });

    it('should handle no results found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([])
      });

      await expect(
        GeocodingService.forwardGeocode('NonexistentPlace12345')
      ).rejects.toMatchObject({
        code: GEOCODING_ERRORS.NOT_FOUND,
        retryable: false
      });
    });
  });

  describe('formatAddress', () => {
    it('should format complete address correctly', () => {
      const address = {
        house_number: '123',
        road: 'Marine Drive',
        neighbourhood: 'Nariman Point',
        city: 'Mumbai',
        state: 'Maharashtra',
        postcode: '400001',
        country: 'India'
      };

      const formatted = GeocodingService.formatAddress(address);
      expect(formatted).toBe('123 Marine Drive, Nariman Point, Mumbai, Maharashtra, 400001, India');
    });

    it('should handle partial address data', () => {
      const address = {
        city: 'Mumbai',
        state: 'Maharashtra',
        country: 'India'
      };

      const formatted = GeocodingService.formatAddress(address);
      expect(formatted).toBe('Mumbai, Maharashtra, India');
    });

    it('should handle empty address', () => {
      const formatted = GeocodingService.formatAddress({});
      expect(formatted).toBe('Unknown Address');
    });
  });

  describe('formatAddressForDisplay', () => {
    const mockResult: GeocodeResult = {
      latitude: 19.0760,
      longitude: 72.8777,
      formattedAddress: '123 Marine Drive, Nariman Point, Mumbai, Maharashtra, 400001, India',
      streetNumber: '123',
      streetName: 'Marine Drive',
      neighborhood: 'Nariman Point',
      city: 'Mumbai',
      state: 'Maharashtra',
      country: 'India',
      postalCode: '400001',
      confidence: 0.9
    };

    it('should format short address', () => {
      const result = GeocodingService.formatAddressForDisplay(mockResult, 'short');
      expect(result).toBe('Mumbai, Maharashtra');
    });

    it('should format medium address', () => {
      const result = GeocodingService.formatAddressForDisplay(mockResult, 'medium');
      expect(result).toBe('Marine Drive, Nariman Point, Mumbai');
    });

    it('should format full address', () => {
      const result = GeocodingService.formatAddressForDisplay(mockResult, 'full');
      expect(result).toBe(mockResult.formattedAddress);
    });
  });

  describe('getLocationDescription', () => {
    it('should prioritize landmark in description', () => {
      const result: GeocodeResult = {
        latitude: 19.0760,
        longitude: 72.8777,
        formattedAddress: 'Test Address',
        city: 'Mumbai',
        state: 'Maharashtra',
        country: 'India',
        landmark: 'Gateway of India',
        confidence: 0.9
      };

      const description = GeocodingService.getLocationDescription(result);
      expect(description).toBe('Near Gateway of India, Mumbai');
    });

    it('should use neighborhood when no landmark', () => {
      const result: GeocodeResult = {
        latitude: 19.0760,
        longitude: 72.8777,
        formattedAddress: 'Test Address',
        city: 'Mumbai',
        state: 'Maharashtra',
        country: 'India',
        neighborhood: 'Bandra',
        confidence: 0.9
      };

      const description = GeocodingService.getLocationDescription(result);
      expect(description).toBe('Bandra, Mumbai');
    });

    it('should fallback to city and state', () => {
      const result: GeocodeResult = {
        latitude: 19.0760,
        longitude: 72.8777,
        formattedAddress: 'Test Address',
        city: 'Mumbai',
        state: 'Maharashtra',
        country: 'India',
        confidence: 0.9
      };

      const description = GeocodingService.getLocationDescription(result);
      expect(description).toBe('Mumbai, Maharashtra');
    });
  });

  describe('isWithinIndia', () => {
    it('should return true for coordinates within India', () => {
      expect(GeocodingService.isWithinIndia(19.0760, 72.8777)).toBe(true); // Mumbai
      expect(GeocodingService.isWithinIndia(28.6139, 77.2090)).toBe(true); // Delhi
      expect(GeocodingService.isWithinIndia(12.9716, 77.5946)).toBe(true); // Bangalore
    });

    it('should return false for coordinates outside India', () => {
      expect(GeocodingService.isWithinIndia(40.7128, -74.0060)).toBe(false); // New York
      expect(GeocodingService.isWithinIndia(51.5074, -0.1278)).toBe(false); // London
    });
  });

  describe('getDistance', () => {
    it('should calculate distance between two points correctly', () => {
      // Distance between Mumbai and Delhi (approximately 1150 km)
      const distance = GeocodingService.getDistance(
        19.0760, 72.8777, // Mumbai
        28.6139, 77.2090  // Delhi
      );
      
      expect(distance).toBeGreaterThan(1100);
      expect(distance).toBeLessThan(1200);
    });

    it('should return 0 for same coordinates', () => {
      const distance = GeocodingService.getDistance(
        19.0760, 72.8777,
        19.0760, 72.8777
      );
      
      expect(distance).toBe(0);
    });
  });
});

describe('AddressFormatter', () => {
  describe('standardizeAddress', () => {
    it('should clean up address formatting', () => {
      const messy = '  123   Main  Street  ,  ,  Mumbai  ,  Maharashtra  ';
      const clean = AddressFormatter.standardizeAddress(messy);
      expect(clean).toBe('123 Main Street, Mumbai, Maharashtra');
    });

    it('should handle empty or whitespace-only input', () => {
      expect(AddressFormatter.standardizeAddress('')).toBe('');
      expect(AddressFormatter.standardizeAddress('   ')).toBe('');
    });
  });

  describe('parseAddressString', () => {
    it('should extract city and state from address', () => {
      const address = '123 Main Street, Bandra, Mumbai, Maharashtra';
      const parsed = AddressFormatter.parseAddressString(address);
      
      expect(parsed.city).toBe('Mumbai');
      expect(parsed.state).toBe('Maharashtra');
      expect(parsed.formattedAddress).toBe(address);
    });

    it('should handle short addresses', () => {
      const address = 'Mumbai, Maharashtra';
      const parsed = AddressFormatter.parseAddressString(address);
      
      expect(parsed.city).toBe('Mumbai');
      expect(parsed.state).toBe('Maharashtra');
    });
  });

  describe('isValidAddressString', () => {
    it('should validate reasonable addresses', () => {
      expect(AddressFormatter.isValidAddressString('123 Main Street, Mumbai')).toBe(true);
      expect(AddressFormatter.isValidAddressString('Bandra West, Mumbai')).toBe(true);
      expect(AddressFormatter.isValidAddressString('Near Railway Station')).toBe(true);
    });

    it('should reject invalid addresses', () => {
      expect(AddressFormatter.isValidAddressString('')).toBe(false);
      expect(AddressFormatter.isValidAddressString('abc')).toBe(false);
      expect(AddressFormatter.isValidAddressString('12345')).toBe(false);
      expect(AddressFormatter.isValidAddressString('   ')).toBe(false);
    });
  });

  describe('cleanAddress', () => {
    it('should remove undefined/null values', () => {
      const dirty = 'undefined, 123 Main St, null, Mumbai, Unknown';
      const clean = AddressFormatter.cleanAddress(dirty);
      expect(clean).toBe('123 Main St, Mumbai');
    });

    it('should handle multiple commas', () => {
      const dirty = '123 Main St,, Mumbai,, Maharashtra';
      const clean = AddressFormatter.cleanAddress(dirty);
      expect(clean).toBe('123 Main St, Mumbai, Maharashtra');
    });
  });
});

// Integration tests with real-world scenarios
describe('Geocoding Integration Tests', () => {
  it('should handle typical Indian addresses', async () => {
    const mockMumbaiResponse = {
      lat: '19.0760',
      lon: '72.8777',
      address: {
        road: 'Marine Drive',
        neighbourhood: 'Nariman Point',
        city: 'Mumbai',
        state: 'Maharashtra',
        country: 'India',
        postcode: '400001'
      }
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockMumbaiResponse)
    });

    const result = await GeocodingService.reverseGeocode(19.0760, 72.8777);
    
    expect(result.city).toBe('Mumbai');
    expect(result.state).toBe('Maharashtra');
    expect(GeocodingService.isWithinIndia(result.latitude, result.longitude)).toBe(true);
    
    const shortFormat = GeocodingService.formatAddressForDisplay(result, 'short');
    expect(shortFormat).toBe('Mumbai, Maharashtra');
  });

  it('should handle rural/village addresses', async () => {
    const mockVillageResponse = {
      lat: '20.1234',
      lon: '73.5678',
      address: {
        village: 'Shirdi',
        state: 'Maharashtra',
        country: 'India'
      }
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockVillageResponse)
    });

    const result = await GeocodingService.reverseGeocode(20.1234, 73.5678);
    
    expect(result.city).toBe('Shirdi');
    expect(result.state).toBe('Maharashtra');
    expect(result.confidence).toBeLessThan(0.8); // Lower confidence for rural areas
  });
});