import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { AzureMapsClient } from '../lib/azure-maps-client.js';
import {
  GeocodeParamsSchema,
  BatchGeocodeParamsSchema,
} from '../lib/types.js';
import { AzureMapsError } from '../lib/errors.js';

// ============================================================================
// TOOL DEFINITION: maps_search_address
// ============================================================================

export const geocodeAddressTool: Tool = {
  name: 'maps_search_address',
  description:
    'Convert an address string to geographic coordinates (geocoding). Returns latitude, longitude, formatted address, and confidence score.',
  inputSchema: {
    type: 'object',
    properties: {
      address: {
        type: 'string',
        description:
          'Address to geocode (e.g., "1 Microsoft Way, Redmond, WA" or "Space Needle, Seattle")',
      },
      countryFilter: {
        type: 'string',
        description:
          'ISO 3166-1 alpha-2 country code to filter results (e.g., "US", "CA", "GB"). Optional.',
      },
      maxResults: {
        type: 'number',
        description:
          'Maximum number of results to return (1-20). Default: 1',
        minimum: 1,
        maximum: 20,
      },
    },
    required: ['address'],
  },
};

// ============================================================================
// HANDLER: maps_search_address
// ============================================================================

export async function handleGeocodeAddress(
  args: unknown,
  client: AzureMapsClient
): Promise<any> {
  try {
    const params = GeocodeParamsSchema.parse(args);
    const result = await client.geocodeAddress(params);
    return result;
  } catch (error) {
    if (error instanceof AzureMapsError) {
      return error.toErrorResponse();
    }
    throw error;
  }
}

// ============================================================================
// TOOL DEFINITION: maps_batch_geocode
// ============================================================================

export const batchGeocodeTool: Tool = {
  name: 'maps_batch_geocode',
  description:
    'Batch geocode multiple addresses in a single request (up to 100 addresses). Returns an array of results with coordinates, formatted addresses, and confidence scores. More efficient than N sequential geocode calls for multi-stop itineraries.',
  inputSchema: {
    type: 'object',
    properties: {
      addresses: {
        type: 'array',
        description:
          'Array of address strings to geocode (1-100 addresses)',
        items: {
          type: 'string',
        },
        minItems: 1,
        maxItems: 100,
      },
    },
    required: ['addresses'],
  },
};

// ============================================================================
// HANDLER: maps_batch_geocode
// ============================================================================

export async function handleBatchGeocode(
  args: unknown,
  client: AzureMapsClient
): Promise<any> {
  try {
    const params = BatchGeocodeParamsSchema.parse(args);
    const result = await client.batchGeocode(params);
    return result;
  } catch (error) {
    if (error instanceof AzureMapsError) {
      return error.toErrorResponse();
    }
    throw error;
  }
}
