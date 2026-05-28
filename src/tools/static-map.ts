import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { AzureMapsClient } from '../lib/azure-maps-client.js';
import { StaticMapParamsSchema } from '../lib/types.js';
import { AzureMapsError } from '../lib/errors.js';

// ============================================================================
// TOOL DEFINITION: maps_render_static_map
// ============================================================================

export const staticMapTool: Tool = {
  name: 'maps_render_static_map',
  description:
    '✅ SUPPORTS LABELED PINS - Generate a static map image (PNG/JPEG) with optional route overlay and labeled POI markers. Pins can include custom text labels (e.g., "Hotel", "Airport", "Start", "End"). Returns base64-encoded image suitable for embedding in documents or displaying to users. ⚠️ URL LENGTH LIMIT: Routes with 100+ waypoints will likely FAIL due to HTTP GET URL size constraints. For large routes (100+ waypoints), use maps_generate_locked_html instead, which bypasses URL limits and generates a complete self-contained HTML file. This tool is for simple, small maps only. PIN LABEL EXAMPLE: [{latitude: 47.6062, longitude: -122.3321, label: "Start"}, {latitude: 47.6205, longitude: -122.3493, label: "Hotel"}]',
  inputSchema: {
    type: 'object',
    properties: {
      center: {
        type: 'object',
        description: 'Map center coordinates',
        properties: {
          latitude: { type: 'number', minimum: -90, maximum: 90 },
          longitude: { type: 'number', minimum: -180, maximum: 180 },
        },
        required: ['latitude', 'longitude'],
      },
      zoom: {
        type: 'number',
        description:
          'Zoom level (0-20). 0 = world view, 20 = street level. Default: 12',
        minimum: 0,
        maximum: 20,
      },
      width: {
        type: 'number',
        description: 'Image width in pixels (1-2048). Default: 800',
        minimum: 1,
        maximum: 2048,
      },
      height: {
        type: 'number',
        description: 'Image height in pixels (1-2048). Default: 600',
        minimum: 1,
        maximum: 2048,
      },
      routeGeometry: {
        type: 'string',
        description:
          'Optional route geometry to overlay (encoded polyline or GeoJSON LineString from maps_calculate_route with outputLevel="full")',
      },
      pins: {
        type: 'array',
        description:
          '✅ LABELED PINS SUPPORTED - Array of POI markers with optional text labels. Each pin can have a "label" property (up to 100 chars) to display custom text on the map. Examples: {latitude: 47.6062, longitude: -122.3321, label: "Hotel"} or {latitude: 45.5231, longitude: -122.6765, label: "Airport"} or unlabeled: {latitude: 40.7128, longitude: -74.0060}',
        items: {
          type: 'object',
          properties: {
            latitude: { type: 'number', minimum: -90, maximum: 90 },
            longitude: { type: 'number', minimum: -180, maximum: 180 },
            label: {
              type: 'string',
              description:
                'Optional text label to display on the pin (e.g., "Start", "Hotel", "Waypoint 1"). Max 100 characters.',
            },
          },
          required: ['latitude', 'longitude'],
        },
      },
      format: {
        type: 'string',
        description: 'Image format. Default: "png"',
        enum: ['png', 'jpeg'],
      },
    },
    required: ['center'],
  },
};

// ============================================================================
// HANDLER: maps_render_static_map
// ============================================================================

export async function handleRenderStaticMap(
  args: unknown,
  client: AzureMapsClient
): Promise<any> {
  try {
    const params = StaticMapParamsSchema.parse(args);
    const result = await client.renderStaticMap(params);
    return result;
  } catch (error) {
    if (error instanceof AzureMapsError) {
      return error.toErrorResponse();
    }
    throw error;
  }
}
