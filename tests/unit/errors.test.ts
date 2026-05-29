import { describe, expect, it } from 'vitest';
import {
  AzureMapsError,
  ErrorCode,
  createGeocodeNoResultsError,
  createRouteImpossibleError,
} from '../../src/lib/errors.js';

describe('Error Factory: AzureMapsError', () => {
  it('should create error with required fields', () => {
    const error = new AzureMapsError(
      ErrorCode.GEOCODE_NO_RESULTS,
      'Address not found'
    );

    expect(error.code).toBe(ErrorCode.GEOCODE_NO_RESULTS);
    expect(error.message).toBe('Address not found');
    expect(error.retryable).toBe(false);
    expect(error.retryAfter).toBeUndefined();
  });

  it('should create retryable error', () => {
    const error = new AzureMapsError(ErrorCode.NETWORK_ERROR, 'Connection failed', {
      retryable: true,
    });

    expect(error.retryable).toBe(true);
  });

  it('should create error with retryAfter', () => {
    const error = new AzureMapsError(
      ErrorCode.RATE_LIMIT_EXCEEDED,
      'Rate limit exceeded',
      {
        retryable: true,
        retryAfter: 60,
      }
    );

    expect(error.retryable).toBe(true);
    expect(error.retryAfter).toBe(60);
  });

  it('should convert to ErrorResponse format', () => {
    const error = new AzureMapsError(
      ErrorCode.GEOCODE_NO_RESULTS,
      'Address not found'
    );

    const response = error.toErrorResponse();

    expect(response).toEqual({
      success: false,
      error: {
        code: ErrorCode.GEOCODE_NO_RESULTS,
        message: 'Address not found',
        retryable: false,
        retryAfter: undefined,
      },
    });
  });

  it('should include retryAfter in ErrorResponse when set', () => {
    const error = new AzureMapsError(
      ErrorCode.RATE_LIMIT_EXCEEDED,
      'Rate limit exceeded',
      {
        retryable: true,
        retryAfter: 60,
      }
    );

    const response = error.toErrorResponse();

    expect(response.error.retryAfter).toBe(60);
  });
});

describe('Error Factory: createGeocodeNoResultsError', () => {
  it('should create GEOCODE_NO_RESULTS error', () => {
    const error = createGeocodeNoResultsError('Invalid Address 123');

    expect(error.code).toBe(ErrorCode.GEOCODE_NO_RESULTS);
    expect(error.message).toContain('Invalid Address 123');
    expect(error.retryable).toBe(false);
  });

  it('should format message with address', () => {
    const error = createGeocodeNoResultsError('1 Microsoft Way');

    expect(error.message).toBe('Address not found: "1 Microsoft Way"');
  });
});

describe('Error Factory: createRouteImpossibleError', () => {
  it('should create ROUTE_IMPOSSIBLE error with default message', () => {
    const error = createRouteImpossibleError();

    expect(error.code).toBe(ErrorCode.ROUTE_IMPOSSIBLE);
    expect(error.message).toBe('No route found between waypoints');
    expect(error.retryable).toBe(false);
  });

  it('should create ROUTE_IMPOSSIBLE error with custom reason', () => {
    const error = createRouteImpossibleError('Cannot cross ocean');

    expect(error.code).toBe(ErrorCode.ROUTE_IMPOSSIBLE);
    expect(error.message).toBe('Cannot cross ocean');
    expect(error.retryable).toBe(false);
  });
});

describe('Error Factory: Error Code Standardization', () => {
  it('should have non-retryable geocoding errors', () => {
    const geocodeError = createGeocodeNoResultsError('test');
    expect(geocodeError.retryable).toBe(false);
  });

  it('should have non-retryable routing errors', () => {
    const routeError = createRouteImpossibleError();
    expect(routeError.retryable).toBe(false);
  });

  it('should have retryable rate limit errors', () => {
    const rateLimitError = new AzureMapsError(
      ErrorCode.RATE_LIMIT_EXCEEDED,
      'Rate limit exceeded',
      { retryable: true, retryAfter: 60 }
    );
    expect(rateLimitError.retryable).toBe(true);
    expect(rateLimitError.retryAfter).toBe(60);
  });

  it('should have retryable network errors', () => {
    const networkError = new AzureMapsError(
      ErrorCode.NETWORK_ERROR,
      'Connection failed',
      { retryable: true }
    );
    expect(networkError.retryable).toBe(true);
  });
});
