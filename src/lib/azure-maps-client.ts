import {
  GeocodeParams,
  GeocodeResult,
  BatchGeocodeParams,
  BatchGeocodeResult,
  BatchGeocodeItem,
  ReverseGeocodeParams,
  ReverseGeocodeResult,
  POISearchParams,
  POISearchResult,
  RouteParams,
  RouteResult,
  TimezoneParams,
  TimezoneResult,
  StaticMapParams,
  StaticMapResult,
  AzureMapsGeocodeResponse,
  AzureMapsBatchGeocodeResponse,
  AzureMapsReverseGeocodeResponse,
  AzureMapsPOISearchResponse,
  AzureMapsRouteResponse,
  AzureMapsTimezoneResponse,
} from './types.js';
import {
  AzureMapsError,
  createNetworkError,
  mapHttpStatusToError,
  createGeocodeNoResultsError,
  createPOINoResultsError,
  createRouteImpossibleError,
  createOverlayTooLargeError,
} from './errors.js';

// ============================================================================
// CONFIGURATION
// ============================================================================

export interface AzureMapsClientConfig {
  endpoint: string;
  apiKey?: string; // For dev/testing
  apiVersion?: string;
  maxRetries?: number;
  retryDelayMs?: number;
}

const DEFAULT_API_VERSION = '1.0';
const ROUTE_API_VERSION = '1.0'; // CORRECTED: Live API validation confirmed v1.0 (not 2025-01-01)
const SEARCH_API_VERSION = '2026-01-01';
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_RETRY_DELAY_MS = 1000;

// ============================================================================
// AZURE MAPS HTTP CLIENT
// ============================================================================

export class AzureMapsClient {
  private readonly endpoint: string;
  private readonly apiKey?: string;
  private readonly apiVersion: string;
  private readonly maxRetries: number;
  private readonly retryDelayMs: number;

  constructor(config: AzureMapsClientConfig) {
    this.endpoint = config.endpoint.replace(/\/$/, ''); // Remove trailing slash
    this.apiKey = config.apiKey;
    this.apiVersion = config.apiVersion || DEFAULT_API_VERSION;
    this.maxRetries = config.maxRetries ?? DEFAULT_MAX_RETRIES;
    this.retryDelayMs = config.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS;
  }

  // ==========================================================================
  // GEOCODING
  // ==========================================================================

  async geocodeAddress(params: GeocodeParams): Promise<GeocodeResult> {
    const url = this.buildUrl('/search/address/json', {
      query: params.address,
      countrySet: params.countryFilter,
      limit: params.maxResults.toString(),
    });

    const response = await this.fetchWithRetry(url);
    const data = await response.json() as AzureMapsGeocodeResponse;

    // Parse Azure Maps response
    if (!data.results || data.results.length === 0) {
      throw createGeocodeNoResultsError(params.address);
    }

    const result = data.results[0];
    return {
      success: true,
      data: {
        coordinates: {
          latitude: result.position.lat,
          longitude: result.position.lon,
        },
        formattedAddress: result.address.freeformAddress,
        confidence: this.mapConfidenceScore(result.score),
      },
    };
  }

  // ==========================================================================
  // BATCH GEOCODING
  // ==========================================================================

  async batchGeocode(params: BatchGeocodeParams): Promise<BatchGeocodeResult> {
    const url = this.buildUrlWithVersion('/geocode:batch', SEARCH_API_VERSION);

    // Build batch request body using NEW Geocoding Batch API format
    const batchItems = params.addresses.map((address) => ({
      addressLine: address,
      top: 1,
    }));

    const response = await this.fetchWithRetry(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ batchItems }),
    });

    const data = await response.json() as AzureMapsBatchGeocodeResponse;

    // Parse batch results (NEW format: indexed by array position)
    const results: BatchGeocodeItem[] = params.addresses.map((address, index) => {
      const batchResult = data.batchItems?.[index];

      if (!batchResult || !batchResult.features || batchResult.features.length === 0) {
        return {
          address,
          coordinates: null,
          formattedAddress: null,
          confidence: null,
          error: batchResult?.error?.message || 'No results found',
        };
      }

      const firstResult = batchResult.features[0];
      const coords = firstResult.geometry?.coordinates;
      const props = firstResult.properties;

      if (!coords || coords.length < 2) {
        return {
          address,
          coordinates: null,
          formattedAddress: null,
          confidence: null,
          error: 'Invalid coordinates',
        };
      }

      return {
        address,
        coordinates: {
          latitude: coords[1],  // GeoJSON format: [longitude, latitude]
          longitude: coords[0],
        },
        formattedAddress: props?.address?.formattedAddress || address,
        confidence: this.mapConfidenceScore(props?.confidence || 0),
      };
    });

    const successCount = results.filter((r) => r.coordinates !== null).length;

    return {
      success: true,
      data: {
        results,
        totalCount: results.length,
        successCount,
        failureCount: results.length - successCount,
      },
    };
  }

  // ==========================================================================
  // REVERSE GEOCODING
  // ==========================================================================

  async reverseGeocode(
    params: ReverseGeocodeParams
  ): Promise<ReverseGeocodeResult> {
    const url = this.buildUrl('/search/address/reverse/json', {
      query: `${params.latitude},${params.longitude}`,
    });

    const response = await this.fetchWithRetry(url);
    const data = await response.json() as AzureMapsReverseGeocodeResponse;

    if (!data.addresses || data.addresses.length === 0) {
      throw new AzureMapsError(
        'GEOCODE_NO_RESULTS' as any,
        'No address found for coordinates',
        { retryable: false }
      );
    }

    const result = data.addresses[0];
    const addr = result.address;

    return {
      success: true,
      data: {
        address: addr.freeformAddress,
        components: {
          streetNumber: addr.streetNumber,
          streetName: addr.streetName,
          municipality: addr.municipality,
          countrySubdivision: addr.countrySubdivision,
          postalCode: addr.postalCode,
          country: addr.country,
          countryCode: addr.countryCode,
        },
      },
    };
  }

  // ==========================================================================
  // POI SEARCH
  // ==========================================================================

  async searchPOIs(params: POISearchParams): Promise<POISearchResult> {
    const url = this.buildUrl('/search/poi/json', {
      query: params.category,
      lat: params.latitude.toString(),
      lon: params.longitude.toString(),
      radius: params.radius.toString(),
      limit: params.maxResults.toString(),
    });

    const response = await this.fetchWithRetry(url);
    const data = await response.json() as AzureMapsPOISearchResponse;

    if (!data.results || data.results.length === 0) {
      throw createPOINoResultsError(
        params.category,
        `${params.latitude},${params.longitude}`
      );
    }

    const pois = data.results.map((poi: any) => ({
      name: poi.poi?.name || 'Unknown',
      category: poi.poi?.categories?.[0] || params.category,
      coordinates: {
        latitude: poi.position.lat,
        longitude: poi.position.lon,
      },
      distance: poi.dist || 0,
      address: poi.address?.freeformAddress,
    }));

    return {
      success: true,
      data: {
        pois,
        totalCount: pois.length,
      },
    };
  }

  // ==========================================================================
  // ROUTING
  // ==========================================================================

  async calculateRoute(params: RouteParams): Promise<RouteResult> {
    // WIRE-LEVEL EQUIVALENCE: Replicate Niobe's validated GET request format
    // Niobe validated: GET /route/directions/json?api-version=1.0&query=47.620,-122.349:45.523,-122.676
    // Format: query=lat,lon:lat,lon:lat,lon (colon-separated waypoints)
    
    const query = params.waypoints
      .map(w => `${w.latitude},${w.longitude}`)
      .join(':');

    const urlParams: Record<string, string> = {
      query,
      travelMode: params.vehicleType || 'car',
      traffic: params.trafficEnabled ? 'true' : 'false',
    };

    // Add avoid options if specified
    if (params.avoidOptions && params.avoidOptions.length > 0) {
      urlParams.avoid = params.avoidOptions.join(',');
    }

    // Add route output options for full detail
    if (params.outputLevel === 'full') {
      urlParams.routeOutputOptions = 'turnByTurnInstructions';
    }

    const url = this.buildUrlWithVersion('/route/directions/json', ROUTE_API_VERSION, urlParams);

    // Wire-level verification logging (temporary - for validation)
    if (process.env.LOG_HTTP_REQUESTS === 'true') {
      console.log('[Azure Maps] Route API Request:', {
        method: 'GET',
        url: url.replace(/subscription-key=[^&]+/, 'subscription-key=***'),
        note: 'GET with query parameters (matches Niobe validation)'
      });
    }

    // Use GET request (matches Niobe's validated curl command)
    const response = await this.fetchWithRetry(url);

    const data = await response.json() as AzureMapsRouteResponse;

    if (!data.routes || data.routes.length === 0) {
      throw createRouteImpossibleError();
    }

    const route = data.routes[0];
    const summary = route.summary;

    // Base response (summary level)
    const result: RouteResult = {
      success: true,
      data: {
        distanceMeters: summary.lengthInMeters,
        durationSeconds: summary.travelTimeInSeconds,
        arrivalTime: summary.arrivalTime,
      },
    };

    // Add legs for detailed/full output levels
    if (params.outputLevel === 'detailed' || params.outputLevel === 'full') {
      result.data.legs = route.legs.map((leg: any) => ({
        distance: leg.summary.lengthInMeters,
        duration: leg.summary.travelTimeInSeconds,
        startPoint: {
          latitude: leg.points[0].latitude,
          longitude: leg.points[0].longitude,
        },
        endPoint: {
          latitude: leg.points[leg.points.length - 1].latitude,
          longitude: leg.points[leg.points.length - 1].longitude,
        },
      }));
    }

    // Add turn-by-turn instructions for full output level
    if (params.outputLevel === 'full') {
      result.data.turnByTurnInstructions = route.guidance?.instructions?.map(
        (instr: any) => ({
          instruction: instr.message,
          distance: instr.routeOffsetInMeters || 0,
          travelTime: instr.travelTimeInSeconds || 0,
          point: {
            latitude: instr.point?.latitude || 0,
            longitude: instr.point?.longitude || 0,
          },
        })
      ) || [];

      // Add geometry (encoded polyline)
      result.data.geometry = this.encodePolyline(route.legs);
    }

    return result;
  }

  // ==========================================================================
  // TIMEZONE
  // ==========================================================================

  async getTimezone(params: TimezoneParams): Promise<TimezoneResult> {
    const url = this.buildUrl('/timezone/byCoordinates/json', {
      query: `${params.latitude},${params.longitude}`,
      timeStamp: params.timestamp,
    });

    const response = await this.fetchWithRetry(url);
    const data = await response.json() as AzureMapsTimezoneResponse;

    const tz = data.TimeZones?.[0];
    if (!tz) {
      throw new AzureMapsError(
        'INTERNAL_ERROR' as any,
        'Timezone data not found',
        { retryable: false }
      );
    }

    return {
      success: true,
      data: {
        timezoneId: tz.Id,
        utcOffset: this.formatUtcOffset(tz.ReferenceTime.StandardOffset),
        dstActive: tz.ReferenceTime.DaylightSavings !== '00:00:00',
        dstSavings: tz.ReferenceTime.DaylightSavings,
      },
    };
  }

  // ==========================================================================
  // STATIC MAP RENDERING
  // ==========================================================================

  async renderStaticMap(params: StaticMapParams): Promise<StaticMapResult> {
    // ==========================================================================
    // PRE-FLIGHT VALIDATION: Check URL size before making API call
    // ==========================================================================
    
    // Calculate route point count and URL size
    let routePointCount = 0;
    let routeUrlLength = 0;
    
    if (params.routeGeometry) {
      try {
        // Parse GeoJSON to count points
        const geometry = typeof params.routeGeometry === 'string'
          ? JSON.parse(params.routeGeometry)
          : params.routeGeometry;
        
        if (geometry.type === 'LineString' && Array.isArray(geometry.coordinates)) {
          routePointCount = geometry.coordinates.length;
          
          // Estimate URL length for route: ~22 chars per point (lon,lat format)
          // Format: "lon lat|lon lat|..." with %20 encoding
          routeUrlLength = routePointCount * 22;
        }
      } catch (err) {
        // If parsing fails, estimate from string length
        routeUrlLength = params.routeGeometry.length;
      }
    }
    
    // Calculate pins URL length: ~40 chars per pin
    const pinCount = params.pins?.length || 0;
    const pinsUrlLength = pinCount * 40;
    
    // Calculate total URL length
    const baseUrlLength = 200; // Endpoint + standard params
    const estimatedTotalLength = baseUrlLength + routeUrlLength + pinsUrlLength;
    
    // Safe limit: 3000 chars (margin under 4KB URL limit)
    const URL_SIZE_LIMIT = 3000;
    
    if (estimatedTotalLength > URL_SIZE_LIMIT) {
      throw createOverlayTooLargeError(routePointCount, estimatedTotalLength, pinCount);
    }
    
    // ==========================================================================
    // GENERATE STATIC MAP (if validation passed)
    // ==========================================================================
    
    // WIRE-LEVEL EQUIVALENCE: Replicate Niobe's CORRECTED validated pin format
    // Niobe validated (visual confirmation): pins=default|coFF0000|la1|-122.3321,47.6062
    // Format: style|modifier1|modifier2|lon,lat|style|lon,lat (single pipes, comma-separated coords)
    // Label format: la{label} (e.g., la1, laA, laSTART) - NO quotes, NO spaces
    // CRITICAL: Azure Maps pin format: pinStyle||modifiers|coordinates
    // - DOUBLE pipe (||) after pin style
    // - Single pipe (|) between modifiers and coordinates
    // - Multiple pins joined by double pipe (||)
    // - Labels MUST be URL-encoded BEFORE joining (spaces, special chars)
    
    // Build pins parameter
    // Azure Maps pin format:
    // - Single pin: default||'label'longitude latitude  OR  default||longitude latitude
    // - Multiple pins: default||location1|location2|location3 (style appears ONCE, locations separated by single pipe)
    let pinsParam: string | undefined;
    if (params.pins && params.pins.length > 0) {
      const style = 'default';
      const locations = params.pins.map((p) => {
        if (p.label) {
          return `'${p.label}'${p.longitude} ${p.latitude}`;
        } else {
          return `${p.longitude} ${p.latitude}`;
        }
      });
      // Format: style||location1|location2|location3
      pinsParam = `${style}||${locations.join('|')}`;
    }

    // Build URL with all parameters EXCEPT pins and path (URLSearchParams can't handle space encoding correctly)
    const baseParams: Record<string, string | undefined> = {
      center: `${params.center.longitude},${params.center.latitude}`,
      zoom: (params.zoom ?? 12).toString(),
      width: (params.width ?? 800).toString(),  // Default width: 800
      height: (params.height ?? 600).toString(), // Default height: 600
      format: params.format,
      // path: DO NOT include here - URLSearchParams will encode space as + (wrong)
      // pins: DO NOT include here - URLSearchParams will encode space as + (wrong)
    };

    // Step 1: Convert GeoJSON LineString to Azure Maps path format
    // Format: style||lon lat||lon lat (same double pipe pattern as pins)
    let pathParam: string | undefined;
    if (params.routeGeometry) {
      try {
        // Parse GeoJSON (may be string or object)
        const geometry = typeof params.routeGeometry === 'string'
          ? JSON.parse(params.routeGeometry)
          : params.routeGeometry;
        
        if (geometry.type === 'LineString' && Array.isArray(geometry.coordinates)) {
          const coordinates = geometry.coordinates;
          
          // Convert coordinates array to Azure Maps format
          const coords = coordinates
            .map(([lon, lat]: [number, number]) => `${lon} ${lat}`)  // Space-separated lon/lat
            .join('|');  // Single pipe between coordinate pairs
          
          // Azure Maps path style syntax: lcCOLOR|lwWIDTH||coordinates
          // lc = line color (hex without # prefix), NO colon after lc
          // lw = line width in pixels, NO colon after lw
          // Single pipe | between style properties AND between coordinate pairs
          // Double pipe || ONLY between style and first coordinate
          // NOTE: Azure Maps uses NO colons after style modifiers (unlike Google Maps)
          const lineColor = 'FF0000';  // Red
          const lineWidth = 3;  // 3 pixels
          pathParam = `lc${lineColor}|lw${lineWidth}||${coords}`;
        }
      } catch (err) {
        // If parsing fails, routeGeometry might already be in Azure Maps format
        pathParam = params.routeGeometry;
      }
    }

    // Step 2: Encode pins parameter (entire value needs URL encoding)
    const encodedPins = pinsParam ? encodeURIComponent(pinsParam) : undefined;
    // Step 3: Path uses manual space replacement per existing pattern
    const encodedPath = pathParam?.replace(/ /g, '%20');

    // Build base URL without pins and path, then append them manually
    let url = this.buildUrl('/map/static/png', baseParams);
    if (encodedPath) {
      url += `&path=${encodedPath}`;
    }
    if (encodedPins) {
      url += `&pins=${encodedPins}`;
    }

    const response = await this.fetchWithRetry(url);
    console.log('[Azure Maps] Response content-length:', response.headers.get('content-length'));
    
    const buffer = await response.arrayBuffer();
    console.log('[Azure Maps] Actual buffer size:', buffer.byteLength);
    
    if (buffer.byteLength === 0) {
      console.error('[Azure Maps] ERROR: Azure Maps API returned empty image buffer');
      console.error('[Azure Maps] Request URL (truncated):', url.substring(0, 500) + '...');
      throw new Error('Azure Maps API returned empty image buffer');
    }
    
    const base64 = Buffer.from(buffer).toString('base64');

    return {
      success: true,
      data: {
        imageBase64: base64,
        contentType: `image/${params.format}`,
        sizeBytes: buffer.byteLength,
      },
    };
  }

  // ==========================================================================
  // PRIVATE HELPERS
  // ==========================================================================

  private buildUrl(path: string, params: Record<string, string | undefined> = {}): string {
    return this.buildUrlWithVersion(path, this.apiVersion, params);
  }

  private buildUrlWithVersion(
    path: string,
    apiVersion: string,
    params: Record<string, string | undefined> = {}
  ): string {
    const url = new URL(path, this.endpoint);
    url.searchParams.set('api-version', apiVersion);

    if (this.apiKey) {
      url.searchParams.set('subscription-key', this.apiKey);
    }

    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) {
        url.searchParams.set(key, value);
      }
    }

    return url.toString();
  }

  private async fetchWithRetry(
    url: string,
    options: RequestInit = {}
  ): Promise<Response> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await fetch(url, options);

        // Success case
        if (response.ok) {
          return response;
        }

        // Non-retryable error
        if (response.status < 500 && response.status !== 429) {
          const body = await response.text();
          throw mapHttpStatusToError(response.status, body);
        }

        // Retryable error (5xx or 429)
        if (attempt < this.maxRetries) {
          const delay = this.retryDelayMs * Math.pow(2, attempt); // Exponential backoff
          await this.sleep(delay);
          continue;
        }

        // Max retries exceeded
        throw mapHttpStatusToError(response.status);
      } catch (error) {
        if (error instanceof AzureMapsError) {
          throw error;
        }

        lastError = error as Error;

        if (attempt < this.maxRetries) {
          const delay = this.retryDelayMs * Math.pow(2, attempt);
          await this.sleep(delay);
          continue;
        }
      }
    }

    throw createNetworkError(lastError!);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private mapConfidenceScore(score: number): 'High' | 'Medium' | 'Low' {
    if (score >= 0.8) return 'High';
    if (score >= 0.5) return 'Medium';
    return 'Low';
  }

  private formatUtcOffset(offset: string): string {
    // Convert "HH:MM:SS" to "+/-HH:MM"
    const parts = offset.split(':');
    return `${parts[0]}:${parts[1]}`;
  }

  private encodePolyline(legs: any[]): string {
    // Simplified: concatenate leg points into GeoJSON LineString
    const coordinates: number[][] = [];
    for (const leg of legs) {
      for (const point of leg.points || []) {
        coordinates.push([point.longitude, point.latitude]);
      }
    }
    return JSON.stringify({
      type: 'LineString',
      coordinates,
    });
  }

}
