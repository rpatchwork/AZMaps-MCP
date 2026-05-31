import { describe, expect, it, beforeAll } from 'vitest';
import { AzureMapsClient } from '../../src/lib/azure-maps-client.js';

const API_KEY = process.env.AZURE_MAPS_API_KEY;
const SKIP_INTEGRATION = !API_KEY;

interface BenchmarkResult {
  operation: string;
  p50: number;
  p95: number;
  p99: number;
  target_p95: number;
  status: '✅' | '⚠️' | '❌';
}

function calculatePercentile(values: number[], percentile: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[index];
}

describe.skipIf(SKIP_INTEGRATION)('Performance: Benchmarks', () => {
  let client: AzureMapsClient;
  const results: BenchmarkResult[] = [];

  beforeAll(() => {
    if (!API_KEY) {
      console.warn(
        '⚠️  Skipping performance benchmarks: AZURE_MAPS_API_KEY not set'
      );
      return;
    }

    client = new AzureMapsClient({
      endpoint: 'https://atlas.microsoft.com',
      apiKey: API_KEY,
    });
  });

  afterAll(() => {
    if (results.length > 0) {
      console.log('\n' + '='.repeat(80));
      console.log('PERFORMANCE BENCHMARK REPORT');
      console.log('='.repeat(80));
      console.log(
        `${'Operation'.padEnd(30)} ${'p50'.padStart(8)} ${'p95'.padStart(8)} ${'p99'.padStart(8)} ${'Target'.padStart(8)} ${'Status'.padStart(8)}`
      );
      console.log('-'.repeat(80));

      results.forEach((r) => {
        console.log(
          `${r.operation.padEnd(30)} ${r.p50.toFixed(0).padStart(6)}ms ${r.p95.toFixed(0).padStart(6)}ms ${r.p99.toFixed(0).padStart(6)}ms ${r.target_p95.toFixed(0).padStart(6)}ms ${r.status.padStart(8)}`
        );
      });

      console.log('='.repeat(80) + '\n');
    }
  });

  describe('Latency: Single Geocode', () => {
    it('should measure geocode latency (target: <500ms p95)', async () => {
      const iterations = 20;
      const latencies: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        await client.geocodeAddress({
          address: '1 Microsoft Way, Redmond, WA',
          maxResults: 1,
        });
        const duration = performance.now() - start;
        latencies.push(duration);
      }

      const p50 = calculatePercentile(latencies, 50);
      const p95 = calculatePercentile(latencies, 95);
      const p99 = calculatePercentile(latencies, 99);

      const status = p95 < 500 ? '✅' : p95 < 600 ? '⚠️' : '❌';

      results.push({
        operation: 'Geocode (single)',
        p50,
        p95,
        p99,
        target_p95: 500,
        status,
      });

      expect(p95).toBeLessThan(600); // Allow 20% tolerance for v1
    }, 30000);
  });

  describe('Latency: Batch Geocode', () => {
    it('should measure batch geocode latency (10 addresses)', async () => {
      const iterations = 10;
      const latencies: number[] = [];

      const addresses = [
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

      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        await client.batchGeocode({ addresses });
        const duration = performance.now() - start;
        latencies.push(duration);
      }

      const p50 = calculatePercentile(latencies, 50);
      const p95 = calculatePercentile(latencies, 95);
      const p99 = calculatePercentile(latencies, 99);

      const status = p95 < 1000 ? '✅' : p95 < 1200 ? '⚠️' : '❌';

      results.push({
        operation: 'Batch Geocode (10)',
        p50,
        p95,
        p99,
        target_p95: 1000,
        status,
      });

      expect(p95).toBeLessThan(1200);
    }, 20000);
  });

  describe('Latency: Route Calculation', () => {
    it('should measure route calculation latency (target: <2000ms p95)', async () => {
      const iterations = 15;
      const latencies: number[] = [];

      const waypoints = [
        { latitude: 47.6062, longitude: -122.3321 },
        { latitude: 47.6205, longitude: -122.3493 },
        { latitude: 47.6101, longitude: -122.3421 },
        { latitude: 47.6175, longitude: -122.3501 },
        { latitude: 47.6134, longitude: -122.3407 },
      ];

      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        await client.calculateRoute({
          waypoints,
          outputLevel: 'summary',
        });
        const duration = performance.now() - start;
        latencies.push(duration);
      }

      const p50 = calculatePercentile(latencies, 50);
      const p95 = calculatePercentile(latencies, 95);
      const p99 = calculatePercentile(latencies, 99);

      const status = p95 < 2000 ? '✅' : p95 < 2500 ? '⚠️' : '❌';

      results.push({
        operation: 'Route (5 waypoints)',
        p50,
        p95,
        p99,
        target_p95: 2000,
        status,
      });

      expect(p95).toBeLessThan(2500);
    }, 30000);
  });

  describe('Latency: Static Map Generation', () => {
    it('should measure static map generation latency (target: <3000ms p95)', async () => {
      const iterations = 10;
      const latencies: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        await client.renderStaticMap({
          center: { latitude: 47.6062, longitude: -122.3321 },
          zoom: 12,
          width: 800,
          height: 600,
        });
        const duration = performance.now() - start;
        latencies.push(duration);
      }

      const p50 = calculatePercentile(latencies, 50);
      const p95 = calculatePercentile(latencies, 95);
      const p99 = calculatePercentile(latencies, 99);

      const status = p95 < 3000 ? '✅' : p95 < 3500 ? '⚠️' : '❌';

      results.push({
        operation: 'Static Map',
        p50,
        p95,
        p99,
        target_p95: 3000,
        status,
      });

      expect(p95).toBeLessThan(3500);
    }, 20000);
  });

  describe('Throughput: Concurrent Requests', () => {
    it('should measure concurrent geocode throughput', async () => {
      const concurrency = 10;
      const addresses = [
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

      const start = performance.now();

      await Promise.all(
        addresses.map((address) =>
          client.geocodeAddress({ address, maxResults: 1 })
        )
      );

      const duration = performance.now() - start;
      const throughput = (concurrency / duration) * 1000; // requests per second

      console.log(
        `\n  Concurrent (${concurrency}x): throughput: ${throughput.toFixed(2)} req/sec`
      );

      expect(throughput).toBeGreaterThan(1); // At least 1 req/sec
    }, 15000);
  });
});
