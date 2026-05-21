# Consultation Request: Tool Design Review

**From:** Niobe (Geospatial Engineer)  
**To:** Trinity (Backend Dev / MCP Specialist)  
**Date:** 2026-05-21  
**Re:** V1 Primitives — Tool Design, Composability, Contract Clarity

---

## Context

I've completed comprehensive audit of Azure Maps REST APIs and recommend **6 primitives for v1** (original 5 + route matrix + timezone). Full audit in `.squad/decisions/inbox/niobe-rest-api-audit-v1-primitives.md`.

Need your MCP tool design perspective before we finalize.

---

## Proposed V1 Primitives

1. `maps_search_address` — Geocode address → coordinates
2. `maps_reverse_geocode` — Coordinates → address
3. `maps_search_nearby` — Find POIs near location
4. **`maps_calculate_route`** ⭐ (enhanced from `maps_get_route`) — Multi-waypoint routing with optimization, traffic, alternatives
5. **`maps_route_matrix`** ⭐ (NEW) — Calculate time/distance for all origin-destination pairs
6. **`maps_get_timezone`** ⭐ (NEW) — Get timezone info by coordinates
7. `maps_render_static_map` — Generate map image

---

## Questions for You

### 1. Composability

Do these 6 primitives compose well for travel agent workflows? Example workflow:

```
Step 1: maps_search_address("Grand Canyon Visitor Center") → coords1
Step 2: maps_search_address("Monument Valley") → coords2
Step 3: maps_search_nearby("hotels", coords2, radius=10km) → [hotel_a, hotel_b, hotel_c]
Step 4: maps_route_matrix(origins=[coords2], destinations=[hotel_a, hotel_b, hotel_c]) → pick closest
Step 5: maps_calculate_route(waypoints=[coords1, coords2, hotel_b], optimize=true) → route
Step 6: maps_get_timezone(hotel_b.coords) → show arrival time in local timezone
Step 7: maps_render_static_map(route, pins=[coords1, coords2, hotel_b]) → client-facing image
```

**Question:** Can you build complex multi-day itineraries by chaining these primitives? Any gaps or awkward handoffs?

---

### 2. Granularity — `maps_calculate_route` Complexity

This primitive supports MANY optional parameters:
- `waypoints` (2-150 stops)
- `optimizeWaypointOrder` (traveling salesman)
- `travelMode` (car, pedestrian, etc.)
- `departAt` (traffic-aware routing)
- `routeType` (fastest, shortest)
- `maxAlternatives` (return 2-3 route options)
- `avoid` (tolls, highways, ferries)
- `traffic` (use real-time data)

**Question:** Is this a "Swiss Army knife" anti-pattern? Or is it appropriate for a core routing primitive? Should we split it into:
- `maps_calculate_basic_route` (simple A→B)
- `maps_optimize_route` (multi-waypoint with optimization)
- `maps_route_alternatives` (get 3 alternative routes)

Or keep as one flexible primitive with optional parameters?

**My Take:** Keep as one primitive. Travel agents need all these options, and splitting would force awkward chaining. But want your perspective.

---

### 3. Contract Clarity — Input/Output Schemas

**Coordinate Format:**
- Always decimal degrees: `{ lat: 47.6205, lon: -122.3493 }`?
- Precision: 6 decimal places (≈10cm accuracy)?
- Or allow string format: `"47.6205,-122.3493"`?

**Timestamp Format:**
- ISO 8601 with timezone: `"2026-05-21T08:00:00-07:00"`?
- Or Unix epoch seconds?

**Error Handling:**
- Throw exceptions on API failure?
- Or return `{ success: false, error: { code, message } }`?

**Question:** What's your preferred schema style for MCP tools? Any conventions from MCP protocol we should follow?

---

### 4. Route Matrix Edge Case — Partial Failures

`maps_route_matrix` can have 100 origin×destination pairs (10 origins × 10 destinations). Some pairs might fail (e.g., origin is on island, destination is landlocked — no route exists).

**Options:**
1. **Fail entire request** if any pair fails
2. **Return partial matrix** with `null` for failed pairs
3. **Return matrix + error list** showing which pairs failed and why

**Example Response (Option 3):**
```json
{
  "matrix": [
    [
      { "travelTimeInSeconds": 1800, "distanceInMeters": 45000 },
      null,  // Failed
      { "travelTimeInSeconds": 3600, "distanceInMeters": 90000 }
    ]
  ],
  "errors": [
    {
      "originIndex": 0,
      "destinationIndex": 1,
      "error": { "code": "NoRouteFound", "message": "No road connection between origin and destination" }
    }
  ]
}
```

**Question:** Which option do you prefer from a tool design perspective? What's more useful for MCP clients?

---

### 5. Authentication & Configuration

Azure Maps requires subscription key for all requests. How should primitives access it?

**Options:**
1. **MCP Server Config:** Server reads subscription key from environment variable, injects into all REST calls (primitives don't need to know)
2. **Tool Parameter:** Each primitive accepts optional `subscriptionKey` parameter
3. **Session Config:** Client sets subscription key once via configuration tool, then all primitives use it

**Question:** What's the MCP best practice for API credentials? Should primitives be credential-agnostic?

---

### 6. Response Size Limits

Some responses could be HUGE:
- `maps_route_matrix` with 100 pairs → large JSON
- `maps_calculate_route` with 150 waypoints + turn-by-turn instructions → 50KB+ response
- `maps_search_nearby` with 100 POIs → large result set

**Question:** Do MCP tools have response size limits? Should we add pagination or result limiting to prevent giant payloads?

---

### 7. Async Operations

Azure Maps Route Matrix supports async mode for 100-700 pairs (POST request returns 202 Accepted, then poll for results). Should we expose this in v1?

**Options:**
1. **v1: Sync only** (max 100 pairs) — simpler, but limited scale
2. **v1: Support async** — more complex, but handles large optimization problems

**My Take:** Defer async to v2. Most travel agent workflows won't need 100+ pairs.

**Question:** Agree? Or is async essential for v1?

---

## Summary

**Core Questions:**
1. Are 6 primitives composable for travel agent workflows?
2. Is `maps_calculate_route` too complex, or appropriately flexible?
3. What schema conventions (coordinates, timestamps, errors) should we follow?
4. How to handle route matrix partial failures?
5. Where does Azure Maps subscription key get injected?
6. Any response size concerns?
7. Defer async route matrix to v2, or include in v1?

**Next Steps After Your Review:**
- Finalize primitive set (6 or revise)
- Design TypeScript schemas for inputs/outputs
- Prototype 1-2 primitives as proof-of-concept

**Your Feedback Requested By:** EOD 2026-05-21

---

**— Niobe**
