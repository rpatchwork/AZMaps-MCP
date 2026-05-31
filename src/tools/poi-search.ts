import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { AzureMapsClient } from '../lib/azure-maps-client.js';
import { POISearchParamsSchema } from '../lib/types.js';
import { AzureMapsError } from '../lib/errors.js';

// ============================================================================
// TOOL DEFINITION: maps_search_nearby
// ============================================================================

export const poiSearchTool: Tool = {
  name: 'maps_search_nearby',
  description:
    'Search for Points of Interest (POIs) near a location by category. Returns POI name, category, coordinates, distance from search center, and optional address. Use for finding hotels, restaurants, gas stations, attractions, etc.',
  inputSchema: {
    type: 'object',
    properties: {
      latitude: {
        type: 'number',
        description: 'Search center latitude (-90 to 90)',
        minimum: -90,
        maximum: 90,
      },
      longitude: {
        type: 'number',
        description: 'Search center longitude (-180 to 180)',
        minimum: -180,
        maximum: 180,
      },
      category: {
        type: 'string',
        description:
          'POI category to search (e.g., "hotel", "restaurant", "gas station", "airport", "museum", "hospital"). Use general terms for broader results.',
      },
      radius: {
        type: 'number',
        description:
          'Search radius in meters (1-50000). Default: 5000 (5 km)',
        minimum: 1,
        maximum: 50000,
      },
      maxResults: {
        type: 'number',
        description:
          'Maximum number of POIs to return (1-100). Default: 10. Keep low to prevent token waste.',
        minimum: 1,
        maximum: 100,
      },
    },
    required: ['latitude', 'longitude', 'category'],
  },
};

// ============================================================================
// HANDLER: maps_search_nearby
// ============================================================================

export async function handlePOISearch(
  args: unknown,
  client: AzureMapsClient
): Promise<any> {
  try {
    const params = POISearchParamsSchema.parse(args);
    const result = await client.searchPOIs(params);
    return result;
  } catch (error) {
    if (error instanceof AzureMapsError) {
      return error.toErrorResponse();
    }
    throw error;
  }
}
