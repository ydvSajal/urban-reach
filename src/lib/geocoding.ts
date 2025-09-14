/**
 * Geocoding Service
 * Provides reverse geocoding functionality to convert coordinates to addresses
 * with proper error handling and address formatting utilities
 */

export interface GeocodeResult {
  latitude: number;
  longitude: number;
  formattedAddress: string;
  streetNumber?: string;
  streetName?: string;
  neighborhood?: string;
  city: string;
  state: string;
  country: string;
  postalCode?: string;
  landmark?: string;
  confidence: number; // 0-1 scale
}

export interface GeocodeError {
  code: string;
  message: string;
  retryable: boolean;
}

export interface GeocodeOptions {
  timeout?: number;
  retries?: number;
  language?: string;
  includeDetails?: boolean;
}

/**
 * Geocoding service class with multiple provider support and error handling
 */
export class GeocodingService {
  private static readonly DEFAULT_TIMEOUT = 10000;
  private static readonly DEFAULT_RETRIES = 3;
  private static readonly RETRY_DELAY = 1000;

  /**
   * Reverse geocode coordinates to address using Nominatim (OpenStreetMap)
   */
  static async reverseGeocode(
    latitude: number,
    longitude: number,
    options: GeocodeOptions = {}
  ): Promise<GeocodeResult> {
    const {
      timeout = this.DEFAULT_TIMEOUT,
      retries = this.DEFAULT_RETRIES,
      language = 'en',
      includeDetails = true
    } = options;

    // Validate coordinates
    if (!this.isValidCoordinate(latitude, longitude)) {
      throw this.createError('INVALID_COORDINATES', 'Invalid latitude or longitude values', false);
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const result = await this.performReverseGeocode(
          latitude,
          longitude,
          { timeout, language, includeDetails }
        );
        return result;
      } catch (error) {
        lastError = error as Error;
        
        // Don't retry for non-retryable errors
        if (error instanceof Error && error.message.includes('NOT_FOUND')) {
          throw error;
        }

        // Wait before retry (exponential backoff)
        if (attempt < retries) {
          await this.delay(this.RETRY_DELAY * Math.pow(2, attempt));
        }
      }
    }

    throw lastError || this.createError('UNKNOWN_ERROR', 'Geocoding failed after retries', true);
  }

  /**
   * Forward geocode address to coordinates
   */
  static async forwardGeocode(
    address: string,
    options: GeocodeOptions = {}
  ): Promise<GeocodeResult[]> {
    const {
      timeout = this.DEFAULT_TIMEOUT,
      language = 'en'
    } = options;

    if (!address || address.trim().length < 3) {
      throw this.createError('INVALID_ADDRESS', 'Address must be at least 3 characters long', false);
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const url = new URL('https://nominatim.openstreetmap.org/search');
      url.searchParams.set('format', 'json');
      url.searchParams.set('q', address.trim());
      url.searchParams.set('limit', '5');
      url.searchParams.set('addressdetails', '1');
      url.searchParams.set('accept-language', language);

      const response = await fetch(url.toString(), {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Municipal-System/1.0'
        }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw this.createError(
          'SERVICE_ERROR',
          `Geocoding service returned ${response.status}`,
          response.status >= 500
        );
      }

      const data = await response.json();

      if (!Array.isArray(data) || data.length === 0) {
        throw this.createError('NOT_FOUND', 'No results found for the given address', false);
      }

      return data.map(item => this.parseNominatimResult(item));
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw this.createError('TIMEOUT', 'Geocoding request timed out', true);
      }
      throw error;
    }
  }

  /**
   * Perform the actual reverse geocoding request
   */
  private static async performReverseGeocode(
    latitude: number,
    longitude: number,
    options: { timeout: number; language: string; includeDetails: boolean }
  ): Promise<GeocodeResult> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), options.timeout);

    try {
      const url = new URL('https://nominatim.openstreetmap.org/reverse');
      url.searchParams.set('format', 'json');
      url.searchParams.set('lat', latitude.toString());
      url.searchParams.set('lon', longitude.toString());
      url.searchParams.set('zoom', '18');
      url.searchParams.set('addressdetails', options.includeDetails ? '1' : '0');
      url.searchParams.set('accept-language', options.language);

      const response = await fetch(url.toString(), {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Municipal-System/1.0'
        }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw this.createError(
          'SERVICE_ERROR',
          `Geocoding service returned ${response.status}`,
          response.status >= 500
        );
      }

      const data = await response.json();

      if (!data || data.error) {
        throw this.createError('NOT_FOUND', 'No address found for the given coordinates', false);
      }

      return this.parseNominatimResult(data);
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw this.createError('TIMEOUT', 'Geocoding request timed out', true);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Parse Nominatim API response into standardized format
   */
  private static parseNominatimResult(data: any): GeocodeResult {
    const address = data.address || {};
    
    // Calculate confidence based on available address components
    const confidence = this.calculateConfidence(address);

    return {
      latitude: parseFloat(data.lat),
      longitude: parseFloat(data.lon),
      formattedAddress: this.formatAddress(address),
      streetNumber: address.house_number,
      streetName: address.road || address.street,
      neighborhood: address.neighbourhood || address.suburb || address.quarter,
      city: address.city || address.town || address.village || address.municipality || 'Unknown City',
      state: address.state || address.region || address.province || 'Unknown State',
      country: address.country || 'Unknown Country',
      postalCode: address.postcode,
      landmark: address.amenity || address.shop || address.building || address.tourism,
      confidence
    };
  }

  /**
   * Format address components into a readable string
   */
  static formatAddress(address: any): string {
    const components: string[] = [];

    // Add house number and street
    if (address.house_number && address.road) {
      components.push(`${address.house_number} ${address.road}`);
    } else if (address.road) {
      components.push(address.road);
    }

    // Add neighborhood/area
    if (address.neighbourhood || address.suburb) {
      components.push(address.neighbourhood || address.suburb);
    }

    // Add city
    const city = address.city || address.town || address.village || address.municipality;
    if (city) {
      components.push(city);
    }

    // Add state
    if (address.state || address.region) {
      components.push(address.state || address.region);
    }

    // Add postal code
    if (address.postcode) {
      components.push(address.postcode);
    }

    // Add country
    if (address.country) {
      components.push(address.country);
    }

    return components.join(', ') || 'Unknown Address';
  }

  /**
   * Format address for display in different contexts
   */
  static formatAddressForDisplay(result: GeocodeResult, format: 'short' | 'medium' | 'full' = 'medium'): string {
    switch (format) {
      case 'short':
        return `${result.city}, ${result.state}`;
      
      case 'medium':
        const parts = [];
        if (result.streetName) parts.push(result.streetName);
        if (result.neighborhood) parts.push(result.neighborhood);
        parts.push(result.city);
        return parts.join(', ');
      
      case 'full':
      default:
        return result.formattedAddress;
    }
  }

  /**
   * Get a short description of the location for UI display
   */
  static getLocationDescription(result: GeocodeResult): string {
    if (result.landmark) {
      return `Near ${result.landmark}, ${result.city}`;
    }
    
    if (result.neighborhood) {
      return `${result.neighborhood}, ${result.city}`;
    }
    
    return `${result.city}, ${result.state}`;
  }

  /**
   * Calculate confidence score based on available address components
   */
  private static calculateConfidence(address: any): number {
    let score = 0;
    const weights = {
      house_number: 0.2,
      road: 0.2,
      neighbourhood: 0.1,
      city: 0.2,
      state: 0.15,
      country: 0.1,
      postcode: 0.05
    };

    Object.entries(weights).forEach(([key, weight]) => {
      if (address[key]) {
        score += weight;
      }
    });

    return Math.min(score, 1.0);
  }

  /**
   * Validate coordinate values
   */
  private static isValidCoordinate(latitude: number, longitude: number): boolean {
    return (
      typeof latitude === 'number' &&
      typeof longitude === 'number' &&
      !isNaN(latitude) &&
      !isNaN(longitude) &&
      latitude >= -90 &&
      latitude <= 90 &&
      longitude >= -180 &&
      longitude <= 180
    );
  }

  /**
   * Create standardized error object
   */
  private static createError(code: string, message: string, retryable: boolean): GeocodeError {
    const error = new Error(message) as Error & GeocodeError;
    error.code = code;
    error.retryable = retryable;
    return error;
  }

  /**
   * Delay utility for retry logic
   */
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Check if coordinates are within a specific country/region
   */
  static isWithinIndia(latitude: number, longitude: number): boolean {
    // Approximate bounding box for India
    return (
      latitude >= 6.0 && latitude <= 37.0 &&
      longitude >= 68.0 && longitude <= 97.0
    );
  }

  /**
   * Get distance between two coordinates in kilometers
   */
  static getDistance(
    lat1: number, lon1: number,
    lat2: number, lon2: number
  ): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private static toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}

/**
 * Utility functions for address formatting and validation
 */
export class AddressFormatter {
  /**
   * Standardize address format for storage
   */
  static standardizeAddress(address: string): string {
    return address
      .trim()
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .replace(/,\s*,/g, ',') // Remove duplicate commas
      .replace(/^,|,$/g, ''); // Remove leading/trailing commas
  }

  /**
   * Extract components from a formatted address string
   */
  static parseAddressString(address: string): Partial<GeocodeResult> {
    const parts = address.split(',').map(part => part.trim());
    
    return {
      formattedAddress: address,
      city: parts.length >= 2 ? parts[parts.length - 2] : undefined,
      state: parts.length >= 1 ? parts[parts.length - 1] : undefined,
    };
  }

  /**
   * Validate if an address string looks reasonable
   */
  static isValidAddressString(address: string): boolean {
    if (!address || address.trim().length < 5) {
      return false;
    }

    // Check for minimum components (at least some letters and possibly numbers)
    const hasLetters = /[a-zA-Z]/.test(address);
    const notOnlyNumbers = !/^\d+$/.test(address.trim());
    
    return hasLetters && notOnlyNumbers;
  }

  /**
   * Clean and format address for display
   */
  static cleanAddress(address: string): string {
    return address
      .replace(/\b(undefined|null|Unknown)\b/gi, '')
      .replace(/,\s*,/g, ',')
      .replace(/^,\s*|,\s*$/g, '')
      .trim();
  }
}

// Export error types for better error handling
export const GEOCODING_ERRORS = {
  INVALID_COORDINATES: 'INVALID_COORDINATES',
  INVALID_ADDRESS: 'INVALID_ADDRESS',
  SERVICE_ERROR: 'SERVICE_ERROR',
  TIMEOUT: 'TIMEOUT',
  NOT_FOUND: 'NOT_FOUND',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR'
} as const;

export type GeocodingErrorCode = typeof GEOCODING_ERRORS[keyof typeof GEOCODING_ERRORS];