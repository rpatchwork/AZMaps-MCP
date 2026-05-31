# Azure Maps MCP Server — API Reference

**Version:** 1.0.0  
**Protocol:** JSON-RPC 2.0 over HTTP  
**Base URL:** `https://ca-azmaps-mcp-dev.graysand-f7f65db5.eastus.azurecontainerapps.io`  
**Last Updated:** 2026-05-24

---

## Overview

This document provides a complete reference for all 7 MCP tools in the Azure Maps MCP Server. Each tool follows the Model Context Protocol (MCP) specification and wraps Azure Maps Gen2 REST APIs.

### Tool Discovery

To discover all available tools, send a `tools/list` request:

```json
{
  "jsonrpc": "2.0",
  "method": "tools/list",
  "params": {},
  "id": 1
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "tools": [
      {"name": "maps_search_address", "description": "...", "inputSchema": {...}},
      {"name": "maps_batch_geocode", "description": "...", "inputSchema": {...}},
      {"name": "maps_reverse_geocode", "description": "...", "inputSchema": {...}},
      {"name": "maps_search_nearby", "description": "...", "inputSchema": {...}},
      {"name": "maps_calculate_route", "description": "...", "inputSchema": {...}},
      {"name": "maps_get_timezone", "description": "...", "inputSchema": {...}},
      {"name": "maps_render_static_map", "description": "...", "inputSchema": {...}}
    ]
  }
}
```

---

## 1. maps_search_address

**Purpose:** Convert an address string to geographic coordinates (forward geocoding). Returns latitude, longitude, formatted address, and confidence score.

**Azure Maps API:** Search API v2026-01-01 (`GET /search/address/json`)

### MCP Schema

```json
{
  "name": "maps_search_address",
  "description": "Convert an address string to geographic coordinates (geocoding). Returns latitude, longitude, formatted address, and confidence score.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "address": {
        "type": "string",
        "description": "Address to geocode (e.g., \"1 Microsoft Way, Redmond, WA\" or \"Space Needle, Seattle\")"
      },
      "countryFilter": {
        "type": "string",
        "description": "ISO 3166-1 alpha-2 country code to filter results (e.g., \"US\", \"CA\", \"GB\"). Optional."
      },
      "maxResults": {
        "type": "number",
        "description": "Maximum number of results to return (1-20). Default: 1",
        "minimum": 1,
        "maximum": 20
      }
    },
    "required": ["address"]
  }
}
```

### Request Example

```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "maps_search_address",
    "arguments": {
      "address": "1 Microsoft Way, Redmond, WA",
      "maxResults": 1
    }
  },
  "id": 1
}
```

### Response Example (Success)

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{\n  \"success\": true,\n  \"data\": {\n    \"coordinates\": {\n      \"latitude\": 47.641879,\n      \"longitude\": -122.1264715\n    },\n    \"formattedAddress\": \"1 Microsoft Way, Redmond, WA 98052, United States\",\n    \"confidence\": \"High\"\n  }\n}"
      }
    ]
  }
}
```

### Response Example (Error)

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{\n  \"success\": false,\n  \"error\": {\n    \"code\": \"GEOCODE_NO_RESULTS\",\n    \"message\": \"Address not found: \\\"Nonexistent Street 99999\\\"\",\n    \"retryable\": false\n  }\n}"
      }
    ]
  }
}
```

### Error Handling

| Error Code | Description | Retryable | HTTP Status |
|------------|-------------|-----------|-------------|
| `GEOCODE_NO_RESULTS` | Address not found in Azure Maps database | No | 200 (success envelope) |
| `INVALID_ADDRESS` | Address string empty or malformed | No | 200 (success envelope) |
| `INVALID_INPUT` | Invalid `maxResults` or `countryFilter` | No | 200 (success envelope) |
| `AUTHENTICATION_FAILED` | API key invalid or expired | No | 401 |
| `RATE_LIMIT_EXCEEDED` | Too many requests | Yes | 429 |
| `SERVICE_UNAVAILABLE` | Azure Maps service temporarily down | Yes | 503 |

### Usage Notes

- **Best Results:** Provide full address including street number, city, state/province, and country
- **Country Filter:** Use `countryFilter` to improve accuracy for ambiguous addresses (e.g., "Paris, TX" vs. "Paris, France")
- **Max Results:** Keep `maxResults=1` unless you need to present multiple options to users
- **Confidence Scores:**
  - `High`: Exact match (street address level)
  - `Medium`: Partial match (neighborhood or postal code level)
  - `Low`: Approximate match (city or region level)
- **Token Efficiency:** Single-result geocoding typically consumes <2KB of response tokens

---

## 2. maps_batch_geocode

**Purpose:** Batch geocode multiple addresses in a single request (up to 100 addresses). More efficient than N sequential `maps_search_address` calls for multi-stop itineraries.

**Azure Maps API:** Search API v2026-01-01 (Sequential calls to `GET /search/address/json`)

**Note:** This tool implements client-side batching. True server-side batch API (`POST /search/address/batch`) is planned for V2.

### MCP Schema

```json
{
  "name": "maps_batch_geocode",
  "description": "Batch geocode multiple addresses in a single request (up to 100 addresses). Returns an array of results with coordinates, formatted addresses, and confidence scores. More efficient than N sequential geocode calls for multi-stop itineraries.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "addresses": {
        "type": "array",
        "description": "Array of address strings to geocode (1-100 addresses)",
        "items": {
          "type": "string"
        },
        "minItems": 1,
        "maxItems": 100
      }
    },
    "required": ["addresses"]
  }
}
```

### Request Example

```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "maps_batch_geocode",
    "arguments": {
      "addresses": [
        "Space Needle, Seattle, WA",
        "Pike Place Market, Seattle, WA",
        "Kerry Park, Seattle, WA"
      ]
    }
  },
  "id": 1
}
```

### Response Example

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{\n  \"success\": true,\n  \"data\": {\n    \"results\": [\n      {\n        \"address\": \"Space Needle, Seattle, WA\",\n        \"coordinates\": {\"latitude\": 47.6205, \"longitude\": -122.3493},\n        \"formattedAddress\": \"400 Broad St, Seattle, WA 98109, United States\",\n        \"confidence\": \"High\"\n      },\n      {\n        \"address\": \"Pike Place Market, Seattle, WA\",\n        \"coordinates\": {\"latitude\": 47.6097, \"longitude\": -122.3425},\n        \"formattedAddress\": \"85 Pike St, Seattle, WA 98101, United States\",\n        \"confidence\": \"High\"\n      },\n      {\n        \"address\": \"Kerry Park, Seattle, WA\",\n        \"coordinates\": {\"latitude\": 47.6295, \"longitude\": -122.3598},\n        \"formattedAddress\": \"211 W Highland Dr, Seattle, WA 98119, United States\",\n        \"confidence\": \"High\"\n      }\n    ],\n    \"totalCount\": 3,\n    \"successCount\": 3,\n    \"failureCount\": 0\n  }\n}"
      }
    ]
  }
}
```

### Response Format (Partial Failures)

If some addresses fail to geocode, they're returned with `null` coordinates and an `error` field:

```json
{
  "success": true,
  "data": {
    "results": [
      {
        "address": "Valid Address",
        "coordinates": {"latitude": 47.6205, "longitude": -122.3493},
        "formattedAddress": "...",
        "confidence": "High"
      },
      {
        "address": "Invalid Address XYZ",
        "coordinates": null,
        "formattedAddress": null,
        "confidence": null,
        "error": "Address not found"
      }
    ],
    "totalCount": 2,
    "successCount": 1,
    "failureCount": 1
  }
}
```

### Error Handling

| Error Code | Description | Retryable |
|------------|-------------|-----------|
| `INVALID_INPUT` | Empty addresses array or >100 addresses | No |
| `RATE_LIMIT_EXCEEDED` | Azure Maps rate limit exceeded during batch | Yes |
| `SERVICE_UNAVAILABLE` | Azure Maps service temporarily unavailable | Yes |

**Per-Item Errors:** Individual address failures are reported in the `error` field of each result item, not as top-level errors.

### Usage Notes

- **Efficiency:** Use for multi-stop itineraries (e.g., 5-stop road trip)
- **Partial Success:** Batch always returns `success: true` even if some addresses fail. Check `failureCount` and individual `error` fields
- **Rate Limiting:** Batch operations count as N individual API calls against your Azure Maps quota
- **Best Practice:** Pre-validate addresses if possible to avoid partial failures

---

## 3. maps_reverse_geocode

**Purpose:** Convert geographic coordinates to a human-readable address (reverse geocoding). Returns full address and structured address components.

**Azure Maps API:** Search API v2026-01-01 (`GET /search/address/reverse/json`)

### MCP Schema

```json
{
  "name": "maps_reverse_geocode",
  "description": "Convert geographic coordinates to a human-readable address (reverse geocoding). Returns full address and address components (street, city, postal code, country).",
  "inputSchema": {
    "type": "object",
    "properties": {
      "latitude": {
        "type": "number",
        "description": "Latitude coordinate (-90 to 90)",
        "minimum": -90,
        "maximum": 90
      },
      "longitude": {
        "type": "number",
        "description": "Longitude coordinate (-180 to 180)",
        "minimum": -180,
        "maximum": 180
      }
    },
    "required": ["latitude", "longitude"]
  }
}
```

### Request Example

```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "maps_reverse_geocode",
    "arguments": {
      "latitude": 47.6205,
      "longitude": -122.3493
    }
  },
  "id": 1
}
```

### Response Example

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{\n  \"success\": true,\n  \"data\": {\n    \"address\": \"400 Broad St, Seattle, WA 98109, United States\",\n    \"components\": {\n      \"streetNumber\": \"400\",\n      \"streetName\": \"Broad St\",\n      \"municipality\": \"Seattle\",\n      \"countrySubdivision\": \"WA\",\n      \"postalCode\": \"98109\",\n      \"country\": \"United States\",\n      \"countryCode\": \"US\"\n    }\n  }\n}"
      }
    ]
  }
}
```

### Error Handling

| Error Code | Description | Retryable |
|------------|-------------|-----------|
| `INVALID_COORDINATES` | Latitude/longitude out of valid range | No |
| `GEOCODE_NO_RESULTS` | No address found at coordinates (e.g., middle of ocean) | No |
| `RATE_LIMIT_EXCEEDED` | Too many requests | Yes |
| `SERVICE_UNAVAILABLE` | Azure Maps temporarily unavailable | Yes |

### Usage Notes

- **Ocean/Remote Areas:** Coordinates in oceans or extremely remote areas may return no results
- **Precision:** Results are most accurate at street-address level (within ~50 meters)
- **Components:** Use `components` object for structured data (e.g., extracting postal code for forms)
- **Address Components:** Not all components are guaranteed (e.g., ocean coordinates won't have `streetName`)

---

## 4. maps_search_nearby

**Purpose:** Search for Points of Interest (POIs) near a location by category. Returns POI name, category, coordinates, distance from search center, and optional address.

**Azure Maps API:** Search API v2026-01-01 (`GET /search/poi/json` or `GET /search/nearby/json`)

### MCP Schema

```json
{
  "name": "maps_search_nearby",
  "description": "Search for Points of Interest (POIs) near a location by category. Returns POI name, category, coordinates, distance from search center, and optional address. Use for finding hotels, restaurants, gas stations, attractions, etc.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "latitude": {
        "type": "number",
        "description": "Search center latitude (-90 to 90)",
        "minimum": -90,
        "maximum": 90
      },
      "longitude": {
        "type": "number",
        "description": "Search center longitude (-180 to 180)",
        "minimum": -180,
        "maximum": 180
      },
      "category": {
        "type": "string",
        "description": "POI category to search (e.g., \"hotel\", \"restaurant\", \"gas station\", \"airport\", \"museum\", \"hospital\"). Use general terms for broader results."
      },
      "radius": {
        "type": "number",
        "description": "Search radius in meters (1-50000). Default: 5000 (5 km)",
        "minimum": 1,
        "maximum": 50000
      },
      "maxResults": {
        "type": "number",
        "description": "Maximum number of POIs to return (1-100). Default: 10. Keep low to prevent token waste.",
        "minimum": 1,
        "maximum": 100
      }
    },
    "required": ["latitude", "longitude", "category"]
  }
}
```

### Request Example

```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "maps_search_nearby",
    "arguments": {
      "latitude": 47.6205,
      "longitude": -122.3493,
      "category": "restaurant",
      "radius": 1000,
      "maxResults": 5
    }
  },
  "id": 1
}
```

### Response Example

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{\n  \"success\": true,\n  \"data\": {\n    \"pois\": [\n      {\n        \"name\": \"SkyCity Restaurant\",\n        \"category\": \"Restaurant\",\n        \"coordinates\": {\"latitude\": 47.6205, \"longitude\": -122.3493},\n        \"distance\": 0,\n        \"address\": \"400 Broad St, Seattle, WA 98109\"\n      },\n      {\n        \"name\": \"Tilikum Place Cafe\",\n        \"category\": \"Restaurant\",\n        \"coordinates\": {\"latitude\": 47.6189, \"longitude\": -122.3517},\n        \"distance\": 245,\n        \"address\": \"407 Cedar St, Seattle, WA 98121\"\n      },\n      {\n        \"name\": \"Peso's Kitchen & Lounge\",\n        \"category\": \"Restaurant\",\n        \"coordinates\": {\"latitude\": 47.6168, \"longitude\": -122.3524},\n        \"distance\": 478,\n        \"address\": \"605 Queen Anne Ave N, Seattle, WA 98109\"\n      }\n    ],\n    \"totalCount\": 3\n  }\n}"
      }
    ]
  }
}
```

### Error Handling

| Error Code | Description | Retryable |
|------------|-------------|-----------|
| `POI_NO_RESULTS` | No POIs found for category in search area | No |
| `INVALID_CATEGORY` | Category string empty or invalid | No |
| `INVALID_COORDINATES` | Latitude/longitude out of range | No |
| `RATE_LIMIT_EXCEEDED` | Too many requests | Yes |
| `SERVICE_UNAVAILABLE` | Azure Maps temporarily unavailable | Yes |

### Usage Notes

- **Category Selection:** Use general terms for broad results (e.g., "restaurant", "hotel", "gas station")
- **Common Categories:** hotel, restaurant, cafe, gas station, parking, hospital, pharmacy, bank, atm, grocery store, museum, park, airport
- **Radius Guidelines:**
  - Urban areas: 1000-2000m (0.6-1.2 miles)
  - Suburban: 5000m (3 miles, default)
  - Rural: 10000-25000m (6-15 miles)
- **Max Results:** Keep `maxResults` low (5-10) to avoid token waste. POIs are returned sorted by distance.
- **Distance Units:** All distances in meters. Divide by 1609.34 for miles, or 1000 for kilometers.
- **Sparse Areas:** Rural/remote areas may return 0 results. Increase `radius` or try broader categories.

---

## 5. maps_calculate_route

**Purpose:** Calculate driving route with multiple waypoints. Returns distance, duration, arrival time, and optional turn-by-turn directions. Supports traffic-aware routing and vehicle type optimization.

**Azure Maps API:** Route API v2025-01-01 (`POST /route/directions/json`)

### MCP Schema

```json
{
  "name": "maps_calculate_route",
  "description": "Calculate driving route with multiple waypoints. Returns distance, duration, and arrival time. Use outputLevel parameter to control response detail: \"summary\" (distance/duration only), \"detailed\" (+ leg breakdowns), or \"full\" (+ turn-by-turn instructions and geometry).",
  "inputSchema": {
    "type": "object",
    "properties": {
      "waypoints": {
        "type": "array",
        "description": "Array of waypoint coordinates (minimum 2 for start/end). Format: [{latitude, longitude}, ...]",
        "items": {
          "type": "object",
          "properties": {
            "latitude": {"type": "number", "minimum": -90, "maximum": 90},
            "longitude": {"type": "number", "minimum": -180, "maximum": 180}
          },
          "required": ["latitude", "longitude"]
        },
        "minItems": 2
      },
      "vehicleType": {
        "type": "string",
        "description": "Vehicle type for routing calculations. Default: \"car\"",
        "enum": ["car", "truck", "taxi", "bus"]
      },
      "avoidOptions": {
        "type": "array",
        "description": "Route avoidance options (e.g., [\"tolls\", \"highways\"]). Optional.",
        "items": {
          "type": "string",
          "enum": ["tolls", "highways", "ferries"]
        }
      },
      "trafficEnabled": {
        "type": "boolean",
        "description": "Include real-time traffic data in route calculation. Default: true"
      },
      "outputLevel": {
        "type": "string",
        "description": "Response detail level: \"summary\" (distance/duration only), \"detailed\" (+ leg breakdowns), \"full\" (+ turn-by-turn + geometry). Default: \"summary\"",
        "enum": ["summary", "detailed", "full"]
      }
    },
    "required": ["waypoints"]
  }
}
```

### Request Example (Summary)

```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "maps_calculate_route",
    "arguments": {
      "waypoints": [
        {"latitude": 47.6205, "longitude": -122.3493},
        {"latitude": 47.6062, "longitude": -122.3321}
      ],
      "vehicleType": "car",
      "trafficEnabled": true,
      "outputLevel": "summary"
    }
  },
  "id": 1
}
```

### Response Example (Summary)

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{\n  \"success\": true,\n  \"data\": {\n    \"distanceMeters\": 3245,\n    \"durationSeconds\": 720,\n    \"arrivalTime\": \"2026-05-24T18:27:00Z\"\n  }\n}"
      }
    ]
  }
}
```

### Response Example (Detailed)

```json
{
  "success": true,
  "data": {
    "distanceMeters": 3245,
    "durationSeconds": 720,
    "arrivalTime": "2026-05-24T18:27:00Z",
    "legs": [
      {
        "distance": 3245,
        "duration": 720,
        "startPoint": {"latitude": 47.6205, "longitude": -122.3493},
        "endPoint": {"latitude": 47.6062, "longitude": -122.3321}
      }
    ]
  }
}
```

### Response Example (Full)

```json
{
  "success": true,
  "data": {
    "distanceMeters": 3245,
    "durationSeconds": 720,
    "arrivalTime": "2026-05-24T18:27:00Z",
    "legs": [...],
    "turnByTurnInstructions": [
      {
        "instruction": "Head south on Broad St",
        "distance": 245,
        "travelTime": 45,
        "point": {"latitude": 47.6205, "longitude": -122.3493}
      },
      {
        "instruction": "Turn right onto Denny Way",
        "distance": 890,
        "travelTime": 180,
        "point": {"latitude": 47.6182, "longitude": -122.3498}
      }
    ],
    "geometry": "encoded_polyline_string_or_geojson"
  }
}
```

### Error Handling

| Error Code | Description | Retryable |
|------------|-------------|-----------|
| `ROUTE_IMPOSSIBLE` | No route found between waypoints (e.g., islands, blocked roads) | No |
| `INVALID_WAYPOINTS` | <2 waypoints or coordinates out of range | No |
| `INVALID_INPUT` | Invalid vehicleType or avoidOptions | No |
| `RATE_LIMIT_EXCEEDED` | Too many requests | Yes |
| `SERVICE_UNAVAILABLE` | Azure Maps temporarily unavailable | Yes |

### Usage Notes

- **Output Levels:**
  - `summary`: Use for distance/time estimates (most token-efficient)
  - `detailed`: Use when you need leg breakdowns for multi-stop routes
  - `full`: Use when displaying routes on maps or providing navigation
- **Traffic:** `trafficEnabled=true` (default) provides real-time traffic-aware routing. Disable for predictive routing.
- **Vehicle Types:**
  - `car`: Standard passenger vehicle (default)
  - `truck`: Truck routing with height/weight restrictions
  - `taxi`: Optimized for urban taxi operations
  - `bus`: Public transit routing
- **Avoid Options:** Combine multiple options (e.g., `["tolls", "highways"]`)
- **Max Waypoints:** Supports up to 150 waypoints (most use cases need 2-10)
- **Token Consumption:**
  - `summary`: ~0.5KB
  - `detailed`: ~2-5KB
  - `full`: ~10-50KB (depends on route complexity)

---

## 6. maps_get_timezone

**Purpose:** Get timezone information for geographic coordinates. Returns timezone ID (IANA), UTC offset, and DST status. Essential for cross-timezone trip planning.

**Azure Maps API:** Timezone API v1.0 (`GET /timezone/byCoordinates/json`)

### MCP Schema

```json
{
  "name": "maps_get_timezone",
  "description": "Get timezone information for geographic coordinates. Returns timezone ID (e.g., \"America/Los_Angeles\"), UTC offset, and DST status. Essential for cross-timezone trip planning (e.g., Seattle→Denver, LA→Phoenix).",
  "inputSchema": {
    "type": "object",
    "properties": {
      "latitude": {
        "type": "number",
        "description": "Latitude coordinate (-90 to 90)",
        "minimum": -90,
        "maximum": 90
      },
      "longitude": {
        "type": "number",
        "description": "Longitude coordinate (-180 to 180)",
        "minimum": -180,
        "maximum": 180
      },
      "timestamp": {
        "type": "string",
        "description": "Optional timestamp (ISO 8601 or Unix timestamp) for historical timezone lookup. If omitted, uses current time."
      }
    },
    "required": ["latitude", "longitude"]
  }
}
```

### Request Example

```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "maps_get_timezone",
    "arguments": {
      "latitude": 47.6205,
      "longitude": -122.3493
    }
  },
  "id": 1
}
```

### Response Example

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{\n  \"success\": true,\n  \"data\": {\n    \"timezoneId\": \"America/Los_Angeles\",\n    \"utcOffset\": \"-08:00\",\n    \"dstActive\": false,\n    \"dstSavings\": \"+01:00\"\n  }\n}"
      }
    ]
  }
}
```

### Error Handling

| Error Code | Description | Retryable |
|------------|-------------|-----------|
| `INVALID_COORDINATES` | Latitude/longitude out of range | No |
| `INVALID_INPUT` | Invalid timestamp format | No |
| `RATE_LIMIT_EXCEEDED` | Too many requests | Yes |
| `SERVICE_UNAVAILABLE` | Azure Maps temporarily unavailable | Yes |

### Usage Notes

- **Timezone ID:** IANA timezone identifier (e.g., "America/Los_Angeles", "Europe/London", "Asia/Tokyo")
- **UTC Offset:** Current UTC offset in hours (e.g., "-08:00", "+05:30")
- **DST Status:**
  - `dstActive: true` - Currently in Daylight Saving Time
  - `dstActive: false` - Currently in Standard Time
  - `dstSavings` - DST offset when active (typically "+01:00")
- **Historical Lookups:** Use `timestamp` parameter to get timezone information for past/future dates (useful for trip planning)
- **Use Cases:**
  - Cross-timezone trip planning (e.g., Seattle→Denver flight times)
  - Local time conversions for international itineraries
  - DST transition awareness (e.g., Arizona doesn't observe DST)

---

## 7. maps_render_static_map

**Purpose:** Generate a static map image (PNG/JPEG) with optional route overlay and POI markers. Returns base64-encoded image suitable for embedding in documents or displaying to users.

**Azure Maps API:** Render API v2024-04-01 (`GET /map/static/json`)

### MCP Schema

```json
{
  "name": "maps_render_static_map",
  "description": "Generate a static map image (PNG/JPEG) with optional route overlay and POI markers. Returns base64-encoded image suitable for embedding in documents or displaying to users. Useful for visualizing itineraries.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "center": {
        "type": "object",
        "description": "Map center coordinates",
        "properties": {
          "latitude": {"type": "number", "minimum": -90, "maximum": 90},
          "longitude": {"type": "number", "minimum": -180, "maximum": 180}
        },
        "required": ["latitude", "longitude"]
      },
      "zoom": {
        "type": "number",
        "description": "Zoom level (0-20). 0 = world view, 20 = street level. Default: 12",
        "minimum": 0,
        "maximum": 20
      },
      "width": {
        "type": "number",
        "description": "Image width in pixels (1-2048). Default: 800",
        "minimum": 1,
        "maximum": 2048
      },
      "height": {
        "type": "number",
        "description": "Image height in pixels (1-2048). Default: 600",
        "minimum": 1,
        "maximum": 2048
      },
      "routeGeometry": {
        "type": "string",
        "description": "Optional route geometry to overlay (encoded polyline or GeoJSON LineString from maps_calculate_route with outputLevel=\"full\")"
      },
      "pins": {
        "type": "array",
        "description": "Optional array of coordinates for POI markers (e.g., waypoints, hotels)",
        "items": {
          "type": "object",
          "properties": {
            "latitude": {"type": "number", "minimum": -90, "maximum": 90},
            "longitude": {"type": "number", "minimum": -180, "maximum": 180}
          },
          "required": ["latitude", "longitude"]
        }
      },
      "format": {
        "type": "string",
        "description": "Image format. Default: \"png\"",
        "enum": ["png", "jpeg"]
      }
    },
    "required": ["center"]
  }
}
```

### Request Example (Simple Map)

```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "maps_render_static_map",
    "arguments": {
      "center": {"latitude": 47.6205, "longitude": -122.3493},
      "zoom": 14,
      "width": 800,
      "height": 600,
      "format": "png"
    }
  },
  "id": 1
}
```

### Request Example (With Pins)

```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "maps_render_static_map",
    "arguments": {
      "center": {"latitude": 47.6205, "longitude": -122.3493},
      "zoom": 12,
      "width": 1024,
      "height": 768,
      "pins": [
        {"latitude": 47.6205, "longitude": -122.3493},
        {"latitude": 47.6062, "longitude": -122.3321},
        {"latitude": 47.6101, "longitude": -122.3421}
      ],
      "format": "png"
    }
  },
  "id": 1
}
```

### Response Example

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{\n  \"success\": true,\n  \"data\": {\n    \"imageBase64\": \"iVBORw0KGgoAAAANSUhEUgAA...(truncated)\",\n    \"contentType\": \"image/png\",\n    \"sizeBytes\": 245678\n  }\n}"
      }
    ]
  }
}
```

### Error Handling

| Error Code | Description | Retryable |
|------------|-------------|-----------|
| `INVALID_COORDINATES` | Center coordinates out of range | No |
| `INVALID_INPUT` | Invalid zoom, width, height, or format | No |
| `RATE_LIMIT_EXCEEDED` | Too many requests | Yes |
| `SERVICE_UNAVAILABLE` | Azure Maps temporarily unavailable | Yes |

### Usage Notes

- **Base64 Decoding:** Use standard base64 decoding to convert `imageBase64` to binary image data
- **Embedding in HTML:** `<img src="data:image/png;base64,{imageBase64}" />`
- **File Export:** Decode base64 and write to file with appropriate extension (.png or .jpeg)
- **Zoom Level Guidelines:**
  - 0-3: World/continent view
  - 4-7: Country/state view
  - 8-11: City view
  - 12-15: Neighborhood view (default: 12)
  - 16-20: Street level
- **Image Size:**
  - **Default:** 800x600 (good for web)
  - **Email:** 600x400 (smaller file size)
  - **Print:** 1200x900+ (higher resolution)
  - **Max:** 2048x2048
- **Format Selection:**
  - `png`: Better quality, larger file size (recommended for overlays)
  - `jpeg`: Smaller file size, some quality loss (good for simple maps)
- **Route Overlay:** Use `routeGeometry` from `maps_calculate_route` with `outputLevel="full"` to overlay routes
- **Pin Limits:** Tested up to 50 pins. Higher counts may impact performance.
- **Token Consumption:** Response size varies (typically 200-500KB base64-encoded, ~1500-4000 tokens)

---

## JSON-RPC Error Codes

Standard JSON-RPC 2.0 error codes used by the server:

| Code | Message | Description |
|------|---------|-------------|
| -32600 | Invalid Request | Malformed JSON-RPC request (missing `jsonrpc` field) |
| -32601 | Method not found | Unknown `method` value (not `tools/list` or `tools/call`) |
| -32602 | Invalid params | Invalid `params` object structure |
| -32603 | Internal error | Unexpected server error during request processing |
| -32000 | Server error | Azure Maps API error (see tool-specific error codes) |

**Note:** Tool-specific errors (e.g., `GEOCODE_NO_RESULTS`) are returned within the MCP success envelope, not as JSON-RPC errors.

---

## Response Envelope Format

All tools follow this standardized response format:

### Success Response

```json
{
  "success": true,
  "data": {
    // Tool-specific data structure
  }
}
```

### Error Response

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "retryable": true,  // or false
    "retryAfter": 60    // Optional: seconds to wait before retry
  }
}
```

### Error Properties

- **code:** Machine-readable error code (see tool-specific error tables)
- **message:** Human-readable error description
- **retryable:** `true` if the request can be retried (network/rate limit errors), `false` for permanent failures
- **retryAfter:** Optional field for rate limit errors, indicating seconds to wait before retry

---

## Rate Limiting

Azure Maps API rate limits vary by SKU:

| SKU | Queries Per Second (QPS) | Concurrent Requests |
|-----|--------------------------|---------------------|
| Gen2 (S0) | 50 | 50 |
| Gen2 (S1) | 500 | 500 |

**Retry Strategy:**
1. Check `retryable: true` in error response
2. Wait `retryAfter` seconds (if provided) or use exponential backoff
3. Retry with same request
4. Max 3 retries recommended

**Best Practices:**
- Implement client-side request queuing for burst protection
- Cache geocoding results to reduce API calls
- Use batch operations where available

---

## Authentication

**Current Implementation:** API Key (Shared Key) authentication

**Header:** API key is passed via `subscription-key` header to Azure Maps (handled internally by MCP server)

**Configuration:** Set `AZURE_MAPS_API_KEY` environment variable on Container App

**Future:** Managed Identity support planned for V1.1 (see ROADMAP.md)

---

## Health Check

**Endpoint:** `GET /healthz`

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2026-05-24T18:15:00Z",
  "service": "azmaps-mcp-server",
  "version": "1.0.0"
}
```

**Use Case:** Container Apps health probes, monitoring dashboards

---

## MCP Client Example

Example using `@modelcontextprotocol/sdk` (TypeScript/JavaScript):

```typescript
import { Client } from '@modelcontextprotocol/sdk/client/index.js';

const client = new Client({
  name: 'my-travel-agent',
  version: '1.0.0'
});

// Connect to MCP server
await client.connect({
  url: 'https://ca-azmaps-mcp-dev.graysand-f7f65db5.eastus.azurecontainerapps.io/message',
  transport: 'http'
});

// List available tools
const tools = await client.listTools();
console.log('Available tools:', tools);

// Call a tool
const geocodeResult = await client.callTool({
  name: 'maps_search_address',
  arguments: {
    address: '1 Microsoft Way, Redmond, WA'
  }
});

console.log('Geocode result:', geocodeResult);
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-05-24 | Initial release - 7 tools (geocoding, POI search, routing, timezone, static maps) |

---

## Support

**Issues:** Report issues to rpatchwork or squad leads  
**Documentation:** See README.md for setup instructions  
**Limitations:** See LIMITATIONS.md for known constraints  
**Roadmap:** See ROADMAP.md for planned features
