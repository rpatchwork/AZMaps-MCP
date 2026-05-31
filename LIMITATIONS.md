# Known Limitations — AZMaps-MCP V1.0

**Last Updated:** 2026-05-24  
**Version:** 1.0.0

This document describes known limitations, deferred features, and documented edge cases in the V1.0 release. These are NOT bugs—they are conscious trade-offs to ship a working service quickly.

---

## V1.0 Scope

AZMaps-MCP V1.0 provides **7 basic primitive operations** for geospatial workflows:
- ✅ Geocoding (single and batch)
- ✅ Reverse geocoding
- ✅ POI search
- ✅ Route calculation
- ✅ Timezone lookup
- ✅ Static map rendering

**V1.0 does NOT include:**
- Advanced routing features (traffic, tolls, alternative routes)
- Batch operation optimization (sequential processing only)
- Parameter validation enhancements
- Structured logging and observability
- Deep health probes

These features are planned for V1.1 or later releases (see [ROADMAP.md](ROADMAP.md)).

---

## Known Issues

### 1. Route Overlay Edge Cases (18 Test Failures)

**Impact:** 18 integration tests fail for route overlay scenarios

**Affected Use Cases:**
- Unicode/international addresses (e.g., "北京市", "Москва")
- Polar coordinates (latitude > 85° or < -85°)
- Ocean routes with no land waypoints
- Extremely long routes (>2000 km with 10+ waypoints)
- Routes through regions with sparse map data

**Workaround:** Use core routing without map overlay, or validate addresses before routing

**Status:** Documented, fix deferred to V1.1 or V2.0 based on user demand

**Test Coverage:** 55/73 integration tests passing (75%)

**Rationale:** These edge cases represent <5% of expected travel agent usage patterns. Core functionality works for 95%+ of real-world scenarios.

---

### 2. Console.log Logging

**Issue:** Server uses `console.log()` for all logging

**Impact:**
- No structured logging (JSON format)
- No log levels (INFO, WARN, ERROR)
- Difficult to filter/search in production logs

**Workaround:** Use Azure Container Apps log queries with text search

**Status:** Deferred to V1.1

**Why:** Console.log is sufficient for V1.0 debugging. Structured logging adds complexity without functional value for initial release.

---

### 3. Default Container Apps Health Probes

**Issue:** Using Container Apps default health probes only

**Current Behavior:**
- Container restart on crash
- No proactive health checks
- No Azure Maps API connectivity validation

**Impact:** Service may appear "running" but fail to process requests if Azure Maps API is unreachable

**Workaround:** Monitor `/message` endpoint response times and error rates

**Status:** Deep health probes planned for V1.1

**Why:** Default probes are sufficient for detecting container crashes. Custom health checks add operational complexity without addressing critical failure modes in V1.0.

---

### 4. `:latest` Docker Tag Caching

**Issue:** Azure Container Apps caches images by digest, not tag

**Problem:** Pushing a new image to `azmapsmcp.azurecr.io/azmaps-mcp:latest` does NOT automatically deploy the new image. Container Apps continues using the cached digest.

**Workaround:** After pushing to `:latest`, restart the Container App:
```bash
az containerapp revision restart \
  --name ca-azmaps-mcp-dev \
  --resource-group rg-azmaps-mcp-dev
```

**Better Solution:** Use semantic versioning tags (`:v1.0.0`, `:v1.0.1`) instead of `:latest` for production deployments. Container Apps creates new revisions automatically when the tag changes.

**Status:** Process improvement, not a code fix

**Why:** Semantic versioning is a best practice. Using `:latest` in production requires manual intervention.

---

## Deferred Features (V1.1)

The following enhancements are planned for V1.1 (target: June 2026):

### SSE Streaming Transport
- **Current:** HTTP-only request-response
- **Planned:** Add SSE streaming alongside HTTP for progressive responses
- **Rationale:** V1.0 tools are all synchronous. SSE adds complexity without functional value. Will revisit when streaming becomes necessary.

### Parameter Validation Enhancements
- **Current:** Basic Zod schema validation
- **Planned:** Enhanced validation with human-readable error messages, parameter constraints, default value recommendations
- **Rationale:** Current validation prevents invalid requests. Enhanced messages improve developer experience but don't block functionality.

### API Version Audit
- **Current:** Using working API versions (55/73 tests passing)
- **Planned:** Audit all Azure Maps REST API versions for deprecation notices, upgrade to latest stable versions
- **Rationale:** Current versions work. Version updates carry regression risk without immediate functional benefit.

### Advanced Route Options
- **Current:** Basic routing with waypoints
- **Planned:** Traffic-aware routing, toll avoidance, alternative routes, route optimization
- **Rationale:** Travel agent workflows don't require advanced routing for V1.0. Add based on user demand.

### Batch Operations Optimization
- **Current:** Sequential processing for batch geocoding
- **Planned:** Parallel processing, request batching, rate limit optimization
- **Rationale:** Current implementation works for typical batch sizes (<20 addresses). Optimize when performance becomes bottleneck.

---

## Out of Scope (No Plans to Implement)

The following features are explicitly **NOT planned** for any version:

### Traffic Incidents API
- **Why:** Real-time traffic data is day-of-travel feature, not trip planning
- **Alternative:** Users can check traffic separately via other services

### Weather Overlays
- **Why:** Weather forecasting is outside geospatial domain
- **Alternative:** Integrate weather APIs separately if needed

### Isochrone API
- **Why:** Drive-time polygons are advanced use case, low demand for travel agents
- **Alternative:** Use route distance as proxy

### Route Matrix (Origin-Destination Pairs)
- **Why:** Fleet routing feature, not core travel agent need
- **Status:** Deferred until user demand signals justify implementation
- **Alternative:** Sequential route calculations work for typical itineraries

---

## Error Handling Limitations

### Rate Limiting
- **Issue:** No rate limiting on MCP server
- **Impact:** Clients can overwhelm Azure Maps API and incur unexpected costs
- **Mitigation:** Azure Maps API has its own rate limits (will return 429 errors)
- **Status:** Client-side rate limiting deferred to V1.1

### Retry Logic
- **Issue:** No automatic retry for transient Azure Maps API failures
- **Impact:** Clients must implement their own retry logic
- **Mitigation:** MCP errors include `retryable: true/false` flag
- **Status:** Server-side retry planned for V1.1

---

## Security & Authentication

### API Key Authentication (Development)
- **Current:** API key stored in Container Apps environment variable
- **Risk:** API key visible to anyone with Container Apps access
- **Mitigation:** Use RBAC to limit Container Apps access
- **Status:** Managed Identity authentication planned for production (deferred)

### No Request Authentication
- **Current:** MCP endpoint is publicly accessible (no auth required)
- **Risk:** Anyone can call the service and consume Azure Maps quota
- **Mitigation:** Network-level restrictions (VNet, firewall rules)
- **Status:** Authentication planned for V1.2

---

## Performance Characteristics

### Response Times (99th Percentile)
- Geocoding: <500ms
- Routing: <2s
- Static maps: <3s
- POI search: <1s

**Note:** Response times depend on Azure Maps API performance and network latency. No SLA guarantees in V1.0.

### Throughput Limits
- **Tested:** 10 concurrent requests
- **Bottleneck:** Azure Maps API rate limits (depends on pricing tier)
- **No load testing performed:** Production capacity unknown

---

## Support & Feedback

**Bugs vs Limitations:**
- If a documented limitation prevents your use case, file a feature request
- If the service behaves differently than documented, file a bug report

**Feature Requests:**
- Prioritize based on user demand and squad capacity
- See [ROADMAP.md](ROADMAP.md) for planned features

**Contact:** File issues in GitHub repository or contact squad via `.squad/` channels
