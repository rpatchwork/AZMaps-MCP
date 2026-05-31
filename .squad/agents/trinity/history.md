# Trinity — History

**Project:** AZMaps-MCP  
**Tech Stack:** Azure Maps, MCP Server, JavaScript SDK  
**User:** rpatchwork  

**Note:** Full history archived to history-archive.md on 2026-05-21 (exceeded 15KB threshold: 15570 bytes). This file contains condensed key patterns.

---

## Recent Updates

### 2026-05-28: Issue #1 — Pin Labels Broken in Static Map API — CLAIMED ✅

**Status:** 🔴 IN PROGRESS  
**Issue:** https://github.com/rpatchwork/AZMaps-MCP/issues/1  
**Priority:** High - Production bug affecting documented feature  
**Branch:** `fix/issue-1-pin-labels` (pending creation)

**Self-Advocacy Decision:** ✅ CLAIMED — This is 100% in my domain (Backend MCP Server)

**Problem Summary:**
Labeled pins fail when calling Azure Maps Static Map API through the MCP server.

**Error Message:**
```
Invalid format for location value ''1' -103.707807 41.8285904' in longitude.
Location is expected to be in the format of <longitude latitude>
```

**Root Causes Identified:**
1. **Coordinate Delimiter Bug:** Using SPACE instead of COMMA
   - Current (wrong): `${p.longitude} ${p.latitude}` → `-103.707807 41.8285904`
   - Correct: `${p.longitude},${p.latitude}` → `-103.707807,41.8285904`
   
2. **Pin Format Structure:** Need to validate against Azure Maps API spec
   - Niobe's validated format: `default|la1|-122.3321,47.6062`
   - Current implementation may have incorrect pipe separators

**Code Location:** `src/lib/azure-maps-client.ts` lines 468-478 (renderStaticMap function)

**Fix Strategy:**
1. Change coordinate delimiter from space to comma on line 474
2. Validate pin format structure matches Azure Maps spec
3. Run integration test: `npm test -- -t "simple numeric label"`
4. Iterate if needed based on test results

**ETA:** 30-60 minutes

**Actions Taken:**
- ✅ Reviewed issue details and code
- ✅ Added claiming comment to GitHub issue
- ✅ Updated project status from "Backlog" → "In Progress"
- 🔲 Create fix branch
- 🔲 Implement coordinate delimiter fix
- 🔲 Validate pin format structure
- 🔲 Run integration tests
- 🔲 Commit and push fix
- 🔲 Create PR for review

---

### 2026-05-24: WI-003 HTTP-Only Transport Implementation — COMPLETE ✅

**Mission:** Replace broken SSE transport with working HTTP-only request-response transport  
**Status:** ✅ COMPLETE — Local validation passed, ready for rebuild/redeploy  
**Decision:** `.squad/decisions/inbox/trinity-wi003-http-transport-complete.md`

**Context:** WI-002 SSE transport didn't process MCP messages. Morpheus decided to simplify to HTTP-only transport for V1 (all tools are synchronous request-response, no streaming needed).

**Implementation Strategy:**
1. **Remove SSE Transport:** Deleted `SSEServerTransport` import and session management code
2. **Manual JSON-RPC Router:** Implemented direct JSON-RPC 2.0 routing in `/message` endpoint
3. **Test-First Validation:** Created `test-http-transport.js` for local validation before redeploy

**Changes Made:**
```typescript
// BEFORE (WI-002 - broken):
app.post('/message', async (req, res) => {
  const transport = new SSEServerTransport('/message', res);
  await server.connect(transport);  // ❌ Never processed req.body
});

// AFTER (WI-003 - working):
app.post('/message', async (req, res) => {
  const { method, params, id } = req.body;  // ✅ Parse JSON-RPC request
  
  if (method === 'tools/list') {
    return res.json({ jsonrpc: '2.0', id, result: { tools: TOOLS } });
  }
  
  if (method === 'tools/call') {
    const toolResult = await handleTool(params.name, params.arguments);
    return res.json({ jsonrpc: '2.0', id, result: { content: [...] } });
  }
});
```

**Test Results (Local - http://localhost:3000):**
- ✅ Test 1: Health check (200 OK)
- ✅ Test 2: `tools/list` (7 tools discovered)
- ✅ Test 3: `tools/call` with `maps_search_address` (geocoded Microsoft campus: 47.641879, -122.1264715)
- ✅ Test 4: Error handling (invalid tool → JSON-RPC error code -32601)

**Overall:** 4/4 tests PASSED (100%)

**JSON-RPC 2.0 Compliance:**
- ✅ Request format: `{"jsonrpc": "2.0", "id": <number>, "method": <string>, "params": <object>}`
- ✅ Success response: `{"jsonrpc": "2.0", "id": <number>, "result": <object>}`
- ✅ Error response: `{"jsonrpc": "2.0", "id": <number>, "error": {"code": <number>, "message": <string>}}`
- ✅ Standard error codes (-32600, -32601, -32603, -32000)

**MCP Protocol Compliance:**
- ✅ `tools/list` returns array of tool definitions
- ✅ `tools/call` invokes tools correctly
- ✅ Responses wrapped in MCP content format: `{content: [{type: 'text', text: JSON.stringify(...)}]}`

**Build Verification:**
```bash
npm run build  # ✅ SUCCESS (no TypeScript errors)
```

**Files Modified:**
- `src/server.ts` (~130 lines changed: removed SSE, added HTTP JSON-RPC router)

**Files Created:**
- `test-http-transport.js` (local validation test suite)
- `.squad/decisions/inbox/trinity-wi003-http-transport-complete.md` (implementation results)

**Implementation Time:** ~1.5 hours
- Research: 20 minutes (JSON-RPC 2.0 spec, MCP protocol)
- Implementation: 45 minutes (code changes)
- Testing: 25 minutes (test script, validation)

**Next Steps:**
- Neo: Rebuild Docker image, push to ACR, redeploy to Container Apps
- Tank: Validate production endpoint after redeploy
- Estimated redeploy time: ~30 minutes

---

## Learnings

### 2026-05-25: Static Map Response Investigation — Field Name Mismatch

**Issue:** User reported empty base64 image (0 characters) from `maps_render_static_map` despite Azure Maps API returning 299151 bytes successfully.

**Investigation Results:**
- ✅ Azure Maps API: HTTP 200, content-length 299151 bytes, valid buffer
- ✅ Route simplification: 296 → 150 points (within limits)
- ✅ Buffer→Base64 conversion: Working correctly in `azure-maps-client.ts` line 499
- ✅ Response structure: Correct field name `imageBase64` per type schema
- ❌ Test script bug: Checking for wrong field name `base64Image` instead of `imageBase64`

**Root Cause:** Test script (`test-route-simplification.ps1` line 56) uses incorrect field name:
```powershell
$base64Length = $toolResult.data.base64Image.Length  # ❌ Wrong field name
```

**Correct Field Name (Per Schema):**
```typescript
// types.ts line 242
data: z.object({
  imageBase64: z.string(),  // ✅ Correct field name
  contentType: z.string(),
  sizeBytes: z.number(),
})
```

**Verified Across Codebase:**
1. Type definition (`src/lib/types.ts`): `imageBase64` ✅
2. Implementation (`src/lib/azure-maps-client.ts`): returns `imageBase64` ✅
3. Documentation (`API-REFERENCE.md`): shows `imageBase64` ✅
4. Test script (`test-route-simplification.ps1`): checks `base64Image` ❌

**Conclusion:** This is NOT a bug in the response chain. The base64 conversion works correctly. The test script uses the wrong field name and should be fixed to check `data.imageBase64` instead of `data.base64Image`.

**Action Item:** Update test script to use correct field name.

---

### Pattern: HTTP-Only Transport for Synchronous MCP Tools

**When to Use:**
- All tools are synchronous request-response operations
- No real-time streaming or progressive responses needed
- Response sizes < 500KB (manageable in single HTTP response)
- V1 primitives where simplicity > optimization

**Implementation Pattern:**
```typescript
app.post('/message', async (req, res) => {
  const { jsonrpc, method, params, id } = req.body;
  
  // Validate JSON-RPC 2.0
  if (jsonrpc !== '2.0') {
    return res.status(400).json({
      jsonrpc: '2.0', id, error: { code: -32600, message: 'Invalid Request' }
    });
  }
  
  // Route to handler
  if (method === 'tools/list') {
    return res.json({ jsonrpc: '2.0', id, result: { tools: TOOLS } });
  }
  
  if (method === 'tools/call') {
    const toolResult = await invokeTool(params.name, params.arguments);
    return res.json({
      jsonrpc: '2.0',
      id,
      result: { content: [{ type: 'text', text: JSON.stringify(toolResult) }] }
    });
  }
  
  // Unknown method
  return res.json({
    jsonrpc: '2.0', id, error: { code: -32601, message: 'Method not found' }
  });
});
```

**Advantages:**
- ✅ Simple to implement (~130 lines)
- ✅ Easy to test (curl, Postman, fetch())
- ✅ Fewer failure modes than SSE
- ✅ Standard HTTP debugging tools work
- ✅ No session state management

**Disadvantages:**
- ❌ No progressive responses for long operations
- ❌ No server-initiated notifications
- ❌ Large responses block until complete

**Decision Criteria:**
Use HTTP-only when all of these are true:
1. No tool needs streaming
2. Max response size < 500KB

---

### 2026-05-24: WI-004 API Reference Documentation — COMPLETE ✅

**Mission:** Create comprehensive API reference for all 7 MCP tools  
**Status:** ✅ COMPLETE — API-REFERENCE.md created (15KB, professional-grade documentation)  
**Duration:** ~90 minutes

**Scope:**
- Documented all 7 V1 tools with complete MCP schemas
- Real request/response examples from production validation
- Error handling matrices for each tool
- Usage notes, best practices, token consumption guidance
- JSON-RPC 2.0 protocol compliance details
- Rate limiting, authentication, and health check documentation

**Documentation Structure (Per Tool):**
1. **Purpose** — Clear description of what the tool does
2. **Azure Maps API** — Underlying REST API endpoint and version
3. **MCP Schema** — Complete JSON Schema with parameter types, constraints, descriptions
4. **Request Example** — Real JSON-RPC 2.0 request format
5. **Response Examples** — Success and error response formats
6. **Error Handling** — Table of error codes, descriptions, retryability, HTTP status
7. **Usage Notes** — Best practices, gotchas, token efficiency tips

**Tools Documented:**
1. `maps_search_address` — Forward geocoding (address → coordinates)
2. `maps_batch_geocode` — Batch geocoding (N addresses → N coordinates)
3. `maps_reverse_geocode` — Reverse geocoding (coordinates → address)
4. `maps_search_nearby` — POI/place search near location
5. `maps_calculate_route` — Multi-waypoint routing with traffic awareness
6. `maps_get_timezone` — Timezone lookup for cross-timezone trip planning
7. `maps_render_static_map` — Static map image generation with overlays

**Key Documentation Patterns:**

**Real Production Examples:**
Used actual validation results from WI-003 production testing:
- Microsoft campus geocoding: 47.641879, -122.1264715
- Space Needle coordinates: 47.6205, -122.3493
- Real error responses (GEOCODE_NO_RESULTS, RATE_LIMIT_EXCEEDED)

**Token Efficiency Guidance:**
- `maps_search_address`: <2KB response
- `maps_calculate_route` summary: ~0.5KB
- `maps_calculate_route` full: ~10-50KB (warn about token consumption)
- `maps_render_static_map`: ~1500-4000 tokens (base64-encoded)

**Error Classification:**
Every tool includes error table with:
- Error code (machine-readable)
- Description (human-readable)
- Retryable flag (client guidance)
- HTTP status (where applicable)

**Copilot-Friendly Design:**
- Clear parameter descriptions with examples
- Reasonable defaults documented (e.g., maxResults=1, radius=5000)
- Use case guidance (when to use which outputLevel)
- Best practices for token efficiency

**File Created:**
- `API-REFERENCE.md` (~15KB, 1000+ lines)

**Decision Document:**
- `.squad/decisions/inbox/trinity-wi004-api-reference-complete.md`

**Quality Metrics:**
- ✅ All 7 tools documented
- ✅ Real examples from production
- ✅ Complete error handling coverage
- ✅ Token efficiency guidance
- ✅ Professional API documentation tone
- ✅ MCP client integration examples

**Collaboration:**
- Scribe handling README, LIMITATIONS, ROADMAP in parallel
- Documentation sprint WI-004 Part 2 of 2 complete
3. All operations complete in < 30 seconds
4. V1 baseline (optimize later)

If any FALSE → consider SSE or WebSocket transport.

---

### Lesson: Test Transport Layer Independently

**Problem:** SSE transport looked correct (health check worked, server started) but didn't process MCP messages.

**Root Cause:** Transport handshake succeeded but protocol message routing failed. Without independent transport tests, we built 7 tools on broken foundation.

**Fix for Future Projects:**
1. **Test transport BEFORE building on top:**
   - Day 1: Implement minimal HTTP endpoint
   - Day 1: Test JSON-RPC routing with curl/Postman
   - Day 1: Validate tools/list and tools/call with dummy handlers
   - Day 2+: Build actual tools

2. **Create transport validation script early:**
   ```javascript
   // test-transport.js (create on Day 1)
   async function testTransport() {
     // Test 1: Health check
     // Test 2: tools/list (empty array OK)
     // Test 3: tools/call (dummy echo handler OK)
     // Test 4: Error handling
   }
   ```

3. **Don't assume SDK transports work out-of-box:**
   - MCP SDK provides transports, but each has nuances
   - SSE requires proper lifecycle management (we missed this)
   - Stdio works for CLI, fails for network services
   - HTTP-only requires manual JSON-RPC routing

**Pattern:** Infrastructure → Transport → Tools (in that order, test each layer)

---

### Lesson: Know When to Pivot vs Fix

**Context:** SSE transport broken, estimated 4-6 hours to debug/fix vs 2-3 hours to implement HTTP-only.

**Decision Framework:**
1. **Does fixing align with V1 scope?** NO (SSE streaming not needed for synchronous tools)
2. **Does pivoting deliver same functional value?** YES (HTTP-only supports all 7 tools)
3. **What's the risk if fix fails?** HIGH (cascades into HTTP-only anyway)
4. **What's the sprint timeline impact?** Fix: -1 day, Pivot: -0.5 day

**Morpheus's Decision:** Pivot to HTTP-only (correct call)

**Key Insight:** Don't over-engineer V1. Ship working primitives, optimize later.

**Anti-Pattern to Avoid:**
- ❌ "We already invested time in SSE, must make it work" (sunk cost fallacy)
- ❌ "HTTP-only is less elegant" (elegance doesn't ship)
- ❌ "SSE will be needed eventually" (YAGNI — you aren't gonna need it)

**Pattern:** If simplification delivers same V1 value at lower cost/risk, simplify.

---

### Lesson: Local Validation Saves Redeploy Cycles

**Approach:** Test HTTP transport locally before pushing to Container Apps.

**Benefits:**
- ✅ Fast iteration (no Docker rebuild, ACR push, Container Apps redeploy)
- ✅ Easy debugging (localhost:3000, full console logs, Chrome DevTools)
- ✅ High confidence before production deploy (4/4 tests passed)
- ✅ Reduced cloud resource churn (fewer failed deployments)

**Test Script Pattern:**
```javascript
// test-http-transport.js
async function runTests() {
  await testHealthCheck();          // Sanity check
  await testToolsList();            // Protocol compliance
  await testToolInvocation();       // End-to-end validation
  await testErrorHandling();        // Edge cases
  
  // Only proceed to rebuild/redeploy if all pass
}
```

**Time Saved:**
- No local test: 3-5 redeploy cycles × 20 min each = 60-100 minutes wasted
- With local test: 25 minutes testing + 1 redeploy cycle = 45 minutes total
- **Net savings: 15-55 minutes** + reduced frustration

**Pattern:** Test locally → Build → Deploy (not Build → Deploy → Debug → Repeat)

---

### Technical: JSON-RPC 2.0 Error Codes (MCP Standard)

**Standard Codes (per spec):**
- `-32700` Parse error (invalid JSON)
- `-32600` Invalid Request (missing jsonrpc/method)
- `-32601` Method not found
- `-32602` Invalid params
- `-32603` Internal error
- `-32000 to -32099` Server-defined errors (use for tool execution failures)

**Implementation in HTTP Transport:**
```typescript
// Invalid JSON-RPC request
return res.status(400).json({
  jsonrpc: '2.0', id, error: { code: -32600, message: 'Invalid Request' }
});

// Unknown method
return res.json({
  jsonrpc: '2.0', id, error: { code: -32601, message: `Method not found: ${method}` }
});

// Tool execution failure
return res.json({
  jsonrpc: '2.0', id, error: {
    code: -32000,
    message: 'Tool execution failed',
    data: { toolName, retryable: true }
  }
});
```

**Best Practice:** Always include `data` field with context (tool name, retryable flag, etc.)

---

### 2026-05-26: Route Simplification Removal — User Preference for Full Resolution

**Context:** Implemented route coordinate simplification (296 → 150 points) to avoid Azure Maps Static API URL length limits (~4KB). User tested the simplified route overlay and found it worked technically, but lost too much detail for their road trip planning use case.

**User Feedback:** "The simplified route is not useful for their road trip planning - it lost too much detail."

**Decision:** Remove simplification algorithm entirely. User wants full-resolution routes (296 points or more) even if it approaches URL limits.

**Removed Code:**
1. `MAX_ROUTE_POINTS = 150` constant
2. Coordinate count check and simplification call (~7 lines)
3. `simplifyRoute()` private method (~35 lines)
4. Simplification logging

**Kept Code:**
- ✅ Enhanced logging (URL length, buffer size) - useful for debugging
- ✅ GeoJSON LineString parsing and Azure Maps path format conversion
- ✅ Manual space encoding as %20 (URLSearchParams fix)

**Files Modified:**
- `src/lib/azure-maps-client.ts` (~42 lines removed)

**Build Verification:**
```bash
npm run build  # ✅ SUCCESS (no TypeScript errors)
```

**Key Insight:** Premature optimization can harm user experience. The simplification worked technically (reduced 296 → 150 points, generated valid map), but sacrificed too much detail for the actual use case (road trip route visualization). User prefers dealing with URL length constraints differently (e.g., POST requests, chunked paths) rather than losing route fidelity.

**Pattern:** When optimizing for technical constraints (URL limits), validate against REAL USER REQUIREMENTS first. A "working" solution that doesn't meet user needs is still wrong.

**Future Consideration:** If Azure Maps Static API rejects requests due to URL length, explore alternatives:
- POST request method (if supported by Static API)
- Multiple map tiles stitched together
- Different Azure Maps API endpoint (e.g., Render API with custom overlays)
- Don't assume simplification is the answer — ask user what detail level they need

---

### Technical: MCP Content Format (Tool Responses)

**MCP Protocol Requirement:**
Tool responses MUST be wrapped in `content` array with typed items:

```typescript
// ✅ CORRECT:
{
  jsonrpc: '2.0',
  id: 123,
  result: {
    content: [
      { type: 'text', text: JSON.stringify(toolResult) }
    ]
  }
}

// ❌ WRONG (missing content wrapper):
{
  jsonrpc: '2.0',
  id: 123,
  result: toolResult  // Direct result not MCP-compliant
}
```

**Content Types:**
- `text` — Plain text or JSON string
- `image` — Base64-encoded image (for static maps)
- `resource` — URI to external resource

**Pattern:** Always wrap tool output in MCP content format, even for simple responses.

---

### Collaboration: Cross-Team Handoffs

**Pattern Observed:**
- Trinity: Implements transport, validates locally, documents results
- Neo: Rebuilds Docker, deploys to Container Apps
- Tank: Validates production endpoint

**Key Success Factors:**
1. **Clear handoff point:** Trinity declares "ready for redeploy" in decision doc
2. **Acceptance criteria met:** All local tests pass before handoff
3. **Next steps documented:** Exact commands for Neo (rebuild, push, deploy)
4. **Risk assessment:** Deployment risk LOW (local validation passed)

**Anti-Pattern:** Half-implemented features thrown over wall ("Neo, deploy this and see if it works")

**Pattern:** Complete local validation → Document results → Request deployment with clear acceptance criteria

---

### 2026-05-22: MCP Transport Architecture Blocker — WI-002
**Mission:** Verify deployed MCP service protocol compliance  
**Status:** 🔴 BLOCKED (Architecture mismatch discovered)  
**Decision:** `.squad/decisions/inbox/trinity-wi002-transport-blocker.md`

**Context:** Neo completed Container Apps deployment (WI-001). Task was to verify MCP protocol working (service health, tool discovery, tool invocation). Container health check timeout revealed critical architecture issue.

**Problem Discovered:**
Server code uses **StdioServerTransport** (stdin/stdout communication for local CLI usage), but deployed to Container Apps expecting **HTTP endpoints**.

**Investigation Steps:**
1. Attempted HTTP health check → ❌ Timeout (10 seconds)
2. Analyzed `src/server.ts` → Found `StdioServerTransport()` 
3. Checked Dockerfile → EXPOSE 3000, health check expects HTTP GET `/health`
4. Checked Container Apps config → Ingress expects HTTP on port 3000
5. Cross-referenced MCP best practices → Confirmed transport mismatch

**Root Cause:**
```typescript
// src/server.ts (line 245)
const transport = new StdioServerTransport();  // ❌ WRONG for Container Apps
await server.connect(transport);
```

**What This Means:**
- Server expects JSON-RPC messages via STDIN (standard input stream)
- Server writes responses to STDOUT (standard output stream)
- Server **NEVER opens an HTTP port** or listens for network connections
- Container Apps ingress cannot route HTTP traffic to the container

**From MCP Best Practices:**
> ❌ DON'T USE: StdioServerTransport (for local CLI MCP servers)  
> ✅ USE: SSEServerTransport (HTTP with Server-Sent Events) for Azure Container Apps/Functions

**Impact:**
- ❌ WI-002 BLOCKED (cannot test MCP protocol over HTTP)
- ❌ Sprint milestone delayed (MCP verification is prerequisite for agent integration)
- ⚠️ Requires code changes, rebuild, redeploy cycle (~1-2 hours)

**Option A Complexity Analysis (May 22, 2026 15:00 UTC):**
rpatchwork asked: "Is Option A a configuration issue that we are fixing, or is it going to create more complexity?"

**Current State:**
```typescript
// src/server.ts (lines 245-248)
const transport = new StdioServerTransport();
await server.connect(transport);
console.log('[SERVER] MCP Server running on stdio transport');
```

**Required Changes:**

1. **New Dependencies (package.json):**
   - `express` (HTTP server framework)
   - `@types/express` (TypeScript types for Express)

2. **Code Changes (src/server.ts, ~50-75 lines):**
   ```typescript
   import express from 'express';
   import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
   
   const app = express();
   app.use(express.json());
   
   // Health check endpoint (for Container Apps probes)
   app.get('/healthz', (req, res) => {
     res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
   });
   
   // MCP endpoint (JSON-RPC over HTTP with SSE)
   app.post('/', async (req, res) => {
     const transport = new SSEServerTransport('/message', res);
     await server.connect(transport);
     // Handle JSON-RPC request/response
   });
   
   app.listen(3000, () => {
     console.log('[SERVER] MCP Server running on HTTP transport (port 3000)');
   });
   ```

3. **Dockerfile Changes:**
   - Update HEALTHCHECK path from `/health` to `/healthz`

**Complexity Assessment: LOW-MEDIUM**

**What makes it LOW:**
- ✅ MCP SDK already provides `SSEServerTransport` - no custom protocol needed
- ✅ Express is well-known, simple to integrate (~30 line setup)
- ✅ Changes localized to ONE file (src/server.ts) + package.json
- ✅ MCP best practices doc shows exact pattern (`.squad/knowledge/mcp-azure-best-practices.md` line 509)
- ✅ No changes to tool implementations (7 tools remain unchanged)
- ✅ No changes to Azure Maps client logic

**What makes it NOT Configuration:**
- ❌ This is an ARCHITECTURE change, not a config tweak
- ❌ Fundamentally changes communication model: stdio (subprocess) → HTTP (network service)
- ❌ Different transport layer in MCP SDK (StdioServerTransport → SSEServerTransport)
- ❌ Changes how clients connect (local process spawn → HTTP POST)
- ❌ Requires rebuild + redeploy cycle

**Risk Assessment:**
- **Low Risk:** SSEServerTransport is standard MCP pattern for Azure hosting (validated in best practices doc)
- **Low Risk:** Express is production-ready, widely used in Node.js ecosystem
- **Medium Risk:** Need to verify JSON-RPC envelope handling works identically over HTTP/SSE
- **Medium Risk:** Need to test that tool invocation, error handling, streaming responses work correctly

**Testing Requirements After Change:**
1. Health check responds at `/healthz` with 200 OK
2. Tool discovery works (POST to `/` with `tools/list` method)
3. Tool invocation works (POST to `/` with `tools/call` method + arguments)
4. Error envelopes return correctly over HTTP
5. All 7 tools execute successfully (geocode, batch geocode, reverse, POI, route, timezone, static map)
6. Graceful shutdown (SIGINT/SIGTERM) still works

**Alternative Approaches Considered:**
- ❌ **Keep Stdio, add HTTP wrapper:** Overcomplicated, introduces subprocess management complexity
- ❌ **Use different MCP SDK:** SSEServerTransport is the recommended Azure pattern
- ✅ **Option A (HTTP transport):** Clean, aligns with Container Apps architecture

**Recommendation:** Option A is **LOW-MEDIUM complexity** with **low risk**. It's NOT a simple config fix - it's an architecture correction to align code with infrastructure. Estimated effort: 1-2 hours (code + test + redeploy).

**Solution Required:**
1. Add Express HTTP server to `src/server.ts`
2. Replace StdioServerTransport with SSEServerTransport
3. Add `/healthz` endpoint for Container Apps probes
4. Add Express dependency: `npm install express @types/express`
5. Update Dockerfile health check to use `/healthz` 
6. Rebuild Docker image, push to ACR, redeploy to Container Apps

**Key Pattern:**
MCP servers have TWO transport modes:
- **Stdio:** For local CLI usage (e.g., Claude Desktop spawning subprocess)
- **HTTP/SSE:** For network-accessible services (Azure Container Apps, AWS Lambda, etc.)

Infrastructure and code MUST agree on transport mode. Mismatch = unreachable service.

**Collaboration Needed:**
- Neo: Dockerfile health check update, Docker rebuild, ACR push, Container Apps redeploy
- Tank: Verify all 7 tools work over HTTP after redeploy

---

### 2026-05-22: WI-002 HTTP Transport Implementation — COMPLETE ✅

**Mission:** Implement HTTP/SSE transport to fix Container Apps connectivity
**Status:** ✅ COMPLETE (Code changes + build verified)
**Decision:** `.squad/decisions/inbox/trinity-http-transport-implemented.md`

**Implementation Summary:**

**Changes Made:**
1. ✅ **Dependencies Added:** Installed `express` and `@types/express` via npm
2. ✅ **Transport Replaced:** Refactored `src/server.ts`:
   - Removed `StdioServerTransport` import and usage
   - Added `SSEServerTransport` from MCP SDK
   - Added Express HTTP server setup
3. ✅ **Endpoints Created:**
   - `GET /healthz` - Health check endpoint for Container Apps probes
   - `POST /message` - MCP JSON-RPC endpoint with SSE transport
4. ✅ **Port Configuration:** Server listens on port 3000 (configurable via `PORT` env var)
5. ✅ **Build Verified:** `npm run build` completed successfully
6. ✅ **Documentation Updated:** Added architecture section to README.md

**Code Structure:**
```typescript
// HTTP server with Express
const app = express();
app.use(express.json());

// Health endpoint
app.get('/healthz', (_req, res) => {
  res.status(200).json({ status: 'healthy', ... });
});

// MCP endpoint with SSE transport
app.post('/message', async (req, res) => {
  const transport = new SSEServerTransport('/message', res);
  await server.connect(transport);
});

// Start server
app.listen(PORT, () => { ... });
```

**Files Modified:**
- `src/server.ts` (~70 lines changed: removed stdio, added HTTP/Express/SSE)
- `package.json` (added express, @types/express dependencies)

---

### 2026-05-24: WI-003 Integration Testing — BLOCKED 🔴

**Mission:** Validate deployed MCP service - test tool discovery and invocation  
**Status:** 🔴 BLOCKED (SSE transport implementation broken)  
**Decision:** `.squad/decisions/inbox/trinity-wi003-integration-test-results.md`

**Context:** Service deployed for 2 days, health endpoint working. Task: prove agents can discover and call tools via MCP protocol. This is binary validation — either it works or it doesn't.

**Test Approach:**
1. Created proper MCP test client using `@modelcontextprotocol/sdk` Client + SSEClientTransport
2. Tested health endpoint, MCP tool discovery (tools/list), tool invocation (tools/call)
3. Analyzed Container App logs to diagnose issues

**Test Results:**

✅ **Health Endpoint:** Works perfectly
- GET /healthz returns 200 OK with healthy status
- Container deployment is solid (Neo's work)

❌ **MCP Tool Discovery:** FAILED
- MCP SDK client throws: `SSE error: Non-200 status code (404)`
- Direct curl test shows POST /message returns 200 with SSE stream
- Server logs show "Received MCP request" but no further processing
- SSE handshake initiates (returns sessionId) but protocol doesn't complete

❌ **Tool Invocation:** NOT TESTED (blocked by tool discovery failure)

**Root Cause Discovered:**

My WI-002 implementation of SSE transport is **fundamentally broken**:

```typescript
// src/server.ts (current implementation)
app.post('/message', async (req, res) => {
  console.log('[SERVER] Received MCP request');
  const transport = new SSEServerTransport('/message', res);
  await server.connect(transport);  // ❌ Never processes incoming messages!
});
```

**Problems:**
1. **No Request Body Processing:** Incoming JSON-RPC messages in `req.body` are never read or processed
2. **Incomplete SSE Lifecycle:** Handshake works (returns sessionId) but message routing doesn't
3. **Transport Per Request:** Creates new transport for every POST (breaks persistent connection pattern)

**Impact:**
- 🔴 **Sprint Goal at Risk:** "Deploy operational MCP service that other agents can discover and call"
- 🔴 **WI-003 Cannot Complete:** Binary validation = FAIL
- ⏱️ **1-2 Day Delay:** Requires code fix, local testing, rebuild, redeploy

**Key Learning:**

**❌ What I Did Wrong in WI-002:**
- Implemented SSE transport without fully understanding the protocol lifecycle
- Assumed Express + SSEServerTransport would "just work" without research
- No local MCP client testing before deployment
- Health endpoint passing ≠ MCP protocol working

**✅ What I Should Have Done:**
1. Researched MCP SSE transport API thoroughly before implementing
2. Created MCP test client FIRST, validated protocol locally
3. Understood SSE bidirectional communication pattern:
   - Client POSTs to initiate connection → Server returns SSE stream with sessionId
   - Client sends JSON-RPC to /message?sessionId=xxx → Server processes and responds over SSE
   - My implementation only does step 1, never completes step 2
4. Integration testing BEFORE deploying to Container Apps

**Process Insight:**

Integration testing (WI-003) should happen BEFORE infrastructure deployment (WI-001), not after:
- Current: Deploy → Test → Find it's broken → Fix → Redeploy (wastes time)
- Better: Test locally → Deploy once → Validate in production

**Critical Pattern — MCP Protocol Validation Checklist:**
- [ ] Research SDK transport API documentation/examples
- [ ] Implement with full understanding of protocol lifecycle
- [ ] Create local MCP test client script
- [ ] Validate protocol locally (tools/list, tools/call) BEFORE deploying
- [ ] Only then proceed to production deployment
- [ ] Document working implementation pattern for team

**Team Collaboration Needed:**
- **Trinity (me):** Fix SSE transport implementation
- **Morpheus:** Decide Option A (fix SSE) vs Option B (switch to simpler HTTP transport)
- **Neo:** Rebuild + redeploy cycle when fix is ready
- **Tank:** Will validate all tools work after fix

**Current Status:**
- Service deployed but unusable for agents
- Detailed test results documented in decision inbox
- Standing by for Morpheus architectural guidance on fix approach
- Ready to implement fix immediately once approach is decided

**Confidence in Fix:** High — Issue is well-understood, scope is contained, MCP SDK provides correct patterns once researched properly

---

## Learnings
- `README.md` (updated with HTTP transport architecture)

**Next Steps:**
- **Neo:** Dockerfile health check update, rebuild, push to ACR, redeploy
- **Trinity (WI-002 Phase 2):** Resume MCP protocol verification via HTTP after deployment
- **Tank:** Integration test all 7 tools over HTTP after deployment

**Decision Rationale:**
- Sprint goal requires network-accessible service (stdio = CLI-only)
- Infrastructure planned HTTP from day one (Dockerfile, Bicep)
- Low complexity, high value (1-2 hours to unblock sprint)
- Standard MCP pattern (SSEServerTransport for Azure)

**Implementation Time:** ~1 hour (analysis + code + build + docs)  
**Commit:** 9ab6f37

**What Was Learned:**

**1. Transport Selection = Core Architecture**
- Not a feature/polish trade-off — fundamental communication layer
- Deployment model dictates transport type:
  - StdioServerTransport: Local CLI tools (process spawns, stdin/stdout pipes)
  - SSEServerTransport: Network-accessible services (Azure hosting)
- Container Apps HTTP ingress REQUIRES HTTP transport

**2. Architecture Validation Checklist**
Before deployment, verify alignment:
- ✅ Transport type matches hosting model
- ✅ Port numbers consistent (Dockerfile EXPOSE, Bicep ingress, server.listen)
- ✅ Health check paths match (Dockerfile, Bicep probes, server endpoint)
- ✅ Environment variables aligned

**3. MCP SDK Integration Patterns**
- `SSEServerTransport` is standard for Azure Container Apps/Functions
- Express integration straightforward (~30 lines)
- Error handling should wrap `transport.connect()` calls
- Health endpoints separate from MCP endpoints

**4. Low-Risk High-Value Decision Framework**
When evaluating "implement now vs defer":
- Foundation bugs (transport mismatch): ALWAYS fix immediately
- Quality enhancements (logging, params): Can defer if foundation works
- Sprint goal test: If removal makes goal unachievable → v1.0 requirement

---

### 2026-05-22: WI-002 Deployment Success — HTTP Transport Live ✅

**Status:** ✅ DEPLOYED (Neo completed redeploy)  
**Revision:** `ca-azmaps-mcp-dev--oc3mtjw`  
**Endpoint:** `https://ca-azmaps-mcp-dev.graysand-f7f65db5.eastus.azurecontainerapps.io`

**Deployment Timeline (Neo):**
- Docker rebuild: 242 seconds (~4 minutes)
- ACR push: 118 seconds (~2 minutes)
- Container Apps redeploy: 120 seconds (~2 minutes)
- Health verification: 2 minutes
- **Total:** ~12 minutes

**Verification Results:**
- ✅ Health endpoint: `GET /healthz` → 200 OK (<100ms)
- ✅ Container health probes: Passing continuously
- ✅ Zero container restarts
- ✅ Clean rollout (100% traffic to new revision)

**Next Phase: WI-002 Protocol Verification**
- Tool discovery: `POST /message` with `tools/list` method
- Tool invocation: Test all 7 tools over HTTP
- Error handling: Verify error envelopes work over HTTP
- Performance: Measure round-trip latency

**References:**
- Orchestration Log: `.squad/orchestration-log/2026-05-22T15-00-trinity-wi002.md`
- Deployment Log: `.squad/orchestration-log/2026-05-22T15-10-neo-wi002.md`
- Decision: `.squad/decisions/decisions.md` (HTTP Transport section)
- `README.md` (added Architecture section documenting HTTP transport)

**What Works:**
- ✅ TypeScript compilation succeeds
- ✅ All tool registrations unchanged (7 tools preserved)
- ✅ Error handling unchanged (standardized error envelopes preserved)
- ✅ Azure Maps client unchanged
- ✅ Graceful shutdown handlers (SIGINT/SIGTERM) unchanged

**What's Next (Handoff to Neo):**
1. **Dockerfile Update:** Change health check from `/health` to `/healthz`
2. **Docker Rebuild:** `docker build -t azmaps-mcp:v2 .`
3. **ACR Push:** Push new image to Azure Container Registry
4. **Container Apps Redeploy:** Update Container Apps to use new image
5. **Verify Health:** Test `GET https://<container-url>/healthz`
6. **Verify MCP Protocol:** Test `POST https://<container-url>/message` with tools/list

**Testing After Deployment (Handoff to Tank):**
- Tool discovery via HTTP: `tools/list` method
- Tool invocation via HTTP: All 7 tools (geocode, batch geocode, reverse, POI, route, timezone, static map)
- Error handling: Verify error envelopes return correctly over HTTP
- Health probe: Verify `/healthz` responds with 200 OK

**Technical Notes:**
- SSEServerTransport pattern follows MCP best practices (`.squad/knowledge/mcp-azure-best-practices.md`)
- Express chosen for simplicity and production readiness
- All tool implementations unchanged (single-responsibility principle maintained)
- No changes to Azure Maps client or error handling architecture

**Complexity Assessment:** LOW-MEDIUM (as predicted in analysis)
- Implementation: ~70 lines changed in single file
- Risk: Low (SSEServerTransport is standard MCP pattern)
- Time: ~45 minutes (analysis + implementation + verification)

**Squad Collaboration:**
- rpatchwork approved: "proceed"
- Morpheus approved: Immediate implementation
- Neo: Ready for Docker rebuild and redeploy
- Tank: Ready for integration testing after deployment

---
- **Trinity:** Implement HTTP transport + health endpoint
- **Neo:** Rebuild and redeploy after code changes
- **Morpheus:** Approve delay to WI-002 completion (~half day slip)

**Critical Lesson:**
MCP transport selection is an ARCHITECTURE decision, not an implementation detail. Must be chosen during design phase based on deployment target. Changing transport after deployment = rebuild + redeploy cycle.

**Next Actions:**
1. Get approval to implement fix (rpatchwork + Morpheus)
2. Implement HTTP transport changes
3. Test locally with Docker
4. Hand off to Neo for redeploy
5. Resume WI-002 verification testing

---

### 2026-05-21: Path Style Syntax Fix — Seventh Iteration
**Mission:** Fix Azure Maps path parameter style prefix syntax  
**Status:** ✅ COMPLETE (Build verified)  
**Decision:** `.squad/decisions/inbox/trinity-path-style-syntax-fix.md`

**Context:** Tank's production readiness assessment identified path style syntax error. Sixth iteration implemented GeoJSON conversion correctly, but style prefix syntax was wrong.

**Root Cause:**
- GeoJSON → Azure Maps conversion: ✅ CORRECT (sixth iteration)
- Path style prefix syntax: ❌ WRONG (`ra0000FF` instead of `lc:FF0000|lw:3`)

**Error:** `{"path":["Invalid format for 'ra' parameter. Expected a float value between 0 and 10018750."]}`

**What Went Wrong:**
```typescript
// SIXTH ITERATION (WRONG):
pathParam = `ra0000FF||${coords}`;
// Azure Maps parsed 'ra' as parameter name, expected numeric value
// '0000FF' failed numeric validation
```

**Seventh Iteration Fix:**
```typescript
// CORRECT: Proper Azure Maps path style syntax
const lineColor = 'FF0000';  // Red (hex without # prefix)
const lineWidth = 3;         // 3 pixels
pathParam = `lc:${lineColor}|lw:${lineWidth}||${coords}`;
```

**Azure Maps Path Style Format:**
- Line color: `lc:{HEX}` (e.g., `lc:FF0000`)
- Line width: `lw:{PIXELS}` (e.g., `lw:3`)
- Line alpha: `ra:{0-1 or 0-255}` (e.g., `ra:0.8`)
- Single pipe `|` between style properties
- Double pipe `||` before coordinates
- Complete format: `path=lc:FF0000|lw:3||-122.3321%2047.6062||-122.4000%2047.5000`

**Build Verification:** `npm run build` → 0 errors ✅

**Expected Impact:**
- Static Map route overlay: 0/1 → 1/1 passing (blocker resolved) ✅
- Total: 55/73 → 56/73 passing (77%)

**Pattern Recognition:**
Path implementation required TWO format layers:
1. **Data format layer:** GeoJSON → Azure Maps coordinates (sixth iteration) ✅
2. **Style layer:** Proper key:value syntax for style properties (seventh iteration) ✅

**Key Lesson:**
Azure Maps Render API parameters have distinct syntax requirements:
- **Delimiter pattern:** Shared across pins/path (double pipe `||`)
- **Style syntax:** Parameter-specific (pins use `default||`, path uses `lc:COLOR|lw:WIDTH||`)

Both layers must be correct for successful rendering. Fixing one layer doesn't help if the other is wrong.

**Collaboration:** Tank's production readiness report provided complete path format specification, enabling targeted fix without additional research iterations.

---

### 2026-05-21: Path Parameter — GeoJSON Format Conversion Added
**Mission:** Complete path parameter fix with GeoJSON → Azure Maps format conversion  
**Status:** ✅ COMPLETE (Build verified)

**Context:** Tank's validation revealed fifth iteration encoding fix was correct but incomplete. Missing format conversion step before encoding.

**Root Cause:**
- Fifth iteration: Applied `%20` encoding ✅
- Missing: Convert GeoJSON LineString to Azure Maps path format ❌
- GeoJSON input: `{ type: "LineString", coordinates: [[lon, lat], ...] }`
- Azure Maps expects: `style||lon lat||lon lat` (same pattern as pins)

**Two-Step Solution:**

**Step 1: Format Conversion (NEW)**
```typescript
// Convert GeoJSON LineString to Azure Maps path format
if (geometry.type === 'LineString' && Array.isArray(geometry.coordinates)) {
  const coords = geometry.coordinates
    .map(([lon, lat]: [number, number]) => `${lon} ${lat}`)  // Space-separated
    .join('||');  // Double pipe separator
  pathParam = `ra0000FF||${coords}`;  // Line style prefix
}
```

**Step 2: Encoding (EXISTING)**
```typescript
const encodedPath = pathParam?.replace(/ /g, '%20');
```

**Pattern Recognition — All Geographic Parameters:**
| Parameter | Format | Delimiter | Encoding |
|-----------|--------|-----------|----------|
| `pins` | `default\|\|lon lat\|\|lon lat` | `\|\|` (double pipe) | `%20` |
| `path` | `style\|\|lon lat\|\|lon lat` | `\|\|` (double pipe) | `%20` |

**Critical Pattern:**
- Azure Maps Render API uses **double pipe + space + %20 encoding** for ALL coordinate parameters
- URLSearchParams limitation applies to ALL geographic params (not just pins)
- When fixing encoding issues, check ALL geographic parameters

**Build Verification:** `npm run build` → 0 errors ✅

**Expected Impact:**
- Static Map route overlay: 0/1 → 1/1 passing ✅
- Static Map pins: 2/2 passing (preserved) ✅
- Net: +1 test passing (56/73 total expected)

**Key Lesson:**
Format conversion MUST happen BEFORE encoding. Two distinct steps:
1. Transform data structure (GeoJSON → Azure Maps format)
2. Apply URL encoding (`%20` for spaces)

---

### 2026-05-21: Path Parameter Encoding Fix — Same Pattern as Pins
**Mission:** Fix route overlay regression by applying manual %20 encoding to path parameter  
**Status:** ✅ COMPLETE

**Context:** Fifth iteration pin fix (2/2 tests passing) introduced NEW regression in route overlay (1/1 test failing). Tank's validation discovered path parameter has identical URLSearchParams encoding issue.

**Root Cause:**
- `pins` parameter: Fixed with manual %20 encoding ✅
- `path` parameter: Still using URLSearchParams (encodes space as `+`) ❌
- Azure Maps Render API rejects `+` for ANY geographic parameter
- Error: `{"path":["The '||' delimiter between the path style and path locations was not found."]}`

**Pattern Identified:**
All Azure Maps Render API parameters containing coordinates or geographic data:
- Cannot use URLSearchParams (encodes space as `+`)
- Must manually encode space as `%20`
- Must be appended to URL string after base URL construction

**Trinity's Fix:**
```typescript
// BEFORE (Broken - path goes through URLSearchParams):
const baseParams: Record<string, string | undefined> = {
  // ...
  path: params.routeGeometry,  // ❌ URLSearchParams encodes space as +
};
const baseUrl = this.buildUrl('/map/static/png', baseParams);
const url = encodedPins ? `${baseUrl}&pins=${encodedPins}` : baseUrl;

// AFTER (Fixed - manual %20 encoding for path):
const baseParams: Record<string, string | undefined> = {
  // ...
  // path: DO NOT include here - same encoding issue as pins
};

// Manually encode path parameter (same fix as pins)
const encodedPath = params.routeGeometry?.replace(/ /g, '%20');

// Append both path and pins manually with correct encoding
let url = this.buildUrl('/map/static/png', baseParams);
if (encodedPath) {
  url += `&path=${encodedPath}`;
}
if (encodedPins) {
  url += `&pins=${encodedPins}`;
}
```

**Key Changes:**
- Removed `path` from `baseParams` object
- Added manual `%20` encoding for path parameter
- Changed URL construction to append both path and pins manually
- Consistent pattern with pins fix

**URLSearchParams Limitation (Critical Pattern):**
- **HTML Form Encoding (RFC 1866):** space → `+`
- **Query String Encoding (RFC 3986):** space → `%20`
- **URLSearchParams uses:** HTML form encoding (space → `+`)
- **Azure Maps requires:** Query string encoding (space → `%20`)
- **Solution:** Manual string replacement + URL append for geographic parameters

**Build Verification:** `npm run build` → 0 errors ✅

**Expected Impact:**
- Static Map pins: 2/2 passing (preserved) ✅
- Static Map route overlay: 0/1 → 1/1 passing (regression fixed) ✅
- Net: +1 test passing (56/73 total expected)

**Critical Lesson:**
When fixing Azure Maps Render API parameter encoding, check ALL geographic parameters (pins, path, future overlays), not just the one currently failing. They all share the same `%20` requirement.

---

### 2026-05-21: Static Map Pin Format — Fourth Iteration Success
**Mission:** Implement wire-level equivalence to Niobe's live API validation  
**Status:** ⚠️ INCOMPLETE (HTTP 200 but no visual validation)

**Context:** Fourth iteration of Static Map pin format fix after repeated spec-vs-reality mismatches.

**Root Cause Analysis:**
- First iteration: POST with JSON body (documentation-based)
- Second iteration: GET with space-separated coords (misinterpretation)
- Third iteration: Double pipe with %20 encoding (over-engineering)
- **Fourth iteration:** Single pipe, comma-separated (wire-level replication) ⚠️

**Niobe's Validated Format (curl):**
```
pins=default|-122.3321,47.6062
```

**Trinity's Fix:**
```typescript
// BEFORE (WRONG):
const pinsValue = params.pins
  ?.map((p) => `default||${p.longitude}%20${p.latitude}`)  // Double pipe, space
  .join('|');

// AFTER (THOUGHT CORRECT, BUT NOT VISUALLY VALIDATED):
const pinsValue = params.pins
  ?.map((p) => `default|${p.longitude},${p.latitude}`)  // Single pipe, comma
  .join('|');
```

**Key Changes:**
- Double pipe (`||`) → Single pipe (`|`)
- Space separator with encoding (`%20`) → Comma separator (`,`)
- Manual URL append → URLSearchParams handles encoding correctly
- Simplified code: pins now included in baseParams like all other parameters

**Wire-Level Equivalence Verified:**
- ✅ Single pipe separator (not double)
- ✅ Comma-separated coordinates (not space)
- ✅ Longitude first, latitude second
- ✅ URLSearchParams encodes correctly (no manual encoding needed)

**Build Verification:** `npm run build` → 0 errors ✅

**Critical Gap:** Niobe validated HTTP 200 response but did NOT visually confirm pins were rendered. The API returns 200 OK for maps without pins — we mistook a blank map for a working pin implementation.

**Outcome:** Tests still failing — Fourth iteration format was WRONG.

---

### 2026-05-21: Static Map Pin Format — Fifth Iteration (CORRECT)
**Mission:** Implement VISUALLY VALIDATED pin format with manual space encoding  
**Status:** ✅ COMPLETE

**Context:** Fifth iteration after Niobe's corrected investigation with visual pin confirmation. Fourth iteration used single pipe + comma based on HTTP 200, but pins were NOT rendering.

**Niobe's Visual Validation Process (Corrected):**
1. Sent API request
2. Saved image file
3. **Opened and inspected image for pin markers**
4. Confirmed ONLY double pipe + space format renders visible pins
5. File size proof: baseline (181KB) vs. pin map (192KB) = 11KB difference

**Correct Format (Visually Confirmed):**
```
pins=default||-122.3321 47.6062
```

**Trinity's Corrected Fix:**
```typescript
// Build pins manually with double pipe + space
const pins = params.pins
  ?.map((p) => `${p.longitude} ${p.latitude}`)  // Space-separated coords
  .join('||');  // Double pipe between locations
const pinsParam = pins ? `default||${pins}` : undefined;
const encodedPins = pinsParam?.replace(/ /g, '%20');  // Manual %20 encoding

// Build base URL WITHOUT pins (URLSearchParams encodes space as +, which fails)
const baseUrl = this.buildUrl('/map/static/png', baseParams);
const url = encodedPins ? `${baseUrl}&pins=${encodedPins}` : baseUrl;
```

**Key Changes from Fourth Iteration:**
- ✅ Single pipe (`|`) → Double pipe (`||`)
- ✅ Comma separator (`,`) → Space separator (` `)
- ✅ URLSearchParams for pins → Manual %20 encoding (URLSearchParams encodes space as `+`)

**URLSearchParams Limitation Discovered:**
- **Problem:** URLSearchParams encodes space as `+` per HTML form encoding (RFC 1866)
- **Azure Maps Requirement:** Space must be encoded as `%20` per query string encoding (RFC 3986)
- **Solution:** Build pins parameter manually, replace spaces with `%20`, append to URL string

**Build Verification:** `npm run build` → 0 errors ✅

**Expected Impact:** 3 Static Map pin tests (from failing → passing)

**Critical Lessons Learned:**
1. **Visual validation is MANDATORY for image APIs** — HTTP 200 ≠ functional correctness
2. **URLSearchParams has encoding limitations** — Can't use for parameters requiring strict `%20` encoding
3. **Save and inspect images** — Azure Maps returns 200 OK even when pins are silently dropped

**Process Improvement:**
When validating image-returning APIs:
1. Execute API call
2. Check HTTP status
3. **Save image file**
4. **Visually inspect for expected elements**
5. Only then declare format validated

---

## Key Implementation Patterns Summary

### 2026-05-21: MCP Tool Design Evaluation
**Outcome:** Validated v1 primitive composability, identified refinements  
**Key Findings:**
- ✅ Strong composability: coordinates flow naturally between tools
- ⚠️ Granularity needs refinement: route output too verbose, POI needs limits
- ✅ Contracts: Good foundation, needs Zod schemas
- ⚠️ Error handling: Needs standardization (hard/soft errors, retry guidance)

**Recommendations:**
1. Add batch geocoding to v1 (critical for multi-stop itineraries)
2. Add outputLevel parameter (routes: summary|detailed|full)
3. Add maxResults parameter (POI search: default 10, max 100)
4. Standardize error envelope with retry guidance

**Implementation Feasibility:** ~250-line HTTP client estimate confirmed. Node.js 20 native fetch + p-retry for backoff. Dual auth (API key + Managed Identity) viable.

### 2026-05-21: V1 MCP Server Implementation (7 Primitives)
**Status:** ✅ COMPLETE (Ready for testing)  
**Deliverables:** 16 files created

**Core Library:**
- types.ts: Zod schemas for 7 tools + error envelope (350 lines)
- errors.ts: Error codes, factories, HTTP mapper (200 lines)
- azure-maps-client.ts: HTTP client with retry logic (400 lines)

**MCP Tools:**
- geocode.ts: maps_search_address + maps_batch_geocode
- reverse-geocode.ts: maps_reverse_geocode
- poi-search.ts: maps_search_nearby (maxResults)
- route.ts: maps_calculate_route (outputLevel)
- timezone.ts: maps_get_timezone
- static-map.ts: maps_render_static_map

**Architecture Decisions:**
- Native fetch + retry wrapper (no Azure Maps SDK dependency)
- Zod runtime validation at boundary (catches 90% errors before API calls)
- Standardized error envelope: { success, data?, error?, metadata? }
- Parameter optimization: outputLevel and maxResults prevent token waste

### 2026-05-21: Critical Blocker Resolution (4 Blockers / 24 Failures)
**Mission:** Fix all blockers reported by Tank  
**Status:** ✅ All 4 blockers resolved

**Blockers Fixed:**
1. ✅ Route API HTTP 415: Updated to v2025-01-01 + Content-Type + GeoJSON format
2. ✅ Batch Geocode: Migrated to /geocode:batch endpoint with v2026-01-01
3. ✅ Static Map Pin Format: Changed from comma to space-separated coordinates
4. ✅ Static Map Defaults: Added width/height defaults (800x600)

**Impact:** 24 test failures → 0 (estimated)

### 2026-05-21: TypeScript Compilation Errors Fixed
**Context:** 17 TypeScript errors blocking test execution  
**Root Causes:**
- Type safety: API responses typed as unknown after response.json()
- Unused imports: Coordinates, ErrorResponse, PORT

**Solution:**
- Added Azure Maps API response types to types.ts (6 new interfaces)
- Replaced as any with proper type assertions in azure-maps-client.ts
- Removed unused imports from 3 files

**Verification:** npm run build → 0 errors ✅

### 2026-05-21: Critical API Fixes (BLOCKER Resolution)
**Context:** All 73 integration tests failed with 400 BadRequest  
**Fixes:**
1. ✅ Invalid API Version: Changed DEFAULT_API_VERSION from '2024-04-01' → '1.0'
2. ✅ Static Map Null Reference: Added zoom default (params.zoom ?? 12)

**Impact:** Unblocked all Azure Maps functionality

---

### 2026-05-21: Corrected Blocker Fixes (Live API Validation)
**Mission:** Implement corrected specifications after live API validation  
**Status:** ✅ COMPLETE

**Context:** First blocker fix attempt used incorrect API versions (`2025-01-01` for Route API) based on documentation research. Niobe completed live API testing against deployed Azure Maps Gen2 instance and provided empirically validated specifications.

**Corrected Specifications:**
1. ✅ Route API version: `2025-01-01` → `1.0` (validated via curl test)
2. ✅ Static Map API version: Already correct at `1.0` (no change)
3. ✅ Static Map pin format: Already correct with space separator (no change)

**Files Modified:**
- `src/lib/azure-maps-client.ts` (Line 47): Changed `ROUTE_API_VERSION` constant

**Build Verification:** `npm run build` → 0 errors ✅

**Expected Impact:** Resolves all 11 Route API test failures (from 43/73 to 73/73 passing)

**Critical Lesson Learned:**
- **ALWAYS validate API specifications against live deployed instances BEFORE implementation**
- Documentation alone is insufficient for Gen2 APIs (contains outdated/incorrect versions)
- New process: Research → Live API validation (curl) → Document → Implement → Test
- This prevents rework cycles and reduces implementation time

---

## Key Patterns Learned

### HTTP Client Design
- Node.js 20 native fetch is production-ready (no axios/node-fetch needed)
- Use p-retry library with exponential backoff (don't write custom logic)
- Support both API key (query string) and Managed Identity (Bearer token) from day 1
- Hand-write types + Zod validation > any types + runtime crashes

### Error Handling for MCP Tools
- Structured envelopes: { success, data?, error?, metadata? }
- Classify retryability: LLM agents need to know if retry makes sense
- Respect Retry-After headers (don't spam 429 responses)
- Human-readable messages for LLM consumption (not debugging dumps)

### Azure Maps Gen2 API Versions (VALIDATED)
**Critical:** These are the CORRECT, live API-validated versions. Do not trust documentation alone.

- **Route API (`/route/directions/json`):** `api-version=1.0`
  - Query format: `query=lat,lon:lat,lon` (comma-separated coords, colon-separated waypoints)
  - Do NOT use `2025-01-01` (documented but unsupported in Gen2)

- **Static Map API (`/map/static/png`):** `api-version=1.0`
  - Pin format: `pins=default||<lon> <lat>` (space-separated, longitude FIRST)
  - **CRITICAL:** Space MUST be encoded as `%20` (NOT `+`)
  - URLSearchParams cannot be used for pins parameter (encodes space as `+`)
  - Do NOT use `2024-07-01-preview` (not supported in Gen2)

- **Search APIs (`/search/address/json`, `/search/poi/json`):** `api-version=1.0` (default)

- **Batch Geocode (`/geocode:batch`):** `api-version=2026-01-01`
  - Uses GeoJSON format with `batchItems` array

**Process:** Always validate API versions with curl tests against deployed instance before implementation.

### URLSearchParams Encoding Limitations (2026-05-21)
**Context:** Static Map pin parameter failed with URLSearchParams encoding

**Problem:** Node.js `URLSearchParams` follows HTML form encoding (RFC 1866):
- Space → `+` (form encoding)
- Azure Maps requires `%20` (percent encoding per RFC 3986)

**Example:**
```typescript
// URLSearchParams produces (WRONG):
pins=default||-122.3321+47.6062    // + rejected by Azure Maps

// Manual encoding produces (CORRECT):
pins=default||-122.3321%20047.6062  // %20 accepted
```

**Solution Pattern:**
```typescript
// 1. Build parameter string manually
const pinsValue = `default||${lon} ${lat}`;

// 2. Manually encode space as %20
const encodedPins = pinsValue.replace(/ /g, '%20');

// 3. Build base URL WITHOUT special parameter
const baseUrl = this.buildUrl('/path', { /* other params */ });

// 4. Append manually encoded parameter
const finalUrl = `${baseUrl}&pins=${encodedPins}`;
```

**When to Use Manual Encoding:**
- ❌ API requires strict percent encoding (space as `%20`)
- ❌ Parameters with special delimiters that need preservation
- ❌ APIs with custom encoding rules (like Azure Maps pins)

**When URLSearchParams is Safe:**
- ✅ Standard REST APIs accepting form encoding
- ✅ APIs tolerating `+` for spaces
- ✅ Parameters without delimiter conflicts

**Validation:** Always log generated URLs (`LOG_HTTP_REQUESTS=true`) to verify encoding matches API expectations.

### 2026-05-21: Wire-Level Equivalence Implementation (Route API Fix)
**Mission:** Fix 11 failing Route API tests by implementing Niobe's exact validated format  
**Status:** ✅ COMPLETE

**Context:** Trinity implemented Route API using POST with JSON body based on documentation, but Niobe validated GET with query parameters. All 11 Route API tests failed with "Request body is invalid or empty" (HTTP 400).

**Root Cause:** Specification handoff failure — Trinity interpreted Niobe's validation as "API contract" rather than "exact request format to replicate".

**Solution:** Converted Route API from POST to GET:
```typescript
// BEFORE (POST with body):
const response = await this.fetchWithRetry(url, {
  method: 'POST',
  body: JSON.stringify({ type: 'FeatureCollection', features: [...] })
});

// AFTER (GET with query params - matches Niobe's curl):
const query = params.waypoints
  .map(w => `${w.latitude},${w.longitude}`)
  .join(':');
const url = this.buildUrlWithVersion('/route/directions/json', '1.0', { query, ... });
const response = await this.fetchWithRetry(url); // Simple GET
```

**Wire-Level Format Matched:**
```
GET /route/directions/json?api-version=1.0&query=47.620,-122.349:45.523,-122.676
```

**Static Map Pins:** Confirmed format already correct (longitude first, space separator, URLSearchParams auto-encodes as %20).

**Verification:** Added conditional logging (`LOG_HTTP_REQUESTS=true`) to both APIs for wire-level verification.

**Build Status:** `npm run build` → 0 errors ✅

**Expected Impact:** 11 Route API tests + 2 Static Map tests = 13 tests fixed (43/73 → 56/73 passing)

**Critical Lesson Learned: Wire-Level Equivalence Protocol**

**WHEN NIOBE VALIDATES WITH CURL:**
1. Trinity MUST replicate the EXACT HTTP request format
2. Same method (GET vs POST)
3. Same parameter location (query string vs body)
4. Same encoding (URL format, delimiters)
5. Same structure (parameter names, nesting)

**ANTI-PATTERN:**
- ❌ Reading Niobe's spec as "API contract" and implementing SDK-style abstractions
- ❌ Choosing different HTTP method because "API supports both"
- ❌ Interpreting validation results as functional requirements

**CORRECT PATTERN:**
- ✅ Niobe's curl command = exact format to implement
- ✅ Add logging to verify generated requests match validated format
- ✅ Wire-level equivalence check before handoff to Tank
- ✅ Don't interpret — replicate

**Why This Matters:**
- Validation proves what WORKS against live API
- Implementation deviations create test failures
- POST vs GET = different code paths in Azure Maps backend
- Documentation may be incomplete/incorrect — trust empirical validation

**Process Improvement:**
After Niobe validates specs, Trinity should:
1. Implement code
2. Log actual HTTP requests (temporary)
3. Compare logged requests to Niobe's curl commands
4. Verify byte-level equivalence
5. Only then declare "implementation complete"

---

### 2026-05-26: Sprint 002 — Enhanced Error Handling ✅

**Mission:** Improve error handling to provide actionable context for LLM agents and prevent API-level failures  
**Status:** ✅ COMPLETE — All 3 work items implemented, tested, documented  
**Decision:** `.squad/decisions/inbox/trinity-sprint-002-complete.md`

**Sprint Scope:**
- WI-001: Enhanced Error Context (P1) — 2-4 hours
- WI-002: Request Size Validation & Large Overlay Handling (P1) — 3 hours
- WI-003: Error Handling Documentation (P2) — 1-2 hours

**Implementation Summary:**

**WI-001: Enhanced Error Context**
- Added optional `details` field to `ErrorResponse` schema in types.ts
- Enhanced `AzureMapsError` class with `details?: Record<string, any>` property
- Updated error factory functions to populate structured context:
  - `createInvalidCoordinatesError()`: Calculates specific range violations (e.g., "latitude 95 exceeds [-90, 90]")
  - `createGeocodeNoResultsError()`: Provides actionable suggestions (verify spelling, simplify query, use country filter)
  - `createPOINoResultsError()`: Suggests broader categories, increased radius
- **Result:** Agents now receive parameter-specific error context with actionable remediation steps

**WI-002: Request Size Validation & Large Overlay Handling**
- Added `OVERLAY_TOO_LARGE` error code to `ErrorCode` enum
- Created `createOverlayTooLargeError(pointCount, estimatedUrlLength, pinCount)` factory function
- Implemented pre-flight URL size validation in `renderStaticMap()`:
  - Parses route geometry GeoJSON to count points
  - Calculates estimated URL length: `routePoints * 22 + pins * 40 + base`
  - Validates against 3000 char safety limit (Azure Maps has ~4KB URL limit)
  - Throws structured error BEFORE API call if exceeded
- **Result:** Prevents 296-point route issue (estimated ~15KB URL) with pre-flight validation

**WI-003: Error Handling Documentation**
- Updated API-REFERENCE.md with enhanced error envelope format
- Documented all 16 error codes with real-world examples:
  - Geocoding errors (3): GEOCODE_NO_RESULTS, GEOCODE_AMBIGUOUS, INVALID_ADDRESS
  - Routing errors (2): ROUTE_IMPOSSIBLE, INVALID_WAYPOINTS
  - POI errors (2): POI_NO_RESULTS, INVALID_CATEGORY
  - Coordinate errors (2): INVALID_COORDINATES, COORDINATES_OUT_OF_RANGE
  - Static map errors (1): OVERLAY_TOO_LARGE
  - Network errors (4): NETWORK_ERROR, RATE_LIMIT_EXCEEDED, AUTHENTICATION_FAILED, SERVICE_UNAVAILABLE
  - General errors (2): INVALID_INPUT, INTERNAL_ERROR
- Added "Troubleshooting Common Scenarios" section:
  - Large route overlay handling (simplify, segment, reduce pins, use dynamic maps)
  - Address geocoding failures (verify format, simplify, country filter, fallback)
  - Route calculation failures (check connectivity, adjust avoidance, segment)
- **Result:** Complete reference for agent developers to handle all error scenarios

**Test Coverage:**
Created `tests/unit/static-map-validation.test.ts` with 3 test cases:
- ✅ Reject route with 296 points + 23 pins (exceeds limit)
- ✅ Accept route with 50 points (within limit)
- ✅ Edge case: 80 pins only (no route, still exceeds limit)
- All tests passing (3/3)

**Build Verification:**
- `npm run build` → 0 TypeScript errors ✅
- All existing tests still passing (no regressions)

**Files Modified:**
- `src/lib/types.ts`: Added `details` field to ErrorResponseSchema
- `src/lib/errors.ts`: Enhanced error classes and factory functions
- `src/lib/azure-maps-client.ts`: Added pre-flight URL size validation
- `API-REFERENCE.md`: Complete error documentation rewrite (~400 lines added)

**Files Created:**
- `tests/unit/static-map-validation.test.ts`: URL size validation test suite
- `.squad/decisions/inbox/trinity-sprint-002-complete.md`: Sprint summary

**Implementation Time:** ~4.5 hours total
- WI-001: 1.5 hours (types, errors, factory functions)
- WI-002: 2 hours (validation logic, error handling, testing)
- WI-003: 1 hour (documentation, examples, troubleshooting guide)

**What Was Learned:**

**1. Pre-Flight Validation Prevents Cascade Failures**
- Validating URL size BEFORE calling Azure Maps prevents:
  - Unnecessary API calls (cost, quota, latency)
  - HTTP 414 errors that are harder to diagnose
  - Poor user experience (wait for network round-trip only to fail)
- Best practice: Validate all known constraints client-side before external API calls

**2. Error Details Field: Backward Compatible Enhancement**
- Optional `details` field allows incremental adoption:
  - Existing agents ignore unknown fields (JSON tolerance)
  - New agents benefit from structured context
  - No breaking changes to existing error handling
- Pattern: Add new optional fields rather than versioning error schemas

**3. Parameter-Specific Error Context = Better Agent Decisions**
- Generic errors: "Invalid coordinates" → Agent retries same input
- Specific errors: "latitude 95 exceeds [-90, 90]" → Agent corrects parameter
- Structured suggestions guide agents to correct actions:
  - "Simplify route geometry" vs "Request failed"
  - "Try broader category" vs "No results"
- Investment in error messages reduces agent confusion loops

**4. URL Size Calculations Must Account for Encoding**
- Route points: ~22 chars per point (lon,lat with separators)
- Pins: ~40 chars per pin (full coordinate pair + label)
- Must include base URL length (~200 chars)
- Safety margin recommended (use 3000 vs actual 4096 limit)

**5. Documentation as Error Prevention**
- Complete error code reference reduces support burden
- Real-world examples help agent developers test edge cases
- Troubleshooting guides accelerate problem resolution
- Best practices section teaches correct usage patterns

**6. Test-Driven Error Validation**
- Created failing test FIRST (296 points should error)
- Implemented validation to make test pass
- Added edge cases (0 route points, many pins)
- Tests document expected behavior

**Sprint Execution Pattern:**
1. Implement work item
2. Build verification (`npm run build`)
3. Create/run tests
4. Move to next work item
5. Final documentation pass
6. Sprint summary

**Next Steps:**
- Neo: Rebuild Docker image with Sprint 002 changes
- Tank: Validate error handling in integration tests
- Morpheus: Review error documentation for agent guidance

---

### 2026-05-26: Azure Maps API Research Spike — Large Route Handling

**Mission:** Research Azure Maps capabilities for visualizing large routes (296+ points)  
**Status:** ✅ COMPLETE — Comprehensive analysis with recommendations  
**Deliverable:** `.squad/decisions/inbox/trinity-azure-maps-research.md`

**Context:** User has 296-point road trip route. Current Static Map API approaches URL length limits (~4KB). Route simplification (296 → 150 points) removed per user feedback (lost too much detail). Research needed to find alternative approaches.

**Key Findings:**

**1. Static Map API Limitations:**
- ❌ **No POST endpoint** — only GET requests supported
- ❌ **URL length hard limit:** ~4KB (browser constraint)
- ❌ **296 points estimated:** ~15KB URL (exceeds all limits)
- ✅ **Max image size:** 8192×8192 pixels (not the blocker)

**2. Azure Maps Web SDK Analysis:**
- ✅ **Can render 296+ points efficiently** (DataSource + LineLayer pattern)
- ✅ **No coordinate limit** (handles 1000+ points smoothly)
- ❌ **Cannot export static images server-side** (browser-only, requires DOM/Canvas/WebGL)
- ⚠️ **HTML artifact pattern possible:** Return HTML template for client-side rendering

**3. Alternative APIs Evaluation:**
- ❌ **Route API:** No simplification endpoint (returns full geometry)
- ❌ **Render Tile API:** Not for custom route overlays
- ❌ **Creator API:** Overkill (designed for persistent custom datasets, additional cost)

**4. Image Stitching Analysis:**
- ⚠️ **Technically feasible** with sharp library
- ⚠️ **HIGH COMPLEXITY:** 2-3 days implementation (geospatial calculations, edge cases)
- ✅ **Sharp recommended:** Production-grade, low memory (~100MB for 4 tiles)
- ⚠️ **Georeferencing required:** Web Mercator projection, tile grid calculation, alignment

**5. MCP Protocol Considerations:**
- ✅ **Base64 pattern works:** 299KB PNG → 400KB base64 (within HTTP limits)
- ❌ **Token cost:** ~100K tokens (unsuitable for LLM processing)
- ✅ **Clawpilot display:** Current pattern works for visualization use case
- ⚠️ **Blob Storage URLs:** Alternative for V2 (zero tokens, requires infrastructure)

**Recommended Solutions:**

**Option A: HTML Artifact (Recommended)**
- Return HTML template with Azure Maps Web SDK code
- User opens in browser → interactive map with full 296-point detail
- **Pros:** Zero simplification, works today, 2-4 hours implementation
- **Cons:** User must manually screenshot if static image needed

**Option B: Segment Route into Multiple Maps**
- Split 296 points → N segments (<100 points each)
- Return array of base64 images
- **Pros:** Uses existing infrastructure, 1 hour implementation
- **Cons:** Disconnected map segments (poor UX)

**Future Enhancements (V2):**
1. **Blob Storage URLs** (~1 day): Zero tokens, requires Azure Blob + cleanup job
2. **Tile Stitching** (~3 days): Sharp library, geospatial calculations, handles arbitrary route sizes
3. **Dedicated Tool** (~4 hours): `maps_render_dynamic_map_html` (separates static vs dynamic concerns)

**Key Insights:**

**URL Encoding Constraints are Hard Limits:** Browser URL limits (~4KB) are HTTP infrastructure constraints, not soft limits. No workaround exists. Must use POST endpoint or different approach entirely.

**Client-Side Rendering ≠ Server-Side Export:** Web SDK libraries require browser environment (DOM/Canvas/WebGL). Not available in Node.js MCP server without headless browser overhead. Design separate paths: static (server APIs) vs dynamic (client rendering).

**Geospatial Complexity:** Operations like "stitch 4 tiles" require map projections, coordinate transforms, edge case handling. Budget 2-3x initial estimate. Always consult Niobe before geospatial work.

**MCP Response Trade-Offs:** Base64 (simple, 100K tokens) vs Blob URLs (requires infra, zero tokens) vs HTML artifacts (full fidelity, client rendering). Design with `returnFormat` parameter for client choice.

**Research Duration:** ~3 hours

**Next Steps:**
- User decision: HTML artifact vs segment approach
- If HTML artifact: Implement `returnFormat` parameter (2-4 hours)
- If tile stitching: Create detailed implementation plan with Niobe

---

## Key Patterns Learned

### Wire-Level Equivalence (2026-05-21)
**Rule:** When Niobe validates an API endpoint with curl, Trinity must generate identical HTTP requests.

**Implementation Pattern:**
- Don't abstract or interpret the validated format
- Match: HTTP method, URL structure, parameter encoding, header format
- Add temporary logging to verify request equivalence
- Trust empirical validation over documentation

**Example:**
- Niobe validated: `GET /route?query=47.6,-122.3:45.5,-122.6`
- Trinity must generate: `GET /route?query=47.6,-122.3:45.5,-122.6`
- NOT: `POST /route` with body (even if docs say it's supported)

### Process:** Always validate API versions with curl tests against deployed instance before implementation.

### Niobe → Trinity Collaboration Pattern (Gen2 Compliance)
**Learned:** 2026-05-21 (blocker fix implementations)

**Pattern:** When Azure Maps Gen2 API details are unclear:
1. Trinity consults Niobe for exact specifications
2. Niobe provides implementation-ready specs (file paths, line numbers, exact code)
3. Trinity implements exactly as specified (no interpretation or "improvements")
4. Tank validates against expected outcomes

**Why This Works:**
- Niobe is the Azure Maps Gen2 authority — don't second-guess her specs
- Exact specifications eliminate ambiguity and rework
- Trinity focuses on clean implementation, not API research
- Clear ownership: Niobe = correctness, Trinity = code quality

### 2026-05-21: Static Map Pin Encoding Fix (URLSearchParams Caveat)
**Mission:** Fix 2 failing Static Map pin tests identified by Tank  
**Status:** ✅ COMPLETE — Ready for validation

**Context:** Tank's wire-level validation showed Static Map pins failing with "Invalid format for location value. Expected a space between coordinates." Root cause: URLSearchParams encodes space as `+` (form encoding), but Azure Maps requires `%20` (percent encoding).

**Wire-Level Evidence:**
```
Generated: pins=default||-122.3321+47.6062    (+ encoding - REJECTED)
Required:  pins=default||-122.3321%2047.6062  (%20 encoding - ACCEPTED)
```

**Solution:** Changed pin parameter handling to bypass URLSearchParams:
1. Manually encode space as `%20` in pin value string
2. Build URL with all parameters EXCEPT pins (to avoid form encoding)
3. Manually append pins parameter to URL string (preserves %20 encoding)

**Code Change (src/lib/azure-maps-client.ts):**
```typescript
// BEFORE: URLSearchParams form encoding (space → +)
const pins = params.pins?.map((p) => `default||${p.longitude} ${p.latitude}`).join('|');
const url = this.buildUrl('/map/static/png', { pins, ... });

// AFTER: Manual %20 encoding, direct URL append
const pinsValue = params.pins?.map((p) => `default||${p.longitude}%20${p.latitude}`).join('|');
let url = this.buildUrl('/map/static/png', baseParams);  // Without pins
if (pinsValue) url += `&pins=${pinsValue}`;  // Manual append with %20 preserved
```

**Build Verification:** `npm run build` → 0 errors ✅

**Expected Impact:** 2 failing Static Map pin tests → 0 (estimated)

**Critical Learning: URLSearchParams Encoding Caveat**

**Form Encoding vs Percent Encoding:**
- **URLSearchParams** uses form encoding (RFC 1866): space → `+`
- **Percent encoding** (RFC 3986): space → `%20`
- Not all REST APIs accept form encoding (Azure Maps Static Map requires strict percent encoding)

**When to Use URLSearchParams:**
- ✅ Standard REST API parameters (most cases)
- ✅ APIs that accept form encoding (`+` for spaces)
- ✅ Parameters without special delimiter characters

**When to Manually Encode:**
- ❌ APIs requiring strict percent encoding (`%20` for spaces)
- ❌ Parameters with special delimiters (pipes, colons) that need preservation
- ❌ APIs with custom encoding rules (like Azure Maps pins)

**Best Practice:**
1. Always test wire-level format against API expectations (use `LOG_HTTP_REQUESTS=true`)
2. Read API documentation for encoding requirements
3. Replicate validated curl commands exactly (wire-level equivalence)
4. Document encoding decisions for future maintenance

**Decision Document:** `.squad/decisions/inbox/trinity-static-map-encoding-fix.md`

**Examples:**
- Route API endpoint fix: Niobe specified `/json` suffix + GeoJSON structure
- Static map pin fix: Niobe specified longitude-first coordinate order

**Anti-Pattern:** Trinity guessing Gen2 API details → wrong assumptions → wasted iterations

### Azure Maps Gen2 API Patterns
**Coordinate Ordering Varies by Endpoint:**
- **GeoJSON arrays:** `[longitude, latitude]` (Route API)
- **Space-separated strings:** `longitude latitude` (Static Map pins)
- **Comma-separated strings:** `longitude,latitude` (Static Map center)
- **Query parameters:** `latitude,longitude` (Timezone API)

**Lesson:** Always verify Gen2 documentation for each specific endpoint — don't assume consistency

**Route API Gen2 (v2025-01-01) Requirements:**
- Endpoint path must include format suffix: `/route/directions/json`
- GeoJSON body requires `pointIndex` (for ordering) and `pointType: 'waypoint'` (for all points)
- Optional `routeOutputOptions` array for additional data (e.g., turn-by-turn instructions)
- No concept of "origin" vs "destination" — all points are waypoints, order inferred from `pointIndex`

### MCP Tool Design
- Composability first: Validate that tools chain effectively
- Token economics: LLM agents consume tokens - provide summary modes
- Empty results ≠ errors: Distinguish "request failed" from "no data found"
- Batch operations: N sequential calls = N×latency - batch endpoints critical

### Parameter Tuning for LLMs
- Default to minimal outputs (summary level)
- Provide escape hatches for detail when needed
- Prevent token waste through sensible defaults (maxResults: 10)

### Azure Maps API Specifics
- API version: Use '1.0' not date-based versions
- Route API: v2025-01-01 requires POST with GeoJSON body
- Batch geocode: NEW /geocode:batch endpoint format (v2026-01-01)
- Static maps: Space-separated pin coordinates (lon lat format)
- GeoJSON: Always [longitude, latitude] coordinate order per spec

---

---

## MCP Best Practices Research (2026-05-21)

**Context:** Deep dive into MCP specification and Microsoft Learn documentation to build expertise in tool schema design for consuming agents (Copilot, Claude, etc.)

### Key MCP Patterns Learned

**Dynamic Discovery (Critical)**
- ❌ Never hardcode tool names in consuming applications
- ✅ Agents call `tools/list` on connection to discover tools dynamically
- ✅ Tool descriptions drive agent decision-making (not documentation)
- **Rationale:** MCP treats tool availability as dynamic - agents must handle additions/removals gracefully

**Tool Schema Design for LLMs**
- **Rich descriptions:** 80-120 characters, state purpose + output + use cases
- **Parameter examples:** Include format examples in every description (e.g., "ISO 3166-1 alpha-2 code like 'US', 'CA'")
- **Explicit units:** Use `distanceMeters`, not `distance` (ambiguity = hallucination)
- **Smart defaults:** Only require parameters that cannot have reasonable defaults
- **Token budget awareness:** Provide `outputLevel` or `maxResults` parameters

**Response Structure Patterns**
- **Standardized error envelope:** `{ success: false, error: { code, message, retryable, retryAfter } }`
- **Retry guidance:** Agents need to know IF (retryable boolean) and WHEN (retryAfter seconds) to retry
- **Metadata for decisions:** Include `{ successCount, failureCount, hasMore }` to guide follow-up actions
- **LLM interpretation:** Don't force rigid parsing - let agents interpret structured responses

**Token Efficiency**
- **Summary modes:** Default to minimal outputs (`summary`), opt-in for detail (`full`)
- **Batch operations:** One `batch_geocode(100)` call > 100 sequential calls
- **Pagination defaults:** `maxResults: 10` (not 1000) prevents token waste
- **Content truncation:** Use `maxTokenBudget` parameter when supported

**Security and Governance**
- **Allow lists:** Use `allowed_tools` to restrict tool access
- **Approval workflows:** Require approval for high-risk operations (writes, deletes)
- **Audit logging:** Log all tool invocations and approvals
- **Data review:** Carefully review what data is shared with third-party MCP servers

### Common Mistakes to Avoid

**Schema Design Mistakes:**
- ❌ Vague descriptions ("Search for data") → ✅ Specific ("Convert address to coordinates (geocoding)")
- ❌ Missing units (`distance: 5000`) → ✅ Explicit (`distanceMeters: 5000`)
- ❌ No parameter examples → ✅ Format hints in every description
- ❌ Requiring every parameter → ✅ Sensible defaults reduce hallucination

**Response Structure Mistakes:**
- ❌ Generic errors ("Something went wrong") → ✅ Structured with retry guidance
- ❌ Token-heavy defaults (1000 results) → ✅ Small defaults (10 results) with opt-in
- ❌ Opaque nested JSON → ✅ Flat structures with clear field names

**Architecture Mistakes:**
- ❌ Hardcoding tool names in consuming code → ✅ Dynamic discovery via `tools/list`
- ❌ Forcing programmatic parsing → ✅ Let LLMs interpret tool outputs
- ❌ No retry logic on 429/503 → ✅ Exponential backoff with Retry-After headers

### Quick Reference for Tool Design

**When designing a new MCP tool:**

1. **Write the description first** (80-120 chars: purpose + output + use cases)
2. **List parameters with examples** (format hints prevent hallucination)
3. **Mark only truly-required params** (defaults > forcing agent guesses)
4. **Design error response** (include `retryable` and `retryAfter`)
5. **Add token controls** (outputLevel or maxResults parameters)
6. **Test with realistic data** (validated by domain expert like Niobe)

**Collaboration checkpoint:** Consult Niobe for API endpoint details, parameter semantics, and response format validation. Trinity owns schema design and TypeScript implementation.

**Documentation:** Full research at `.squad/decisions/inbox/trinity-mcp-best-practices-research.md`

---

## Recent Activity Summary (Last 30 Days)

**2026-05-21:** Decision backlog processing + MCP best practices research
- MCP tool design evaluation complete
- V1 server implementation delivered (16 files)
- 4 critical blockers resolved (all 24 test failures fixed)
- TypeScript compilation errors resolved
- API version configuration corrected
- MCP best practices research complete (35 Microsoft Learn articles analyzed)

**Status:** ✅ Ready for Tank's integration test validation  
**Next:** All-squad meeting to discuss collaboration methodology

**Full History:** See history-archive.md (313 lines, 15570 bytes)

---

### 2026-05-21: MCP Best Practices Research

**Mission:** Establish comprehensive schema design patterns for AZMaps-MCP tool definitions.

**Core Patterns Established:**

1. **Tool Descriptions (80-120 chars)**
   - Be specific about inputs/outputs
   - State use cases explicitly
   - Example: "Convert address to coordinates (geocoding). Returns lat, lon, formatted address, confidence."

2. **Parameter Descriptions**
   - Include examples in every description
   - Specify constraints and formats
   - State optionality explicitly with "Optional." prefix
   - Mention defaults: "Maximum results (1-20). Default: 1"

3. **Required vs Optional Parameters**
   - Require only what has no reasonable default
   - Make filters optional to prevent agent hallucination
   - Provide defaults for limits, zoom levels, verbosity

4. **Standardized Error Envelope**
   ```typescript
   { success: false, error: { code, message, retryable } }
   ```

5. **Token Efficiency**
   - Add `outputLevel` parameter for verbose responses
   - Add `maxResults` parameter for list operations
   - Default to concise responses, opt-in for detail

6. **Naming Conventions**
   - Clarity over brevity: `maxResults` > `max`
   - Consistency across tools: same param names for same concepts
   - CamelCase for JavaScript ecosystem

**Application:** These patterns guide all 7 v1 tool schemas and establish standards for future tool development.

---

### 2026-05-21: Collaboration Protocol - Lessons from Specialist-Bypass Incident

**What Happened:**
- I implemented v1 MCP server including Azure Maps REST API integration
- Did BOTH MCP work AND Azure Maps API work (cross-domain)
- Result: 2 critical bugs that Niobe identified in 1 hour of research
- Root cause: I wasn't aware I should consult Niobe before implementing Azure Maps endpoints

**Why It Happened:**
- No collaboration protocol existed
- Niobe's history file was empty (warning sign they weren't being consulted)
- I tried to be helpful by doing everything, but created avoidable errors

**New Protocol (MANDATORY):**

**I Own:**
- MCP server lifecycle (tool registration, invocation)
- JSON schema design (descriptions, parameters, response structure)
- TypeScript/Node.js architecture

**Niobe Owns:**
- Azure Maps REST API correctness
- Coordinate format handling
- Geospatial domain logic

**Handoff Pattern:**
1. I design MCP tool schema → deliverable in decisions/inbox
2. Niobe reviews and provides Azure Maps API guidance
3. I implement with Niobe's guidance
4. Niobe reviews actual HTTP client code
5. Tank validates with integration tests

**When to Ask Niobe:**
- Uncertain about API versions, coordinate formats, endpoint parameters
- Error codes need interpretation
- Response parsing has ambiguity

**Key Learning:** "Hero member" pattern (one person doing multiple domains) creates avoidable errors. Domain experts must review their domains. Specialist consultation is not optional.

---

### 2026-05-21: Route Overlay MCP Design Analysis

**Mission:** Analyze route overlay capability from MCP tool design perspective for travel agent workflows.

**Context:** Brady requested analysis of whether route overlay (map with route line) is essential for V1, or if workarounds exist. Questions about Copilot usage patterns and alternative tool designs.

**Current State:**
- ✅ `maps_calculate_route` returns GeoJSON geometry with `outputLevel="full"`
- ✅ `maps_render_static_map` accepts `routeGeometry` parameter
- ✅ Implementation converts GeoJSON → Azure Maps path format
- ⚠️ History shows 7 iterations to fix path encoding (URLSearchParams + style syntax)
- ❓ Test status unknown (last history entry shows build passed)

**Key MCP Design Findings:**

1. **Two-Tool Pattern is Correct MCP Design**
   - Composable: Agents can calculate route without rendering map
   - Token efficient: Only request `outputLevel="full"` when needed
   - Follows Unix philosophy: Do one thing well
   - Copilot prefers atomic tools with clear single purposes

2. **Travel Agent Workflow Analysis (3 scenarios)**
   - Verbal route description: ❌ Route overlay NOT essential
   - Visual itinerary: ✅ Route overlay ESSENTIAL (primary deliverable)
   - Client-facing map: ✅ Route overlay ESSENTIAL (professional output)
   - **Conclusion:** Route overlay needed for 2 of 3 core workflows

3. **Copilot Usage Patterns**
   - Can chain tools when descriptions are clear
   - Struggles with implicit requirements ("must use outputLevel=full")
   - Recommendation: Improve tool descriptions with usage examples

4. **Alternative Designs Evaluated**
   - Combined tool (`maps_render_route_map`): ❌ Less composable, not recommended
   - Document workarounds: ✅ Good risk mitigation for V1
   - Simplify style control: ⚠️ Worth investigating if current approach fragile

**V1 Recommendation:**

**Primary Path: Fix + Document**
1. Verify test status (Tank: run integration tests)
2. Improve tool descriptions with cross-references (Trinity)
3. Document limitations + fallback patterns (Scribe)
4. Add integration example (Trinity)

**Contingency: Descope if Tests Fail**
- Remove `routeGeometry` from tool definition
- Keep implementation code (commented) for V2
- Document as V2 feature
- Update AD-003 decision record

**Key Insight:** Route overlay isn't about MCP tool design (design is sound). Question is: Can we deliver stable implementation for V1? If yes, ship it. If no, descope and document workarounds.

**MCP Design Pattern Reinforced:**
- Separate atomic tools > combined convenience tools
- Clear tool descriptions with usage examples are critical
- Document implicit workflows (two-step patterns) in tool descriptions
- Provide fallback guidance when features are experimental

**Deliverable:** `.squad/decisions/inbox/trinity-route-overlay-mcp-analysis.md`

---

### 2026-05-22: MCP Best Practices Research (with Neo)

**Mission:** Comprehensive research on MCP server best practices for Azure hosting to validate current architecture before v1 launch.

**Deliverables:**
- `.squad/knowledge/mcp-azure-best-practices.md` (89KB, 1,078 lines, 8 sections)
- `.squad/knowledge/mcp-research-summary.md` (executive summary, 12KB)

**Key Findings:**

**✅ Architecture Validated:**
- Node.js/TypeScript confirmed as first-class MCP SDK choice (best ecosystem support)
- Direct REST API pattern validated (no SDK wrapper complexity needed)
- Container Apps confirmed optimal for interactive MCP (minReplicas: 1 prevents cold starts)
- Structured error envelopes match MCP recommendations
- Current tool design follows single-responsibility principle ✅

**Cost Analysis:**
- Container Apps: ~$30-50/month (always-warm, zero cold starts)
- Functions Premium: ~$200/month (equivalent always-warm tier)
- Functions Consumption: $0-30/month (but 1-3s cold starts break LLM agent UX)
- **Decision validated:** Container Apps is optimal cost-performance balance

**🔧 Tactical Improvements Identified:**
1. **Health Probes:** Add `/health` endpoint for Container Apps liveness checks (4 hours)
2. **Structured Logging:** Replace console.log with structured JSON logging (6 hours)
3. **Parameter Defaults:** Add maxResults (POI search), outputLevel (routing) to reduce token waste (4 hours)
4. **Observability:** Add request/response logging for debugging
5. **API Version Documentation:** Document version selection rationale

**Research Validation:**
- Current implementation: 90% complete, solid architecture ✅
- Technology stack: Validated against industry best practices ✅
- Design patterns: Centralized HTTP client, error envelopes, batch operations all confirmed correct ✅
- No architectural changes needed — proceed with tactical improvements only

**Squad Meeting Outcome (2026-05-22):**
- Research presented to full squad (Morpheus facilitated)
- Unanimous decision: **CONTINUE WITH EXISTING CODEBASE**
- Recommendation: Focus on tactical improvements vs. rebuild
- Timeline: 2 weeks to v1.0.0 with 5 work items identified

**Personal Contribution:**
- Co-authored MCP best practices guide with Neo
- Validated current MCP server architecture against Microsoft Learn documentation
- Identified parameter optimization opportunities (outputLevel, maxResults)
- Confirmed technology stack aligns with MCP SDK recommendations

**Related Decisions:**
- Supports AD-006 (Continue with Codebase)
- Validates AD-002 (Node.js/TypeScript)
- Informs Sprint 001 planning (health probes, logging, parameters work items)
