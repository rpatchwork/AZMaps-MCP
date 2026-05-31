import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { AzureMapsClient } from '../lib/azure-maps-client.js';
import { RouteParamsSchema } from '../lib/types.js';
import { AzureMapsError } from '../lib/errors.js';

// ============================================================================
// TOOL DEFINITION: maps_calculate_route
// ============================================================================

export const routeTool: Tool = {
  name: 'maps_calculate_route',
  description:
    'Calculate driving route with multiple waypoints. Returns distance, duration, and arrival time. Use outputLevel parameter to control response detail: "summary" (distance/duration only), "detailed" (+ leg breakdowns), or "full" (+ turn-by-turn instructions and geometry).',
  inputSchema: {
    type: 'object',
    properties: {
      waypoints: {
        type: 'array',
        description:
          'Array of waypoint coordinates (minimum 2 for start/end). Format: [{latitude, longitude}, ...]',
        items: {
          type: 'object',
          properties: {
            latitude: { type: 'number', minimum: -90, maximum: 90 },
            longitude: { type: 'number', minimum: -180, maximum: 180 },
          },
          required: ['latitude', 'longitude'],
        },
        minItems: 2,
      },
      vehicleType: {
        type: 'string',
        description:
          'Vehicle type for routing calculations. Default: "car"',
        enum: ['car', 'truck', 'taxi', 'bus'],
      },
      avoidOptions: {
        type: 'array',
        description:
          'Route avoidance options (e.g., ["tolls", "highways"]). Optional.',
        items: {
          type: 'string',
          enum: ['tolls', 'highways', 'ferries'],
        },
      },
      trafficEnabled: {
        type: 'boolean',
        description:
          'Include real-time traffic data in route calculation. Default: true',
      },
      outputLevel: {
        type: 'string',
        description:
          'Response detail level: "summary" (distance/duration only), "detailed" (+ leg breakdowns), "full" (+ turn-by-turn + geometry). Default: "summary"',
        enum: ['summary', 'detailed', 'full'],
      },
    },
    required: ['waypoints'],
  },
};

// ============================================================================
// HANDLER: maps_calculate_route
// ============================================================================

export async function handleCalculateRoute(
  args: unknown,
  client: AzureMapsClient
): Promise<any> {
  try {
    const params = RouteParamsSchema.parse(args);
    const result = await client.calculateRoute(params);
    return result;
  } catch (error) {
    if (error instanceof AzureMapsError) {
      return error.toErrorResponse();
    }
    throw error;
  }
}
