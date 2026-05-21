# Consultation Request: Strategic Scope Review

**From:** Niobe (Geospatial Engineer)  
**To:** Morpheus (Lead / Strategic Direction)  
**Date:** 2026-05-21  
**Re:** V1 Primitives — Scope Validation, Consumer Problem Alignment

---

## Context

I've completed comprehensive audit of Azure Maps REST APIs per your directive to "interrogate the REST APIs and make fresh decisions." Full audit in `.squad/decisions/inbox/niobe-rest-api-audit-v1-primitives.md`.

**Bottom Line:** Recommend **6 primitives for v1** (was 5). Need your scope approval before proceeding.

---

## Proposed Changes from Original 5

### ✅ **KEEP (3 primitives):**
1. `maps_search_address` — Geocode
2. `maps_reverse_geocode` — Reverse geocode
3. `maps_search_nearby` — POI search

### ⚠️ **MODIFY (1 primitive):**
4. `maps_get_route` → **`maps_calculate_route`** (significantly enhanced)
   - Original: Simple A→B routing
   - Proposed: Multi-waypoint (2-150 stops), optimization, traffic-aware, route alternatives, avoid options
   - **Why:** Azure Maps POST /route/directions supports all this — we were designing for the wrong REST endpoint

### 🆕 **ADD (2 primitives):**
5. **`maps_route_matrix`** (NEW) — Calculate time/distance for all origin-destination pairs
   - **Why:** Essential for optimization ("which hotel is closest to POIs?", "best visit order?")
   - **Consumer Problem:** Travel agents frequently need to compare drive times between multiple locations
   - **Without This:** Agents must make N×M individual route requests (wasteful)

6. **`maps_get_timezone`** (NEW) — Get timezone info by coordinates
   - **Why:** Multi-day trips cross timezones (Seattle → Denver, LA → Phoenix)
   - **Consumer Problem:** Agents must show correct local arrival times, warn about timezone changes
   - **Without This:** Manual timezone lookup — error-prone, unprofessional

### ⏸️ **DEFER to v2+:**
- Weather forecasts (nice-to-have, not essential)
- Traffic incidents (alerts useful but not for planning)
- Search along route (can work around with nearby search)
- Route range/isochrone (interesting but not core workflow)

---

## Scope Questions for You

### 1. Does 6 Primitives Violate v1 Scope?

Original plan: 5 primitives  
Proposal: 6 primitives (7 if we count static map rendering)

**Question:** Is adding route matrix + timezone acceptable for v1, or is this scope creep?

**My Justification:**
- Both are ESSENTIAL for consumer problem (travel agents building multi-day itineraries)
- Route matrix unlocks optimization workflows (traveling salesman)
- Timezone is mandatory for cross-timezone trips — not optional
- We're not adding "nice-to-haves" — these are core capabilities

**Alternative:** Could defer timezone to v1.1 if you want to hold line at 5-6 primitives.

---

### 2. Consumer Problem Alignment Check

Do all 6 primitives directly serve **"travel agents building multi-day driving trip itineraries with POIs"**?

| Primitive | Consumer Need | Essential? |
|-----------|---------------|------------|
| `maps_search_address` | Convert hotel/POI addresses to coordinates for routing | ✅ YES |
| `maps_reverse_geocode` | Get address for map clicks or coordinate-based selections | ✅ YES |
| `maps_search_nearby` | Find attractions/hotels/restaurants near destination | ✅ YES |
| `maps_calculate_route` | Build day-by-day driving routes with multiple stops | ✅ YES |
| `maps_route_matrix` | Optimize POI visit order, select closest hotel | ✅ YES |
| `maps_get_timezone` | Show correct local times for cross-timezone trips | ✅ YES |
| `maps_render_static_map` | Client-facing visualization | ✅ YES |

**Question:** Do you see any gold-plating or feature bloat? Or are all 6 legitimately essential?

---

### 3. Complexity Trade-off — `maps_calculate_route`

Enhanced routing primitive supports:
- 2-150 waypoints (multi-stop itineraries)
- Waypoint optimization (traveling salesman — reorder stops for shortest route)
- Traffic-aware routing (avoid rush hour)
- Route alternatives (give client 2-3 options: fastest, shortest, scenic)
- Avoid options (tolls, highways, ferries)
- Departure/arrival time constraints

**Question:** Is this appropriate complexity for v1, or should we simplify?

**Options:**
1. **Full-featured v1** (my recommendation) — Leverage Azure Maps capabilities fully, serve travel agent needs
2. **Basic v1** — Simple A→B routing only, defer optimization/alternatives to v2
3. **Tiered v1** — Split into `maps_basic_route` and `maps_optimized_route`

**My Take:** Travel agents NEED waypoint optimization and alternatives. Simplifying would cripple the product. But want your strategic view.

---

### 4. Route Matrix — Computational Cost Concern

Route matrix is mathematically N×M:
- 10 origins × 10 destinations = 100 route calculations
- Azure Maps charges per transaction (each origin-destination pair = 1 transaction)
- Could be expensive at scale

**Question:** Are we comfortable exposing this in v1, or should we start with simpler primitives?

**Options:**
1. **Include in v1** (my recommendation) — Essential for optimization, travel agents will use sparingly (not every request)
2. **Defer to v2** — Wait until we have usage data and optimization patterns
3. **Limit v1 scope** — Cap at 5×5 = 25 pairs max for v1, expand in v2

**My Take:** Include with sync-only limit (100 pairs max). This prevents abuse while serving legitimate optimization needs.

---

### 5. Deferred Capabilities — Agree/Disagree?

I've pushed these to v2 or later:
- **Weather forecasts** — Nice-to-have, not essential for itinerary creation
- **Traffic incidents** — Useful day-of-travel, but itineraries planned weeks ahead
- **Search along route** — Can work around with nearby search at waypoints
- **Route range/isochrone** — Interesting ("show everywhere within 2-hour drive") but not core workflow
- **Truck routing** — Commercial vehicle constraints (unless we're serving RV/trailer market?)
- **Electric vehicle routing** — EV charging station planning (future market)

**Question:** Any of these you'd PROMOTE to v1? Or defer further to v3?

**Specifically:**
- Should we support truck routing in v1? (If travel agents serve RV or commercial clients)
- Should we include search-along-route in v1? (Find gas stations en route)

---

### 6. Risk Assessment — Overcommitting?

**Green Lights (Low Risk):**
- Geocoding, reverse geocoding, POI search — straightforward REST wrappers
- Static map rendering — single GET request with parameters
- Timezone — simple lookup, no state

**Yellow Lights (Medium Risk):**
- **Route matrix** — Computationally expensive, partial failure handling, cost concerns
- **Enhanced routing** — Many optional parameters, optimization can be slow (traveling salesman), traffic data integration

**Question:** Should we de-risk v1 by deferring route matrix and simplifying routing? Or push forward with full feature set?

**My Take:** Acceptable risk. Route matrix is well-documented Azure Maps API, and travel agents NEED it. Enhanced routing leverages existing Azure capabilities — not building algorithms ourselves.

---

## Summary

**Core Questions:**
1. Is 6 primitives acceptable for v1 scope, or hold line at 5?
2. Do all 6 primitives serve the consumer problem (no gold-plating)?
3. Is enhanced `maps_calculate_route` appropriate complexity, or simplify?
4. Include route matrix in v1 despite computational cost, or defer?
5. Agree with deferred capabilities (weather, traffic, search-along-route), or promote any to v1?
6. Overall risk assessment — pushing too hard, or appropriately ambitious?

**Recommendation:** Approve 6-primitive set and proceed with schema design + prototype.

**Alternative:** If scope concern, could drop timezone to v1.1 (hold at 5 core + static map = 6 total).

**Your Decision Requested By:** EOD 2026-05-21

---

**— Niobe**
