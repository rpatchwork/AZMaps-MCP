import { describe, expect, it, beforeAll } from 'vitest';
import { AzureMapsClient } from '../../src/lib/azure-maps-client.js';
import { ErrorCode } from '../../src/lib/errors.js';
import routes from '../fixtures/routes.json';

const API_KEY = process.env.AZURE_MAPS_API_KEY;
const SKIP_INTEGRATION = !API_KEY;

describe.skipIf(SKIP_INTEGRATION)('Integration: Route Calculation', () => {
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

  describe('Happy Path: 2-Waypoint Routes', () => {
    it.each(routes.short_routes)(
      'should calculate route: $name',
      async ({
        waypoints,
        expected_distance_km,
        expected_duration_hours,
        tolerance_km,
        tolerance_hours,
      }) => {
        const result = await client.calculateRoute({
          waypoints,
          vehicleType: 'car',
          trafficEnabled: true,
          outputLevel: 'summary',
        });

        expect(result.success).toBe(true);
        expect(result.data.distanceMeters).toBeGreaterThan(0);
        expect(result.data.durationSeconds).toBeGreaterThan(0);

        // Verify distance within tolerance
        const actualDistanceKm = result.data.distanceMeters / 1000;
        expect(actualDistanceKm).toBeGreaterThanOrEqual(
          expected_distance_km - tolerance_km
        );
        expect(actualDistanceKm).toBeLessThanOrEqual(
          expected_distance_km + tolerance_km
        );

        // Verify duration within tolerance
        const actualDurationHours = result.data.durationSeconds / 3600;
        expect(actualDurationHours).toBeGreaterThanOrEqual(
          expected_duration_hours - tolerance_hours
        );
        expect(actualDurationHours).toBeLessThanOrEqual(
          expected_duration_hours + tolerance_hours
        );
      }
    );
  });

  describe('Happy Path: Multi-Waypoint Routes', () => {
    it.each(routes.multi_stop_routes)(
      'should calculate multi-stop route: $name',
      async ({
        waypoints,
        expected_distance_km,
        expected_duration_hours,
        tolerance_km,
        tolerance_hours,
      }) => {
        const result = await client.calculateRoute({
          waypoints,
          vehicleType: 'car',
          trafficEnabled: true,
          outputLevel: 'detailed',
        });

        expect(result.success).toBe(true);
        expect(result.data.legs).toBeDefined();
        expect(result.data.legs).toHaveLength(waypoints.length - 1);

        const actualDistanceKm = result.data.distanceMeters / 1000;
        expect(actualDistanceKm).toBeGreaterThanOrEqual(
          expected_distance_km - tolerance_km
        );
        expect(actualDistanceKm).toBeLessThanOrEqual(
          expected_distance_km + tolerance_km
        );
      }
    );
  });

  describe('Output Levels', () => {
    const testWaypoints = [
      { latitude: 47.6062, longitude: -122.3321 },
      { latitude: 45.5152, longitude: -122.6784 },
    ];

    it('should return summary output (minimal)', async () => {
      const result = await client.calculateRoute({
        waypoints: testWaypoints,
        outputLevel: 'summary',
      });

      expect(result.success).toBe(true);
      expect(result.data.distanceMeters).toBeDefined();
      expect(result.data.durationSeconds).toBeDefined();
      expect(result.data.legs).toBeUndefined();
      expect(result.data.turnByTurnInstructions).toBeUndefined();
      expect(result.data.geometry).toBeUndefined();

      // Verify summary is compact (< 1KB)
      const size = JSON.stringify(result).length;
      expect(size).toBeLessThan(1024);
    });

    it('should return detailed output (includes legs)', async () => {
      const result = await client.calculateRoute({
        waypoints: testWaypoints,
        outputLevel: 'detailed',
      });

      expect(result.success).toBe(true);
      expect(result.data.distanceMeters).toBeDefined();
      expect(result.data.durationSeconds).toBeDefined();
      expect(result.data.legs).toBeDefined();
      expect(result.data.legs).toHaveLength(1);
      expect(result.data.turnByTurnInstructions).toBeUndefined();
      expect(result.data.geometry).toBeUndefined();
    });

    it('should return full output (includes turn-by-turn + geometry)', async () => {
      const result = await client.calculateRoute({
        waypoints: testWaypoints,
        outputLevel: 'full',
      });

      expect(result.success).toBe(true);
      expect(result.data.distanceMeters).toBeDefined();
      expect(result.data.durationSeconds).toBeDefined();
      expect(result.data.legs).toBeDefined();
      expect(result.data.turnByTurnInstructions).toBeDefined();
      expect(result.data.geometry).toBeDefined();

      // Verify full output is larger (> 5KB)
      const size = JSON.stringify(result).length;
      expect(size).toBeGreaterThan(5120);
    });

    it('should verify output level size progression', async () => {
      const summary = await client.calculateRoute({
        waypoints: testWaypoints,
        outputLevel: 'summary',
      });

      const detailed = await client.calculateRoute({
        waypoints: testWaypoints,
        outputLevel: 'detailed',
      });

      const full = await client.calculateRoute({
        waypoints: testWaypoints,
        outputLevel: 'full',
      });

      const summarySize = JSON.stringify(summary).length;
      const detailedSize = JSON.stringify(detailed).length;
      const fullSize = JSON.stringify(full).length;

      expect(summarySize).toBeLessThan(detailedSize);
      expect(detailedSize).toBeLessThan(fullSize);
    });
  });

  describe('Edge Cases: Impossible Routes', () => {
    it.each(routes.impossible_routes)(
      'should reject $name',
      async ({ waypoints, description }) => {
        await expect(
          client.calculateRoute({
            waypoints,
            outputLevel: 'summary',
          })
        ).rejects.toMatchObject({
          code: ErrorCode.ROUTE_IMPOSSIBLE,
          retryable: false,
        });
      }
    );
  });

  describe('Edge Cases: Same Location', () => {
    it.each(routes.same_location_routes)(
      'should handle $name',
      async ({ waypoints, description }) => {
        const result = await client.calculateRoute({
          waypoints,
          outputLevel: 'summary',
        });

        // May return zero-distance route or error - either is acceptable
        if (result.success) {
          expect(result.data.distanceMeters).toBeLessThan(100);
          expect(result.data.durationSeconds).toBeLessThan(60);
        }
      }
    );
  });

  describe('Edge Cases: International Route', () => {
    it('should calculate Seattle to Vancouver BC (border crossing)', async () => {
      const result = await client.calculateRoute({
        waypoints: [
          { latitude: 47.6062, longitude: -122.3321 }, // Seattle
          { latitude: 49.2827, longitude: -123.1207 }, // Vancouver BC
        ],
        outputLevel: 'summary',
      });

      expect(result.success).toBe(true);
      expect(result.data.distanceMeters).toBeGreaterThan(0);
    });
  });

  describe('Performance: Latency Requirements', () => {
    it('should complete route calculation within 2000ms (p95 target)', async () => {
      const start = performance.now();

      await client.calculateRoute({
        waypoints: [
          { latitude: 47.6062, longitude: -122.3321 },
          { latitude: 45.5152, longitude: -122.6784 },
        ],
        outputLevel: 'summary',
      });

      const duration = performance.now() - start;
      expect(duration).toBeLessThan(2000);
    }, 3000);
  });
});
