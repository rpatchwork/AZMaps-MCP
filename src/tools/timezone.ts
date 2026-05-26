import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { AzureMapsClient } from '../lib/azure-maps-client.js';
import { TimezoneParamsSchema } from '../lib/types.js';
import { AzureMapsError } from '../lib/errors.js';

// ============================================================================
// TOOL DEFINITION: maps_get_timezone
// ============================================================================

export const timezoneTool: Tool = {
  name: 'maps_get_timezone',
  description:
    'Get timezone information for geographic coordinates. Returns timezone ID (e.g., "America/Los_Angeles"), UTC offset, and DST status. Essential for cross-timezone trip planning (e.g., Seattle→Denver, LA→Phoenix).',
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
      timestamp: {
        type: 'string',
        description:
          'Optional timestamp (ISO 8601 or Unix timestamp) for historical timezone lookup. If omitted, uses current time.',
      },
    },
    required: ['latitude', 'longitude'],
  },
};

// ============================================================================
// HANDLER: maps_get_timezone
// ============================================================================

export async function handleGetTimezone(
  args: unknown,
  client: AzureMapsClient
): Promise<any> {
  try {
    const params = TimezoneParamsSchema.parse(args);
    const result = await client.getTimezone(params);
    return result;
  } catch (error) {
    if (error instanceof AzureMapsError) {
      return error.toErrorResponse();
    }
    throw error;
  }
}
