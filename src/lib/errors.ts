import { ErrorResponse } from './types.js';

// ============================================================================
// ERROR CODES (Standardized across all tools)
// ============================================================================

export enum ErrorCode {
  // Geocoding errors
  GEOCODE_NO_RESULTS = 'GEOCODE_NO_RESULTS',
  GEOCODE_AMBIGUOUS = 'GEOCODE_AMBIGUOUS',
  INVALID_ADDRESS = 'INVALID_ADDRESS',

  // Routing errors
  ROUTE_IMPOSSIBLE = 'ROUTE_IMPOSSIBLE',
  INVALID_WAYPOINTS = 'INVALID_WAYPOINTS',

  // POI search errors
  POI_NO_RESULTS = 'POI_NO_RESULTS',
  INVALID_CATEGORY = 'INVALID_CATEGORY',

  // Coordinate validation
  INVALID_COORDINATES = 'INVALID_COORDINATES',
  COORDINATES_OUT_OF_RANGE = 'COORDINATES_OUT_OF_RANGE',

  // Static map errors
  OVERLAY_TOO_LARGE = 'OVERLAY_TOO_LARGE',

  // Network/API errors
  NETWORK_ERROR = 'NETWORK_ERROR',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',

  // General errors
  INVALID_INPUT = 'INVALID_INPUT',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}

// ============================================================================
// ERROR FACTORY
// ============================================================================

export class AzureMapsError extends Error {
  public readonly code: ErrorCode;
  public readonly retryable: boolean;
  public readonly retryAfter?: number;
  public readonly statusCode?: number;
  public readonly details?: Record<string, any>;

  constructor(
    code: ErrorCode,
    message: string,
    options: {
      retryable?: boolean;
      retryAfter?: number;
      statusCode?: number;
      cause?: Error;
      details?: Record<string, any>;
    } = {}
  ) {
    super(message);
    this.name = 'AzureMapsError';
    this.code = code;
    this.retryable = options.retryable ?? false;
    this.retryAfter = options.retryAfter;
    this.statusCode = options.statusCode;
    this.details = options.details;

    if (options.cause) {
      this.cause = options.cause;
    }
  }

  toErrorResponse(): ErrorResponse {
    return {
      success: false,
      error: {
        code: this.code,
        message: this.message,
        retryable: this.retryable,
        retryAfter: this.retryAfter,
        details: this.details,
      },
    };
  }
}

// ============================================================================
// ERROR FACTORY FUNCTIONS
// ============================================================================

export function createGeocodeNoResultsError(address: string): AzureMapsError {
  return new AzureMapsError(
    ErrorCode.GEOCODE_NO_RESULTS,
    `Address not found: "${address}"`,
    { 
      retryable: false,
      details: {
        parameter: 'address',
        value: address,
        suggestions: [
          'Verify the address spelling',
          'Try a less specific address (e.g., city name only)',
          'Check if the address includes a valid country',
        ]
      }
    }
  );
}

export function createRouteImpossibleError(
  reason: string = 'No route found between waypoints'
): AzureMapsError {
  return new AzureMapsError(ErrorCode.ROUTE_IMPOSSIBLE, reason, {
    retryable: false,
  });
}

export function createPOINoResultsError(
  category: string,
  location: string
): AzureMapsError {
  return new AzureMapsError(
    ErrorCode.POI_NO_RESULTS,
    `No POIs found for category "${category}" near ${location}`,
    { 
      retryable: false,
      details: {
        category,
        location,
        suggestions: [
          'Try a broader category (e.g., "restaurant" instead of "italian restaurant")',
          'Increase the search radius',
          'Verify the category name is valid',
        ]
      }
    }
  );
}

export function createRateLimitError(retryAfterSeconds: number = 60): AzureMapsError {
  return new AzureMapsError(
    ErrorCode.RATE_LIMIT_EXCEEDED,
    'Azure Maps API rate limit exceeded',
    {
      retryable: true,
      retryAfter: retryAfterSeconds,
      statusCode: 429,
    }
  );
}

export function createInvalidCoordinatesError(
  lat?: number,
  lon?: number
): AzureMapsError {
  const issues: string[] = [];
  const details: Record<string, any> = {};

  if (lat !== undefined) {
    if (lat < -90 || lat > 90) {
      issues.push(`latitude ${lat} exceeds valid range [-90, 90]`);
      details.latitude = { value: lat, min: -90, max: 90 };
    }
  }
  
  if (lon !== undefined) {
    if (lon < -180 || lon > 180) {
      issues.push(`longitude ${lon} exceeds valid range [-180, 180]`);
      details.longitude = { value: lon, min: -180, max: 180 };
    }
  }

  const message = issues.length > 0 
    ? `Invalid coordinates: ${issues.join(', ')}`
    : `Invalid coordinates: latitude=${lat}, longitude=${lon}`;

  return new AzureMapsError(
    ErrorCode.INVALID_COORDINATES,
    message,
    { 
      retryable: false,
      details: Object.keys(details).length > 0 ? details : undefined
    }
  );
}

export function createNetworkError(cause: Error): AzureMapsError {
  return new AzureMapsError(
    ErrorCode.NETWORK_ERROR,
    'Failed to connect to Azure Maps API',
    {
      retryable: true,
      cause,
    }
  );
}

export function createAuthenticationError(): AzureMapsError {
  return new AzureMapsError(
    ErrorCode.AUTHENTICATION_FAILED,
    'Azure Maps authentication failed. Check API key or Managed Identity configuration.',
    { retryable: false, statusCode: 401 }
  );
}

export function createServiceUnavailableError(): AzureMapsError {
  return new AzureMapsError(
    ErrorCode.SERVICE_UNAVAILABLE,
    'Azure Maps service is temporarily unavailable',
    {
      retryable: true,
      retryAfter: 30,
      statusCode: 503,
    }
  );
}

export function createInvalidInputError(message: string): AzureMapsError {
  return new AzureMapsError(ErrorCode.INVALID_INPUT, message, {
    retryable: false,
  });
}

export function createOverlayTooLargeError(
  pointCount: number,
  estimatedUrlLength: number,
  pinCount: number = 0
): AzureMapsError {
  const maxRecommended = 100;
  const urlLimit = 4096; // Typical URL length limit
  
  return new AzureMapsError(
    ErrorCode.OVERLAY_TOO_LARGE,
    `Route overlay exceeds Azure Maps URL limit (${pointCount} route points, ${pinCount} pins, ~${estimatedUrlLength} bytes). Maximum ~${maxRecommended} route points recommended.`,
    {
      retryable: false,
      details: {
        routePointCount: pointCount,
        pinCount: pinCount,
        estimatedUrlLength: estimatedUrlLength,
        urlLimit: urlLimit,
        maxRecommendedPoints: maxRecommended,
        suggestions: [
          'Simplify route geometry to fewer waypoints',
          'Break route into multiple map segments',
          'Reduce number of pins/markers',
          'Use Azure Maps dynamic map SDK for complex routes',
        ]
      }
    }
  );
}

// ============================================================================
// HTTP STATUS CODE MAPPER
// ============================================================================

export function mapHttpStatusToError(
  statusCode: number,
  responseBody?: string
): AzureMapsError {
  switch (statusCode) {
    case 400:
      return createInvalidInputError(
        responseBody || 'Invalid request parameters'
      );
    case 401:
    case 403:
      return createAuthenticationError();
    case 404:
      return new AzureMapsError(
        ErrorCode.GEOCODE_NO_RESULTS,
        'Resource not found',
        { retryable: false, statusCode }
      );
    case 429:
      return createRateLimitError();
    case 500:
    case 502:
    case 503:
    case 504:
      return createServiceUnavailableError();
    default:
      return new AzureMapsError(
        ErrorCode.INTERNAL_ERROR,
        `Unexpected HTTP status: ${statusCode}`,
        { retryable: true, statusCode }
      );
  }
}
