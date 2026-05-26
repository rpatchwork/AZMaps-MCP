import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { AzureMapsClient } from '../lib/azure-maps-client.js';
import { ReverseGeocodeParamsSchema } from '../lib/types.js';
import { AzureMapsError } from '../lib/errors.js';

// ============================================================================
// TOOL DEFINITION: maps_reverse_geocode
// ============================================================================

export const reverseGeocodeTool: Tool = {
  name: 'maps_reverse_geocode',
  description:
    'Convert geographic coordinates to a human-readable address (reverse geocoding). Returns full address and address components (street, city, postal code, country).',
  inputSchema: {
    type: 'object',
    properties: {
      latitude: {
        type: 'number',
        description: 'Latitude coordinate (-90 to 90)',
        minimum: -90,
        maximum: 90,
      },
      longitude: {
        type: 'number',
        description: 'Longitude coordinate (-180 to 180)',
        minimum: -180,
        maximum: 180,
      },
    },
    required: ['latitude', 'longitude'],
  },
};

// ============================================================================
// HANDLER: maps_reverse_geocode
// ============================================================================

export async function handleReverseGeocode(
  args: unknown,
  client: AzureMapsClient
): Promise<any> {
  try {
    const params = ReverseGeocodeParamsSchema.parse(args);
    const result = await client.reverseGeocode(params);
    return result;
  } catch (error) {
    if (error instanceof AzureMapsError) {
      return error.toErrorResponse();
    }
    throw error;
  }
}
