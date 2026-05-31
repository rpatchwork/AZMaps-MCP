import { describe, expect, it, beforeAll } from 'vitest';
import { AzureMapsClient } from '../../src/lib/azure-maps-client.js';

const API_KEY = process.env.AZURE_MAPS_API_KEY;
const SKIP_INTEGRATION = !API_KEY;

describe.skipIf(SKIP_INTEGRATION)('Integration: Static Map', () => {
  let client: AzureMapsClient;

  beforeAll(() => {
    if (!API_KEY) {
      console.warn(
        '⚠️  Skipping integration tests: AZURE_MAPS_API_KEY not set'
      );
      return;
    }

    client = new AzureMapsClient({
      endpoint: 'https://atlas.microsoft.com',
      apiKey: API_KEY,
    });
  });

  describe('Happy Path: Basic Map Generation', () => {
    it('should generate map centered on Seattle', async () => {
      const result = await client.renderStaticMap({
        center: { latitude: 47.6062, longitude: -122.3321 },
        zoom: 12,
        width: 800,
        height: 600,
        format: 'png',
      });

      expect(result.success).toBe(true);
      expect(result.data.imageBase64).toBeTruthy();
      expect(result.data.contentType).toBe('image/png');
      expect(result.data.sizeBytes).toBeGreaterThan(0);

      // Verify base64 is valid
      expect(result.data.imageBase64).toMatch(/^[A-Za-z0-9+/]+={0,2}$/);
    });

    it('should generate map centered on Paris', async () => {
      const result = await client.renderStaticMap({
        center: { latitude: 48.8566, longitude: 2.3522 },
        zoom: 13,
        width: 600,
        height: 400,
        format: 'png',
      });

      expect(result.success).toBe(true);
      expect(result.data.contentType).toBe('image/png');
    });
  });

  describe('Happy Path: Map with Route Overlay', () => {
    it('should generate map with route line', async () => {
      // First calculate a route to get geometry
      const route = await client.calculateRoute({
        waypoints: [
          { latitude: 47.6062, longitude: -122.3321 },
          { latitude: 47.6205, longitude: -122.3493 },
        ],
        outputLevel: 'full',
      });

      const mapResult = await client.renderStaticMap({
        center: { latitude: 47.6134, longitude: -122.3407 },
        zoom: 14,
        width: 800,
        height: 600,
        routeGeometry: route.data.geometry,
      });

      expect(mapResult.success).toBe(true);
      expect(mapResult.data.imageBase64).toBeTruthy();
      expect(mapResult.data.sizeBytes).toBeGreaterThan(0);
    });
  });

  describe('Happy Path: Map with POI Pins', () => {
    it('should generate map with multiple POI pins', async () => {
      const pins = [
        { latitude: 47.6062, longitude: -122.3321 },
        { latitude: 47.6205, longitude: -122.3493 },
        { latitude: 47.6101, longitude: -122.3421 },
      ];

      const result = await client.renderStaticMap({
        center: { latitude: 47.6134, longitude: -122.3407 },
        zoom: 13,
        width: 800,
        height: 600,
        pins,
      });

      expect(result.success).toBe(true);
      expect(result.data.imageBase64).toBeTruthy();
    });

    it('should handle 50+ POI pins', async () => {
      // Generate 50 random pins around Seattle
      const pins = Array.from({ length: 50 }, (_, i) => ({
        latitude: 47.6 + (Math.random() - 0.5) * 0.1,
        longitude: -122.33 + (Math.random() - 0.5) * 0.1,
      }));

      const result = await client.renderStaticMap({
        center: { latitude: 47.6062, longitude: -122.3321 },
        zoom: 12,
        width: 1024,
        height: 768,
        pins,
      });

      expect(result.success).toBe(true);
      expect(result.data.imageBase64).toBeTruthy();
    });
  });

  describe('Labeled Pins: URL Encoding Edge Cases', () => {
    // 🔒 MANDATORY REGRESSION TEST — This test MUST pass before shipping
    // Bug: Labels with spaces and special characters were not properly URL-encoded
    // Impact: Azure Maps API would reject requests or render incorrect pins
    // Root Cause: Direct string concatenation without encodeURIComponent()
    
    it('should handle simple numeric label', async () => {
      // Simple case: single digit label (e.g., waypoint number)
      const pins = [
        { latitude: 47.6062, longitude: -122.3321, label: '1' },
      ];

      const result = await client.renderStaticMap({
        center: { latitude: 47.6062, longitude: -122.3321 },
        zoom: 13,
        width: 800,
        height: 600,
        pins,
      });

      expect(result.success).toBe(true);
      expect(result.data.imageBase64).toBeTruthy();
      expect(result.data.sizeBytes).toBeGreaterThan(0);
    });

    it('should handle label with spaces', async () => {
      // CRITICAL: This would have caught the bug pre-fix
      // Labels like "Stop 1", "Waypoint 2", "Hotel Lobby" contain spaces
      // Spaces MUST be encoded as %20 in URL parameters
      const pins = [
        { latitude: 47.6062, longitude: -122.3321, label: 'Stop 1' },
        { latitude: 47.6205, longitude: -122.3493, label: 'Stop 2' },
      ];

      const result = await client.renderStaticMap({
        center: { latitude: 47.6134, longitude: -122.3407 },
        zoom: 13,
        width: 800,
        height: 600,
        pins,
      });

      expect(result.success).toBe(true);
      expect(result.data.imageBase64).toBeTruthy();
      expect(result.data.sizeBytes).toBeGreaterThan(0);
    });

    it('should handle label with special characters', async () => {
      // CRITICAL: This would have caught the bug pre-fix
      // Labels with &, =, +, #, etc. MUST be URL-encoded
      // Common real-world cases: "Hotel & Spa", "R&D Lab", "Terminal A+B"
      const pins = [
        { latitude: 47.6062, longitude: -122.3321, label: 'Hotel & Spa' },
        { latitude: 47.6205, longitude: -122.3493, label: 'R&D Lab' },
        { latitude: 47.6101, longitude: -122.3421, label: 'Terminal A+B' },
      ];

      const result = await client.renderStaticMap({
        center: { latitude: 47.6134, longitude: -122.3407 },
        zoom: 13,
        width: 800,
        height: 600,
        pins,
      });

      expect(result.success).toBe(true);
      expect(result.data.imageBase64).toBeTruthy();
      expect(result.data.sizeBytes).toBeGreaterThan(0);
    });

    it('should handle mixed labeled and unlabeled pins', async () => {
      // Real-world scenario: some waypoints have labels, others don't
      const pins = [
        { latitude: 47.6062, longitude: -122.3321, label: 'Start Point' },
        { latitude: 47.6134, longitude: -122.3407 }, // No label
        { latitude: 47.6205, longitude: -122.3493, label: 'End Point' },
      ];

      const result = await client.renderStaticMap({
        center: { latitude: 47.6134, longitude: -122.3407 },
        zoom: 13,
        width: 800,
        height: 600,
        pins,
      });

      expect(result.success).toBe(true);
      expect(result.data.imageBase64).toBeTruthy();
    });
  });

  describe('Edge Cases: Large Route (Cross-Country)', () => {
    it('should generate map with cross-country route', async () => {
      const route = await client.calculateRoute({
        waypoints: [
          { latitude: 47.6062, longitude: -122.3321 }, // Seattle
          { latitude: 40.7128, longitude: -74.006 }, // New York
        ],
        outputLevel: 'full',
      });

      const mapResult = await client.renderStaticMap({
        center: { latitude: 42, longitude: -95 }, // Midpoint
        zoom: 5,
        width: 1024,
        height: 768,
        routeGeometry: route.data.geometry,
      });

      expect(mapResult.success).toBe(true);
      expect(mapResult.data.imageBase64).toBeTruthy();
    });
  });

  describe('Format Options', () => {
    it('should generate PNG format', async () => {
      const result = await client.renderStaticMap({
        center: { latitude: 47.6062, longitude: -122.3321 },
        format: 'png',
      });

      expect(result.success).toBe(true);
      expect(result.data.contentType).toBe('image/png');
    });

    it('should generate JPEG format', async () => {
      const result = await client.renderStaticMap({
        center: { latitude: 47.6062, longitude: -122.3321 },
        format: 'jpeg',
      });

      expect(result.success).toBe(true);
      expect(result.data.contentType).toBe('image/jpeg');
    });
  });

  describe('Size Validation', () => {
    it('should respect custom width and height', async () => {
      const result = await client.renderStaticMap({
        center: { latitude: 47.6062, longitude: -122.3321 },
        width: 400,
        height: 300,
      });

      expect(result.success).toBe(true);
      expect(result.data.imageBase64).toBeTruthy();
    });

    it('should handle maximum size (2048x2048)', async () => {
      const result = await client.renderStaticMap({
        center: { latitude: 47.6062, longitude: -122.3321 },
        width: 2048,
        height: 2048,
      });

      expect(result.success).toBe(true);
      expect(result.data.sizeBytes).toBeGreaterThan(0);
    });
  });

  describe('Performance: Latency Requirements', () => {
    it('should complete map generation within 3000ms (p95 target)', async () => {
      const start = performance.now();

      await client.renderStaticMap({
        center: { latitude: 47.6062, longitude: -122.3321 },
        zoom: 12,
        width: 800,
        height: 600,
      });

      const duration = performance.now() - start;
      expect(duration).toBeLessThan(3000);
    }, 4000);
  });

  describe('Visual Regression: Baseline Comparison', () => {
    it('should generate consistent map for Seattle baseline', async () => {
      const result = await client.renderStaticMap({
        center: { latitude: 47.6062, longitude: -122.3321 },
        zoom: 12,
        width: 800,
        height: 600,
        format: 'png',
      });

      expect(result.success).toBe(true);

      // TODO: Save baseline PNG for manual inspection
      // TODO: Implement pixel diff comparison in future iterations
      // For v1, we verify that map generation succeeds consistently
      expect(result.data.imageBase64).toBeTruthy();
      expect(result.data.sizeBytes).toBeGreaterThan(50000); // Reasonable size for 800x600 PNG
    });
  });
});
