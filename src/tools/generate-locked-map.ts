import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { AzureMapsClient } from '../lib/azure-maps-client.js';
import { AzureMapsError } from '../lib/errors.js';

// ============================================================================
// TOOL DEFINITION: maps_generate_locked_html
// ============================================================================

export const generateLockedMapTool: Tool = {
  name: 'maps_generate_locked_html',
  description:
    'Generate a self-contained, locked (non-interactive) HTML map file with route visualization and labeled markers. IDEAL FOR LARGE ROUTES - prevents API usage after initial load. Returns complete HTML with embedded Azure Maps SDK, transparent compact info panel (top-right), and customizable point labels. Perfect for trip planning, documentation, and static visualizations.',
  inputSchema: {
    type: 'object',
    properties: {
      title: {
        type: 'string',
        description: 'Map title displayed in the info panel (e.g., "PNW Family Road Trip 2026")',
      },
      routeCoordinates: {
        type: 'array',
        description: 'Array of route waypoints in order [lat, lon] format',
        items: {
          type: 'array',
          items: { type: 'number' },
          minItems: 2,
          maxItems: 2,
        },
        minItems: 2,
      },
      markers: {
        type: 'array',
        description: 'Array of labeled markers/stops along the route',
        items: {
          type: 'object',
          properties: {
            latitude: { type: 'number', minimum: -90, maximum: 90 },
            longitude: { type: 'number', minimum: -180, maximum: 180 },
            label: {
              type: 'string',
              description: 'Custom label for this point (e.g., "Omaha Start", "Portland Stop", "Hotel Name")',
            },
          },
          required: ['latitude', 'longitude', 'label'],
        },
      },
      routeColor: {
        type: 'string',
        description: 'Hex color for route line (default: #2272B9)',
        pattern: '^#[0-9A-Fa-f]{6}$',
      },
      routeWidth: {
        type: 'number',
        description: 'Route line width in pixels (default: 5)',
        minimum: 1,
        maximum: 20,
      },
      markerColor: {
        type: 'string',
        description: 'Hex color for markers (default: #FF5733)',
        pattern: '^#[0-9A-Fa-f]{6}$',
      },
      infoPanelStats: {
        type: 'array',
        description: 'Array of stat lines to display in info panel (e.g., ["296 waypoints", "23 stops", "Route description"])',
        items: { type: 'string' },
      },
      apiKey: {
        type: 'string',
        description: 'Azure Maps subscription key (if not provided, uses server default)',
      },
    },
    required: ['title', 'routeCoordinates', 'markers'],
  },
};

// ============================================================================
// HANDLER: maps_generate_locked_html
// ============================================================================

// Zod schema for input validation
const GenerateLockedMapParamsSchema = z.object({
  title: z.string().min(1, 'Title cannot be empty'),
  routeCoordinates: z
    .array(
      z.tuple([z.number().min(-90).max(90), z.number().min(-180).max(180)])
    )
    .min(2, 'Route must have at least 2 coordinates')
    .max(1000, 'Route cannot exceed 1000 coordinates'),
  markers: z
    .array(
      z.object({
        latitude: z.number().min(-90).max(90),
        longitude: z.number().min(-180).max(180),
        label: z.string().min(1, 'Marker label cannot be empty'),
      })
    )
    .min(1, 'At least one marker is required')
    .max(500, 'Cannot exceed 500 markers'),
  routeColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color').optional(),
  routeWidth: z.number().min(1).max(20).optional(),
  markerColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color').optional(),
  infoPanelStats: z.array(z.string()).max(10, 'Cannot exceed 10 stat lines').optional(),
  apiKey: z.string().optional(),
});

type GenerateLockedMapArgs = z.infer<typeof GenerateLockedMapParamsSchema>;

// HTML escape utility to prevent XSS
function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export async function handleGenerateLockedMap(
  args: unknown,
  _client: AzureMapsClient
): Promise<string> {
  try {
    // Validate input with Zod schema
    const params = GenerateLockedMapParamsSchema.parse(args);

    // Defaults
    const routeColor = params.routeColor || '#2272B9';
    const routeWidth = params.routeWidth || 5;
    const markerColor = params.markerColor || '#FF5733';
    const apiKey = params.apiKey || process.env.AZURE_MAPS_API_KEY || '';
    const stats = params.infoPanelStats || [
      `${params.routeCoordinates.length} waypoints`,
      `${params.markers.length} stops`,
    ];

    // Convert route coordinates to {lat, lon} format
    const routeData = params.routeCoordinates
      .map(([lat, lon]) => `            {lat: ${lat}, lon: ${lon}}`)
      .join(',\n');

    // Convert markers to pin format with XSS protection
    const pinsData = params.markers
      .map(
        (m) =>
          `            {lat: ${m.latitude}, lon: ${m.longitude}, title: "${escapeHtml(m.label).replace(/"/g, '&quot;')}"}`
      )
      .join(',\n');

    // Build stats HTML with XSS protection
    const statsHtml = stats
      .map((stat) => `            <strong>${escapeHtml(stat)}</strong><br>`)
      .join('\n');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${params.title}</title>
    
    <!-- Azure Maps Web SDK -->
    <link rel="stylesheet" href="https://atlas.microsoft.com/sdk/javascript/mapcontrol/2/atlas.min.css" />
    <script src="https://atlas.microsoft.com/sdk/javascript/mapcontrol/2/atlas.min.js"></script>
    
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            overflow: hidden;
        }
        
        #map {
            width: 100vw;
            height: 100vh;
            cursor: default;
        }
        
        /* Compact Top-Right with Transparent Glass Effect */
        .info-panel {
            position: absolute;
            top: 20px;
            right: 20px;
            background: rgba(255, 255, 255, 0.85);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            padding: 10px 15px;
            border-radius: 6px;
            border: 1px solid rgba(255, 255, 255, 0.4);
            box-shadow: 0 4px 16px rgba(0,0,0,0.12);
            max-width: 200px;
            font-size: 12px;
            z-index: 1000;
        }
        
        .info-panel h2 {
            font-size: 14px;
            font-weight: 600;
            margin-bottom: 6px;
            color: #2272B9;
        }
        
        .info-panel .stats {
            font-size: 11px;
            color: #666;
            line-height: 1.5;
        }
        
        .info-panel .stats strong {
            color: #333;
            font-size: 12px;
        }
        
        .locked-badge {
            position: absolute;
            bottom: 20px;
            left: 20px;
            background: rgba(0, 0, 0, 0.7);
            color: white;
            padding: 8px 12px;
            border-radius: 6px;
            font-size: 12px;
            z-index: 1000;
        }
    </style>
</head>
<body>
    <div id="map"></div>
    
    <div class="info-panel">
        <h2>📍 ${escapeHtml(params.title)}</h2>
        <div class="stats">
${statsHtml}
        </div>
    </div>
    
    <div class="locked-badge">
        🔒 View locked (minimal API usage)
    </div>
    
    <script>
        // Route data (${params.routeCoordinates.length} waypoints)
        const routeData = [
${routeData}
        ];
        
        // Pin markers (${params.markers.length} labeled stops)
        const pins = [
${pinsData}
        ];
        
        // Azure Maps API key
        const apiKey = '${apiKey}';
        
        // Initialize Azure Maps with DISABLED interactions (locked mode)
        const map = new atlas.Map('map', {
            authOptions: {
                authType: 'subscriptionKey',
                subscriptionKey: apiKey
            },
            center: [-112.5, 44.5],
            zoom: 5,
            style: 'road',
            interactive: false,      // LOCKED: No pan/zoom/rotate
            showFeedbackLink: false,
            showLogo: false
        });
        
        // When map is ready, add route and markers
        map.events.add('ready', function() {
            const dataSource = new atlas.source.DataSource();
            map.sources.add(dataSource);
            
            // Create route line
            const routeLine = new atlas.data.LineString(
                routeData.map(point => [point.lon, point.lat])
            );
            dataSource.add(routeLine);
            
            // Add route layer
            map.layers.add(new atlas.layer.LineLayer(dataSource, null, {
                strokeColor: '${routeColor}',
                strokeWidth: ${routeWidth},
                strokeOpacity: 0.8
            }));
            
            // Add pin markers
            pins.forEach(function(pin) {
                const marker = new atlas.HtmlMarker({
                    position: [pin.lon, pin.lat],
                    color: '${markerColor}',
                    text: '📍'
                });
                map.markers.add(marker);
            });
            
            // Auto-fit to route bounds with padding
            map.setCamera({
                bounds: atlas.data.BoundingBox.fromData(routeLine),
                padding: 50
            });
            
            console.log('✅ Locked map loaded - initial tiles only, no further API calls');
        });
    </script>
</body>
</html>`;

    return html;
  } catch (error) {
    if (error instanceof AzureMapsError) {
      // Return error as string for HTML generation errors
      return JSON.stringify(error.toErrorResponse(), null, 2);
    }
    throw error;
  }
}
