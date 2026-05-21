# Tank — History

**Project:** AZMaps-MCP  
**Tech Stack:** Azure Maps, MCP Server, TypeScript, Vitest  
**User:** rpatchwork  

**Note:** Full history archived to history-archive.md on 2026-05-21 (exceeded 15KB threshold: 38079 bytes). This file contains condensed key patterns.

---

## Key Test Patterns Summary

### V1 Test Suite: 16 files created
- Unit tests (87): types, errors, azure-maps-client
- Integration tests (73): All 7 primitives covered
- Performance benchmarks (5): AD-003 latency targets
- Fixtures: addresses, routes, POIs

### Edge Case Catalog: 120+ scenarios
- Validation: Invalid coords, out-of-range
- Error handling: No results, rate limits, retries
- Boundaries: Polar coords, date line, timezone
- Geographic: Ambiguous addresses, impossible routes, ocean coords

### Success Criteria
- Geocoding: ±0.01° (~1km), confidence > 0.7
- Routes: Geometry connects waypoints, legs = waypoints - 1
- Maps: Valid PNG, dimensions match

### Performance Targets (AD-003)
- Geocode: < 500ms p95 ✅
- Batch (10): < 1000ms p95 ✅
- Route: < 2000ms p95 ✅ (after fixes)
- Static Map: < 3000ms p95 ✅

### Major Issues Resolved
1. API Version Error: Changed '2024-04-01' → '1.0' (Trinity)
2. Batch Geocode: Migrated to /geocode:batch endpoint (Trinity)
3. Static Map Defaults: 800x600 fallback (Trinity)

### Outstanding Blockers (2026-05-21)
- ❌ Route API: 11/11 tests failing (HTTP 415) → **Root cause identified by Niobe**
- ❌ Static Map Pins: Wrong coordinate order (lat lon vs lon lat) → **Root cause identified by Niobe**

### Testability Ratings
- EXCELLENT: geocode, reverse-geocode, timezone, batch-geocode
- GOOD: route
- MODERATE: POI search (quality validation complex)
- CHALLENGING: static-map (visual regression)

---

### 2026-05-21: Collaboration Protocol — Testing Phase Gate

**Context:** Squad established mandatory specialist review gates. My role enforces quality before testing phase.

**New Testing Gate:**
- I will NOT begin integration testing for Azure Maps API code until Niobe approval is documented
- Approval signal: "Azure Maps implementation reviewed — approved by Niobe" in design doc or PR
- Rationale: This incident showed 2 critical bugs that specialist review would have caught pre-testing

**Why This Matters:**
- Testing phase discovered bugs that specialist review would have prevented
- 11 failed route tests + coordinate bug = wasted test cycles
- Niobe's 1-hour research identified both root causes immediately
- Specialist review is cheaper than test-fix cycles

**Enforcement:**
- Check for Niobe approval before running API integration tests
- Escalate to Morpheus if approval missing and pressure to test exists
- Document approval status in test reports

**Key Learning:** Testing validates implementation correctness, but specialist review validates domain correctness. Domain review must come first.

### Key Learnings
1. Golden test pattern works for POI quality
2. Visual regression: structural validation > pixel comparison
3. Empty results ≠ errors (rural POIs, ocean coords)
4. Integration tests must run before declaring "fix complete"
5. Allow 20% performance tolerance for v1 benchmarks

**Full History:** See history-archive.md (810 lines, 38079 bytes)
