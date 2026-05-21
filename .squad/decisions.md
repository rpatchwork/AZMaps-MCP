# Squad Decisions

## Active Decisions

### AD-001: Bicep over Terraform for IaC

**Date:** 2026-05-20  
**Status:** Proposed  
**Decider:** Morpheus  
**Consulted:** Pending (Neo review requested)

**Context:** AZMaps-MCP requires Infrastructure as Code for deploying Azure Maps service with toggleable parameters (SKU, scale, features). Must choose between Bicep and Terraform.

**Decision:** Use **Bicep** as the primary IaC tool for this project.

**Rationale:**
- Native Azure tooling with first-class support from Microsoft
- Strong type checking and compile-time validation
- Azure Maps resource definitions are well-maintained and up-to-date
- Simpler syntax for Azure-specific resources
- Can leverage Azure Verified Modules (AVM) for best practices
- Better error messages and IntelliSense support in VS Code
- No state management complexity (handled by ARM)

**Consequences:** Faster development with better tooling, easier maintenance with Azure-native patterns, simpler CI/CD integration. Team must learn Bicep syntax. Cannot reuse if project expands to multi-cloud.

**Implementation Notes:** Use modular structure (`/infra/modules/`), separate parameter files for dev/prod environments, leverage bicepparam files for type-safe parameters, consider Azure Verified Modules for Maps account deployment.

**Related:** See STRATEGY.md Part 1.1 for detailed structure. Related to AD-003 (Managed Identity) for authentication patterns.

---

### AD-002: Node.js/TypeScript for MCP Server

**Date:** 2026-05-20  
**Status:** Proposed  
**Decider:** Morpheus  
**Consulted:** Pending (Niobe review requested)

**Context:** MCP Server must implement Model Context Protocol and interact with Azure Maps JavaScript SDK. Must choose runtime and language.

**Decision:** Use **Node.js with TypeScript** for the MCP Server implementation.

**Rationale:**
- Azure Maps JavaScript SDK is first-class and well-maintained by Microsoft
- Strong MCP protocol support in Node.js ecosystem
- TypeScript provides type safety for quality requirements
- Rich ecosystem for building API servers (Express, Fastify)
- Excellent async I/O model for API gateway pattern
- Strong tooling (VS Code, ESLint, Jest)
- Fast development iteration

**Consequences:** Fast development velocity with TypeScript, direct use of official Azure Maps SDK, rich ecosystem for testing and tooling. May need optimization for high-scale scenarios (addressed via caching and connection pooling). Slightly higher resource costs than compiled languages.

**Implementation Notes:** Use TypeScript strict mode for maximum safety, Zod for runtime schema validation, Jest for testing framework, ESLint + Prettier for code quality, esbuild or tsx for fast development builds.

**Quality Assurance:** This decision directly supports quality definition in STRATEGY.md Part 2.2 through type safety via TypeScript strict mode, strong ecosystem for testing (Jest, Supertest), excellent debugging support in VS Code, and clear error handling patterns.

**Related:** See STRATEGY.md Part 2.1 for architecture details. Related to AD-004 (caching strategy) and AD-005 (phased tool rollout).

---

---

## AD-003: V1 Primitive Scope — Azure Maps MCP Server

**Date:** 2026-05-21  
**Decided by:** Morpheus (Lead)  
**Authority:** User directive after team REST API audit  
**Status:** 🔒 LOCKED — Implementation may proceed

### Context

Team completed comprehensive Azure Maps REST API audit (Niobe), MCP tool design evaluation (Trinity), strategic scope review (Morpheus), and testing analysis (Tank). User approved Trinity's refinements with explicit guidance: include timezone, exclude route matrix (demand-driven), prioritize batch operations and parameterization.

### V1 Primitives (7 tools)

#### 1. `maps_search_address` (Geocode)
**REST Endpoint:** `GET /search/address/json`  
**Purpose:** Convert address string to coordinates  
**Inputs:** address (string), optional: country_filter, max_results  
**Outputs:** { coordinates, formatted_address, confidence }  
**Priority:** P0 (Critical)

#### 2. `maps_batch_geocode` (Batch Geocoding)
**REST Endpoint:** `POST /search/address/batch/json`  
**Purpose:** Convert array of addresses to array of coordinates (Trinity recommendation)  
**Inputs:** addresses (string[])  
**Outputs:** { results: [{ address, coordinates, formatted_address, confidence }] }  
**Priority:** P0 (Critical) — Multi-stop itinerary planning  
**Rationale:** Prevents N sequential calls for N-stop trips

#### 3. `maps_reverse_geocode`
**REST Endpoint:** `GET /search/address/reverse/json`  
**Purpose:** Convert coordinates to address  
**Inputs:** latitude, longitude  
**Outputs:** { address, components }  
**Priority:** P1 (Nice-to-have)

#### 4. `maps_search_nearby` (POI Search)
**REST Endpoint:** `GET /search/poi/json`  
**Purpose:** Find points of interest by category near location  
**Inputs:** latitude, longitude, category, radius, **maxResults** (default: 10, max: 100)  
**Outputs:** { pois: [{ name, category, coordinates, distance }] }  
**Priority:** P0 (Critical)  
**Trinity refinement:** maxResults parameter prevents token waste

#### 5. `maps_calculate_route`
**REST Endpoint:** `POST /route/directions/json`  
**Purpose:** Calculate driving route with waypoints  
**Inputs:** waypoints (coordinates[]), vehicle_type, avoid_options, traffic_enabled, **outputLevel** (summary|detailed|full)  
**Outputs:**   
  - summary: { distance_meters, duration_seconds, arrival_time }
  - detailed: + { legs[], summary_per_leg }
  - full: + { turn_by_turn_instructions[], geometry }  
**Priority:** P0 (Critical)  
**Trinity refinement:** outputLevel prevents 5KB JSON dumps when agents only need summary stats

#### 6. `maps_get_timezone`
**REST Endpoint:** `GET /timezone/byCoordinates/json`  
**Purpose:** Get timezone information for coordinates  
**Inputs:** latitude, longitude, timestamp (optional)  
**Outputs:** { timezone_id, utc_offset, dst_active }  
**Priority:** P1 (Nice-to-have) — Cross-timezone trip planning  
**Rationale:** Professional itineraries need accurate timezone handling (Seattle→Denver, LA→Phoenix)

#### 7. `maps_render_static_map`
**REST Endpoint:** `GET /map/static/png`  
**Purpose:** Generate static map image with route + POI overlay  
**Inputs:** center, zoom, route_geometry (optional), pins (optional), size  
**Outputs:** PNG image (base64 or URL)  
**Priority:** P1 (Nice-to-have)

### Error Handling (Trinity Standard)

All primitives return structured errors:
```json
{
  "success": false,
  "error": {
    "code": "GEOCODE_NO_RESULTS",
    "message": "Address not found",
    "retryable": false
  }
}
```

### Deferred to V2 (Demand-Driven)

- **Route matrix** (origin-destination pairs) — Fleet routing, not core travel agent need. User: "consuming agents can signal demand if batch capabilities and business logic aren't enough"
- Weather forecasts — Nice-to-have, not essential for planning
- Traffic incidents — Day-of-travel feature
- Search along route corridor — Can work around with POI search + distance filter

### Deferred to V3+

- TSP waypoint optimization (compute-heavy)
- Multi-day route segmentation
- GeoJSON export/import

### Implementation Handoff

**To Neo (Cloud Engineer):**
- Build Bicep templates for: Azure Maps Gen2 account, Container Apps environment + app
- Configure: Public endpoint, API key for dev (.env + .gitignore), Managed Identity for prod (deferred)
- Expose 7 HTTP endpoints via Container Apps ingress

**To Trinity (Backend Dev):**
- Implement TypeScript HTTP client wrapper for 7 REST endpoints
- Implement Zod schemas for inputs/outputs
- Implement error envelope standardization
- Implement MCP server with 7 tool definitions
- Follow outputLevel and maxResults parameter conventions

**To Tank (Tester):**
- Design test cases for all 7 primitives
- Edge cases: ambiguous addresses, impossible routes, zero POI results, timezone edge cases
- Integration tests with real Azure Maps API
- Performance validation: geocode <500ms, route <2s, map <3s

### Timeline

- **V1 implementation:** 2-3 weeks (7 primitives)
- **V2 planning:** After v1 ships, based on consuming agent demand signals

### Success Criteria

Travel agents can:
1. ✅ Geocode multi-stop itineraries (batch)
2. ✅ Calculate driving routes with waypoints
3. ✅ Find POIs near waypoints
4. ✅ Handle cross-timezone trips
5. ✅ Generate map visualizations (optional)

---

## Governance

- All meaningful changes require team consensus
- Document architectural decisions here
- Keep history focused on work, decisions focused on direction

---

## 2026-05-21: Azure Maps Infrastructure Decisions (v1)
**By:** rpatchwork (via Morpheus)
**Context:** Neo needed clarification on deployment target, authentication, SKU, and networking

**Decisions:**

1. **SKU/Tier:** Gen2 (only supported tier for this use case)
   - Gen1 is not an option for us
   - Start with Gen2, evaluate pricing tier as we understand transaction volume

2. **Networking:** Public endpoint
   - No private endpoint or VNet integration needed for v1
   - Travel agent access pattern supports public endpoint

3. **Authentication - Development:**
   - API key for local development and testing
   - **SECURITY REQUIREMENTS:**
     - API key must NOT be published to GitHub
     - API key must NOT appear in logs or any data streams in the repo
     - Use `.env` file with `.gitignore` protection
     - Squad members need access but it stays out of version control

4. **Authentication - Production:**
   - Managed Identity for MCP server → Azure Maps calls
   - **NOT IN SCOPE YET** - we're still defining objectives
   - No action on production scenarios until problem statement is complete

**Implications:**
- Neo can proceed with Gen2 Bicep templates
- Need `.env` + `.gitignore` setup for API key protection
- Dev deployment targets local MCP server first
- Production design deferred until objectives are locked

**Why:** 
- Gen2 is the supported tier for our requirements
- Public endpoint simplifies v1 while meeting travel agent needs
- API key enables fast dev/test iteration with proper security controls
- Managed Identity deferred until we're ready for production deployment

---

## 2026-05-21: SDK Selection - Direct REST APIs over Deprecated SDK
**Decider:** Niobe (Geospatial Engineer)
**Consulted:** Morpheus (strategic), Neo (deployment), Trinity (implementation)
**Status:** Approved

**Decision:** Use Azure Maps REST APIs directly without SDK wrapper

**Context:** MCP server needs to call Azure Maps services. Available options:
- Web SDK (azure-maps-control): Browser-only, requires DOM
- JavaScript SDK (azure-maps-rest): Deprecated, retires 9/30/26
- Direct REST APIs: Current, supported, server-compatible

**Rationale:**
- Web SDK is incompatible with Node.js backend (DOM dependencies)
- JavaScript SDK creates immediate technical debt (4 months to retirement)
- REST APIs are future-proof and align with "primitives first" principle
- Travel agents need route data (JSON), not interactive map rendering

**Implementation:**
- Build custom TypeScript HTTP client wrapper (~100-200 lines)
- Use native Node.js 20 `fetch` (no dependencies)
- Support dual auth: API key (dev) + Managed Identity (prod)
- Implement retry logic with exponential backoff

**Trade-offs:**
- ✅ Future-proof, no migration needed
- ✅ Full control over types and error handling
- ⚠️ Team writes HTTP client wrapper (but increases quality through explicit control)

---

## 2026-05-21: Deployment Target - Azure Container Apps
**Decider:** Niobe (Geospatial Engineer)
**Consulted:** Morpheus (strategic), Neo (deployment), Trinity (implementation)
**Status:** Approved

**Decision:** Deploy MCP server to Azure Container Apps with minReplicas: 1

**Context:** MCP servers are long-lived HTTP APIs requiring immediate response (<1s). Must choose between Functions, Container Apps, or App Service.

**Rationale:**
- MCP servers are NOT event-driven functions (they are request-response HTTP APIs)
- Cold starts (1-3s on Functions) break LLM tool invocation UX
- Container Apps with minReplicas: 1 = always-warm, zero cold starts
- Pattern match: Container Apps designed for containerized HTTP APIs
- Cost efficient: ~$30-50/month baseline + autoscale on traffic

**Why NOT Functions:**
- Functions optimize for workloads that tolerate cold starts
- Premium Functions would work but cost more than Container Apps
- Functions add binding abstractions not needed for Express.js apps

**Implementation:**
- Dockerfile with multi-stage build (TypeScript → Node.js runtime)
- Base image: node:20-alpine
- Container Apps configuration: 0.5 CPU, 1GB memory, port 3000
- Bicep modules: container-app.bicep, container-registry.bicep

**Trade-offs:**
- ✅ No cold starts, autoscales, portable
- ⚠️ Baseline cost for 1 always-running replica
- ⚠️ Requires Dockerfile + ACR (but AD-002 already chose Node.js/TypeScript)

---

## 2026-05-21: V1 Scope Strategy - Travel Agent MCP Primitives
**Decider:** Morpheus (Lead)
**Status:** Final Scope Approval
**Context:** Strategic review following Niobe's REST API audit and travel agent use case clarification

**Summary:** v1 scope remains 5 core primitives with strict MVP discipline. No scope expansion needed - primitives are correctly atomic and composable.

**Approved v1 Scope:** geocoding, POI search, route directions, static map generation, timezone support

**Prioritization:**
- P0 (v1 Blockers): Route directions, geocoding, POI search
- P1 (v1 Nice-to-Have): Reverse geocode, static maps, timezone
- P2 (v2 Candidates): GeoJSON transforms, route alternatives, fuzzy search
- P3 (v3+ Future): TSP solver, route corridor search, multi-day segmentation

**Deferred to v2:** GeoJSON transforms, route alternatives, fuzzy search, POI details

**Deferred to v3+:** TSP waypoint optimization, route corridor POI search, third-party ratings

**Timeline:** 2-3 weeks for MVP implementation

**Related:** niobe-rest-api-audit-v1-primitives.md, trinity-mcp-tool-design-evaluation.md

---

## 2026-05-21: Phase 1 Pure Native Primitives - Route Implementation
**Analyst:** Niobe (Geospatial Engineer)
**Context:** Native route capabilities vs derived values

**Decision:** Phase 1 (v1.0) implements get_route_directions with pure native primitives only

**What's Native:**
- Waypoint sequence (optimizedWaypoints[])
- Segment breakdown per leg
- Segment and total time/distance
- Traffic delays
- Arrival/departure times (ISO 8601 UTC)
- Route geometry (legs[].points[])
- Turn-by-turn directions (guidance.instructions[])

**What's NOT Native (Deferred to Phase 2):**
- Bounding box calculation (min/max lat/lon from points)
- GeoJSON FeatureCollection wrapper
- MultiLineString geometry format
- Coordinate format conversion (lat/lon → lon/lat)

**Phase 2 (v1.1):** Add get_route_geojson as separate tool with bounding box and GeoJSON formatting

**Rationale:**
- Phase 1 is bulletproof - no computation, no assumptions
- Phase 2 uses Phase 1's proven foundation
- Each phase adds value without risk
- Aligns with "primitives first", "build on simpler capabilities", "don't break what works"

---

## 2026-05-21: MCP Tool Design Standards
**Author:** Trinity (Backend Dev)
**Status:** Approved standards for v1 implementation

**Composability:** ✅ Strong chaining potential - coordinate passthrough, hierarchical refinement, clear data flow

**Granularity Refinements:**
1. **POI Search:** Add maxResults parameter (default: 10) to prevent 100+ POI token dumps
2. **Route Output:** Add outputLevel parameter (summary/detailed/full) - 95% token reduction for summary mode

**Input/Output Standards:**
- Standardize coordinate format: { latitude: number, longitude: number }
- Add Zod schemas with descriptive error messages
- Document category taxonomy, radius limits, waypoint limits in tool descriptions

**Error Handling Standard:**
`
{
  success: boolean,
  data?: T,
  error?: {
    code: string,
    message: string,
    retryable: boolean,
    retryAfter?: number
  },
  metadata?: {
    requestId: string,
    timestamp: string,
    cacheHit?: boolean
  }
}
`

**Key Insight:** 200 OK with empty results ≠ error. Distinguish hard errors (retryable/non-retryable) from soft errors (empty results with explanation).

**Missing Primitive:** Add maps_batch_geocode to v1 (travel agents build 10-stop itineraries, 10 sequential calls = 10x latency)

**Implementation Answers:**
- HTTP Client: Native Node.js 20 fetch with p-retry library
- Types: Hand-write for v1 (Azure Maps has no OpenAPI spec)
- Auth: Support both API key (dev) and Managed Identity (prod) with config flag
- Retry: Use p-retry with exponential backoff, respect Retry-After header
- Static maps: URL-only for v1 (simpler, cacheable), base64 in v2 if requested

**Estimate:** Custom HTTP client wrapper = ~100-200 lines of typed code

---

## 2026-05-21: Testing Strategy for V1 Primitives
**Author:** Tank (Tester)
**Status:** Analysis Complete

**Testability Assessment:**
- maps_search_address: EXCELLENT (deterministic, quantifiable)
- maps_reverse_geocode: EXCELLENT (deterministic, no ambiguity)
- maps_search_nearby: MODERATE (quality validation complex)
- maps_get_route: GOOD (quantifiable metrics)
- maps_render_static_map: CHALLENGING (visual output, binary data)

**Critical Test Cases:**
- Address ambiguity (multiple cities, same street name)
- International format variations (US/UK/Japan)
- Invalid coordinates (lat > 90, lon > 180)
- Impossible routes (ocean crossings)
- Waypoint limits (150 max, 151 should error)
- POI search in rural areas (zero results is valid)
- Static map visual regression

**Edge Cases:**
- Zero waypoints, one waypoint (errors)
- 150 waypoints (valid max), 151 waypoints (exceeds limit)
- Duplicate consecutive waypoints
- Border crossings
- Closed roads with traffic-aware routing

**Static Map Testing:**
- Approach 1: Pixel difference (fragile)
- Approach 2: Perceptual hashing (robust)
- Approach 3: Structural validation (pragmatic) ← **Recommended for v1**

**Success Criteria:**
- Coordinates within 0.01° of expected location
- All POI positions within search radius
- Route geometry connects all waypoints in order
- Number of legs = waypoints - 1
- Returns valid PNG (magic bytes check)
- Image dimensions match request

**Recommendation:** Golden test pattern for POI quality - capture known-good result sets, test for regressions

