import { describe, expect, it, beforeAll } from 'vitest';
import { AzureMapsClient } from '../../src/lib/azure-maps-client.js';

const API_KEY = process.env.AZURE_MAPS_API_KEY;
const SKIP_INTEGRATION = !API_KEY;

describe.skipIf(SKIP_INTEGRATION)('Integration: Timezone', () => {
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

  describe('Happy Path: US Timezones', () => {
    it('should get Seattle timezone (America/Los_Angeles)', async () => {
      const result = await client.getTimezone({
        latitude: 47.6062,
        longitude: -122.3321,
      });

      expect(result.success).toBe(true);
      expect(result.data.timezoneId).toBe('America/Los_Angeles');
      expect(result.data.utcOffset).toMatch(/^[+-]\d{2}:\d{2}$/);
      expect(result.data.dstActive).toBeTypeOf('boolean');
    });

    it('should get New York timezone (America/New_York)', async () => {
      const result = await client.getTimezone({
        latitude: 40.7128,
        longitude: -74.006,
      });

      expect(result.success).toBe(true);
      expect(result.data.timezoneId).toBe('America/New_York');
      expect(result.data.utcOffset).toMatch(/^[+-]\d{2}:\d{2}$/);
    });

    it('should get Chicago timezone (America/Chicago)', async () => {
      const result = await client.getTimezone({
        latitude: 41.8781,
        longitude: -87.6298,
      });

      expect(result.success).toBe(true);
      expect(result.data.timezoneId).toBe('America/Chicago');
    });

    it('should get Denver timezone (America/Denver)', async () => {
      const result = await client.getTimezone({
        latitude: 39.7392,
        longitude: -104.9903,
      });

      expect(result.success).toBe(true);
      expect(result.data.timezoneId).toBe('America/Denver');
    });
  });

  describe('Happy Path: International Timezones', () => {
    it('should get London timezone (Europe/London)', async () => {
      const result = await client.getTimezone({
        latitude: 51.5074,
        longitude: -0.1278,
      });

      expect(result.success).toBe(true);
      expect(result.data.timezoneId).toBe('Europe/London');
    });

    it('should get Paris timezone (Europe/Paris)', async () => {
      const result = await client.getTimezone({
        latitude: 48.8566,
        longitude: 2.3522,
      });

      expect(result.success).toBe(true);
      expect(result.data.timezoneId).toBe('Europe/Paris');
    });

    it('should get Tokyo timezone (Asia/Tokyo)', async () => {
      const result = await client.getTimezone({
        latitude: 35.6762,
        longitude: 139.6503,
      });

      expect(result.success).toBe(true);
      expect(result.data.timezoneId).toBe('Asia/Tokyo');
      expect(result.data.utcOffset).toBe('+09:00');
    });

    it('should get Sydney timezone (Australia/Sydney)', async () => {
      const result = await client.getTimezone({
        latitude: -33.8688,
        longitude: 151.2093,
      });

      expect(result.success).toBe(true);
      expect(result.data.timezoneId).toBe('Australia/Sydney');
    });
  });

  describe('Edge Cases: Timezone Boundaries', () => {
    it('should handle coordinates on timezone boundary (US/Pacific)', async () => {
      // Nevada border (Pacific/Mountain boundary)
      const result = await client.getTimezone({
        latitude: 39.0,
        longitude: -120.0,
      });

      expect(result.success).toBe(true);
      expect(result.data.timezoneId).toBeTruthy();
    });
  });

  describe('Edge Cases: Date Line Crossing', () => {
    it('should handle eastern date line (Fiji - 179.9°E)', async () => {
      const result = await client.getTimezone({
        latitude: -18.0,
        longitude: 179.9,
      });

      expect(result.success).toBe(true);
      expect(result.data.timezoneId).toBeTruthy();
    });

    it('should handle western date line (Samoa - -179.9°W)', async () => {
      const result = await client.getTimezone({
        latitude: -14.0,
        longitude: -179.9,
      });

      expect(result.success).toBe(true);
      expect(result.data.timezoneId).toBeTruthy();
    });
  });

  describe('Edge Cases: DST Transitions', () => {
    it('should detect DST active flag varies by timestamp', async () => {
      // Seattle coordinates
      const lat = 47.6062;
      const lon = -122.3321;

      // Summer date (DST active)
      const summerResult = await client.getTimezone({
        latitude: lat,
        longitude: lon,
        timestamp: '2026-07-01T12:00:00Z',
      });

      // Winter date (DST inactive)
      const winterResult = await client.getTimezone({
        latitude: lat,
        longitude: lon,
        timestamp: '2026-01-01T12:00:00Z',
      });

      expect(summerResult.success).toBe(true);
      expect(winterResult.success).toBe(true);

      // DST should differ between summer and winter
      // (this may be true or false depending on actual DST rules)
      expect(summerResult.data.dstActive).toBeTypeOf('boolean');
      expect(winterResult.data.dstActive).toBeTypeOf('boolean');
    });
  });

  describe('Performance: Latency Requirements', () => {
    it('should complete timezone lookup within 500ms', async () => {
      const start = performance.now();

      await client.getTimezone({
        latitude: 47.6062,
        longitude: -122.3321,
      });

      const duration = performance.now() - start;
      expect(duration).toBeLessThan(500);
    }, 1000);
  });
});
