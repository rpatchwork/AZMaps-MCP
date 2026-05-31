import { describe, expect, it, beforeEach, vi } from 'vitest';
import { AzureMapsClient } from '../../src/lib/azure-maps-client.js';
import { ErrorCode } from '../../src/lib/errors.js';

// Mock global fetch
global.fetch = vi.fn();

describe('HTTP Client: AzureMapsClient Construction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create client with valid config', () => {
    const client = new AzureMapsClient({
      endpoint: 'https://atlas.microsoft.com',
      apiKey: 'test-key',
    });

    expect(client).toBeDefined();
  });

  it('should strip trailing slash from endpoint', () => {
    const client = new AzureMapsClient({
      endpoint: 'https://atlas.microsoft.com/',
      apiKey: 'test-key',
    });

    expect(client).toBeDefined();
  });

  it('should use default API version when not provided', () => {
    const client = new AzureMapsClient({
      endpoint: 'https://atlas.microsoft.com',
      apiKey: 'test-key',
    });

    expect(client).toBeDefined();
  });

  it('should use custom API version when provided', () => {
    const client = new AzureMapsClient({
      endpoint: 'https://atlas.microsoft.com',
      apiKey: 'test-key',
      apiVersion: '2023-01-01',
    });

    expect(client).toBeDefined();
  });
});

describe('HTTP Client: Authentication', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should add API key to query string', async () => {
    const mockResponse = {
      ok: true,
      json: async () => ({
        results: [
          {
            position: { lat: 47.6394, lon: -122.1283 },
            address: { freeformAddress: '1 Microsoft Way, Redmond, WA' },
            score: 0.9,
          },
        ],
      }),
    };

    (global.fetch as any).mockResolvedValueOnce(mockResponse);

    const client = new AzureMapsClient({
      endpoint: 'https://atlas.microsoft.com',
      apiKey: 'test-api-key',
    });

    await client.geocodeAddress({ address: '1 Microsoft Way', maxResults: 1 });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('subscription-key=test-api-key'),
      expect.any(Object)
    );
  });

  it('should add api-version parameter', async () => {
    const mockResponse = {
      ok: true,
      json: async () => ({
        results: [
          {
            position: { lat: 47.6394, lon: -122.1283 },
            address: { freeformAddress: '1 Microsoft Way, Redmond, WA' },
            score: 0.9,
          },
        ],
      }),
    };

    (global.fetch as any).mockResolvedValueOnce(mockResponse);

    const client = new AzureMapsClient({
      endpoint: 'https://atlas.microsoft.com',
      apiKey: 'test-api-key',
    });

    await client.geocodeAddress({ address: '1 Microsoft Way', maxResults: 1 });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('api-version='),
      expect.any(Object)
    );
  });

  it('should use correct base URL', async () => {
    const mockResponse = {
      ok: true,
      json: async () => ({
        results: [
          {
            position: { lat: 47.6394, lon: -122.1283 },
            address: { freeformAddress: '1 Microsoft Way, Redmond, WA' },
            score: 0.9,
          },
        ],
      }),
    };

    (global.fetch as any).mockResolvedValueOnce(mockResponse);

    const client = new AzureMapsClient({
      endpoint: 'https://atlas.microsoft.com',
      apiKey: 'test-api-key',
    });

    await client.geocodeAddress({ address: '1 Microsoft Way', maxResults: 1 });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('https://atlas.microsoft.com/'),
      expect.any(Object)
    );
  });
});

describe('HTTP Client: Retry Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should not retry on success', async () => {
    const mockResponse = {
      ok: true,
      json: async () => ({
        results: [
          {
            position: { lat: 47.6394, lon: -122.1283 },
            address: { freeformAddress: '1 Microsoft Way, Redmond, WA' },
            score: 0.9,
          },
        ],
      }),
    };

    (global.fetch as any).mockResolvedValueOnce(mockResponse);

    const client = new AzureMapsClient({
      endpoint: 'https://atlas.microsoft.com',
      apiKey: 'test-api-key',
    });

    await client.geocodeAddress({ address: '1 Microsoft Way', maxResults: 1 });

    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('should retry on 429 rate limit', async () => {
    const rateLimitResponse = {
      ok: false,
      status: 429,
      text: async () => 'Rate limit exceeded',
    };

    const successResponse = {
      ok: true,
      json: async () => ({
        results: [
          {
            position: { lat: 47.6394, lon: -122.1283 },
            address: { freeformAddress: '1 Microsoft Way, Redmond, WA' },
            score: 0.9,
          },
        ],
      }),
    };

    (global.fetch as any)
      .mockResolvedValueOnce(rateLimitResponse)
      .mockResolvedValueOnce(successResponse);

    const client = new AzureMapsClient({
      endpoint: 'https://atlas.microsoft.com',
      apiKey: 'test-api-key',
      maxRetries: 3,
      retryDelayMs: 1000,
    });

    const promise = client.geocodeAddress({
      address: '1 Microsoft Way',
      maxResults: 1,
    });

    // Fast-forward time for exponential backoff (1s)
    await vi.advanceTimersByTimeAsync(1000);

    await promise;

    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('should retry on 500 server error', async () => {
    const serverErrorResponse = {
      ok: false,
      status: 500,
      text: async () => 'Internal server error',
    };

    const successResponse = {
      ok: true,
      json: async () => ({
        results: [
          {
            position: { lat: 47.6394, lon: -122.1283 },
            address: { freeformAddress: '1 Microsoft Way, Redmond, WA' },
            score: 0.9,
          },
        ],
      }),
    };

    (global.fetch as any)
      .mockResolvedValueOnce(serverErrorResponse)
      .mockResolvedValueOnce(successResponse);

    const client = new AzureMapsClient({
      endpoint: 'https://atlas.microsoft.com',
      apiKey: 'test-api-key',
      maxRetries: 3,
      retryDelayMs: 1000,
    });

    const promise = client.geocodeAddress({
      address: '1 Microsoft Way',
      maxResults: 1,
    });

    // Fast-forward time for exponential backoff (1s)
    await vi.advanceTimersByTimeAsync(1000);

    await promise;

    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('should not retry on 400 client error', async () => {
    const clientErrorResponse = {
      ok: false,
      status: 400,
      text: async () => 'Bad request',
    };

    (global.fetch as any).mockResolvedValueOnce(clientErrorResponse);

    const client = new AzureMapsClient({
      endpoint: 'https://atlas.microsoft.com',
      apiKey: 'test-api-key',
    });

    await expect(
      client.geocodeAddress({ address: '1 Microsoft Way', maxResults: 1 })
    ).rejects.toThrow();

    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('should not retry on 404 not found', async () => {
    const notFoundResponse = {
      ok: false,
      status: 404,
      text: async () => 'Not found',
    };

    (global.fetch as any).mockResolvedValueOnce(notFoundResponse);

    const client = new AzureMapsClient({
      endpoint: 'https://atlas.microsoft.com',
      apiKey: 'test-api-key',
    });

    await expect(
      client.geocodeAddress({ address: '1 Microsoft Way', maxResults: 1 })
    ).rejects.toThrow();

    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('should respect max retry attempts', async () => {
    const serverErrorResponse = {
      ok: false,
      status: 500,
      text: async () => 'Internal server error',
    };

    (global.fetch as any).mockResolvedValue(serverErrorResponse);

    const client = new AzureMapsClient({
      endpoint: 'https://atlas.microsoft.com',
      apiKey: 'test-api-key',
      maxRetries: 3,
      retryDelayMs: 1000,
    });

    const promise = client.geocodeAddress({
      address: '1 Microsoft Way',
      maxResults: 1,
    });
    const rejection = expect(promise).rejects.toThrow();

    // Fast-forward through all retry attempts
    // Initial attempt + 3 retries = 4 total
    // Delays: 1s, 2s, 4s (exponential backoff)
    await vi.advanceTimersByTimeAsync(7000);

    await rejection;

    expect(global.fetch).toHaveBeenCalledTimes(4); // Initial + 3 retries
  });

  it('should use exponential backoff timing', async () => {
    const serverErrorResponse = {
      ok: false,
      status: 500,
      text: async () => 'Internal server error',
    };

    (global.fetch as any).mockResolvedValue(serverErrorResponse);

    const client = new AzureMapsClient({
      endpoint: 'https://atlas.microsoft.com',
      apiKey: 'test-api-key',
      maxRetries: 3,
      retryDelayMs: 1000,
    });

    const promise = client.geocodeAddress({
      address: '1 Microsoft Way',
      maxResults: 1,
    });
    const rejection = expect(promise).rejects.toThrow();

    // Verify backoff timing: 1s → 2s → 4s
    await vi.advanceTimersByTimeAsync(500);
    expect(global.fetch).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(500);
    expect(global.fetch).toHaveBeenCalledTimes(2);

    await vi.advanceTimersByTimeAsync(2000);
    expect(global.fetch).toHaveBeenCalledTimes(3);

    await vi.advanceTimersByTimeAsync(4000);
    expect(global.fetch).toHaveBeenCalledTimes(4);

    await rejection;
  });
});

describe('HTTP Client: Error Mapping', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should map 404 to GEOCODE_NO_RESULTS', async () => {
    const notFoundResponse = {
      ok: false,
      status: 404,
      text: async () => 'Not found',
    };

    (global.fetch as any).mockResolvedValueOnce(notFoundResponse);

    const client = new AzureMapsClient({
      endpoint: 'https://atlas.microsoft.com',
      apiKey: 'test-api-key',
    });

    await expect(
      client.geocodeAddress({ address: 'Invalid Address', maxResults: 1 })
    ).rejects.toMatchObject({
      code: ErrorCode.GEOCODE_NO_RESULTS,
      retryable: false,
    });
  });

  it('should map 429 to RATE_LIMIT_EXCEEDED with retryAfter', async () => {
    const rateLimitResponse = {
      ok: false,
      status: 429,
      text: async () => 'Rate limit exceeded',
    };

    (global.fetch as any).mockResolvedValue(rateLimitResponse);

    const client = new AzureMapsClient({
      endpoint: 'https://atlas.microsoft.com',
      apiKey: 'test-api-key',
      maxRetries: 0,
    });

    await expect(
      client.geocodeAddress({ address: 'Test', maxResults: 1 })
    ).rejects.toMatchObject({
      code: ErrorCode.RATE_LIMIT_EXCEEDED,
      retryable: true,
      retryAfter: expect.any(Number),
    });
  });

  it('should map network failure to NETWORK_ERROR', async () => {
    (global.fetch as any).mockRejectedValueOnce(new Error('Network failure'));

    const client = new AzureMapsClient({
      endpoint: 'https://atlas.microsoft.com',
      apiKey: 'test-api-key',
      maxRetries: 0,
    });

    await expect(
      client.geocodeAddress({ address: 'Test', maxResults: 1 })
    ).rejects.toMatchObject({
      code: ErrorCode.NETWORK_ERROR,
      retryable: true,
    });
  });
});

describe('HTTP Client: Static Map Pin Encoding', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should encode a numeric pin label without breaking lon/lat parsing', async () => {
    const mockResponse = {
      ok: true,
      headers: new Headers({ 'content-length': '8' }),
      arrayBuffer: async () => new Uint8Array([137, 80, 78, 71]).buffer,
    };

    (global.fetch as any).mockResolvedValueOnce(mockResponse);

    const client = new AzureMapsClient({
      endpoint: 'https://atlas.microsoft.com',
      apiKey: 'test-api-key',
    });

    await client.renderStaticMap({
      center: { latitude: 47.6062, longitude: -122.3321 },
      zoom: 13,
      width: 800,
      height: 600,
      pins: [
        { latitude: 47.6062, longitude: -122.3321, label: '1' },
      ],
    });

    const requestUrl = String((global.fetch as any).mock.calls[0][0]);
    const rawPins = requestUrl.match(/[?&]pins=([^&]+)/)?.[1];

    expect(rawPins).toBeDefined();
    expect(rawPins).toContain("default%7C%7C'1'-122.3321%2047.6062");
    expect(rawPins).toContain('%7C%7C');
    expect(rawPins).not.toContain('%271%27%20-122.3321');
    expect(rawPins).not.toContain('+');
  });

  it('should encode multi-word and multiple labeled pins', async () => {
    const mockResponse = {
      ok: true,
      headers: new Headers({ 'content-length': '8' }),
      arrayBuffer: async () => new Uint8Array([137, 80, 78, 71]).buffer,
    };

    (global.fetch as any).mockResolvedValueOnce(mockResponse);

    const client = new AzureMapsClient({
      endpoint: 'https://atlas.microsoft.com',
      apiKey: 'test-api-key',
    });

    await client.renderStaticMap({
      center: { latitude: 47.6062, longitude: -122.3321 },
      zoom: 13,
      pins: [
        { latitude: 47.6062, longitude: -122.3321, label: 'Stop 1' },
        { latitude: 47.6205, longitude: -122.3493, label: 'Stop 2' },
      ],
    });

    const requestUrl = String((global.fetch as any).mock.calls[0][0]);
    const rawPins = requestUrl.match(/[?&]pins=([^&]+)/)?.[1];

    expect(rawPins).toBeDefined();
    expect(rawPins).toContain("default%7C%7C'Stop%201'-122.3321%2047.6062");
    expect(rawPins).toContain("%7C'Stop%202'-122.3493%2047.6205");
    expect(rawPins).not.toContain('%27Stop%201%27%20-122.3321');
    expect(rawPins).not.toContain('+');
  });

  it('should encode mixed labeled and unlabeled pins', async () => {
    const mockResponse = {
      ok: true,
      headers: new Headers({ 'content-length': '8' }),
      arrayBuffer: async () => new Uint8Array([137, 80, 78, 71]).buffer,
    };

    (global.fetch as any).mockResolvedValueOnce(mockResponse);

    const client = new AzureMapsClient({
      endpoint: 'https://atlas.microsoft.com',
      apiKey: 'test-api-key',
    });

    await client.renderStaticMap({
      center: { latitude: 47.6062, longitude: -122.3321 },
      zoom: 13,
      pins: [
        { latitude: 47.6062, longitude: -122.3321, label: 'Start Point' },
        { latitude: 47.6134, longitude: -122.3407 },
        { latitude: 47.6205, longitude: -122.3493, label: 'End Point' },
      ],
    });

    const requestUrl = String((global.fetch as any).mock.calls[0][0]);
    const rawPins = requestUrl.match(/[?&]pins=([^&]+)/)?.[1];

    expect(rawPins).toBeDefined();
    expect(rawPins).toContain("default%7C%7C'Start%20Point'-122.3321%2047.6062");
    expect(rawPins).toContain('%7C-122.3407%2047.6134');
    expect(rawPins).toContain("%7C'End%20Point'-122.3493%2047.6205");
    expect(rawPins).not.toContain('%27Start%20Point%27%20-122.3321');
  });

  it('should preserve path overlay encoding with labeled pins', async () => {
    const mockResponse = {
      ok: true,
      headers: new Headers({ 'content-length': '8' }),
      arrayBuffer: async () => new Uint8Array([137, 80, 78, 71]).buffer,
    };

    (global.fetch as any).mockResolvedValueOnce(mockResponse);

    const client = new AzureMapsClient({
      endpoint: 'https://atlas.microsoft.com',
      apiKey: 'test-api-key',
    });

    await client.renderStaticMap({
      center: { latitude: 47.6062, longitude: -122.3321 },
      zoom: 13,
      routeGeometry: JSON.stringify({
        type: 'LineString',
        coordinates: [
          [-122.3321, 47.6062],
          [-122.3493, 47.6205],
        ],
      }),
      pins: [{ latitude: 47.6062, longitude: -122.3321, label: 'Hotel & Spa' }],
    });

    const requestUrl = String((global.fetch as any).mock.calls[0][0]);
    const rawPins = requestUrl.match(/[?&]pins=([^&]+)/)?.[1];
    const rawPath = requestUrl.match(/[?&]path=([^&]+)/)?.[1];

    expect(rawPins).toBeDefined();
    expect(rawPath).toBeDefined();
    expect(rawPins).toContain("default%7C%7C'Hotel%20%26%20Spa'-122.3321%2047.6062");
    expect(rawPins).not.toContain('%27Hotel%20%26%20Spa%27%20-122.3321');
    expect(rawPins).not.toContain('+');
    expect(rawPath).toContain('lw3%7C%7C');
    expect(rawPath).not.toContain('+');
  });

  it('should encode routeGeometry with numeric, text, punctuation, and mixed pins', async () => {
    const mockResponse = {
      ok: true,
      headers: new Headers({ 'content-length': '8' }),
      arrayBuffer: async () => new Uint8Array([137, 80, 78, 71]).buffer,
    };

    (global.fetch as any).mockResolvedValueOnce(mockResponse);

    const client = new AzureMapsClient({
      endpoint: 'https://atlas.microsoft.com',
      apiKey: 'test-api-key',
    });

    await client.renderStaticMap({
      center: { latitude: 42.739355, longitude: -105.965204 },
      zoom: 7,
      width: 640,
      height: 400,
      routeGeometry: JSON.stringify({
        type: 'LineString',
        coordinates: [
          [-103.70781, 41.82859],
          [-104.55762, 42.20348],
          [-106.32521, 42.85724],
          [-108.21079, 43.6506],
        ],
      }),
      pins: [
        { latitude: 41.8285904, longitude: -103.707807, label: '1' },
        { latitude: 42.20348, longitude: -104.55762, label: 'ScottsBluff' },
        { latitude: 42.85724, longitude: -106.32521 },
        { latitude: 43.6505995, longitude: -108.210787, label: 'Hotel & Spa #2' },
      ],
    });

    const requestUrl = String((global.fetch as any).mock.calls[0][0]);
    const rawPins = requestUrl.match(/[?&]pins=([^&]+)/)?.[1];
    const rawPath = requestUrl.match(/[?&]path=([^&]+)/)?.[1];

    expect(rawPins).toBeDefined();
    expect(rawPath).toBeDefined();
    expect(rawPins).toContain("default%7C%7C'1'-103.707807%2041.8285904");
    expect(rawPins).toContain("%7C'ScottsBluff'-104.55762%2042.20348");
    expect(rawPins).toContain('%7C-106.32521%2042.85724');
    expect(rawPins).toContain("%7C'Hotel%20%26%20Spa%20%232'-108.210787%2043.6505995");
    expect(rawPins).not.toContain('+');
    expect(rawPath).toContain('lcFF0000%7Clw3%7C%7C-103.70781%2041.82859');
    expect(rawPath).not.toContain('+');
  });
});
