# Niobe — History

**Project:** AZMaps-MCP
**Tech Stack:** Azure Maps Gen2 REST APIs, MCP Server, TypeScript
**User:** rpatchwork

## Learnings

### 2026-05-21: Azure Maps REST API Deep Research

**Mission:** Become expert in Azure Maps Gen2 REST APIs to fix Route/Static Map blockers and guide Trinity.

#### Key Findings

**COORDINATE ORDER CONFUSION = #1 SOURCE OF BUGS**

Different APIs use different coordinate orders:
- **GeoJSON (Gen2 APIs):** `[longitude, latitude]` array
- **Static Map pins:** `longitude latitude` (space-separated)
- **Timezone API:** `latitude,longitude` (legacy format)

**Route API Fix Identified:**
- Endpoint incomplete: need `/route/directions/json` (not just `/route/directions`)
- Request body needs `pointIndex` and `pointType: "waypoint"` in properties
- Need `routeOutputOptions` array in body

**Static Map Pin Fix Identified:**
- Coordinates MUST be `longitude latitude` (space-separated), NOT `latitude,longitude`
- Example: `pins=default||-122.349 47.620` (lon first!)

#### Azure Maps API Version Strategy

- **Gen2 APIs (2025+):** Use GeoJSON format, longitude-first coordinate order
- **Gen1 APIs (v1.0):** Legacy format, mostly latitude-first
- Route, Geocode, Reverse Geocode = migrated to Gen2
- POI Search, Static Map, Timezone = still on Gen1

#### Common Pitfalls to Avoid

1. **Mixing coordinate orders** - Always check API docs for each endpoint
2. **Wrong separators** - GeoJSON uses arrays, query params use commas or spaces
3. **API version mismatch** - Gen2 APIs expect different request/response formats
4. **Missing required properties** - Route API needs `pointIndex` and `pointType`

#### Travel Agent Use Case Patterns

| Scenario | API Sequence |
|----------|--------------|
| "Find hotels near landmark" | 1. Geocode landmark → 2. POI Search (coordinates + radius) |
| "Route between addresses" | 1. Batch Geocode → 2. Route POST (coordinates array) |

---

### 2026-05-21: Collaboration Protocol Established

**Context:** Squad established domain ownership model and mandatory review gates after specialist-bypass incident.

**My Role as Azure Maps Specialist:**

**I Own:**
- Azure Maps REST API correctness (endpoints, parameters, response parsing)
- Coordinate format handling (lat/lon vs lon/lat, GeoJSON vs legacy)
- API version selection (Gen1 vs Gen2, migration guidance)
- Geospatial domain logic (distance calculations, route validation)

**Review Gate (MANDATORY):**
- Trigger: Trinity implements/modifies code calling Azure Maps REST APIs
- My Responsibility: Review design docs + actual HTTP client code before Tank tests
- Timeline: 24h review window (can delegate if unavailable)
- Approval Signal: "Azure Maps implementation reviewed — approved by Niobe"

**When to Ask Trinity:**
- MCP schema design questions (tool descriptions, parameter naming)
- TypeScript implementation patterns
- Error envelope structure decisions

**Why This Matters:**
- This incident: Trinity implemented v1 alone → 2 critical bugs I found in 1 hour of research
- Root cause: No collaboration protocol existed
- Solution: Specialist review is now mandatory, not optional
- My history file was empty until this research = warning sign I wasn't being consulted

**Key Learning:** Empty history files signal specialists not being engaged. Domain experts must review their domains.
| "Map with route overlay" | 1. Route POST → 2. Static Map (pins + path geometry) |
| "Timezone for location" | 1. Geocode address → 2. Timezone (coordinates) |

#### Quick Reference for Trinity Consultations

**Route API Checklist:**
- ✅ Endpoint: `/route/directions/json`
- ✅ Method: POST with GeoJSON body
- ✅ Coordinates: `[longitude, latitude]`
- ✅ Properties: `pointIndex`, `pointType: "waypoint"`

**Static Map Pin Format:**
- ✅ Format: `pins=style||lon lat|lon lat`
- ✅ Separator: SPACE (not comma)
- ✅ Order: longitude FIRST

**Coordinate Validation:**
- Latitude: -90 to +90
- Longitude: -180 to +180
- Always validate before API calls

#### Research Tools Used

- Azure MCP Documentation tool (`mcp_azure_mcp_documentation`)
- Official Microsoft Learn documentation
- API migration guides (Bing Maps → Azure Maps)
- SDK reference documentation

#### Next Steps

- Join all-squad meeting to discuss methodology gaps
- Help Trinity implement fixes for Route and Static Map APIs
- Validate geospatial correctness in all implementations
