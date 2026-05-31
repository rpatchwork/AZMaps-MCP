import { z } from 'zod';

// ============================================================================
// COMMON TYPES
// ============================================================================

export const CoordinatesSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

export type Coordinates = z.infer<typeof CoordinatesSchema>;

// ============================================================================
// ERROR ENVELOPE (Standardized across all tools)
// ============================================================================

export const ErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
    retryable: z.boolean(),
    retryAfter: z.number().optional(), // Seconds to wait before retry
    details: z.record(z.any()).optional(), // Enhanced context (parameter names, values, suggestions)
  }),
});

export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;

// ============================================================================
// GEOCODING (maps_search_address)
// ============================================================================

export const GeocodeParamsSchema = z.object({
  address: z.string().min(1, 'Address cannot be empty'),
  countryFilter: z.string().optional(),
  maxResults: z.number().min(1).max(20).default(1),
});

export type GeocodeParams = z.infer<typeof GeocodeParamsSchema>;

export const GeocodeResultSchema = z.object({
  success: z.literal(true),
  data: z.object({
    coordinates: CoordinatesSchema,
    formattedAddress: z.string(),
    confidence: z.enum(['High', 'Medium', 'Low']),
  }),
});

export type GeocodeResult = z.infer<typeof GeocodeResultSchema>;

// ============================================================================
// BATCH GEOCODING (maps_batch_geocode)
// ============================================================================

export const BatchGeocodeParamsSchema = z.object({
  addresses: z.array(z.string().min(1)).min(1).max(100),
});

export type BatchGeocodeParams = z.infer<typeof BatchGeocodeParamsSchema>;

export const BatchGeocodeItemSchema = z.object({
  address: z.string(),
  coordinates: CoordinatesSchema.nullable(),
  formattedAddress: z.string().nullable(),
  confidence: z.enum(['High', 'Medium', 'Low']).nullable(),
  error: z.string().optional(),
});

export type BatchGeocodeItem = z.infer<typeof BatchGeocodeItemSchema>;

export const BatchGeocodeResultSchema = z.object({
  success: z.literal(true),
  data: z.object({
    results: z.array(BatchGeocodeItemSchema),
    totalCount: z.number(),
    successCount: z.number(),
    failureCount: z.number(),
  }),
});

export type BatchGeocodeResult = z.infer<typeof BatchGeocodeResultSchema>;

// ============================================================================
// REVERSE GEOCODING (maps_reverse_geocode)
// ============================================================================

export const ReverseGeocodeParamsSchema = CoordinatesSchema;

export type ReverseGeocodeParams = z.infer<typeof ReverseGeocodeParamsSchema>;

export const AddressComponentsSchema = z.object({
  streetNumber: z.string().optional(),
  streetName: z.string().optional(),
  municipality: z.string().optional(),
  countrySubdivision: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
  countryCode: z.string().optional(),
});

export type AddressComponents = z.infer<typeof AddressComponentsSchema>;

export const ReverseGeocodeResultSchema = z.object({
  success: z.literal(true),
  data: z.object({
    address: z.string(),
    components: AddressComponentsSchema,
  }),
});

export type ReverseGeocodeResult = z.infer<typeof ReverseGeocodeResultSchema>;

// ============================================================================
// POI SEARCH (maps_search_nearby)
// ============================================================================

export const POISearchParamsSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  category: z.string().min(1, 'Category cannot be empty'),
  radius: z.number().min(1).max(50000).default(5000), // meters
  maxResults: z.number().min(1).max(100).default(10),
});

export type POISearchParams = z.infer<typeof POISearchParamsSchema>;

export const POISchema = z.object({
  name: z.string(),
  category: z.string(),
  coordinates: CoordinatesSchema,
  distance: z.number(), // meters from search center
  address: z.string().optional(),
});

export type POI = z.infer<typeof POISchema>;

export const POISearchResultSchema = z.object({
  success: z.literal(true),
  data: z.object({
    pois: z.array(POISchema),
    totalCount: z.number(),
  }),
});

export type POISearchResult = z.infer<typeof POISearchResultSchema>;

// ============================================================================
// ROUTING (maps_calculate_route)
// ============================================================================

export const OutputLevelSchema = z.enum(['summary', 'detailed', 'full']);

export type OutputLevel = z.infer<typeof OutputLevelSchema>;

export const RouteParamsSchema = z.object({
  waypoints: z.array(CoordinatesSchema).min(2, 'At least 2 waypoints required'),
  vehicleType: z.enum(['car', 'truck', 'taxi', 'bus']).default('car'),
  avoidOptions: z.array(z.enum(['tolls', 'highways', 'ferries'])).optional(),
  trafficEnabled: z.boolean().default(true),
  outputLevel: OutputLevelSchema.default('summary'),
});

export type RouteParams = z.infer<typeof RouteParamsSchema>;

export const RouteLegSchema = z.object({
  distance: z.number(), // meters
  duration: z.number(), // seconds
  startPoint: CoordinatesSchema,
  endPoint: CoordinatesSchema,
});

export type RouteLeg = z.infer<typeof RouteLegSchema>;

export const TurnInstructionSchema = z.object({
  instruction: z.string(),
  distance: z.number(),
  travelTime: z.number(),
  point: CoordinatesSchema,
});

export type TurnInstruction = z.infer<typeof TurnInstructionSchema>;

export const RouteResultSchema = z.object({
  success: z.literal(true),
  data: z.object({
    distanceMeters: z.number(),
    durationSeconds: z.number(),
    arrivalTime: z.string().optional(), // ISO 8601
    legs: z.array(RouteLegSchema).optional(), // detailed/full only
    turnByTurnInstructions: z.array(TurnInstructionSchema).optional(), // full only
    geometry: z.string().optional(), // full only (encoded polyline or GeoJSON)
  }),
});

export type RouteResult = z.infer<typeof RouteResultSchema>;

// ============================================================================
// TIMEZONE (maps_get_timezone)
// ============================================================================

export const TimezoneParamsSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  timestamp: z.string().optional(), // ISO 8601 or Unix timestamp
});

export type TimezoneParams = z.infer<typeof TimezoneParamsSchema>;

export const TimezoneResultSchema = z.object({
  success: z.literal(true),
  data: z.object({
    timezoneId: z.string(), // e.g., "America/Los_Angeles"
    utcOffset: z.string(), // e.g., "-08:00"
    dstActive: z.boolean(),
    dstSavings: z.string().optional(), // e.g., "+01:00"
  }),
});

export type TimezoneResult = z.infer<typeof TimezoneResultSchema>;

// ============================================================================
// STATIC MAP (maps_render_static_map)
// ============================================================================

export const PinSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  label: z.string().max(100).optional(), // Optional label text (up to 100 chars)
});

export type Pin = z.infer<typeof PinSchema>;

export const StaticMapParamsSchema = z.object({
  center: CoordinatesSchema,
  zoom: z.number().min(0).max(20).default(12),
  width: z.number().min(1).max(2048).default(800),
  height: z.number().min(1).max(2048).default(600),
  routeGeometry: z.string().optional(), // Encoded polyline or GeoJSON LineString
  pins: z.array(PinSchema).optional(), // POI markers with optional labels
  format: z.enum(['png', 'jpeg']).default('png'),
});

export type StaticMapParams = z.infer<typeof StaticMapParamsSchema>;

export const StaticMapResultSchema = z.object({
  success: z.literal(true),
  data: z.object({
    imageBase64: z.string(), // Base64-encoded image
    contentType: z.string(), // "image/png" or "image/jpeg"
    sizeBytes: z.number(),
  }),
});

export type StaticMapResult = z.infer<typeof StaticMapResultSchema>;

// ============================================================================
// AZURE MAPS API RAW RESPONSE TYPES (Internal use only)
// ============================================================================
// These types represent the raw JSON responses from Azure Maps REST API
// before transformation into our standardized result types above.

export interface AzureMapsGeocodeResponse {
  results: Array<{
    position: { lat: number; lon: number };
    address: {
      freeformAddress: string;
      countryRegion?: string;
      streetName?: string;
      municipality?: string;
      postalCode?: string;
    };
    score: number;
  }>;
}

export interface AzureMapsBatchGeocodeResponse {
  batchItems: Array<{
    features?: Array<{
      type: 'Feature';
      geometry: {
        type: 'Point';
        coordinates: [number, number]; // [longitude, latitude] GeoJSON format
      };
      properties: {
        address?: {
          formattedAddress?: string;
        };
        confidence?: number;
      };
    }>;
    error?: {
      message: string;
    };
  }>;
}

export interface AzureMapsReverseGeocodeResponse {
  addresses: Array<{
    address: {
      freeformAddress: string;
      streetNumber?: string;
      streetName?: string;
      municipality?: string;
      countrySubdivision?: string;
      postalCode?: string;
      country?: string;
      countryCode?: string;
    };
  }>;
}

export interface AzureMapsPOISearchResponse {
  results: Array<{
    poi?: {
      name: string;
      categories?: string[];
    };
    position: { lat: number; lon: number };
    dist?: number;
    address?: {
      freeformAddress: string;
    };
  }>;
}

export interface AzureMapsRouteResponse {
  routes: Array<{
    summary: {
      lengthInMeters: number;
      travelTimeInSeconds: number;
      arrivalTime?: string;
    };
    legs: Array<{
      summary: {
        lengthInMeters: number;
        travelTimeInSeconds: number;
      };
      points: Array<{
        latitude: number;
        longitude: number;
      }>;
    }>;
    guidance?: {
      instructions?: Array<{
        message: string;
        routeOffsetInMeters?: number;
        travelTimeInSeconds?: number;
        point?: {
          latitude: number;
          longitude: number;
        };
      }>;
    };
  }>;
}

export interface AzureMapsTimezoneResponse {
  TimeZones: Array<{
    Id: string;
    ReferenceTime: {
      StandardOffset: string;
      DaylightSavings: string;
    };
  }>;
}
