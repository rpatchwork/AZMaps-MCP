# Consultation Request: Testing & Edge Cases Review

**From:** Niobe (Geospatial Engineer)  
**To:** Tank (Tester / Quality Assurance)  
**Date:** 2026-05-21  
**Re:** V1 Primitives — Testing Strategy, Edge Cases, Error Scenarios

---

## Context

I've audited Azure Maps REST APIs and propose **6 primitives for v1**. Full details in `.squad/decisions/inbox/niobe-rest-api-audit-v1-primitives.md`.

Need your QA perspective on testability, edge cases, and error scenarios before we finalize.

---

## Proposed V1 Primitives

1. `maps_search_address` — Geocode address → coordinates
2. `maps_reverse_geocode` — Coordinates → address
3. `maps_search_nearby` — Find POIs near location
4. `maps_calculate_route` — Multi-waypoint routing with optimization
5. `maps_route_matrix` — Calculate time/distance for all origin-destination pairs
6. `maps_get_timezone` — Get timezone info by coordinates
7. `maps_render_static_map` — Generate map image

---

## Testing Questions

### 1. Edge Cases — Coordinates

**Geographic Extremes:**
- **North/South Poles:** `(90.0, 0.0)` and `(-90.0, 0.0)` — Do Azure Maps APIs handle polar regions?
- **International Date Line:** `(0.0, 180.0)` and `(0.0, -180.0)` — Longitude wraparound
- **Middle of Ocean:** `(0.0, -150.0)` — No nearby roads or POIs
- **Antarctica:** `(-75.0, 0.0)` — Minimal road network

**Questions:**
1. Should primitives validate coordinate ranges (-90 ≤ lat ≤ 90, -180 ≤ lon ≤ 180)?
2. What should `maps_search_nearby` return for ocean coordinates? Empty list or error?
3. What should `maps_calculate_route` return if origin/destination have no road access?

---

### 2. Edge Cases — `maps_calculate_route`

**Waypoint Limits:**
- **Minimum:** 2 waypoints (origin + destination) — should validate
- **Maximum:** 150 waypoints — Azure Maps limit
- **Single Waypoint:** Error or treat as "no route needed"?

**Optimization Timeout:**
- Traveling salesman with 150 waypoints could take 30+ seconds
- Should primitive have timeout parameter? (e.g., "abort optimization after 15 seconds")
- What if optimization times out mid-calculation?

**Unreachable Locations:**
- Origin = island, Destination = landlocked continent → no ferry route
- Origin = Hawaii, Destination = Seattle → no driving route exists
- Expected error: `NoRouteFound` or `RouteCalculationFailed`

**Questions:**
1. Should we test with known-difficult scenarios (e.g., cross-country with 100 waypoints)?
2. What's acceptable optimization time? 10 seconds? 30 seconds? 60 seconds?
3. Do we fail fast if no route possible, or retry with relaxed constraints?

---

### 3. Edge Cases — `maps_route_matrix`

**Matrix Dimensions:**
- **1×1:** Single origin, single destination → Should we allow this? (Same as simple route)
- **1×100:** Single origin, 100 destinations → Asymmetric matrix
- **100×1:** 100 origins, single destination → Also asymmetric
- **10×10:** 100 pairs → Synchronous limit
- **50×50:** 2,500 pairs → Would exceed sync limit (need async)

**Partial Failures:**
- What if 98 out of 100 pairs succeed, but 2 fail (islands, unreachable locations)?
- Should entire matrix fail? Or return partial results with error list?

**Example:**
```
Origins: [Seattle, Honolulu, San Francisco]
Destinations: [Portland, Tokyo, Los Angeles]

Matrix Result:
[
  [OK, FAIL (no route), OK],        // Seattle row
  [FAIL (no route), FAIL, FAIL],    // Honolulu row (island!)
  [OK, FAIL (no route), OK]         // SF row
]
```

**Questions:**
1. How should we handle partial failures?
2. Should failed pairs return `null`, `{ error: "..." }`, or throw?
3. Do we test all 100 pairs, or fail fast after first error?

---

### 4. Edge Cases — `maps_search_nearby`

**No Results Scenario:**
- Search for "restaurants" in middle of Sahara Desert (radius = 50 km) → Empty list
- Search for "ski resorts" in Miami → Empty list

**Too Many Results:**
- Search for "gas stations" in downtown LA (radius = 10 km) → Could be 500+ results
- Should we cap at 100 results? Paginate?

**Ambiguous Category:**
- User searches for "food" → Should match restaurants, cafes, fast food, grocery stores?
- Or require specific category like "restaurant"?

**Questions:**
1. What's max result limit per search? 50? 100? 500?
2. Should empty results return `[]` or error?
3. How do we test POI coverage across different regions (US vs rural Africa)?

---

### 5. Edge Cases — `maps_get_timezone`

**Timezone Edge Cases:**
- **International Date Line:** `(0.0, 180.0)` vs `(0.0, -180.0)` — Different timezones but same meridian
- **DST Transitions:** What timezone offset on DST change day (spring forward / fall back)?
- **UTC Offset Extremes:** Some timezones are UTC+14 (Kiribati) or UTC-12 (Baker Island)

**Questions:**
1. Should primitive return DST-aware offset (changes twice/year) or standard offset?
2. Do we test DST transitions specifically (March/November in US)?
3. How do we validate timezone correctness without manual lookup?

---

### 6. Error Scenarios — API Failures

**Azure Maps Service Issues:**
- **401 Unauthorized:** Invalid subscription key
- **429 Too Many Requests:** Rate limit exceeded
- **500 Internal Server Error:** Azure service outage
- **503 Service Unavailable:** Temporary maintenance

**Network Issues:**
- **Timeout:** Request takes >30 seconds
- **Connection Refused:** Azure endpoint unreachable
- **DNS Failure:** Cannot resolve `atlas.microsoft.com`

**Invalid Inputs:**
- **Malformed Address:** `"123 !@#$ Invalid Street"`
- **Invalid Coordinates:** `(200.0, 500.0)` (out of range)
- **Empty Query:** `maps_search_nearby("", coords, 1000)` (no POI query)

**Questions:**
1. Should primitives retry on transient errors (503, timeout)?
2. Should errors be thrown (exceptions) or returned (error objects)?
3. Do we test with deliberately bad inputs (fuzzing)?

---

### 7. Testability — Unit vs Integration

**Unit Testing:**
- Can we mock Azure Maps REST responses for fast unit tests?
- Should we provide fixture data (sample responses) for common scenarios?

**Integration Testing:**
- Do we need real Azure Maps subscription for integration tests?
- Can we use free tier for testing, or need production key?
- Should we test against live Azure Maps service in CI/CD pipeline?

**Performance Testing:**
- How fast should each primitive respond?
  - Geocoding: <500ms?
  - Route calculation (10 waypoints): <2 seconds?
  - Route matrix (100 pairs): <10 seconds?
  - Static map rendering: <1 second?

**Questions:**
1. What's the testing strategy — unit tests + integration tests, or integration only?
2. Do we need Azure Maps sandbox/test environment, or use production?
3. Should we mock Azure Maps responses for CI/CD speed?

---

### 8. Regression Testing — Data Consistency

**Coordinate Precision:**
- Azure Maps returns coordinates with varying precision (6-8 decimal places)
- Do we normalize to 6 decimals? (≈10cm accuracy)

**Address Formatting:**
- Same location, different address formats:
  - `"1 Microsoft Way, Redmond, WA 98052"`
  - `"1 Microsoft Way, Redmond, Washington"`
  - `"1 Microsoft Way, Redmond"`
  
- Should all three geocode to same coordinates?

**Route Consistency:**
- Same origin/destination, different request times → Same route? Or traffic-aware routing changes path?

**Questions:**
1. How do we test for consistent outputs across multiple runs?
2. Do we snapshot responses for regression testing?
3. What's acceptable variation in route time (traffic fluctuates)?

---

### 9. Test Data Sets

**Known Good Scenarios:**
- **Simple Route:** Seattle → Portland (well-traveled corridor, predictable)
- **Multi-Stop Route:** Grand Canyon → Monument Valley → Zion → Bryce Canyon (tourist route)
- **Urban POI Search:** Find "coffee shops" near Space Needle (rich POI data)
- **Rural POI Search:** Find "gas stations" near Montana highway (sparse data)

**Known Bad Scenarios:**
- **No Route:** Hawaii → Alaska (no driving route)
- **No POIs:** Restaurant search in Antarctica
- **Invalid Address:** `"xyz123 Not A Real Place"`

**Questions:**
1. Should we maintain test data set of known-good addresses/coordinates?
2. Do we need separate test suites for US vs international locations?
3. How often do we refresh test data (POIs close, roads change)?

---

## Summary

**Core Questions:**
1. How do we handle geographic extremes (poles, oceans, dateline)?
2. What timeout limits for route optimization with many waypoints?
3. How do we handle partial failures in route matrix (some pairs succeed, some fail)?
4. What's max result limit for POI searches?
5. How do we test timezone correctness, especially DST transitions?
6. What error handling strategy (retry? throw exceptions? return error objects)?
7. Unit tests with mocks, or integration tests with live Azure Maps?
8. How do we ensure consistent outputs for regression testing?
9. Do we need curated test data set for known-good scenarios?

**Next Steps After Your Review:**
- Design test strategy (unit + integration)
- Identify critical test cases per primitive
- Create test data fixtures
- Document expected error handling

**Your Feedback Requested By:** EOD 2026-05-21

---

**— Niobe**
