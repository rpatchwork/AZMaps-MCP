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
    '🏷️ LABELED PINS FULLY SUPPORTED 🏷️ - Generate a static map image (PNG/JPEG) with route overlays and LABELED POI markers. **EACH PIN CAN HAVE A TEXT LABEL** to identify locations (e.g., "Start", "Hotel", "Airport Terminal A", "Restaurant", "Waypoint 1"). Returns base64-encoded image suitable for embedding. **LABEL EXAMPLES:** Single labeled pin: [{latitude: 47.6062, longitude: -122.3321, label: "Start"}] | Multiple labeled pins: [{latitude: 47.6062, longitude: -122.3321, label: "Departure"}, {latitude: 47.6205, longitude: -122.3493, label: "Hotel Check-in"}, {latitude: 47.6097, longitude: -122.3331, label: "Dinner Reservation"}] | Mixed labeled and unlabeled: [{latitude: 47.6062, longitude: -122.3321, label: "Airport"}, {latitude: 47.6205, longitude: -122.3493}] (second pin has no label). **The "label" property is OPTIONAL but RECOMMENDED for clarity.** ⚠️ URL LENGTH LIMIT: Routes with 100+ waypoints will likely FAIL due to HTTP GET URL size constraints. For large routes (100+ waypoints), use maps_generate_locked_html instead, which bypasses URL limits and generates a complete self-contained HTML file.',
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
          '🏷️ LABELED PINS FULLY SUPPORTED 🏷️ - Array of POI markers. **EACH PIN CAN INCLUDE A "label" PROPERTY** to display custom text directly on the map marker. Labels are optional but highly recommended for identifying locations. Label examples: "Start", "End", "Hotel Checkin", "Airport Terminal B", "Waypoint 1", "Meeting Point", "Restaurant Reservation". **Format:** {latitude: number, longitude: number, label?: string}. **Example with labels:** [{latitude: 47.6062, longitude: -122.3321, label: "Departure Point"}, {latitude: 47.6205, longitude: -122.3493, label: "Destination"}]. **Example without labels:** [{latitude: 47.6062, longitude: -122.3321}, {latitude: 47.6205, longitude: -122.3493}]. You can mix labeled and unlabeled pins in the same array. Max label length: 100 characters.',
        items: {
          type: 'object',
          properties: {
            latitude: { type: 'number', minimum: -90, maximum: 90 },
            longitude: { type: 'number', minimum: -180, maximum: 180 },
            label: {
              type: 'string',
              description:
                '🏷️ PIN LABEL TEXT (FULLY SUPPORTED) - Custom text to display directly on this map pin. Use descriptive labels to identify locations: "Start", "End", "Hotel", "Airport Terminal A", "Waypoint 1", "Meeting Point", "Restaurant", etc. Labels make maps more informative and user-friendly. **This is an OPTIONAL property** - pins without labels will display as plain markers. Max 100 characters. Examples: "Departure", "Destination", "Lunch Stop", "Hotel Check-in", "Meeting Location".',
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
