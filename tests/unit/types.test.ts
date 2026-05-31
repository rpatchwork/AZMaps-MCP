import { describe, expect, it } from 'vitest';
import {
  CoordinatesSchema,
  GeocodeParamsSchema,
  BatchGeocodeParamsSchema,
  ReverseGeocodeParamsSchema,
  POISearchParamsSchema,
  RouteParamsSchema,
  TimezoneParamsSchema,
  StaticMapParamsSchema,
  ErrorResponseSchema,
  OutputLevelSchema,
} from '../../src/lib/types.js';

describe('Type Validation: CoordinatesSchema', () => {
  it('should accept valid coordinates', () => {
    const valid = { latitude: 47.6062, longitude: -122.3321 };
    expect(() => CoordinatesSchema.parse(valid)).not.toThrow();
  });

  it('should reject latitude out of range (>90)', () => {
    const invalid = { latitude: 91, longitude: -122.3321 };
    expect(() => CoordinatesSchema.parse(invalid)).toThrow();
  });

  it('should reject latitude out of range (<-90)', () => {
    const invalid = { latitude: -91, longitude: -122.3321 };
    expect(() => CoordinatesSchema.parse(invalid)).toThrow();
  });

  it('should reject longitude out of range (>180)', () => {
    const invalid = { latitude: 47.6062, longitude: 181 };
    expect(() => CoordinatesSchema.parse(invalid)).toThrow();
  });

  it('should reject longitude out of range (<-180)', () => {
    const invalid = { latitude: 47.6062, longitude: -181 };
    expect(() => CoordinatesSchema.parse(invalid)).toThrow();
  });

  it('should reject missing latitude', () => {
    const invalid = { longitude: -122.3321 };
    expect(() => CoordinatesSchema.parse(invalid)).toThrow();
  });

  it('should reject missing longitude', () => {
    const invalid = { latitude: 47.6062 };
    expect(() => CoordinatesSchema.parse(invalid)).toThrow();
  });

  it('should accept boundary values (poles and date line)', () => {
    expect(() => CoordinatesSchema.parse({ latitude: 90, longitude: 0 })).not.toThrow();
    expect(() => CoordinatesSchema.parse({ latitude: -90, longitude: 0 })).not.toThrow();
    expect(() => CoordinatesSchema.parse({ latitude: 0, longitude: 180 })).not.toThrow();
    expect(() => CoordinatesSchema.parse({ latitude: 0, longitude: -180 })).not.toThrow();
  });
});

describe('Type Validation: GeocodeParamsSchema', () => {
  it('should accept valid address', () => {
    const valid = { address: '1 Microsoft Way, Redmond, WA' };
    expect(() => GeocodeParamsSchema.parse(valid)).not.toThrow();
  });

  it('should accept address with optional country filter', () => {
    const valid = { address: 'Paris', countryFilter: 'FR' };
    expect(() => GeocodeParamsSchema.parse(valid)).not.toThrow();
  });

  it('should accept address with optional maxResults', () => {
    const valid = { address: 'London', maxResults: 5 };
    expect(() => GeocodeParamsSchema.parse(valid)).not.toThrow();
  });

  it('should apply default maxResults (1) when not provided', () => {
    const input = { address: 'Seattle' };
    const result = GeocodeParamsSchema.parse(input);
    expect(result.maxResults).toBe(1);
  });

  it('should reject empty address string', () => {
    const invalid = { address: '' };
    expect(() => GeocodeParamsSchema.parse(invalid)).toThrow();
  });

  it('should reject maxResults = 0', () => {
    const invalid = { address: 'Seattle', maxResults: 0 };
    expect(() => GeocodeParamsSchema.parse(invalid)).toThrow();
  });

  it('should reject maxResults = -1', () => {
    const invalid = { address: 'Seattle', maxResults: -1 };
    expect(() => GeocodeParamsSchema.parse(invalid)).toThrow();
  });

  it('should reject maxResults > 20', () => {
    const invalid = { address: 'Seattle', maxResults: 21 };
    expect(() => GeocodeParamsSchema.parse(invalid)).toThrow();
  });
});

describe('Type Validation: BatchGeocodeParamsSchema', () => {
  it('should accept valid addresses array', () => {
    const valid = { addresses: ['Seattle', 'Portland', 'San Francisco'] };
    expect(() => BatchGeocodeParamsSchema.parse(valid)).not.toThrow();
  });

  it('should accept 100 addresses (maximum)', () => {
    const addresses = Array.from({ length: 100 }, (_, i) => `Address ${i}`);
    const valid = { addresses };
    expect(() => BatchGeocodeParamsSchema.parse(valid)).not.toThrow();
  });

  it('should reject empty addresses array', () => {
    const invalid = { addresses: [] };
    expect(() => BatchGeocodeParamsSchema.parse(invalid)).toThrow();
  });

  it('should reject > 100 addresses', () => {
    const addresses = Array.from({ length: 101 }, (_, i) => `Address ${i}`);
    const invalid = { addresses };
    expect(() => BatchGeocodeParamsSchema.parse(invalid)).toThrow();
  });

  it('should reject array with empty string', () => {
    const invalid = { addresses: ['Seattle', '', 'Portland'] };
    expect(() => BatchGeocodeParamsSchema.parse(invalid)).toThrow();
  });
});

describe('Type Validation: POISearchParamsSchema', () => {
  it('should accept valid POI search parameters', () => {
    const valid = {
      latitude: 47.6062,
      longitude: -122.3321,
      category: 'restaurant',
    };
    expect(() => POISearchParamsSchema.parse(valid)).not.toThrow();
  });

  it('should apply default radius (5000m) when not provided', () => {
    const input = {
      latitude: 47.6062,
      longitude: -122.3321,
      category: 'hotel',
    };
    const result = POISearchParamsSchema.parse(input);
    expect(result.radius).toBe(5000);
  });

  it('should apply default maxResults (10) when not provided', () => {
    const input = {
      latitude: 47.6062,
      longitude: -122.3321,
      category: 'hotel',
    };
    const result = POISearchParamsSchema.parse(input);
    expect(result.maxResults).toBe(10);
  });

  it('should reject maxResults = 0', () => {
    const invalid = {
      latitude: 47.6062,
      longitude: -122.3321,
      category: 'hotel',
      maxResults: 0,
    };
    expect(() => POISearchParamsSchema.parse(invalid)).toThrow();
  });

  it('should reject maxResults > 100', () => {
    const invalid = {
      latitude: 47.6062,
      longitude: -122.3321,
      category: 'hotel',
      maxResults: 101,
    };
    expect(() => POISearchParamsSchema.parse(invalid)).toThrow();
  });

  it('should reject empty category', () => {
    const invalid = {
      latitude: 47.6062,
      longitude: -122.3321,
      category: '',
    };
    expect(() => POISearchParamsSchema.parse(invalid)).toThrow();
  });

  it('should reject radius < 1m', () => {
    const invalid = {
      latitude: 47.6062,
      longitude: -122.3321,
      category: 'hotel',
      radius: 0,
    };
    expect(() => POISearchParamsSchema.parse(invalid)).toThrow();
  });

  it('should reject radius > 50000m', () => {
    const invalid = {
      latitude: 47.6062,
      longitude: -122.3321,
      category: 'hotel',
      radius: 50001,
    };
    expect(() => POISearchParamsSchema.parse(invalid)).toThrow();
  });
});

describe('Type Validation: RouteParamsSchema', () => {
  it('should accept valid 2-waypoint route', () => {
    const valid = {
      waypoints: [
        { latitude: 47.6062, longitude: -122.3321 },
        { latitude: 45.5152, longitude: -122.6784 },
      ],
    };
    expect(() => RouteParamsSchema.parse(valid)).not.toThrow();
  });

  it('should accept 5-waypoint route', () => {
    const valid = {
      waypoints: [
        { latitude: 47.6062, longitude: -122.3321 },
        { latitude: 45.5152, longitude: -122.6784 },
        { latitude: 44.0521, longitude: -123.0868 },
        { latitude: 42.3265, longitude: -122.8756 },
        { latitude: 40.7128, longitude: -122.4194 },
      ],
    };
    expect(() => RouteParamsSchema.parse(valid)).not.toThrow();
  });

  it('should apply default vehicleType (car)', () => {
    const input = {
      waypoints: [
        { latitude: 47.6062, longitude: -122.3321 },
        { latitude: 45.5152, longitude: -122.6784 },
      ],
    };
    const result = RouteParamsSchema.parse(input);
    expect(result.vehicleType).toBe('car');
  });

  it('should apply default trafficEnabled (true)', () => {
    const input = {
      waypoints: [
        { latitude: 47.6062, longitude: -122.3321 },
        { latitude: 45.5152, longitude: -122.6784 },
      ],
    };
    const result = RouteParamsSchema.parse(input);
    expect(result.trafficEnabled).toBe(true);
  });

  it('should apply default outputLevel (summary)', () => {
    const input = {
      waypoints: [
        { latitude: 47.6062, longitude: -122.3321 },
        { latitude: 45.5152, longitude: -122.6784 },
      ],
    };
    const result = RouteParamsSchema.parse(input);
    expect(result.outputLevel).toBe('summary');
  });

  it('should reject single waypoint', () => {
    const invalid = {
      waypoints: [{ latitude: 47.6062, longitude: -122.3321 }],
    };
    expect(() => RouteParamsSchema.parse(invalid)).toThrow();
  });

  it('should reject empty waypoints array', () => {
    const invalid = { waypoints: [] };
    expect(() => RouteParamsSchema.parse(invalid)).toThrow();
  });

  it('should accept all valid outputLevel values', () => {
    const waypoints = [
      { latitude: 47.6062, longitude: -122.3321 },
      { latitude: 45.5152, longitude: -122.6784 },
    ];

    expect(() =>
      RouteParamsSchema.parse({ waypoints, outputLevel: 'summary' })
    ).not.toThrow();
    expect(() =>
      RouteParamsSchema.parse({ waypoints, outputLevel: 'detailed' })
    ).not.toThrow();
    expect(() =>
      RouteParamsSchema.parse({ waypoints, outputLevel: 'full' })
    ).not.toThrow();
  });

  it('should reject invalid outputLevel', () => {
    const invalid = {
      waypoints: [
        { latitude: 47.6062, longitude: -122.3321 },
        { latitude: 45.5152, longitude: -122.6784 },
      ],
      outputLevel: 'invalid',
    };
    expect(() => RouteParamsSchema.parse(invalid)).toThrow();
  });
});

describe('Type Validation: TimezoneParamsSchema', () => {
  it('should accept valid coordinates', () => {
    const valid = { latitude: 47.6062, longitude: -122.3321 };
    expect(() => TimezoneParamsSchema.parse(valid)).not.toThrow();
  });

  it('should accept coordinates with optional timestamp', () => {
    const valid = {
      latitude: 47.6062,
      longitude: -122.3321,
      timestamp: '2026-05-21T12:00:00Z',
    };
    expect(() => TimezoneParamsSchema.parse(valid)).not.toThrow();
  });

  it('should reject invalid coordinates', () => {
    const invalid = { latitude: 91, longitude: -122.3321 };
    expect(() => TimezoneParamsSchema.parse(invalid)).toThrow();
  });
});

describe('Type Validation: StaticMapParamsSchema', () => {
  it('should accept valid static map parameters', () => {
    const valid = {
      center: { latitude: 47.6062, longitude: -122.3321 },
    };
    expect(() => StaticMapParamsSchema.parse(valid)).not.toThrow();
  });

  it('should apply default zoom (12)', () => {
    const input = {
      center: { latitude: 47.6062, longitude: -122.3321 },
    };
    const result = StaticMapParamsSchema.parse(input);
    expect(result.zoom).toBe(12);
  });

  it('should apply default width (800)', () => {
    const input = {
      center: { latitude: 47.6062, longitude: -122.3321 },
    };
    const result = StaticMapParamsSchema.parse(input);
    expect(result.width).toBe(800);
  });

  it('should apply default height (600)', () => {
    const input = {
      center: { latitude: 47.6062, longitude: -122.3321 },
    };
    const result = StaticMapParamsSchema.parse(input);
    expect(result.height).toBe(600);
  });

  it('should apply default format (png)', () => {
    const input = {
      center: { latitude: 47.6062, longitude: -122.3321 },
    };
    const result = StaticMapParamsSchema.parse(input);
    expect(result.format).toBe('png');
  });

  it('should reject zoom < 0', () => {
    const invalid = {
      center: { latitude: 47.6062, longitude: -122.3321 },
      zoom: -1,
    };
    expect(() => StaticMapParamsSchema.parse(invalid)).toThrow();
  });

  it('should reject zoom > 20', () => {
    const invalid = {
      center: { latitude: 47.6062, longitude: -122.3321 },
      zoom: 21,
    };
    expect(() => StaticMapParamsSchema.parse(invalid)).toThrow();
  });

  it('should reject width < 1', () => {
    const invalid = {
      center: { latitude: 47.6062, longitude: -122.3321 },
      width: 0,
    };
    expect(() => StaticMapParamsSchema.parse(invalid)).toThrow();
  });

  it('should reject width > 2048', () => {
    const invalid = {
      center: { latitude: 47.6062, longitude: -122.3321 },
      width: 2049,
    };
    expect(() => StaticMapParamsSchema.parse(invalid)).toThrow();
  });

  it('should reject height > 2048', () => {
    const invalid = {
      center: { latitude: 47.6062, longitude: -122.3321 },
      height: 2049,
    };
    expect(() => StaticMapParamsSchema.parse(invalid)).toThrow();
  });
});

describe('Type Validation: ErrorResponseSchema', () => {
  it('should accept valid error response', () => {
    const valid = {
      success: false,
      error: {
        code: 'GEOCODE_NO_RESULTS',
        message: 'Address not found',
        retryable: false,
      },
    };
    expect(() => ErrorResponseSchema.parse(valid)).not.toThrow();
  });

  it('should accept error response with retryAfter', () => {
    const valid = {
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Rate limit exceeded',
        retryable: true,
        retryAfter: 60,
      },
    };
    expect(() => ErrorResponseSchema.parse(valid)).not.toThrow();
  });

  it('should reject success: true', () => {
    const invalid = {
      success: true,
      error: {
        code: 'GEOCODE_NO_RESULTS',
        message: 'Address not found',
        retryable: false,
      },
    };
    expect(() => ErrorResponseSchema.parse(invalid)).toThrow();
  });

  it('should reject missing error.code', () => {
    const invalid = {
      success: false,
      error: {
        message: 'Address not found',
        retryable: false,
      },
    };
    expect(() => ErrorResponseSchema.parse(invalid)).toThrow();
  });

  it('should reject missing error.message', () => {
    const invalid = {
      success: false,
      error: {
        code: 'GEOCODE_NO_RESULTS',
        retryable: false,
      },
    };
    expect(() => ErrorResponseSchema.parse(invalid)).toThrow();
  });

  it('should reject missing error.retryable', () => {
    const invalid = {
      success: false,
      error: {
        code: 'GEOCODE_NO_RESULTS',
        message: 'Address not found',
      },
    };
    expect(() => ErrorResponseSchema.parse(invalid)).toThrow();
  });
});
