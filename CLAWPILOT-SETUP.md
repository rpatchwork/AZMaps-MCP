# Clawpilot Integration Guide

This guide explains how to connect your Clawpilot agent to the AZMaps-MCP service.

## Service Status

✅ **Operational**  
🌐 **Endpoint:** `https://ca-azmaps-mcp-dev.graysand-f7f65db5.eastus.azurecontainerapps.io`  
🔧 **Tools:** 7 available (geocoding, routing, POI search, timezone, static maps)  
📋 **Protocol:** MCP JSON-RPC 2.0 over HTTP (with full handshake support)  
🔐 **Authentication:** None required (server-side API key handling)

---

## MCP Protocol Handshake

The service implements the complete MCP initialization sequence:

1. **Client sends `initialize`** — Server responds with capabilities
2. **Client sends `notifications/initialized`** — Server acknowledges (204)
3. **Client calls `tools/list`** — Server returns available tools
4. **Client calls `tools/call`** — Server executes tool and returns results

Your Clawpilot agent will handle this handshake automatically.

---

## Quick Verification

Test that the service is responding:

```powershell
# Health check
curl https://ca-azmaps-mcp-dev.graysand-f7f65db5.eastus.azurecontainerapps.io/healthz

# Expected response:
# {"status":"healthy","timestamp":"2026-05-24T...","service":"azmaps-mcp-server","version":"1.0.0"}
```

---

## Configuration File

The service configuration is available in **`azmaps-mcp-config.json`**. This file contains:

- Service endpoint URL
- Available tools and their schemas
- Request/response format examples
- Quick Start examples

**To use with Clawpilot:**

1. **Option A: Direct Reference**
   - Point your Clawpilot configuration to `azmaps-mcp-config.json`
   - The file is JSON and follows MCP server configuration standards

2. **Option B: Manual Configuration**
   - Add this to your Clawpilot MCP servers configuration:

```json
{
  "mcpServers": {
    "azmaps": {
      "name": "Azure Maps MCP Server",
      "url": "https://ca-azmaps-mcp-dev.graysand-f7f65db5.eastus.azurecontainerapps.io/message",
      "transport": "http",
      "protocol": "json-rpc-2.0"
    }
  }
}
```

---

## Testing the Connection

Run the included test script to verify all tools work:

```powershell
.\test-mcp-client.ps1
```

This will test:
- ✅ Tool discovery (lists all 7 tools)
- ✅ Geocoding (Microsoft campus address)
- ✅ Routing (Space Needle → Pike Place Market)
- ✅ Timezone lookup (Seattle coordinates)

---

## Available Tools

| Tool | Purpose | Example |
|------|---------|---------|
| **maps_search_address** | Geocode address to coordinates | "1 Microsoft Way, Redmond, WA" |
| **maps_batch_geocode** | Geocode multiple addresses (up to 100) | ["Space Needle", "Pike Place"] |
| **maps_reverse_geocode** | Coordinates to address | 47.6205, -122.3493 |
| **maps_search_nearby** | Find nearby POIs | "coffee shop" near coordinates |
| **maps_calculate_route** | Multi-waypoint routing | [start, waypoint1, end] |
| **maps_get_timezone** | Timezone info for coordinates | 47.6205, -122.3493 |
| **maps_render_static_map** | Generate static map image | Center, zoom, markers, paths |

---

## Request Format

All requests use **MCP JSON-RPC 2.0** format:

```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "maps_search_address",
    "arguments": {
      "address": "1 Microsoft Way, Redmond, WA"
    }
  },
  "id": 1
}
```

## Response Format

Responses follow MCP content format:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{\"success\":true,\"data\":{...}}"
      }
    ]
  }
}
```

---

## Clawpilot Usage Examples

Once configured, your Clawpilot agent can call the service naturally:

**Example 1: Geocode an address**
```
"Find the coordinates for 1 Microsoft Way, Redmond, WA"
```

**Example 2: Calculate a route**
```
"Calculate driving directions from Space Needle to Pike Place Market"
```

**Example 3: Find nearby POIs**
```
"Find coffee shops near the Space Needle"
```

**Example 4: Get timezone**
```
"What timezone is Seattle in?"
```

---

## Documentation

- **README.md** — Project overview and architecture
- **API-REFERENCE.md** — Complete tool reference with schemas
- **LIMITATIONS.md** — Known issues and limitations
- **ROADMAP.md** — Future enhancements (V1.1, V1.2, V2.0)
- **azmaps-mcp-config.json** — Full configuration file

---

## Support & Issues

- **Service Health:** `GET /healthz`
- **Tool Discovery:** `POST /message` with method `tools/list`
- **Issues:** Report in GitHub or contact service owner

---

## What's Next?

Try these with your Clawpilot agent:

1. **Multi-stop trip planning** — Use batch geocode + routing
2. **Location-based search** — Reverse geocode + nearby POI search
3. **Map visualization** — Static map with route overlay
4. **Time zone handling** — Timezone lookup for travel planning

**Service is production-ready!** Start integrating with your agents. 🚀
