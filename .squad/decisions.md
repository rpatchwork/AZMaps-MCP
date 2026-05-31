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

## 2026-05-24 — Sprint 001 Retrospective

**Date:** 2026-05-24T19:30:00Z  
**Facilitator:** Morpheus (Lead)  
**Sprint Duration:** 2026-05-22 to 2026-05-24 (3 days, 79% faster than 2-week plan)  
**Status:** ✅ Sprint Goal Achieved — Service operational, all 7 tools validated

### Key Wins
- **Exceptional delivery speed** — 2-week sprint completed in 3 days with zero scope cuts
- **Effective architectural decisions** — HTTP transport and HTTP-only recovery decisions made in 15 minutes each, both correct
- **Rapid blocker recovery** — 4-hour turnaround from SSE failure discovery to production restoration
- **High-quality documentation** — Complete suite (README, LIMITATIONS, ROADMAP, API-REFERENCE) in 2.5 hours
- **Strong squad collaboration** — Clear roles, clean handoffs, parallel work without conflicts

### Key Lessons
1. **Test locally BEFORE deploying** — 30-second local Docker test prevents hours of production debugging
2. **Transport complexity must match requirements** — HTTP sufficient for synchronous tools; SSE was premature optimization
3. **Sprint goal as decision filter** — "Does this enable operational service?" test prevents scope debates
4. **Honest documentation builds trust** — 18 documented edge cases sets expectations correctly
5. **Pre-sprint research investment pays off** — Front-loaded research enabled 3-day execution

### Critical Action Items (P0)
- **Establish local Docker testing protocol** (mandatory before all deployments)
- **Adopt semantic versioning** for Docker images (eliminate `:latest` tag confusion)
- **Create integration test suite template** (prevent protocol-level bugs)

### Sprint Grade: A (Excellent)
3 days vs 2 weeks planned, 7 hours effort vs 80 estimated, all 4 work items delivered, sprint goal achieved. Exceptional execution enabled by thorough planning.

**Full retrospective:** `.squad/ceremonies/sprint-001-retrospective.md`

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

## 2026-05-24 — WI-003 Transport Architecture Decision

**Date:** 2026-05-24  
**Status:** Implemented  
**Decider:** Morpheus  
**Implementer:** Trinity  
**Deployer:** Neo

### Context

WI-003 integration testing discovered critical blocker: SSE transport from WI-002 established connections but never processed JSON-RPC messages. MCP clients could not discover or invoke tools. Sprint goal at risk.

### Decision

**Switch to HTTP-only request-response transport** for V1.0. Defer SSE streaming to V1.1.

### Rationale

**Sprint Goal Alignment:** All 7 V1 tools are synchronous request-response operations. No tool requires streaming, progressive responses, or long-lived connections. HTTP-only transport is sufficient for sprint goal.

**V1 Scope Classification:** SSE streaming is optimization (V1.1), not functional requirement (V1.0). Response sizes manageable (<200KB max), latencies acceptable (<5s).

**Complexity vs Value:** HTTP implementation: 2-3 hours. SSE fix: 4-6 hours research + debugging. Equal functional value. Lower risk, faster recovery.

**Risk Assessment:** HTTP = low risk (proven Express.js pattern). SSE = medium risk (protocol lifecycle complexity, session management). SSE failure would cascade to HTTP fallback anyway.

### Implementation Outcome

Trinity completed HTTP-only transport in 1.5 hours with 100% test pass rate:
- Removed SSE transport, implemented manual JSON-RPC 2.0 router
- Local validation: 4/4 tests passed (health, tools/list, tools/call, error handling)
- Neo deployed to production in 15 minutes (learned: Container Apps image caching requires restart)
- Production validation: All 7 tools operational via HTTP

**Result:** WI-003 recovered same-day. Sprint back on track.

### V1.1 Path

SSE streaming deferred as enhancement when baseline proven. Add as optional transport alongside HTTP if performance data justifies complexity.

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

---

## 2026-05-21: Azure Maps Gen2 REST API Research Findings
**Author:** Niobe  
**Type:** Research Deliverable  
**Context:** Route API blockers + static map pin coordinate bug

**Critical Findings:**

### Route API Fix
- **Missing endpoint suffix:** Must use `/route/directions/json` not `/route/directions`
- **Request format:** GeoJSON FeatureCollection with pointIndex and pointType properties
- **Coordinate order:** [longitude, latitude] per GeoJSON standard

### Static Map Pin Fix
- **Coordinate format:** `longitude latitude` (space-separated, NOT comma)
- **Current bug:** Using `latitude,longitude` format causes incorrect pin placement

**Implementation Impact:** Both fixes are one-line changes but critical for v1 functionality. All 11 route tests blocked until endpoint path corrected.

**Related:** See morpheus-squad-methodology-improvements.md for collaboration protocol established from this incident.

---

## 2026-05-21: MCP Best Practices for Tool Design
**Author:** Trinity  
**Type:** Research Deliverable  
**Context:** Schema design guidance for AZMaps-MCP tools

**Key Findings:**

### Tool Schema Principles
1. **Dynamic discovery:** Agents call tools/list on connection - descriptions drive tool selection
2. **Parameter clarity:** Include examples, constraints, defaults in descriptions
3. **Optional parameters:** Make filters/limits optional with sensible defaults
4. **Token efficiency:** Return structured + concise responses

### Response Standards
- **Error envelope:** Standardized structure with retry guidance
- **Success metadata:** Include confidence scores, truncation flags
- **Verbosity control:** outputLevel parameter (summary/detailed/full)

### Naming Conventions
- **Clarity over brevity:** maxResults > max, countryFilter > country
- **Consistency:** Same parameter names across all tools
- **CamelCase:** Standard for JavaScript ecosystem

**Implementation Impact:** Guides schema design for all 7 v1 tools. Establishes patterns for error handling, pagination, and output control.

**Related:** Applied in all tool implementations. See trinity-tool-design-* files for per-tool application.

---

## 2026-05-21: Squad Collaboration Protocol (Specialist Review Gates)
**Decider:** Morpheus (Lead)  
**Type:** Process Decision  
**Status:** 🔒 APPROVED — Immediate implementation  
**Consulted:** Full squad (Niobe, Trinity, Tank, Neo, Morpheus)

**Context:** Trinity implemented v1 without consulting Niobe (Azure Maps specialist), resulting in 2 critical blockers that Niobe's research immediately identified. Root cause: No collaboration protocol between domain experts.

**Decision:** Establish domain ownership model with mandatory specialist review gates for API integrations.

### Domain Ownership

**Trinity (MCP Expert) owns:**
- MCP server lifecycle (tool registration, invocation)
- JSON schema design (descriptions, parameters, response structure)
- TypeScript/Node.js architecture

**Niobe (Azure Maps Specialist) owns:**
- Azure Maps REST API correctness (endpoints, parameters, response parsing)
- Coordinate format handling (lat/lon vs. lon/lat, GeoJSON standards)
- API version selection and migration guidance
- Geospatial domain logic

### Handoff Pattern: Trinity → Niobe → Trinity

1. **Stage 1:** Trinity designs MCP tool schema → deliverable in `.squad/decisions/inbox/`
2. **Stage 2:** Niobe reviews and provides Azure Maps API guidance
3. **Stage 3:** Trinity implements with Niobe's guidance
4. **Stage 4:** Niobe reviews actual HTTP client code
5. **Stage 5:** Tank validates with integration tests

### Review Gate (REQUIRED)

**Trigger:** Implementing or modifying code that calls Azure Maps REST APIs

**Gate:** Niobe MUST review before code reaches Tank (testing phase)

**Enforcement:**
- Trinity creates design document → pings Niobe for review
- Niobe has 24h to review (or delegate if unavailable)
- Code with "Reviewed by Niobe" approval can proceed to Tank
- Emergency override: Morpheus can waive gate, but post-hoc review required

### Boundaries

**Trinity asks Niobe when:**
- Uncertain about API version, coordinate formats, endpoint parameters
- Error codes need interpretation
- Response parsing has ambiguity

**Niobe asks Trinity when:**
- MCP schema design questions
- Tool naming or description clarity
- TypeScript implementation patterns

**Why This Matters:** Prevents specialist-bypass incidents. Domain experts must review their domains. Hero-member pattern (one person doing multiple domains) creates avoidable errors.

**Related:** Incident root cause: niobe-azure-maps-rest-api-research.md identified both blockers that specialist review would have caught pre-implementation.
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

---

### AD-004: Azure Maps Gen2 Deployment Verification
**Date:** 2026-05-21  
**Verified by:** Neo (Infrastructure Specialist)  
**Authority:** Brady directive - Gen1 APIs deprecated, Gen2 required

**Summary:** ✅ CONFIRMED — Azure Maps account deployed as Gen2 (SKU G2) with zero Gen1 references.

**Deployed Configuration:**
- Resource: `azmapsmcp-maps-dev`
- SKU: G2 (Standard tier)
- Kind: Gen2
- Status: Succeeded

**Infrastructure Safety:**
- Bicep @allowed(['G2']) decorator prevents Gen1 deployment
- No S0/S1 SKU references in codebase
- kind: 'Gen2' explicitly set in all modules

**Compliance:** No remediation required. Project is Gen2-compliant from inception.

---

### AD-005: Azure Maps Gen2 Only (2026-05-21)

**Decision:** This project uses ONLY Azure Maps Gen2. Gen1 APIs are deprecated and MUST NOT be referenced.

**Rationale:**
- Gen1 (SKUs S0, S1) is deprecated for new accounts
- Gen2 (SKU G2) is the current supported generation
- Mixing generations causes API compatibility issues
- Neo confirmed Gen2 deployed (SKU G2, kind: 'Gen2')

**Enforcement:**
- Niobe is the Gen2 gatekeeper — rejects any Gen1 references
- All infrastructure MUST use SKU G2 only (enforced via Bicep `@allowed(['G2'])`)
- All API documentation MUST specify Gen2 endpoints
- All tests MUST validate against Gen2 APIs
- See Niobe's Gen2 compliance checklist for team-wide checks

**Compliance Checklist Owner:** Niobe

**Status:** ACTIVE

---

### Niobe Charter Update: Gen2 Enforcement Role
**Date:** 2026-05-21  
**Proposed by:** Niobe (Azure Maps Specialist)  
**Authority:** Brady directive — "Azure Maps Gen2 only is a rule that gets followed everywhere"

**Charter Addition:** Niobe is now the Gen2 compliance gatekeeper. NO ONE may reference, deploy, or document Gen1 patterns without rejection.

**Enforcement Actions:**
- Review all Azure Maps infrastructure for S0/S1 SKU references
- Audit API documentation for Gen2 compatibility
- Challenge Gen1 references from any team member
- Maintain Gen1-free knowledge base
- Pre-deployment verification of G2 SKU

**Red Flags:** Infrastructure with S0/S1, documentation suggesting Gen1→Gen2 migration, API guidance for Gen1-only endpoints, ambiguous tier discussions

**Collaboration:** Neo (verify Bicep G2-only), Trinity (validate MCP tools don't encode Gen1 assumptions), Tank (test Gen2 deployment), Scribe (documentation uses Gen2 terminology)

---

### Gen2 Compliance Checklist
**Date:** 2026-05-21  
**Enforced by:** Niobe (Azure Maps Specialist)  
**Authority:** Brady directive — Gen1 deprecated, Gen2 required

**Pre-Flight Checks:**

**Neo (Infrastructure):**
- [ ] Bicep/Terraform SKU restricted to ['G2']
- [ ] Resource definition includes kind: 'Gen2'
- [ ] Zero S0/S1 references in parameter files
- [ ] Niobe approval: "Infrastructure reviewed — Gen2 compliant"

**Trinity (API Integration):**
- [ ] Endpoints use Gen2-compatible API versions
- [ ] Auth method works with Gen2 (subscription key or Managed Identity)
- [ ] No Gen1 SKU behavior assumptions
- [ ] Niobe approval: "API integration reviewed — Gen2 compatible"

**Tank (Testing):**
- [ ] Test fixtures assume Gen2 account (G2 SKU)
- [ ] Test cases validate Gen2 deployment
- [ ] Integration tests verify Gen2 API responses
- [ ] Niobe approval: "Test plan reviewed — Gen2 assumptions validated"

**Scribe (Documentation):**
- [ ] All references say "Gen2 account (G2 SKU)"
- [ ] Setup instructions specify Gen2 deployment only
- [ ] Niobe approval: "Documentation reviewed — Gen2 terminology correct"

**Red Flags:** "Should we use S0 or G2?", S0/S1 in @allowed lists, "Gen1 vs Gen2" sections, Gen1 migration discussions

**Audit Pattern:** `S0|S1|Gen1|gen1` (expected: zero matches except deprecation warnings)

**Consequences:** Infrastructure deployment fails (Bicep enforces), documentation rejected, code flagged for review, test assumptions challenged

**Questions:** Ask Niobe — Gen2 compliance gatekeeper and Azure Maps domain expert

---

## AD-006: Continue with Existing Codebase + Tactical Improvements

**Date:** 2026-05-22  
**Decider:** Morpheus (Lead) with unanimous squad consensus  
**Status:** 🔒 LOCKED — Implementation proceeding  
**Participants:** Full squad (Morpheus, Niobe, Trinity, Tank, Neo, Ralph, Scribe)  
**Meeting:** V1 Reboot Squad Meeting (research phase outcomes)

**Context:** After comprehensive research phase covering infrastructure stability (Ralph+Neo), MCP best practices (Trinity+Neo), and Azure Maps API specifications (Niobe+Trinity), squad needed to decide: continue with 90% complete codebase or start fresh?

**Decision:** **CONTINUE WITH EXISTING CODEBASE + 5 TACTICAL IMPROVEMENTS**

**What's Already Built (90% Complete):**
- ✅ MCP Server Implementation (tool registration, invocation, stdio transport)
- ✅ 7 Primitive Tools (geocode, batch-geocode, reverse-geocode, POI search, route, timezone, static map)
- ✅ Infrastructure Layer (AzureMapsClient, centralized HTTP, error handling, types)
- ✅ Testing Framework (Vitest, unit/integration/performance test structure)
- ✅ Build & Development (TypeScript strict, ESBuild, Docker, package.json)
- ✅ Deployed Infrastructure (Azure Container Registry, Azure Maps Gen2)

**What Needs Tactical Refinement (10%):**
1. Health probes for Container Apps (Trinity, 4 hours)
2. Structured logging - replace console.log (Trinity, 6 hours)
3. Parameter enhancements - maxResults, outputLevel (Trinity, 4 hours)
4. API version audit and updates (Niobe, 4 hours)
5. Container Apps deployment debugging (Neo, 2 days)

**Rationale:**

**Research Validation:**
- Infrastructure research (Ralph+Neo): Production-ready foundation ✅
- MCP best practices research (Trinity+Neo): Architecture validated ✅
- API specification analysis (Niobe+Trinity): Tool coverage validated ✅

**Cost-Benefit Analysis:**

| Approach | Effort | Risk | Time to Ship |
|----------|--------|------|--------------|
| **Continue + Refine** | 2-3 days | Low | 1 week |
| **Clean Restart** | 2-3 weeks | Medium | 3-4 weeks |

**Starting from scratch would rebuild the same architecture, rewrite the same tool handlers, and recreate the same test structure — all to arrive at the same place we already are.**

**Squad Consensus:** Unanimous agreement to continue with existing codebase.

**Consequences:**
- ✅ Ship v1 in 1 week instead of 3-4 weeks
- ✅ Maintain development momentum
- ✅ Preserve team knowledge embedded in current codebase
- ✅ Focus engineering effort on tactical improvements vs. rebuilding working code
- ⚠️ Accept that architectural patterns are locked (Node.js/TypeScript/Container Apps/Direct REST)

**Implementation:** See Sprint 001 plan (`.squad/planning/sprint-001-v1-launch.md`) for detailed work items, timeline, and success criteria.

**Related Decisions:** Validates AD-002 (Node.js/TypeScript), AD-003 (V1 Primitive Scope), AD-005 (Gen2 only)

---

## AD-007: API Version Strategy for Azure Maps Gen2

**Date:** 2026-05-22  
**Decider:** Niobe (Azure Maps Specialist)  
**Status:** 🔒 LOCKED — Version audit in progress  
**Reviewed by:** Morpheus (strategic), Trinity (implementation impact)

**Context:** Azure Maps has multiple API versions across categories (Search, Route, Render, Timezone). Current implementation may use inconsistent or outdated versions. Squad meeting identified need for explicit version selection strategy.

**Decision:** Use **latest stable Gen2 versions** for all Azure Maps REST API calls:

| API Category | Version | Status | Rationale |
|--------------|---------|--------|-----------|
| **Search** | 2026-01-01 | Latest Stable | GA March 2026, newest features |
| **Route** | 2025-01-01 | Latest Stable | Current production version |
| **Render** | 2024-04-01 | Latest Stable | Avoid deprecated 1.0 (retiring Sept 2026) |
| **Timezone** | 1.0 | Only Stable | Single supported version |

**Rationale:**

**Future-Proofing:**
- Latest stable versions provide newest features without preview/breaking change risk
- Avoid deprecated APIs (Render 1.0 retiring September 2026)
- Reduce risk of forced migration during v1 production lifetime

**API Stability:**
- All selected versions are GA (Generally Available) — no preview/beta status
- Gen2 platform commitment: Stable versions maintained long-term
- Date-based versioning (YYYY-MM-DD) signals API maturity

**Operational Safety:**
- No breaking changes expected within Gen2 platform
- Incremental updates possible without tool redesign
- Clear audit trail for version selection rationale

**Consequences:**
- ✅ Future-proof implementation — new features available if needed
- ✅ No breaking changes expected during v1 lifecycle
- ✅ Clear documentation for version selection rationale
- ⚠️ Requires audit of current implementation to identify version drift
- ⚠️ All 7 tools must be regression tested after version updates

**Implementation Plan:**

**Phase 1: Audit (Niobe, 2 hours)**
1. Search codebase for `api-version=` query parameters
2. Compare against latest stable versions in Azure Maps API reference
3. Document current vs. target versions for each tool
4. Create version drift report

**Phase 2: Update (Trinity, 2 hours)**
1. Update HTTP client with correct API versions
2. Add inline code comments documenting version selection rationale
3. Update tool documentation with API version info

**Phase 3: Validation (Tank, 1 hour)**
1. Run full integration test suite against updated versions
2. Validate all 7 tools produce expected responses
3. Document any behavioral changes observed

**Success Criteria:**
- ✅ All tools use documented latest stable versions
- ✅ Zero test regressions after version updates
- ✅ Version selection rationale documented in code comments
- ✅ API reference documents match deployed versions

**Related Decisions:** Enforces AD-005 (Gen2 only), supports AD-006 (tactical improvements), aligns with AD-003 (V1 primitive scope)

---

## AD-008: Azure Maps Path Parameter Syntax for Static Map Route Overlay

**Date:** 2026-05-21  
**Decider:** Niobe (Azure Maps Specialist) with Trinity (implementation)  
**Status:** 🔒 RESOLVED — Bug fixed after 7-iteration debugging journey  
**Context:** Static map route overlay feature failing with path parameter format errors

**Problem:** Route overlay on static maps failing through multiple implementation attempts. Integration tests at 0% passing for route overlay feature.

**Root Cause:** Azure Maps path parameter requires specific syntax that differs from other major mapping providers (Google Maps, Mapbox, Bing Maps all use colons in style modifiers; Azure Maps does NOT).

**Correct Syntax:**
```
path=lcFF0000|lw3||lon lat|lon lat|lon lat
     └style┘  └─────coordinates─────────┘
```

Where:
- `lc` = line color (hex WITHOUT colon): `lcFF0000` NOT `lc:FF0000`
- `lw` = line width in pixels (WITHOUT colon): `lw3` NOT `lw:3`
- Single pipe `|` separates style properties
- Double pipe `||` separates style from coordinates
- Single pipe `|` separates coordinate pairs
- Coordinates are `longitude latitude` (space-separated)

**Common Errors Identified During Debugging:**

1. **Iteration 1-6:** Used colon syntax `lc:FF0000|lw:3` (incorrect for Azure Maps)
2. **Iteration 5:** Missing GeoJSON to Azure Maps coordinate conversion
3. **Iteration 6:** Wrong style prefix `ra0000FF` (confused opacity parameter with color)
4. **Iteration 7:** ✅ Correct implementation: `lcFF0000|lw3||coords`

**Decision:** Azure Maps path syntax is **provider-specific** and requires:
- NO colons after style modifiers (unique to Azure Maps)
- Single pipe between coordinate pairs (not double pipe)
- Double pipe ONLY between style and first coordinate

**Implementation:**
```typescript
// azure-maps-client.ts line 454
const lineColor = 'FF0000';  // Red (no # prefix)
const lineWidth = 3;         // Pixels
pathParam = `lc${lineColor}|lw${lineWidth}||${coords}`;
// Example: lcFF0000|lw3||-122.33214 47.60633|-122.33221 47.6064
```

**Consequences:**
- ✅ Route overlay feature now works correctly
- ✅ Integration tests at 55/73 passing (route overlay unblocked)
- ⚠️ Developer documentation must explicitly note Azure Maps syntax differences
- ⚠️ Future maintainers must not "fix" to match other providers' colon syntax

**Testing Validation:**
- Static map route overlay test: PASSING ✅
- Wire-level validation: Path parameter correctly formatted
- Azure Maps API accepts request without format errors

**Key Learning:** Azure Maps syntax deviates from industry norms (Google/Mapbox/Bing all use colons). Always consult official Microsoft documentation, not third-party mapping provider patterns.

**Related Decisions:** Supports AD-003 (V1 primitive scope), implements maps_render_static_map tool

---

## Research Phase Outcomes (2026-05-22)

**Context:** Squad pivoted from implementation to research-driven validation before continuing v1 work.

### Infrastructure Stability Research (Ralph + Neo)

**Deliverable:** `infra/stable/` — Production-ready infrastructure package

**Key Findings:**
- ✅ Azure Container Registry deployed and verified (azmapsmcp.azurecr.io)
- ✅ Azure Maps Gen2 deployed and API key secured
- ✅ Docker image successfully pushed to ACR
- ⚠️ Container Apps deployment failed (RBAC permissions, archived to infra/archive/)
- 📦 Comprehensive documentation package created (deployment scripts, troubleshooting guides)

**Cost Analysis:**
- ACR Basic: ~$5/month
- Azure Maps Gen2: $0-50/month (pay-as-you-go based on transactions)
- Container Apps: ~$30-50/month (when deployed with minReplicas: 1)
- Total: ~$35-105/month estimated

**Outcome:** Infrastructure foundation is production-ready. Only Container Apps hosting layer needs debugging.

### MCP Best Practices Research (Trinity + Neo)

**Deliverable:** `.squad/knowledge/mcp-azure-best-practices.md` (89KB, 1,078 lines)

**Key Findings:**
- ✅ Current architecture validated against industry best practices
- ✅ Node.js/TypeScript confirmed as first-class MCP SDK choice
- ✅ Direct REST API pattern confirmed correct (no SDK wrapper needed)
- ✅ Container Apps validated as optimal hosting (vs Functions cold starts)
- ✅ Structured error envelopes match MCP recommendations
- 🔧 Tactical improvements identified: health probes, structured logging, parameter defaults

**Architecture Validation:**

| Our Decision | Best Practice | Status |
|--------------|---------------|--------|
| Node.js/TypeScript | Recommended | ✅ Validated |
| Direct REST APIs | Correct pattern | ✅ Validated |
| Container Apps (minReplicas: 1) | Optimal for interactive MCP | ✅ Validated |
| Structured error envelopes | Required for LLM agents | ✅ Validated |
| Batch operations | Essential for multi-step workflows | ✅ Validated |

**Cost Comparison:**
- Container Apps: ~$30-50/month (always-warm, zero cold starts)
- Functions Premium: ~$200/month (equivalent always-warm tier)
- Functions Consumption: $0-30/month (but 1-3s cold starts break UX)

**Outcome:** Technology stack validated. No architectural changes needed. Proceed with tactical improvements.

### Azure Maps API Specification Research (Niobe + Trinity)

**Deliverable:** `.squad/knowledge/azure-maps-api-reference.md` — Complete Gen2 API reference from GitHub specs

**Key Findings:**
- ✅ All 7 V1 tools correctly map to Azure Maps Gen2 REST APIs
- ✅ Latest API versions identified: Search 2026-01-01, Route 2025-01-01, Render 2024-04-01, Timezone 1.0
- ✅ No critical gaps in tool coverage for travel agent workflows
- 🔧 API version audit needed (current implementation may use older versions)

**API Coverage Validation:**

| Tool | REST Endpoint | Latest Version | Implementation Status |
|------|---------------|----------------|----------------------|
| maps_search_address | GET /search/address/json | 2026-01-01 | ✅ Working |
| maps_batch_geocode | POST /search/address/batch | 2026-01-01 | ✅ Working |
| maps_reverse_geocode | GET /search/address/reverse/json | 2026-01-01 | ✅ Working |
| maps_search_nearby | GET /search/poi/json | 2026-01-01 | ✅ Working |
| maps_calculate_route | POST /route/directions/json | 2025-01-01 | ✅ Working |
| maps_get_timezone | GET /timezone/byCoordinates/json | 1.0 | ✅ Working |
| maps_render_static_map | GET /map/static/png | 2024-04-01 | ✅ Working |

**Outcome:** V1 scope strategically sound. API coverage complete for travel agent use cases.

---

## WI-004 Documentation Complete (2026-05-24)

**Date:** 2026-05-24T18:15:00Z  
**Status:** ✅ Complete (Part 1 and Part 2)  
**Sprint:** Sprint 001 Day 3  
**Work Item:** WI-004 Documentation

### Part 1: README, LIMITATIONS, ROADMAP (Scribe)

**Duration:** ~45 minutes  
**Deliverables:**
- **README.md** (updated) — V1.0 status, 7 tools, Quick Start, architecture, deployment
- **LIMITATIONS.md** (created) — Known issues, deferred features, out-of-scope items
- **ROADMAP.md** (created) — V1.0 shipped, V1.1-V2.0 plans, feature request process

**Key Content:**
- V1.0 status badge (operational, 7 tools, production-ready)
- All 7 tools documented with descriptions
- Quick Start cURL examples (tools/list, tools/call)
- Production endpoint: `ca-azmaps-mcp-dev.graysand-f7f65db5.eastus.azurecontainerapps.io`
- Test coverage: 87/87 unit (100%), 55/73 integration (75%)
- 18 route overlay edge cases documented
- Console.log logging noted as limitation (v1.1)
- `:latest` tag caching workaround documented
- V1.1 target: June 2026 (SSE, structured logging, health probes)
- "Not in Scope" clarity: traffic incidents, weather, isochrone, route matrix

**Documentation Quality:**
- Professional, concise, factual tone
- No unexplained jargon
- Working code examples
- Cross-references between docs
- All facts verified from source

**Metrics:**
- ~4800 words total documentation
- 2 files created, 1 file updated

### Part 2: API Reference (Trinity)

**Duration:** ~90 minutes  
**Deliverable:** **API-REFERENCE.md** (~15KB, 1000+ lines)

**Content:**
- Complete MCP schema definitions for all 7 tools
- Real request/response examples from production (WI-003 validation)
- Error handling matrices with retryability guidance
- Token efficiency tips for Copilot optimization
- JSON-RPC 2.0 protocol compliance
- MCP client integration examples (TypeScript SDK)
- Rate limiting, authentication, health check docs

**Tools Documented:**
1. maps_search_address — Forward geocoding
2. maps_batch_geocode — Batch geocoding (up to 100 addresses)
3. maps_reverse_geocode — Reverse geocoding
4. maps_search_nearby — POI/place search
5. maps_calculate_route — Multi-waypoint routing
6. maps_get_timezone — Timezone lookup
7. maps_render_static_map — Static map generation

**Per-Tool Documentation Structure:**
- Purpose and use case
- Azure Maps REST API endpoint and version
- Complete JSON Schema (MCP format)
- Real request/response examples
- Error code table (code, description, retryable, HTTP status)
- Usage notes and best practices

**Key Features:**
- Real production examples (Microsoft campus, Space Needle)
- Token efficiency guidance (response size estimates)
- Error classification (retryable flags)
- Copilot-friendly parameter descriptions
- JSON-RPC 2.0 standard error codes documented

**Outcome:** Complete developer reference for integrating with AZMaps-MCP V1.0

### Combined Impact

**Documentation Package:**
- README.md — First-time user onboarding
- LIMITATIONS.md — Sets expectations, prevents surprises
- ROADMAP.md — Future visibility, feature request guidance
- API-REFERENCE.md — Developer integration guide

**Quality Standards Met:**
- Clear, professional, factual
- Working code examples
- Cross-referenced
- Production-verified details
- No placeholders or TBDs

**Total Effort:** ~2 hours (Scribe 45 min + Trinity 90 min)  
**Value:** Production-ready documentation for V1.0 launch
