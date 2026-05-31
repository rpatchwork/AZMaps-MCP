import { describe, expect, it, beforeAll } from 'vitest';
import { AzureMapsClient } from '../../src/lib/azure-maps-client.js';
import { ErrorCode } from '../../src/lib/errors.js';
import addresses from '../fixtures/addresses.json';

const API_KEY = process.env.AZURE_MAPS_API_KEY;
const SKIP_INTEGRATION = !API_KEY;

describe.skipIf(SKIP_INTEGRATION)('Integration: Geocoding', () => {
  let client: AzureMapsClient;

  beforeAll(() => {
    if (!API_KEY) {
      console.warn('⚠️  Skipping integration tests: AZURE_MAPS_API_KEY not set');
      return;
    }

    client = new AzureMapsClient({
      endpoint: 'https://atlas.microsoft.com',
      apiKey: API_KEY,
    });
  });

  describe('Happy Path: US Addresses', () => {
    it.each(addresses.us_addresses)(
      'should geocode $address',
      async ({ address, expected_lat, expected_lon, tolerance }) => {
        const result = await client.geocodeAddress({ address, maxResults: 1 });

        expect(result.success).toBe(true);
        expect(result.data.coordinates.latitude).toBeCloseTo(expected_lat, tolerance);
        expect(result.data.coordinates.longitude).toBeCloseTo(
          expected_lon,
          tolerance
        );
        expect(result.data.formattedAddress).toBeTruthy();
        expect(result.data.confidence).toMatch(/^(High|Medium|Low)$/);
      }
    );
  });

  describe('Happy Path: International Addresses', () => {
    it.each(addresses.international_addresses)(
      'should geocode $address',
      async ({ address, expected_lat, expected_lon, tolerance }) => {
        const result = await client.geocodeAddress({ address, maxResults: 1 });

        expect(result.success).toBe(true);
        expect(result.data.coordinates.latitude).toBeCloseTo(expected_lat, tolerance);
        expect(result.data.coordinates.longitude).toBeCloseTo(
          expected_lon,
          tolerance
        );
      }
    );
  });

  describe('Edge Cases: Ambiguous Addresses', () => {
    it('should return multiple results for ambiguous address "Springfield"', async () => {
      const result = await client.geocodeAddress({
        address: 'Springfield',
        maxResults: 5,
      });

      expect(result.success).toBe(true);
      expect(result.data.formattedAddress).toContain('Springfield');
    });

    it('should respect country filter for "London"', async () => {
      const result = await client.geocodeAddress({
        address: 'London',
        countryFilter: 'GB',
        maxResults: 1,
      });

      expect(result.success).toBe(true);
      expect(result.data.formattedAddress).toContain('United Kingdom');
    });
  });

  describe('Edge Cases: Invalid Addresses', () => {
    it.each(addresses.invalid_addresses)(
      'should reject invalid address: $address',
      async ({ address }) => {
        await expect(
          client.geocodeAddress({ address, maxResults: 1 })
        ).rejects.toMatchObject({
          code: ErrorCode.GEOCODE_NO_RESULTS,
          retryable: false,
        });
      }
    );
  });

  describe('Edge Cases: Special Characters', () => {
    it('should handle international address with Unicode "東京タワー"', async () => {
      const result = await client.geocodeAddress({
        address: '東京タワー',
        countryFilter: 'JP',
        maxResults: 1,
      });

      expect(result.success).toBe(true);
      expect(result.data.coordinates.latitude).toBeCloseTo(35.6586, 0.01);
      expect(result.data.coordinates.longitude).toBeCloseTo(139.7454, 0.01);
    });

    it('should handle address with special characters "123 Main St. #456"', async () => {
      const result = await client.geocodeAddress({
        address: '1 Microsoft Way #100, Redmond, WA',
        maxResults: 1,
      });

      expect(result.success).toBe(true);
      expect(result.data.formattedAddress).toContain('Microsoft');
    });
  });

  describe('Batch Geocoding', () => {
    it('should geocode 1 address in batch', async () => {
      const result = await client.batchGeocode({
        addresses: ['Space Needle, Seattle, WA'],
      });

      expect(result.success).toBe(true);
      expect(result.data.totalCount).toBe(1);
      expect(result.data.successCount).toBe(1);
      expect(result.data.failureCount).toBe(0);
      expect(result.data.results).toHaveLength(1);
    });

    it('should geocode 10 addresses in batch', async () => {
      const testAddresses = [
        'Space Needle, Seattle',
        'Pike Place Market, Seattle',
        'Amazon Spheres, Seattle',
        'University of Washington, Seattle',
        'Seattle Center, Seattle',
        'Pioneer Square, Seattle',
        'Capitol Hill, Seattle',
        'Fremont Troll, Seattle',
        'Gas Works Park, Seattle',
        'Alki Beach, Seattle',
      ];

      const result = await client.batchGeocode({ addresses: testAddresses });

      expect(result.success).toBe(true);
      expect(result.data.totalCount).toBe(10);
      expect(result.data.successCount).toBeGreaterThanOrEqual(8);
      expect(result.data.results).toHaveLength(10);
    });

    it('should handle mixed valid/invalid addresses in batch', async () => {
      const result = await client.batchGeocode({
        addresses: [
          'Space Needle, Seattle, WA',
          'asdfghjkl123456',
          'Pike Place Market, Seattle',
        ],
      });

      expect(result.success).toBe(true);
      expect(result.data.totalCount).toBe(3);
      expect(result.data.successCount).toBeGreaterThanOrEqual(2);
      expect(result.data.failureCount).toBeGreaterThanOrEqual(1);
    });
  });
});
