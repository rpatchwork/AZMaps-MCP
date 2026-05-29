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

    // Fast-forward through all retry attempts
    // Initial attempt + 3 retries = 4 total
    // Delays: 1s, 2s, 4s (exponential backoff)
    await vi.advanceTimersByTimeAsync(7000);

    await expect(promise).rejects.toThrow();

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

    // Verify backoff timing: 1s → 2s → 4s
    await vi.advanceTimersByTimeAsync(500);
    expect(global.fetch).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(500);
    expect(global.fetch).toHaveBeenCalledTimes(2);

    await vi.advanceTimersByTimeAsync(2000);
    expect(global.fetch).toHaveBeenCalledTimes(3);

    await vi.advanceTimersByTimeAsync(4000);
    expect(global.fetch).toHaveBeenCalledTimes(4);

    await expect(promise).rejects.toThrow();
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
