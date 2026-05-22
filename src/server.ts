#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { config } from 'dotenv';
import express from 'express';
import { AzureMapsClient } from './lib/azure-maps-client.js';
import {
  geocodeAddressTool,
  batchGeocodeTool,
  handleGeocodeAddress,
  handleBatchGeocode,
} from './tools/geocode.js';
import {
  reverseGeocodeTool,
  handleReverseGeocode,
} from './tools/reverse-geocode.js';
import { poiSearchTool, handlePOISearch } from './tools/poi-search.js';
import { routeTool, handleCalculateRoute } from './tools/route.js';
import { timezoneTool, handleGetTimezone } from './tools/timezone.js';
import {
  staticMapTool,
  handleRenderStaticMap,
} from './tools/static-map.js';

// ============================================================================
// CONFIGURATION
// ============================================================================

config(); // Load .env file

const AZURE_MAPS_ENDPOINT =
  process.env.AZURE_MAPS_ENDPOINT || 'https://atlas.microsoft.com/';
const AZURE_MAPS_API_KEY = process.env.AZURE_MAPS_API_KEY;
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';

// Validation
if (!AZURE_MAPS_API_KEY) {
  console.error(
    'ERROR: AZURE_MAPS_API_KEY is not set. Please configure environment variables.'
  );
  process.exit(1);
}

// ============================================================================
// AZURE MAPS CLIENT INITIALIZATION
// ============================================================================

const azureMapsClient = new AzureMapsClient({
  endpoint: AZURE_MAPS_ENDPOINT,
  apiKey: AZURE_MAPS_API_KEY,
  maxRetries: 3,
  retryDelayMs: 1000,
});

console.log('[SERVER] Azure Maps client initialized');
console.log(`[SERVER] Endpoint: ${AZURE_MAPS_ENDPOINT}`);

// ============================================================================
// MCP SERVER SETUP
// ============================================================================

const server = new Server(
  {
    name: 'azmaps-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// ============================================================================
// TOOL REGISTRATION
// ============================================================================

const TOOLS = [
  geocodeAddressTool,
  batchGeocodeTool,
  reverseGeocodeTool,
  poiSearchTool,
  routeTool,
  timezoneTool,
  staticMapTool,
];

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: TOOLS,
  };
});

// ============================================================================
// TOOL INVOCATION HANDLER
// ============================================================================

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'maps_search_address':
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                await handleGeocodeAddress(args, azureMapsClient),
                null,
                2
              ),
            },
          ],
        };

      case 'maps_batch_geocode':
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                await handleBatchGeocode(args, azureMapsClient),
                null,
                2
              ),
            },
          ],
        };

      case 'maps_reverse_geocode':
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                await handleReverseGeocode(args, azureMapsClient),
                null,
                2
              ),
            },
          ],
        };

      case 'maps_search_nearby':
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                await handlePOISearch(args, azureMapsClient),
                null,
                2
              ),
            },
          ],
        };

      case 'maps_calculate_route':
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                await handleCalculateRoute(args, azureMapsClient),
                null,
                2
              ),
            },
          ],
        };

      case 'maps_get_timezone':
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                await handleGetTimezone(args, azureMapsClient),
                null,
                2
              ),
            },
          ],
        };

      case 'maps_render_static_map':
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                await handleRenderStaticMap(args, azureMapsClient),
                null,
                2
              ),
            },
          ],
        };

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    console.error(`[ERROR] Tool invocation failed: ${name}`, error);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: false,
              error: {
                code: 'INTERNAL_ERROR',
                message:
                  error instanceof Error ? error.message : 'Unknown error',
                retryable: false,
              },
            },
            null,
            2
          ),
        },
      ],
      isError: true,
    };
  }
});

// ============================================================================
// HTTP SERVER SETUP
// ============================================================================

const app = express();
app.use(express.json());

// Health check endpoint for Container Apps probes
app.get('/healthz', (_req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'azmaps-mcp-server',
    version: '1.0.0',
  });
});

// MCP endpoint (JSON-RPC over HTTP with SSE)
app.post('/message', async (req, res) => {
  console.log('[SERVER] Received MCP request');
  const transport = new SSEServerTransport('/message', res);
  await server.connect(transport);
});

// ============================================================================
// SERVER STARTUP
// ============================================================================

async function main() {
  console.log('[SERVER] Starting AZMaps MCP Server...');
  console.log(`[SERVER] Log level: ${LOG_LEVEL}`);
  console.log(`[SERVER] Registered tools: ${TOOLS.length}`);
  TOOLS.forEach((tool) => {
    console.log(`  - ${tool.name}`);
  });

  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`[SERVER] MCP Server running on HTTP transport (port ${PORT})`);
    console.log('[SERVER] Endpoints:');
    console.log(`  - POST /message (MCP JSON-RPC with SSE)`);
    console.log(`  - GET /healthz (health check)`);
    console.log('[SERVER] Ready to receive tool invocations');
  });
}

// ============================================================================
// GRACEFUL SHUTDOWN
// ============================================================================

process.on('SIGINT', async () => {
  console.log('\n[SERVER] SIGINT received, shutting down gracefully...');
  await server.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n[SERVER] SIGTERM received, shutting down gracefully...');
  await server.close();
  process.exit(0);
});

// ============================================================================
// START SERVER
// ============================================================================

main().catch((error) => {
  console.error('[FATAL] Server startup failed:', error);
  process.exit(1);
});
