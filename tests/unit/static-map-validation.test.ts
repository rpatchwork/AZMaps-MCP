import { describe, it, expect } from 'vitest';
import { AzureMapsClient } from '../../src/lib/azure-maps-client.js';
import { StaticMapParams } from '../../src/lib/types.js';
import { ErrorCode } from '../../src/lib/errors.js';

describe('Static Map URL Size Validation', () => {
  const client = new AzureMapsClient({
    endpoint: 'https://atlas.microsoft.com',
    apiKey: 'test-key',
  });

  it('should reject route with 296 points (URL too large)', async () => {
    // Generate mock GeoJSON with 296 points
    const coordinates: [number, number][] = [];
    for (let i = 0; i < 296; i++) {
      coordinates.push([-122.0 + i * 0.01, 47.0 + i * 0.01]);
    }

    const routeGeometry = {
      type: 'LineString',
      coordinates,
    };

    const params: StaticMapParams = {
      center: { latitude: 47.5, longitude: -122.0 },
      zoom: 10,
      width: 800,
      height: 600,
      routeGeometry: JSON.stringify(routeGeometry),
      pins: Array(23).fill(null).map((_, i) => ({
        latitude: 47.0 + i * 0.1,
        longitude: -122.0 + i * 0.1,
      })),
    };

    // Should throw OVERLAY_TOO_LARGE error
    await expect(client.renderStaticMap(params)).rejects.toThrow();
    
    try {
      await client.renderStaticMap(params);
    } catch (error: any) {
      expect(error.code).toBe(ErrorCode.OVERLAY_TOO_LARGE);
      expect(error.message).toContain('296');
      expect(error.message).toContain('23 pins');
      expect(error.details).toBeDefined();
      expect(error.details.routePointCount).toBe(296);
      expect(error.details.pinCount).toBe(23);
      expect(error.details.suggestions).toBeInstanceOf(Array);
      expect(error.details.suggestions.length).toBeGreaterThan(0);
    }
  });

  it('should accept route with 50 points (within limits)', async () => {
    // Generate mock GeoJSON with 50 points
    const coordinates: [number, number][] = [];
    for (let i = 0; i < 50; i++) {
      coordinates.push([-122.0 + i * 0.01, 47.0 + i * 0.01]);
    }

    const routeGeometry = {
      type: 'LineString',
      coordinates,
    };

    const params: StaticMapParams = {
      center: { latitude: 47.5, longitude: -122.0 },
      zoom: 10,
      width: 800,
      height: 600,
      routeGeometry: JSON.stringify(routeGeometry),
      pins: [{ latitude: 47.5, longitude: -122.0 }],
    };

    // Should NOT throw validation error (will fail later due to test API key)
    // We're just testing the size validation passes
    try {
      await client.renderStaticMap(params);
    } catch (error: any) {
      // Expect authentication error or network error, NOT OVERLAY_TOO_LARGE
      expect(error.code).not.toBe(ErrorCode.OVERLAY_TOO_LARGE);
    }
  });

  it('should calculate URL size correctly for edge cases', async () => {
    // Test with no route, many pins
    const params: StaticMapParams = {
      center: { latitude: 47.5, longitude: -122.0 },
      zoom: 10,
      width: 800,
      height: 600,
      pins: Array(80).fill(null).map((_, i) => ({
        latitude: 47.0 + i * 0.01,
        longitude: -122.0 + i * 0.01,
      })),
    };

    // 80 pins * 40 chars = 3200 chars (over limit)
    await expect(client.renderStaticMap(params)).rejects.toThrow();
    
    try {
      await client.renderStaticMap(params);
    } catch (error: any) {
      expect(error.code).toBe(ErrorCode.OVERLAY_TOO_LARGE);
      expect(error.details.pinCount).toBe(80);
    }
  });
});
