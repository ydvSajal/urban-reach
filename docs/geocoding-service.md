# Geocoding Service Documentation

## Overview

The Geocoding Service provides comprehensive address resolution and coordinate conversion functionality for the Municipal Complaint Management System. It includes reverse geocoding (coordinates to addresses), forward geocoding (addresses to coordinates), and various address formatting utilities.

## Features

### Core Functionality
- **Reverse Geocoding**: Convert latitude/longitude coordinates to readable addresses
- **Forward Geocoding**: Convert address strings to coordinates
- **Address Formatting**: Standardize and format addresses for consistent display
- **Error Handling**: Comprehensive error handling with retry mechanisms
- **Validation**: Address and coordinate validation utilities

### Service Provider
- **Primary Provider**: OpenStreetMap Nominatim
- **Coverage**: Global coverage with optimized handling for Indian locations
- **Rate Limiting**: Respectful usage with built-in delays and retry logic
- **Reliability**: Automatic retry with exponential backoff for failed requests

## API Reference

### GeocodingService Class

#### reverseGeocode(latitude, longitude, options?)
Converts coordinates to a detailed address.

```typescript
const result = await GeocodingService.reverseGeocode(19.0760, 72.8777, {
  timeout: 10000,
  retries: 2,
  includeDetails: true
});
```

**Parameters:**
- `latitude` (number): Latitude coordinate (-90 to 90)
- `longitude` (number): Longitude coordinate (-180 to 180)
- `options` (optional):
  - `timeout`: Request timeout in milliseconds (default: 10000)
  - `retries`: Number of retry attempts (default: 3)
  - `language`: Response language (default: 'en')
  - `includeDetails`: Include detailed address components (default: true)

**Returns:** `Promise<GeocodeResult>`

#### forwardGeocode(address, options?)
Converts an address string to coordinates.

```typescript
const results = await GeocodingService.forwardGeocode("Mumbai, Maharashtra", {
  timeout: 10000,
  language: 'en'
});
```

**Parameters:**
- `address` (string): Address to geocode (minimum 3 characters)
- `options` (optional):
  - `timeout`: Request timeout in milliseconds
  - `language`: Search language preference

**Returns:** `Promise<GeocodeResult[]>`

#### Utility Methods

```typescript
// Format address for display
const formatted = GeocodingService.formatAddressForDisplay(result, 'medium');

// Get location description
const description = GeocodingService.getLocationDescription(result);

// Check if coordinates are within India
const isInIndia = GeocodingService.isWithinIndia(lat, lng);

// Calculate distance between two points
const distance = GeocodingService.getDistance(lat1, lng1, lat2, lng2);
```

### AddressFormatter Class

#### standardizeAddress(address)
Cleans and standardizes address formatting.

```typescript
const clean = AddressFormatter.standardizeAddress("  123   Main  St  ,  Mumbai  ");
// Returns: "123 Main St, Mumbai"
```

#### isValidAddressString(address)
Validates if an address string is reasonable.

```typescript
const isValid = AddressFormatter.isValidAddressString("123 Main Street, Mumbai");
// Returns: true
```

#### cleanAddress(address)
Removes undefined/null values and cleans formatting.

```typescript
const clean = AddressFormatter.cleanAddress("undefined, 123 Main St, null, Mumbai");
// Returns: "123 Main St, Mumbai"
```

## Data Types

### GeocodeResult
```typescript
interface GeocodeResult {
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
```

### GeocodeError
```typescript
interface GeocodeError {
  code: string;
  message: string;
  retryable: boolean;
}
```

## Error Codes

| Code | Description | Retryable |
|------|-------------|-----------|
| `INVALID_COORDINATES` | Invalid latitude or longitude values | No |
| `INVALID_ADDRESS` | Address string is too short or invalid | No |
| `SERVICE_ERROR` | Geocoding service returned an error | Yes (if 5xx) |
| `TIMEOUT` | Request timed out | Yes |
| `NOT_FOUND` | No results found for the query | No |
| `UNKNOWN_ERROR` | Unexpected error occurred | Yes |

## React Hook Usage

### useGeocoding Hook

The `useGeocoding` hook provides a convenient way to use geocoding functionality in React components.

```typescript
import { useGeocoding } from '@/hooks/useGeocoding';

const MyComponent = () => {
  const {
    isLoading,
    error,
    lastResult,
    reverseGeocode,
    forwardGeocode,
    getCurrentLocation,
    formatAddress,
    clearError
  } = useGeocoding({ showToasts: true });

  const handleGeocode = async () => {
    const result = await reverseGeocode(19.0760, 72.8777);
    if (result) {
      console.log('Address:', formatAddress(result, 'medium'));
    }
  };

  return (
    <div>
      {isLoading && <p>Loading...</p>}
      {error && <p>Error: {error.message}</p>}
      <button onClick={handleGeocode}>Get Address</button>
    </div>
  );
};
```

## Integration Examples

### LocationPicker Component
The LocationPicker component uses the geocoding service for:
- Converting GPS coordinates to addresses
- Searching for locations by address
- Displaying formatted address information
- Validating location data

### Report Submission
The SubmitReport component uses address formatting for:
- Validating user-entered addresses
- Standardizing address format before storage
- Ensuring consistent address formatting

## Performance Considerations

### Caching
- Results are not automatically cached by the service
- Implement application-level caching for frequently accessed locations
- Consider using browser localStorage for recent searches

### Rate Limiting
- Nominatim has usage limits (1 request per second recommended)
- Service includes built-in delays to respect rate limits
- Implement request queuing for high-volume applications

### Error Handling
- Always handle geocoding errors gracefully
- Provide fallback options when geocoding fails
- Use retry mechanisms for transient failures

## Testing

### Manual Testing
Use the GeocodingTest component to manually verify functionality:

```typescript
import GeocodingTest from '@/components/GeocodingTest';

// Add to your development routes
<Route path="/test-geocoding" element={<GeocodingTest />} />
```

### Test Locations
The service includes test data for major Indian cities:
- Mumbai: 19.0760, 72.8777
- Delhi: 28.6139, 77.2090
- Bangalore: 12.9716, 77.5946
- Chennai: 13.0827, 80.2707
- Kolkata: 22.5726, 88.3639

### Accuracy Verification
- Test with known addresses and verify results
- Check confidence scores for result quality
- Validate coordinate accuracy with mapping services

## Best Practices

### Address Input
1. Validate addresses before geocoding
2. Provide clear error messages for invalid input
3. Use autocomplete for better user experience
4. Standardize addresses before storage

### Error Handling
1. Always handle geocoding failures gracefully
2. Provide retry options for transient errors
3. Show meaningful error messages to users
4. Log errors for debugging and monitoring

### Performance
1. Debounce search inputs to reduce API calls
2. Cache frequently accessed locations
3. Use appropriate timeout values
4. Implement request queuing for bulk operations

### User Experience
1. Show loading states during geocoding
2. Provide progress feedback for long operations
3. Allow users to manually correct addresses
4. Display confidence levels when appropriate

## Troubleshooting

### Common Issues

**Geocoding fails for valid addresses:**
- Check network connectivity
- Verify service availability
- Increase timeout values
- Check for rate limiting

**Low confidence scores:**
- Address may be incomplete or ambiguous
- Try more specific address components
- Verify address format and spelling
- Consider manual verification

**Timeout errors:**
- Increase timeout value in options
- Check network speed and stability
- Implement retry logic with backoff
- Consider alternative geocoding providers

### Debugging
1. Enable console logging for detailed error information
2. Use the GeocodingTest component for isolated testing
3. Check network requests in browser developer tools
4. Verify API response format and content

## Future Enhancements

### Planned Features
- Multiple geocoding provider support
- Offline geocoding for cached locations
- Batch geocoding operations
- Enhanced Indian address parsing
- Custom geocoding for municipal boundaries

### Configuration Options
- Provider selection and fallback
- Custom API endpoints
- Regional optimization settings
- Caching configuration
- Rate limiting customization