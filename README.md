# AZMaps-MCP

[![Status](https://img.shields.io/badge/status-v1.0%20operational-brightgreen)](https://github.com/rpatchwork/AZMaps-MCP)
[![Tools](https://img.shields.io/badge/tools-7%20primitives-blue)](#features)
[![Deployment](https://img.shields.io/badge/deployment-Azure%20Container%20Apps-0078D4)](#deployment)

Model Context Protocol (MCP) server exposing Azure Maps geospatial APIs to AI agents. Provides 7 production-ready primitives for geocoding, routing, POI search, timezone lookup, and map visualization.

**Production Endpoint:** `https://ca-azmaps-mcp-dev.graysand-f7f65db5.eastus.azurecontainerapps.io`

## Features

AZMaps-MCP exposes 7 geospatial tools via JSON-RPC 2.0:

1. **`maps_search_address`** — Convert address strings to geographic coordinates
2. **`maps_batch_geocode`** — Batch geocoding for multi-stop itineraries
3. **`maps_reverse_geocode`** — Convert coordinates to formatted addresses
4. **`maps_search_nearby`** — Find points of interest by category and radius
5. **`maps_calculate_route`** — Calculate driving routes with waypoints
6. **`maps_get_timezone`** — Get timezone information for coordinates
7. **`maps_render_static_map`** — Generate static map images with overlays

All tools return structured JSON responses with standardized error handling.

## Quick Start

**List Available Tools:**
```bash
curl -X POST https://ca-azmaps-mcp-dev.graysand-f7f65db5.eastus.azurecontainerapps.io/message \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list"
  }'
```

**Call a Tool (Geocode Example):**
```bash
curl -X POST https://ca-azmaps-mcp-dev.graysand-f7f65db5.eastus.azurecontainerapps.io/message \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "maps_search_address",
      "arguments": {
        "address": "1 Microsoft Way, Redmond, WA"
      }
    }
  }'
```

## Architecture

**Transport:** HTTP-only request-response (JSON-RPC 2.0)
- **Endpoint:** `POST /message` — MCP JSON-RPC over HTTP
- **Health Check:** `GET /healthz` — Container health probe
- **Port:** 3000 (configurable via `PORT` environment variable)

**Why HTTP-only?** SSE streaming transport is deferred to v1.1. All 7 V1 tools are synchronous operations with manageable response sizes (<200KB), making HTTP request-response sufficient for production use.

## Deployment

**Azure Resources:**
- **Container App:** `ca-azmaps-mcp-dev` (East US)
- **Container Registry:** `azmapsmcp.azurecr.io`
- **Azure Maps Account:** Gen2 (public endpoint)
- **Resource Group:** `rg-azmaps-mcp-dev`

**Deployment Stack:**
- Azure Container Apps (minReplicas: 1, maxReplicas: 3)
- Managed Identity (AcrPull for image registry)
- Log Analytics (30-day retention)

See [`infra/`](infra/) for Bicep templates and deployment documentation.

## Testing

**Test Coverage:**
- ✅ **87/87 unit tests** passing (100%)
- ✅ **55/73 integration tests** passing (75%)

**Known Test Gaps:**
- 18 integration test failures are documented edge cases (unicode addresses, polar coordinates, ocean routes)
- See [LIMITATIONS.md](LIMITATIONS.md) for details

## Getting Started (Local Development)

**Prerequisites:**
- Node.js 20+
- Azure Maps API key (see [Azure Portal](https://portal.azure.com))
- Docker (optional, for containerized testing)

**Setup:**
```bash
# Clone repository
git clone https://github.com/rpatchwork/AZMaps-MCP.git
cd AZMaps-MCP

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env and add your AZURE_MAPS_API_KEY

# Run in development mode
npm run dev

# Run tests
npm test
```

## Project Structure

```
AZMaps-MCP/
├── src/
│   ├── server.ts              # MCP server entry point
│   ├── lib/
│   │   ├── azure-maps-client.ts  # Azure Maps REST API client
│   │   ├── types.ts           # TypeScript type definitions
│   │   └── errors.ts          # Standardized error handling
│   └── tools/                 # 7 MCP tool implementations
├── tests/
│   ├── unit/                  # 87 unit tests
│   ├── integration/           # 73 integration tests
│   └── performance/           # Performance benchmarks
├── infra/                     # Bicep infrastructure templates
└── Dockerfile                 # Production container image

```

## Documentation

- **[LIMITATIONS.md](LIMITATIONS.md)** — Known issues and deferred features
- **[ROADMAP.md](ROADMAP.md)** — V1.1 scope and future plans
- **[infra/README.md](infra/README.md)** — Deployment guide
- **[.squad/](/.squad/)** — Team decisions and sprint planning

## Contributing

This project follows the **Core Operating Principles** documented in `.squad/`:
- Build primitives first, add complexity iteratively
- Test everything before deployment
- Check assumptions, ask for clarification
- Git history is your safety net

## License

MIT
