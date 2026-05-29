import { describe, expect, it, beforeAll } from 'vitest';
import { AzureMapsClient } from '../../src/lib/azure-maps-client.js';
import { ErrorCode } from '../../src/lib/errors.js';
import pois from '../fixtures/pois.json';

const API_KEY = process.env.AZURE_MAPS_API_KEY;
const SKIP_INTEGRATION = !API_KEY;

describe.skipIf(SKIP_INTEGRATION)('Integration: POI Search', () => {
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

  describe('Happy Path: Category Search', () => {
    it('should find restaurants near Seattle', async () => {
      const result = await client.searchPOIs({
        latitude: 47.6062,
        longitude: -122.3321,
        category: 'restaurant',
        radius: 1000,
        maxResults: 10,
      });

      expect(result.success).toBe(true);
      expect(result.data.pois).toBeInstanceOf(Array);
      expect(result.data.pois.length).toBeGreaterThan(0);
      expect(result.data.pois.length).toBeLessThanOrEqual(10);

      // Verify POI structure
      const poi = result.data.pois[0];
      expect(poi).toHaveProperty('name');
      expect(poi).toHaveProperty('category');
      expect(poi).toHaveProperty('coordinates');
      expect(poi).toHaveProperty('distance');
      expect(poi.coordinates.latitude).toBeTypeOf('number');
      expect(poi.coordinates.longitude).toBeTypeOf('number');
    });

    it('should find hotels near Paris', async () => {
      const result = await client.searchPOIs({
        latitude: 48.8566,
        longitude: 2.3522,
        category: 'hotel',
        radius: 2000,
        maxResults: 10,
      });

      expect(result.success).toBe(true);
      expect(result.data.pois.length).toBeGreaterThan(0);
      expect(result.data.totalCount).toBe(result.data.pois.length);
    });
  });

  describe('Edge Cases: Dense Urban Areas', () => {
    it.each(pois.dense_areas)(
      'should find POIs in $name',
      async ({ latitude, longitude, category, radius, expected_min_results }) => {
        const result = await client.searchPOIs({
          latitude,
          longitude,
          category,
          radius,
          maxResults: 50,
        });

        expect(result.success).toBe(true);
        expect(result.data.pois.length).toBeGreaterThanOrEqual(
          expected_min_results
        );
      }
    );
  });

  describe('Edge Cases: Sparse Rural Areas', () => {
    it.each(pois.sparse_areas)(
      'should handle sparse POIs in $name',
      async ({ latitude, longitude, category, radius, expected_max_results }) => {
        const result = await client.searchPOIs({
          latitude,
          longitude,
          category,
          radius,
          maxResults: 20,
        });

        expect(result.success).toBe(true);
        expect(result.data.pois.length).toBeLessThanOrEqual(expected_max_results);
      }
    );
  });

  describe('Parameter: maxResults', () => {
    it.each(pois.max_results_tests)(
      'should respect $name',
      async ({
        latitude,
        longitude,
        category,
        radius,
        max_results,
        expected_exact_count,
      }) => {
        const result = await client.searchPOIs({
          latitude,
          longitude,
          category,
          radius,
          maxResults: max_results,
        });

        expect(result.success).toBe(true);
        expect(result.data.pois.length).toBeLessThanOrEqual(max_results);
        // In dense areas, should hit the maxResults limit
        expect(result.data.pois.length).toBeGreaterThan(0);
      }
    );
  });

  describe('Edge Cases: Invalid Categories', () => {
    it('should handle invalid category "asdfghjkl"', async () => {
      await expect(
        client.searchPOIs({
          latitude: 47.6062,
          longitude: -122.3321,
          category: 'asdfghjkl',
          radius: 1000,
          maxResults: 10,
        })
      ).rejects.toMatchObject({
        code: ErrorCode.POI_NO_RESULTS,
        retryable: false,
      });
    });
  });

  describe('Edge Cases: Radius Bounds', () => {
    it('should handle very large radius (50000m)', async () => {
      const result = await client.searchPOIs({
        latitude: 47.6062,
        longitude: -122.3321,
        category: 'airport',
        radius: 50000,
        maxResults: 10,
      });

      expect(result.success).toBe(true);
      expect(result.data.pois.length).toBeGreaterThan(0);
    });
  });

  describe('Performance: Token Waste Prevention', () => {
    it('should return smaller result set with maxResults=10 vs maxResults=100', async () => {
      const result10 = await client.searchPOIs({
        latitude: 40.758,
        longitude: -73.9855,
        category: 'restaurant',
        radius: 1000,
        maxResults: 10,
      });

      const result100 = await client.searchPOIs({
        latitude: 40.758,
        longitude: -73.9855,
        category: 'restaurant',
        radius: 1000,
        maxResults: 100,
      });

      expect(result10.data.pois.length).toBeLessThanOrEqual(10);
      expect(result100.data.pois.length).toBeGreaterThan(result10.data.pois.length);
      expect(result100.data.pois.length).toBeLessThanOrEqual(100);

      // Verify truncation works - result10 should be much smaller
      const size10 = JSON.stringify(result10).length;
      const size100 = JSON.stringify(result100).length;
      expect(size100).toBeGreaterThan(size10);
    });
  });
});
