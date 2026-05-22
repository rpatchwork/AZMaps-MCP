# Azure Maps Gen2 REST API Reference

> **Created:** 2026-05-22  
> **Source:** [Azure REST API Specs GitHub Repository](https://github.com/Azure/azure-rest-api-specs/tree/main/specification/maps/data-plane)  
> **Analyzed by:** Niobe (Azure Maps Gen2 Specialist)

This document provides a comprehensive reference for building our MCP server as an Azure Maps REST API client.

---

## Executive Summary

Azure Maps Gen2 provides 9 major API categories via OpenAPI/Swagger specifications. The APIs are transitioning to TypeSpec (TSP) format with recent migrations (last month) across all major services. Latest stable versions use **2025-01-01** or **2026-01-01** API versions, representing the Gen2 platform.

### API Categories Available

| Category | Latest Stable Version | Status | Purpose |
|----------|----------------------|---------|---------|
| **Search** | 2026-01-01 | ✅ Active | Geocoding, POI search, reverse geocoding |
| **Route** | 2025-01-01 | ✅ Active | Directions, distance matrix, route optimization |
| **Render** | 2024-04-01 | ⚠️ Migrating | Static maps, tiles, copyright attribution |
| **Timezone** | 1.0 | ✅ Stable | Timezone by coordinates, IANA ID conversion |
| **Geolocation** | 1.0 | ✅ Stable | IP-to-location lookup |
| **Weather** | 1.1 | ✅ Active | Current/forecast weather data |
| **Traffic** | 2025-01-01 | ✅ Active | Traffic incidents, flow data |
| **AsyncBatchManagement** | N/A | 🔧 Specialized | Batch geocoding/routing operations |
| **Common** | N/A | 📦 Shared | Shared types and error models |

---

## API Versioning Strategy

### Current Gen2 Versions (Recommended)

```
Search:    2026-01-01 (latest stable), 2025-01-01, 2023-06-01
Route:     2025-01-01 (latest stable)
Render:    2024-04-01 (latest stable), 2022-08-01
Timezone:  1.0 (stable, no updates planned)
Geolocation: 1.0 (stable, no updates planned)
Weather:   1.1 (stable)
Traffic:   2025-01-01 (latest stable)
```

### Deprecated/Retired Versions

- **Render 1.0**: Deprecated, retiring September 17, 2026
- **Route 1.0**: Marked as "deprecated"
- **Traffic 1.0**: Will be retired March 31, 2028
- **Search 1.0**: Legacy API, superseded by 2023-06-01+

### API Version Guidance

**✅ RECOMMENDED:** Use the latest stable versions listed above. They represent Azure Maps Gen2 architecture.

**🔍 Version Format:** APIs use either:
- **Date-based:** `YYYY-MM-DD` (e.g., `2026-01-01`) - Gen2 standard
- **Semantic:** `X.Y` (e.g., `1.0`, `1.1`) - Legacy/stable APIs

**📋 Breaking Change Policy:** Microsoft maintains backward compatibility within major versions. Date-based APIs introduce new features without breaking existing calls.

---

## Authentication Patterns

All Azure Maps APIs support **two authentication methods**:

### 1. Shared Key (API Key) Authentication

```http
GET /search/address/json?api-version=2026-01-01&query=Seattle
Host: atlas.microsoft.com
subscription-key: YOUR_API_KEY
```

**Headers:**
- `subscription-key: <your-key>`

**Use Case:** Development, testing, simple applications

### 2. Azure AD (Microsoft Entra ID) Authentication

```http
GET /search/address/json?api-version=2026-01-01&query=Seattle
Host: atlas.microsoft.com
Authorization: Bearer <JWT-token>
x-ms-client-id: <your-client-id>
```

**Headers:**
- `Authorization: Bearer <token>`
- `x-ms-client-id: <client-id>`

**Token Scope:** `https://atlas.microsoft.com/.default`

**Use Case:** Production environments, managed identities, zero-trust architecture

### OpenAPI Spec Configuration

All APIs specify these authentication settings:

```yaml
credential-default-policy-type: BearerTokenCredentialPolicy
credential-scopes: 'https://atlas.microsoft.com/.default'
add-credentials: true
```

**Our Implementation:** Currently using **API Key** via `mapsApiKey` parameter. Future enhancement: Add Azure AD support via `DefaultAzureCredential`.

---

## API Categories Deep Dive

### 1. Search API (Geocoding & POI)

**Base Path:** `/search/`  
**Latest Version:** `2026-01-01` (GA release - March 2026)  
**Previous Stable:** `2025-01-01`, `2023-06-01`

**Key Endpoints:**
- `GET /search/address/json` - Forward geocoding (address → coordinates)
- `GET /search/address/reverse/json` - Reverse geocoding (coordinates → address)
- `GET /search/poi/json` - Point of Interest search
- `GET /search/nearby/json` - Nearby search with category filters
- `GET /search/fuzzy/json` - Combined geocoding + POI search
- `POST /search/address/batch` - Batch geocoding (async)

**Version History:**
- `2026-01-01` (Jan 2026) - Latest GA
- `2025-01-01` (Jan 2025)
- `2023-06-01` (Jun 2023)
- `1.0` - Legacy (retired)

**Preview Features:** `2025-06-01-preview` (experimental features)

**MCP Implementation Status:**
- ✅ Forward geocoding (`maps_search_address`)
- ✅ Reverse geocoding (`maps_reverse_geocode`)
- ✅ POI search (`maps_search_poi`)
- 🔜 Batch geocoding (future enhancement)
- 🔜 Fuzzy search (combines address + POI)

---

### 2. Route API (Directions & Routing)

**Base Path:** `/route/`  
**Latest Version:** `2025-01-01`  
**Previous Versions:** `2024-07-01-preview`, `2024-04-01-preview`, `2023-10-01-preview`, `1.0` (deprecated)

**Key Endpoints:**
- `POST /route/directions/json` - Get directions between waypoints
- `POST /route/matrix/json` - Distance/time matrix for multiple origins/destinations
- `GET /route/range/json` - Isochrone/isodistance polygons (reachable area)
- `POST /route/snaptoroads` - Snap GPS traces to roads

**Route Features:**
- Multi-waypoint routing (up to 150 waypoints)
- Route alternatives
- Traffic-aware routing
- Vehicle type optimization (car, truck, bicycle, pedestrian)
- Avoid features (tolls, highways, ferries)
- ETA calculation

**MCP Implementation Status:**
- ✅ Basic routing (`maps_get_route`)
- 🔜 Route matrix (future enhancement)
- 🔜 Isochrone/range calculations
- 🔜 Advanced routing options (vehicle profiles, avoidances)

---

### 3. Render API (Map Visualization)

**Base Path:** `/map/`  
**Latest Version:** `2024-04-01`  
**Previous Versions:** `2022-08-01`, `2.1`, `2.0`, `1.0` (deprecated - retiring Sept 2026)

**Key Endpoints:**
- `GET /map/tile/json` - Raster map tiles
- `GET /map/static/json` - Static map images (PNG)
- `GET /map/copyright/json` - Copyright/attribution data
- `GET /map/traffic/json` - Traffic flow overlay tiles

**Static Map Parameters:**
- Center coordinates or bounding box
- Zoom level (1-20)
- Map styles (road, satellite, hybrid, dark, grayscale)
- Image format (PNG, JPEG)
- Size (max 8192x8192 pixels)
- Markers/overlays

**Important Notes:**
- Render 1.0 deprecated (retire: Sept 17, 2026)
- Web SDK uses Render 2.0/2.1 internally
- Static maps ideal for PDFs, reports, email notifications

**MCP Implementation Status:**
- ✅ Static map generation (`maps_get_static_map`)
- 🔜 Map tiles (for custom rendering)
- 🔜 Traffic overlays

---

### 4. Timezone API

**Base Path:** `/timezone/`  
**Latest Version:** `1.0` (stable, no planned updates)

**Key Endpoints:**
- `GET /timezone/byCoordinates/json` - Timezone info by coordinates
- `GET /timezone/byId/json` - Timezone details by IANA ID
- `GET /timezone/enumIana/json` - List all IANA timezone IDs

**Response Data:**
- IANA timezone ID (e.g., `America/Los_Angeles`)
- Current UTC offset
- Daylight saving time status
- Transition times (DST start/end)

**MCP Implementation Status:**
- ✅ Timezone by coordinates (`maps_get_timezone`)
- 🔜 Timezone enumeration

---

### 5. Geolocation API

**Base Path:** `/geolocation/`  
**Latest Version:** `1.0` (stable)

**Key Endpoints:**
- `GET /geolocation/ip/json` - Get location info from IP address

**Response Data:**
- Country code
- ISO country code
- IP address
- Confidence level

**Use Cases:**
- Content localization
- Regulatory compliance (GDPR, data sovereignty)
- Fraud detection
- Analytics/reporting

**MCP Implementation Status:**
- ❌ Not implemented (low priority for travel agent use case)

---

### 6. Weather API

**Base Path:** `/weather/`  
**Latest Version:** `1.1` (stable)  
**Previous Version:** `1.0` (preview)

**Key Endpoints:**
- `GET /weather/currentConditions/json` - Current weather conditions
- `GET /weather/forecast/daily/json` - Daily forecast (1-15 days)
- `GET /weather/forecast/hourly/json` - Hourly forecast (1-240 hours)
- `GET /weather/forecast/minute/json` - Minute-by-minute precipitation (120 min)
- `GET /weather/severe/json` - Severe weather alerts
- `GET /weather/airQuality/json` - Air quality index

**MCP Implementation Status:**
- ❌ Not implemented (out of scope for travel routing)

---

### 7. Traffic API

**Base Path:** `/traffic/`  
**Latest Version:** `2025-01-01`  
**Deprecated:** `1.0` (retiring March 31, 2028)

**Key Endpoints:**
- `GET /traffic/flow/json` - Real-time traffic flow data
- `GET /traffic/incident/json` - Traffic incidents (accidents, closures)
- `GET /traffic/trafficState/json` - Traffic state tiles

**Use Cases:**
- Traffic-aware routing (integrated into Route API)
- Real-time traffic overlays
- Incident notifications

**MCP Implementation Status:**
- ❌ Not implemented (traffic already integrated in Route API)

---

### 8. AsyncBatchManagement API

**Base Path:** `/providers/Microsoft.Subscription/subscriptionOperations/`  
**Purpose:** Long-running operations (LRO) for batch requests

**Pattern:**
1. Submit batch request → Get `operationId`
2. Poll status: `GET /subscriptionOperations/{operationId}`
3. Retrieve results when `status: Succeeded`

**Use Cases:**
- Batch geocoding (1000s of addresses)
- Batch routing (distance matrices)
- Asynchronous processing

**MCP Implementation Status:**
- ❌ Not implemented (future enhancement for bulk operations)

---

### 9. Common Module

**Purpose:** Shared types, error models, and response structures

**Shared Types:**
- Error responses (standardized format)
- Coordinate types (lat/lon)
- Bounding boxes
- Pagination models

**Standard Error Format:**
```json
{
  "error": {
    "code": "InvalidCredentials",
    "message": "Invalid subscription key",
    "target": "subscription-key",
    "details": []
  }
}
```

---

## MCP Tool Mapping Strategy

### Current Implementation (Phase 1)

| MCP Tool | Azure Maps API | Endpoint | Version |
|----------|----------------|----------|---------|
| `maps_search_address` | Search API | `/search/address/json` | 2026-01-01 |
| `maps_reverse_geocode` | Search API | `/search/address/reverse/json` | 2026-01-01 |
| `maps_search_poi` | Search API | `/search/poi/json` | 2026-01-01 |
| `maps_get_route` | Route API | `/route/directions/json` | 2025-01-01 |
| `maps_get_static_map` | Render API | `/map/static/json` | 2024-04-01 |
| `maps_get_timezone` | Timezone API | `/timezone/byCoordinates/json` | 1.0 |

### Proposed Phase 2 Extensions

| Proposed MCP Tool | Azure Maps API | Priority | Use Case |
|-------------------|----------------|----------|----------|
| `maps_search_fuzzy` | Search API | 🔥 High | Combined address/POI search |
| `maps_get_route_matrix` | Route API | 🔥 High | Multi-destination optimization |
| `maps_batch_geocode` | Search API (batch) | 🟡 Medium | Bulk address processing |
| `maps_get_route_range` | Route API | 🟡 Medium | "Where can I reach in 30min?" |
| `maps_get_weather` | Weather API | 🔵 Low | Weather at destination |
| `maps_get_traffic_incidents` | Traffic API | 🔵 Low | Real-time traffic alerts |

### Tool Naming Convention

**Pattern:** `maps_{operation}_{resource}`

**Examples:**
- `maps_search_address` (operation: search, resource: address)
- `maps_get_route` (operation: get, resource: route)
- `maps_reverse_geocode` (operation: reverse, resource: geocode)

**Guidelines:**
- Use lowercase with underscores
- Start with `maps_` prefix
- Verb-first (search, get, create)
- Noun describes the resource/result

---

## Key Learnings from OpenAPI Specs

### 1. TypeSpec Migration (TSP)

All APIs have recently migrated to TypeSpec (`.tsp` files) from Swagger (`.json`). This affects:
- **Source of Truth:** Now `.tsp` files, with `.json` generated
- **Breaking Changes:** Unlikely during TypeSpec transition
- **Stability:** Specs are mature, actively maintained

**Files per API:**
- `main.tsp` - API definition entry point
- `client.tsp` - Client configuration
- `models.tsp` - Data type definitions
- `routes.tsp` - Endpoint definitions
- `common/` - Shared models
- `stable/YYYY-MM-DD/*.json` - Generated OpenAPI specs

### 2. Error Handling Patterns

**Standardized Error Structure:**
```typescript
interface AzureMapsError {
  error: {
    code: string;           // "InvalidCredentials", "NotFound", etc.
    message: string;        // Human-readable description
    target?: string;        // Field/parameter that caused error
    details?: ErrorDetail[]; // Nested error context
  }
}
```

**Common Error Codes:**
- `400 Bad Request` - Invalid parameters
- `401 Unauthorized` - Missing/invalid authentication
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found (address, coordinates)
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Azure service error

**Our Implementation:** Wrapped in `AzureMapsError` class ([errors.ts](c:/temp/AZMaps-MCP/src/lib/errors.ts))

### 3. Rate Limiting & Quotas

**Not explicitly documented in OpenAPI specs**, but Azure Maps has:
- Request throttling (QPS limits)
- Daily/monthly transaction limits
- Service tier-based quotas

**Best Practices:**
- Implement exponential backoff for 429 errors
- Cache frequently requested data (geocoding, static maps)
- Use batch APIs for bulk operations

### 4. Parameter Patterns

**Common Parameters Across APIs:**
- `api-version` (required, query param) - Version string
- `subscription-key` (auth header) - API key
- `language` (optional) - ISO 639-1 language code (e.g., `en-US`)
- `view` (optional) - Unified/Localized map views (geopolitical)

**Coordinate Formats:**
- Latitude, Longitude (decimal degrees)
- Range: Lat [-90, 90], Lon [-180, 180]

### 5. Response Pagination

Some APIs support pagination:
```json
{
  "results": [...],
  "nextLink": "https://atlas.microsoft.com/search?...&skip=100"
}
```

**Our Strategy:** Initially return top results; add pagination support in Phase 2.

### 6. SDK Code Generation Support

All APIs have AutoRest configurations for SDK generation:
- Python
- TypeScript/JavaScript
- C# (.NET)
- Java
- Go

**Our Approach:** Direct REST API client (simpler, more transparent) rather than generated SDK.

---

## Authentication Best Practices

### Current: API Key (Shared Key)

**Implementation:**
```typescript
const client = new AzureMapsClient({
  endpoint: 'https://atlas.microsoft.com',
  apiKey: process.env.AZURE_MAPS_API_KEY
});
```

**Security:**
- ✅ Store key in environment variables
- ✅ Rotate keys periodically
- ❌ Never commit keys to source control
- ⚠️ API key has full account permissions

### Future: Azure AD (Managed Identity)

**Implementation (Proposed):**
```typescript
import { DefaultAzureCredential } from '@azure/identity';

const credential = new DefaultAzureCredential();
const token = await credential.getToken('https://atlas.microsoft.com/.default');

// Add to request headers:
// Authorization: Bearer <token>
// x-ms-client-id: <client-id>
```

**Benefits:**
- ✅ No secrets in code/config
- ✅ Automatic token refresh
- ✅ Azure RBAC integration
- ✅ Audit trail via Azure AD

**Implementation Timeline:** Phase 3 (after core API coverage)

---

## Recommendations for MCP Server Development

### 1. API Version Selection

**Use These Versions:**
```typescript
const API_VERSIONS = {
  search: '2026-01-01',
  route: '2025-01-01',
  render: '2024-04-01',
  timezone: '1.0',
  geolocation: '1.0',
  weather: '1.1',
  traffic: '2025-01-01'
} as const;
```

### 2. Client Architecture

**Modular Design:**
```
src/
  lib/
    azure-maps-client.ts      // Core HTTP client
    types.ts                   // TypeScript types from OpenAPI
    errors.ts                  // Error handling
  tools/
    geocode.ts                 // Search API tools
    route.ts                   // Route API tools
    render.ts                  // Render API tools
    timezone.ts                // Timezone API tools
```

### 3. Error Handling Strategy

1. **Wrap API errors** in `AzureMapsError` class
2. **Parse error responses** to extract `code` and `message`
3. **Add context** (tool name, parameters) to error messages
4. **Log errors** for debugging (without exposing API keys)

### 4. Testing Approach

**Unit Tests:**
- Mock Azure Maps API responses
- Test parameter validation
- Error handling scenarios

**Integration Tests:**
- Real API calls (dev environment)
- Use test fixtures (addresses, coordinates)
- Validate response schemas

**Performance Tests:**
- Measure API latency
- Test rate limiting behavior

### 5. Documentation

**For Each Tool:**
- Purpose and use case
- Input parameters (with examples)
- Output format
- Error scenarios
- Example MCP conversation flow

---

## Quick Reference

### Base URL
```
https://atlas.microsoft.com
```

### Authentication Header (API Key)
```http
subscription-key: <your-key>
```

### Common Query Parameters
```
api-version=<version>     (required)
language=<ISO-639-1>      (optional, default: en-US)
view=<Unified|Auto>       (optional, geopolitical view)
```

### HTTP Methods
- **GET** - Query operations (search, route, timezone)
- **POST** - Complex requests (route with many waypoints, batch)

### Response Format
- **Content-Type:** `application/json`
- **Character Encoding:** UTF-8

---

## External Resources

### Official Documentation
- [Azure Maps Documentation](https://docs.microsoft.com/azure/azure-maps/)
- [REST API Reference](https://docs.microsoft.com/rest/api/maps/)
- [OpenAPI Specs Repository](https://github.com/Azure/azure-rest-api-specs/tree/main/specification/maps/data-plane)

### SDK & Tools
- [Azure Maps Web SDK](https://github.com/Azure/azure-maps-web-sdk)
- [AutoRest Code Generator](https://github.com/Azure/autorest)
- [TypeSpec Documentation](https://microsoft.github.io/typespec/)

### Community
- [Azure Maps Feedback](https://feedback.azure.com/forums/909172-azure-maps)
- [Stack Overflow - azure-maps tag](https://stackoverflow.com/questions/tagged/azure-maps)

---

## Conclusion

Azure Maps Gen2 provides a comprehensive, well-documented REST API surface for our MCP server. The APIs are mature, actively maintained, and have clear versioning strategies. Our current implementation covers the core use cases (geocoding, routing, maps, timezone) with room for expansion into batch operations, weather, and traffic as needed.

**Next Steps:**
1. ✅ **Phase 1 Complete:** Core tools implemented
2. 🔜 **Phase 2:** Add fuzzy search, route matrix, batch operations
3. 🔜 **Phase 3:** Azure AD authentication, caching, rate limiting

**Key Takeaway:** The OpenAPI specs provide excellent guidance for API contracts, error handling, and feature discovery. We should reference the stable JSON specs in `stable/YYYY-MM-DD/` directories for authoritative endpoint definitions.

---

**Document Version:** 1.0  
**Last Updated:** 2026-05-22  
**Maintained By:** Niobe (Azure Maps Gen2 Specialist)
