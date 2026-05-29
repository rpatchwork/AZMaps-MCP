import { describe, expect, it, beforeAll } from 'vitest';
import { AzureMapsClient } from '../../src/lib/azure-maps-client.js';
import { ErrorCode } from '../../src/lib/errors.js';

const API_KEY = process.env.AZURE_MAPS_API_KEY;
const SKIP_INTEGRATION = !API_KEY;

describe.skipIf(SKIP_INTEGRATION)('Integration: Reverse Geocoding', () => {
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

  describe('Happy Path: Known Locations', () => {
    it('should reverse geocode Seattle coordinates', async () => {
      const result = await client.reverseGeocode({
        latitude: 47.6062,
        longitude: -122.3321,
      });

      expect(result.success).toBe(true);
      expect(result.data.address).toContain('Seattle');
      expect(result.data.components.municipality).toBe('Seattle');
      expect(result.data.components.countrySubdivision).toBe('WA');
      expect(result.data.components.country).toContain('United States');
    });

    it('should reverse geocode Paris coordinates', async () => {
      const result = await client.reverseGeocode({
        latitude: 48.8566,
        longitude: 2.3522,
      });

      expect(result.success).toBe(true);
      expect(result.data.address).toContain('Paris');
      expect(result.data.components.country).toContain('France');
    });

    it('should reverse geocode Tokyo coordinates', async () => {
      const result = await client.reverseGeocode({
        latitude: 35.6762,
        longitude: 139.6503,
      });

      expect(result.success).toBe(true);
      expect(result.data.address).toBeTruthy();
      expect(result.data.components.country).toContain('Japan');
    });
  });

  describe('Edge Cases: Polar Coordinates', () => {
    it('should handle North Pole coordinates (90, 0)', async () => {
      const result = await client.reverseGeocode({
        latitude: 90,
        longitude: 0,
      });

      expect(result.success).toBe(true);
      expect(result.data.address).toBeTruthy();
    });

    it('should handle South Pole coordinates (-90, 0)', async () => {
      const result = await client.reverseGeocode({
        latitude: -90,
        longitude: 0,
      });

      expect(result.success).toBe(true);
      expect(result.data.address).toBeTruthy();
    });
  });

  describe('Edge Cases: Date Line', () => {
    it('should handle coordinates on date line (0, 180)', async () => {
      const result = await client.reverseGeocode({
        latitude: 0,
        longitude: 180,
      });

      expect(result.success).toBe(true);
      expect(result.data.address).toBeTruthy();
    });

    it('should handle coordinates on date line (0, -180)', async () => {
      const result = await client.reverseGeocode({
        latitude: 0,
        longitude: -180,
      });

      expect(result.success).toBe(true);
      expect(result.data.address).toBeTruthy();
    });
  });

  describe('Edge Cases: Ocean Coordinates', () => {
    it('should handle Pacific Ocean coordinates (0, -170)', async () => {
      const result = await client.reverseGeocode({
        latitude: 0,
        longitude: -170,
      });

      expect(result.success).toBe(true);
      expect(result.data.address).toBeTruthy();
      // Ocean coordinates may return generic location or "Pacific Ocean"
    });
  });

  describe('Validation: Invalid Coordinates', () => {
    it('should reject latitude > 90', async () => {
      await expect(
        client.reverseGeocode({
          latitude: 91,
          longitude: 0,
        })
      ).rejects.toMatchObject({
        code: ErrorCode.INVALID_COORDINATES,
        retryable: false,
      });
    });

    it('should reject latitude < -90', async () => {
      await expect(
        client.reverseGeocode({
          latitude: -91,
          longitude: 0,
        })
      ).rejects.toMatchObject({
        code: ErrorCode.INVALID_COORDINATES,
        retryable: false,
      });
    });

    it('should reject longitude > 180', async () => {
      await expect(
        client.reverseGeocode({
          latitude: 0,
          longitude: 181,
        })
      ).rejects.toMatchObject({
        code: ErrorCode.INVALID_COORDINATES,
        retryable: false,
      });
    });

    it('should reject longitude < -180', async () => {
      await expect(
        client.reverseGeocode({
          latitude: 0,
          longitude: -181,
        })
      ).rejects.toMatchObject({
        code: ErrorCode.INVALID_COORDINATES,
        retryable: false,
      });
    });
  });
});
