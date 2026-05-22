# Sprint 001 — V1 Launch (REFOCUSED)

**Sprint Duration:** 2026-05-22 to 2026-06-05 (2 weeks)  
**Sprint Goal:** Deploy operational MCP service that other agents can discover and call  
**Created:** 2026-05-22  
**Refocused:** 2026-05-22 (user directive: operational service over polish)  
**Created By:** Ralph (Work Monitor)  
**Authority:** Squad Meeting Decision (morpheus-v1-reboot-squad-meeting.md)

---

## Executive Summary

**Status:** 🟢 Ready to Execute (REFOCUSED)

**Refocus Rationale:** Original sprint prioritized polish (logging, parameters, health probes) over proving operational capability. **New focus: Get the MCP service running and callable by other agents FIRST, polish LATER.**

**NEW Sprint Objectives (Priority Order):**
1. **Deploy Container Apps** — Get the service running in Azure (critical path)
2. **Verify MCP Protocol** — Prove other agents can discover tools and invoke them
3. **End-to-End Validation** — Real agent calls Azure Maps via our MCP service
4. **Document Known Limitations** — What works, what doesn't, what's coming in v1.1

**DEPRIORITIZED to V1.1:**
- Structured logging (console.log is fine for v1.0)
- Parameter enhancements (defaults work, optimization can wait)
- API version audit (current versions work, update in v1.1)
- Health probes (Container Apps default probes sufficient for v1.0)

**Critical Success Factors:**
- Container Apps deployment succeeds (unblocks everything else)
- MCP service is reachable and responds to `/list_tools`
- At least 3 tools proven working end-to-end (geocode, route, static map)
- Other Copilot agents can successfully call our service

---

## Sprint Backlog (REFOCUSED)

### WI-001: Container Apps Deployment Fix

**Priority:** P0 (CRITICAL PATH - NOTHING WORKS WITHOUT THIS)  
**Assignee:** Neo (Infrastructure Specialist)  
**Estimate:** 2 days (16 hours)  
**Status:** 🔴 Not Started

**Problem Statement:**  
MCP service cannot be operational until Container Apps deployment succeeds. Previous deployment failed with RBAC/Log Analytics errors. This is the #1 blocker.

**Acceptance Criteria:**
- [ ] Container Apps deployed to `rg-azmaps-mcp-dev`
- [ ] Service is reachable at public FQDN: `https://ca-azmaps-mcp-dev.<region>.azurecontainerapps.io`
- [ ] Container starts successfully (logs show "MCP Server running on port 3000")
- [ ] Health check works: `curl https://<fqdn>/` returns HTTP 200 or valid MCP response
- [ ] Docker image pulled from ACR successfully (AcrPull role working)

**Technical Details:**

**SIMPLIFIED APPROACH - Skip Non-Essentials:**
```bicep
// Minimum viable Container Apps deployment
// Skip: Custom health probes, complex monitoring, advanced RBAC
// Focus: Get it running, prove it works

resource managedIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = {
  name: 'id-azmaps-mcp-dev'
  location: location
}

// Grant AcrPull to Managed Identity
resource acrPullRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  scope: containerRegistry
  name: guid(containerRegistry.id, managedIdentity.id, 'AcrPull')
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '7f951dda-4ed3-4680-a7ca-43fe172d538d')
    principalId: managedIdentity.properties.principalId
    principalType: 'ServicePrincipal'
  }
}

// Simple Log Analytics (use existing if available, create minimal if not)
resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2022-10-01' = {
  name: 'log-azmaps-mcp-dev'
  location: location
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: 30
  }
}

// Container Apps Environment (minimal config)
resource containerAppEnv 'Microsoft.App/managedEnvironments@2023-05-01' = {
  name: 'cae-azmaps-mcp-dev'
  location: location
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logAnalytics.properties.customerId
        sharedKey: logAnalytics.listKeys().primarySharedKey
      }
    }
  }
}

// Container App (minimal viable config)
resource containerApp 'Microsoft.App/containerApps@2023-05-01' = {
  name: 'ca-azmaps-mcp-dev'
  location: location
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${managedIdentity.id}': {}
    }
  }
  properties: {
    managedEnvironmentId: containerAppEnv.id
    configuration: {
      ingress: {
        external: true
        targetPort: 3000
        transport: 'http'
        allowInsecure: false
      }
      registries: [
        {
          server: '${acrName}.azurecr.io'
          identity: managedIdentity.id
        }
      ]
    }
    template: {
      containers: [
        {
          name: 'azmaps-mcp'
          image: '${acrName}.azurecr.io/azmaps-mcp:latest'
          env: [
            {
              name: 'AZURE_MAPS_ENDPOINT'
              value: 'https://atlas.microsoft.com'
            }
            {
              name: 'AZURE_MAPS_API_KEY'
              secretRef: 'maps-api-key'
            }
            {
              name: 'PORT'
              value: '3000'
            }
          ]
          resources: {
            cpu: json('0.5')
            memory: '1Gi'
          }
        }
      ]
      scale: {
        minReplicas: 1  // Keep warm for MCP agent access
        maxReplicas: 3
      }
    }
  }
}

output fqdn string = containerApp.properties.configuration.ingress.fqdn
```

**Testing Validation:**
```powershell
# 1. Verify deployment exists
az containerapp show --name ca-azmaps-mcp-dev --resource-group rg-azmaps-mcp-dev

# 2. Get FQDN
$fqdn = az containerapp show --name ca-azmaps-mcp-dev --resource-group rg-azmaps-mcp-dev --query "properties.configuration.ingress.fqdn" -o tsv
Write-Host "Service FQDN: https://$fqdn"

# 3. Test basic connectivity
curl https://$fqdn/

# 4. Check logs for startup
az containerapp logs show --name ca-azmaps-mcp-dev --resource-group rg-azmaps-mcp-dev --tail 50
```

**Deliverables:**
1. Working `infra/stable/3-container-apps/container-apps.bicep` (simplified)
2. Successful deployment to `rg-azmaps-mcp-dev`
3. FQDN documented in `.squad/reports/deployment-fqdn.md`
4. Basic connectivity test results

**Risk Level:** 🟡 Medium (RBAC can be tricky, but simplified approach reduces surface area)

---

### WI-002: MCP Protocol Verification

**Priority:** P0 (PROVE IT WORKS AS MCP SERVICE)  
**Assignee:** Trinity (MCP Specialist)  
**Estimate:** 4 hours  
**Status:** 🔴 Not Started  
**Dependencies:** WI-001 (needs deployed service)

**Problem Statement:**  
We have code that implements MCP, but we've never proven another agent can discover and call our tools via MCP protocol. Need to verify the service is MCP-compliant and discoverable.

**Acceptance Criteria:**
- [ ] MCP protocol endpoint responds: `GET https://<fqdn>/` returns valid MCP server metadata
- [ ] Tool discovery works: MCP client can call `tools/list` and get 7 tool definitions
- [ ] Tool invocation works: MCP client can call `tools/call` with `maps_search_address` and get results
- [ ] Error handling works: Invalid tool name returns proper MCP error envelope
- [ ] Documentation created: "How to connect to AZMaps-MCP service"

**Technical Details:**

**Test MCP Protocol Manually:**
```powershell
# 1. Verify MCP server info endpoint
$fqdn = "ca-azmaps-mcp-dev.<region>.azurecontainerapps.io"
curl https://$fqdn/

# Expected response (MCP server metadata):
# {
#   "name": "azmaps-mcp",
#   "version": "1.0.0",
#   "capabilities": {
#     "tools": {}
#   }
# }

# 2. List available tools
curl https://$fqdn/tools/list

# Expected: Array of 7 tool definitions with names, descriptions, inputSchemas

# 3. Invoke a tool
curl -X POST https://$fqdn/tools/call `
  -H "Content-Type: application/json" `
  -d '{
    "name": "maps_search_address",
    "arguments": {
      "address": "Space Needle, Seattle WA"
    }
  }'

# Expected: Coordinates for Space Needle

# 4. Test error handling
curl -X POST https://$fqdn/tools/call `
  -H "Content-Type: application/json" `
  -d '{
    "name": "invalid_tool_name",
    "arguments": {}
  }'

# Expected: MCP error envelope with error code
```

**Verify MCP Client Integration:**
```typescript
// Test script using MCP SDK
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const client = new Client({
  name: 'test-client',
  version: '1.0.0'
}, {
  capabilities: {}
});

// Connect to our service
const transport = new StdioClientTransport({
  command: 'curl',
  args: [`https://${process.env.AZMAPS_MCP_FQDN}`]
});

await client.connect(transport);

// List tools
const tools = await client.listTools();
console.log(`Found ${tools.length} tools`);
console.log(tools.map(t => t.name));

// Call geocode tool
const result = await client.callTool({
  name: 'maps_search_address',
  arguments: { address: 'Seattle WA' }
});

console.log('Geocode result:', result);
```

**Deliverables:**
1. Manual test results documented in `.squad/reports/mcp-protocol-verification.md`
2. MCP client test script in `tests/manual/mcp-client-test.ts`
3. Connection guide: `docs/CONNECTING_TO_SERVICE.md`
4. Service endpoint URL documented in README.md

**Risk Level:** 🟢 Low (MCP SDK already implemented, just needs verification)

---

### WI-003: End-to-End Agent Integration

**Priority:** P0 (PROVE OTHER AGENTS CAN USE IT)  
**Assignee:** Trinity + Brady (User Validation)  
**Estimate:** 6 hours  
**Status:** 🔴 Not Started  
**Dependencies:** WI-001, WI-002 (needs deployed service + verified protocol)

**Problem Statement:**  
We need proof that GitHub Copilot (or other MCP clients) can discover our service, see the 7 tools, and successfully call them for real travel agent workflows.

**Acceptance Criteria:**
- [ ] GitHub Copilot workspace configured with AZMaps-MCP connection
- [ ] Copilot can list tools: User types "@azmaps" and sees 7 tool suggestions
- [ ] Geocode workflow works: "Find coordinates for Pike Place Market" → Copilot uses maps_search_address
- [ ] Route workflow works: "Route from Seattle to Portland" → Copilot uses maps_calculate_route
- [ ] Static map workflow works: "Show map of Space Needle" → Copilot uses maps_render_static_map
- [ ] Error handling demonstrated: Invalid inputs return helpful error messages
- [ ] Brady validates: "This is ready for travel agents to use"

**Technical Details:**

**GitHub Copilot MCP Configuration:**
```json
// .copilot/mcp-servers.json or similar
{
  "mcpServers": {
    "azmaps": {
      "url": "https://ca-azmaps-mcp-dev.<region>.azurecontainerapps.io",
      "description": "Azure Maps integration for geocoding, routing, and mapping"
    }
  }
}
```

**Test Scenarios (Brady):**

**Scenario 1: Geocoding**
```
User: "Find coordinates for Pike Place Market in Seattle"

Expected Flow:
1. Copilot recognizes location query
2. Calls @azmaps maps_search_address with "Pike Place Market, Seattle WA"
3. Returns: { latitude: 47.6097, longitude: -122.3422, formattedAddress: "Pike Place Market, Seattle, WA 98101" }
4. Copilot presents: "Pike Place Market is at 47.6097, -122.3422"
```

**Scenario 2: Routing**
```
User: "Calculate drive time from Seattle to Portland"

Expected Flow:
1. Copilot geocodes both cities (maps_batch_geocode or 2x maps_search_address)
2. Calls @azmaps maps_calculate_route with waypoints
3. Returns: { totalDistanceMeters: 280000, totalDurationSeconds: 10800 }
4. Copilot presents: "280 km, about 3 hours"
```

**Scenario 3: Static Map**
```
User: "Show me a map of the Space Needle"

Expected Flow:
1. Copilot geocodes "Space Needle" (maps_search_address)
2. Calls @azmaps maps_render_static_map with coordinates + zoom
3. Returns: Base64-encoded PNG
4. Copilot displays image inline
```

**Scenario 4: Error Handling**
```
User: "Find address for coordinates 999, 999" (invalid)

Expected Flow:
1. Copilot calls @azmaps maps_reverse_geocode with invalid coords
2. Service returns MCP error envelope: { code: 'INVALID_COORDINATES', message: 'Latitude must be between -90 and 90' }
3. Copilot presents: "Those coordinates are invalid. Please check your input."
```

**Deliverables:**
1. GitHub Copilot configuration documented
2. Test scenarios executed and results recorded in `.squad/reports/agent-integration-validation.md`
3. Brady sign-off: "Ready for travel agents" ✅ or feedback for v1.1
4. Screen recordings of successful workflows (optional but nice)

**Risk Level:** 🟡 Medium (Depends on Copilot's MCP client implementation, which we don't control)

---

### WI-004: Documentation & Known Limitations

**Priority:** P1 (SET EXPECTATIONS)  
**Assignee:** Scribe + Trinity  
**Estimate:** 4 hours  
**Status:** 🔴 Not Started  
**Dependencies:** WI-001, WI-002, WI-003 (needs validation results)

**Problem Statement:**  
V1.0 is operational but not polished. Need clear documentation of what works, what doesn't, and what's coming in v1.1 so users have realistic expectations.

**Acceptance Criteria:**
- [ ] README.md updated with service connection details and quick start
- [ ] LIMITATIONS.md created documenting known issues and workarounds
- [ ] ROADMAP.md created with v1.1 planned improvements
- [ ] API reference generated (tool names, parameters, response formats)
- [ ] Troubleshooting guide created (common errors and fixes)

**Technical Details:**

**README.md Updates:**
```markdown
# AZMaps-MCP

Azure Maps MCP Server - Geocoding, routing, and mapping tools for AI agents.

## 🚀 Quick Start

**Service URL:** `https://ca-azmaps-mcp-dev.<region>.azurecontainerapps.io`

**GitHub Copilot Configuration:**
```json
{
  "mcpServers": {
    "azmaps": {
      "url": "https://ca-azmaps-mcp-dev.<region>.azurecontainerapps.io"
    }
  }
}
```

**Available Tools:**
- `maps_search_address` — Geocode address to coordinates
- `maps_batch_geocode` — Batch geocoding (array of addresses)
- `maps_reverse_geocode` — Reverse geocode coordinates to address
- `maps_search_nearby` — Find nearby POIs
- `maps_calculate_route` — Multi-waypoint routing
- `maps_get_timezone` — Get timezone for coordinates
- `maps_render_static_map` — Generate static map image

## ✅ What Works (v1.0)

- All 7 primitive tools functional
- Real-time geocoding and routing
- Static map generation with pins
- Error handling with retryable hints
- Deployed on Azure Container Apps (always-warm)

## ⚠️ Known Limitations (v1.0)

See [LIMITATIONS.md](LIMITATIONS.md) for details:
- Console logging only (no structured logs in v1.0)
- No parameter defaults optimization (v1.1)
- Static map route overlay has edge cases (18/73 tests)
- Health probe is basic (no deep Azure Maps connectivity check)
- API versions not audited (using working versions, formal audit in v1.1)

## 🗺️ Roadmap (v1.1+)

See [ROADMAP.md](ROADMAP.md) for planned improvements.
```

**LIMITATIONS.md:**
```markdown
# Known Limitations — V1.0

## Logging

**Issue:** Service uses console.log, not structured JSON logging.

**Impact:** Harder to query logs in Azure Monitor.

**Workaround:** Use Azure Monitor's text search. Structured logging coming in v1.1 (WI-003-V1.1).

**Timeline:** v1.1 (1-2 weeks after v1.0)

---

## Parameter Defaults

**Issue:** Tools don't have token-optimized defaults.

**Impact:** Agents may request more data than needed (e.g., 100 POIs when 10 would suffice).

**Workaround:** Explicitly specify parameters in agent prompts (e.g., "find 5 restaurants").

**Timeline:** v1.1 (maxResults, outputLevel parameters - WI-004-V1.1)

---

## Static Map Route Overlay

**Issue:** Route overlay has 18 edge cases failing (unicode addresses, polar coordinates, ocean routes).

**Impact:** Some routes render without path line (waypoint pins only).

**Workaround:** Use maps_calculate_route for route data + maps_render_static_map with pins only.

**Timeline:** v1.1 or v2.0 (requires Azure Maps API deep dive)

---

## Health Probe

**Issue:** Health endpoint doesn't test Azure Maps connectivity.

**Impact:** Service may report "healthy" even if Azure Maps API is down.

**Workaround:** Monitor logs for Azure Maps errors.

**Timeline:** v1.1 (deep health checks - WI-002-V1.1)

---

## API Versions

**Issue:** API versions not formally audited.

**Impact:** May be using older API versions without latest features.

**Workaround:** Current versions work correctly (tested in integration suite).

**Timeline:** v1.1 (API version audit - WI-005-V1.1)
```

**ROADMAP.md:**
```markdown
# Roadmap

## V1.1 (Planned: June 2026)

**Goal:** Polish operational service based on v1.0 user feedback

**Work Items:**
- Structured logging with Winston (WI-003-V1.1, 6 hours)
- Parameter enhancements: maxResults, outputLevel (WI-004-V1.1, 4 hours)
- API version audit and update (WI-005-V1.1, 4 hours)
- Deep health probes with Azure Maps connectivity (WI-002-V1.1, 4 hours)
- Performance optimization based on production metrics

**Timeline:** 1-2 weeks after v1.0 release

---

## V2.0 (Planned: Q3 2026)

**Goal:** Advanced features and scale

**Candidate Features:**
- Real-time traffic integration
- Interactive maps (not just static images)
- Route optimization (traveling salesman)
- Batch operations for all tools (not just geocoding)
- Caching layer (Redis) for frequently accessed data
- Multi-region deployment
- Rate limiting and quota management

**Timeline:** 3-4 months after v1.0 release
```

**Deliverables:**
1. Updated README.md with quick start and service URL
2. LIMITATIONS.md documenting known issues
3. ROADMAP.md with v1.1 and v2.0 plans
4. API reference in `docs/API_REFERENCE.md`
5. Troubleshooting guide in `docs/TROUBLESHOOTING.md`

**Risk Level:** 🟢 Low (documentation only, no code changes)

---

## DEPRIORITIZED TO V1.1

The following work items from the original sprint are **DEPRIORITIZED** to v1.1 release. They are valuable improvements but not required for operational service.

### WI-002-V1.1: Health Probes (Deep Checks)

**Original Priority:** P0  
**NEW Priority:** V1.1  
**Reason for Deferral:** Container Apps has default health probes. Deep Azure Maps connectivity checks are nice-to-have, not required for v1.0 operational capability.

**What's Good Enough for V1.0:** Default Container Apps liveness probe (TCP port check). If container responds on port 3000, it's considered healthy.

**When to Implement:** After v1.0 ships and we have production metrics showing health probe gaps.

---

### WI-003-V1.1: Structured Logging

**Original Priority:** P1  
**NEW Priority:** V1.1  
**Reason for Deferral:** Console.log works for debugging v1.0 issues. Structured JSON logging is optimization, not blocker.

**What's Good Enough for V1.0:** `console.log` statements with timestamps and tool names. Azure Monitor captures text logs.

**When to Implement:** After v1.0 ships and we identify specific log query needs (e.g., "find all failed geocode requests").

---

### WI-004-V1.1: Parameter Enhancements

**Original Priority:** P1  
**NEW Priority:** V1.1  
**Reason for Deferral:** Current tools work without defaults. Token optimization is valuable but not required for functional service.

**What's Good Enough for V1.0:** Agents specify parameters explicitly in prompts (e.g., "find 5 restaurants").

**When to Implement:** After v1.0 user feedback shows token waste or poor UX from missing defaults.

---

### WI-005-V1.1: API Version Audit

**Original Priority:** P1  
**NEW Priority:** V1.1  
**Reason for Deferral:** Integration tests pass with current API versions. Formal audit is nice-to-have.

**What's Good Enough for V1.0:** Current API versions work (55/73 integration tests passing, 18 failures are edge cases).

**When to Implement:** After v1.0 ships and we want to ensure latest API features are available.
      }
    }
    template: {
      containers: [{
        name: 'azmaps-mcp'
        image: '${acrLoginServer}/azmaps-mcp:latest'
        resources: {
          cpu: json('0.25')
          memory: '0.5Gi'
        }
        probes: [
          {
            type: 'Liveness'
            httpGet: {
              path: '/health'
              port: 3000
              scheme: 'HTTP'
            }
            initialDelaySeconds: 10
            periodSeconds: 30
            timeoutSeconds: 5
            failureThreshold: 3
          }
          {
            type: 'Readiness'
            httpGet: {
              path: '/health'
              port: 3000
              scheme: 'HTTP'
            }
            initialDelaySeconds: 5
            periodSeconds: 10
            timeoutSeconds: 3
            failureThreshold: 3
          }
        ]
      }]
      scale: {
        minReplicas: 1 // Zero cold starts for interactive agents
        maxReplicas: 3
      }
    }
  }
}
```

**Dependencies:**
- None (can implement before Container Apps deployment)

**Testing Validation:**
```typescript
// tests/integration/health.test.ts

import { describe, it, expect } from 'vitest';

describe('Health Endpoint', () => {
  it('should return 200 when healthy', async () => {
    const response = await fetch('http://localhost:3000/health');
    expect(response.status).toBe(200);
    
    const health = await response.json();
    expect(health.status).toBe('healthy');
    expect(health.checks.azureMaps).toBe('healthy');
  });

  it('should return 503 when Azure Maps unreachable', async () => {
    // Test with invalid API key
    const response = await fetch('http://localhost:3000/health');
    expect(response.status).toBe(503);
    
    const health = await response.json();
    expect(health.status).toBe('unhealthy');
  });
});
```

**Deliverables:**
1. `/health` endpoint in `src/server.ts`
2. Integration test in `tests/integration/health.test.ts`
3. Bicep update in `infra/stable/3-container-apps/container-apps.bicep`
4. Documentation in README.md (Health Monitoring section)

**Risk Level:** 🟢 Low (straightforward HTTP endpoint)

---

### WI-003: Structured Logging Implementation

**Priority:** P1 (High)  
**Assignee:** Trinity (Backend Specialist)  
**Estimate:** 6 hours  
**Status:** 🔴 Not Started

**Problem Statement:**  
Current implementation uses `console.log`, which produces unstructured output. Azure Monitor requires JSON logs for effective querying and alerting.

**Acceptance Criteria:**
- [ ] Winston or Pino logger configured
- [ ] Logging abstraction in `src/lib/logger.ts`
- [ ] All `console.log` statements replaced
- [ ] JSON output format with contextual fields (requestId, toolName, duration)
- [ ] Log levels: debug, info, warn, error
- [ ] Environment variable `LOG_LEVEL` controls verbosity
- [ ] Performance impact <5ms per log statement

**Technical Details:**

**Implementation (Winston):**
```typescript
// src/lib/logger.ts

import winston from 'winston';

const logLevel = process.env.LOG_LEVEL || 'info';

export const logger = winston.createLogger({
  level: logLevel,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'azmaps-mcp' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Helper for request logging
export function createRequestLogger(requestId: string, toolName: string) {
  return logger.child({ requestId, toolName });
}
```

**Usage Example:**
```typescript
// src/tools/geocode.ts

import { createRequestLogger } from '../lib/logger.js';

export async function geocodeAddress(input: { address: string }) {
  const requestId = crypto.randomUUID();
  const log = createRequestLogger(requestId, 'maps_search_address');
  
  log.info('Tool invoked', { input });
  
  const startTime = Date.now();
  
  try {
    const result = await azureMapsClient.get('/search/address/json', {
      'api-version': '2026-01-01',
      query: input.address
    });
    
    const duration = Date.now() - startTime;
    log.info('Tool completed', { duration, resultCount: result.results.length });
    
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    log.error('Tool failed', { duration, error: error.message });
    throw error;
  }
}
```

**Log Output Example:**
```json
{
  "timestamp": "2026-05-22T14:23:45.123Z",
  "level": "info",
  "service": "azmaps-mcp",
  "requestId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "toolName": "maps_search_address",
  "message": "Tool completed",
  "duration": 450,
  "resultCount": 3
}
```

**Dependencies:**
- Add Winston to package.json: `npm install winston`

**Testing Validation:**
```typescript
// tests/unit/logger.test.ts

import { describe, it, expect } from 'vitest';
import { logger, createRequestLogger } from '../src/lib/logger.js';

describe('Logger', () => {
  it('should log JSON format', () => {
    const log = createRequestLogger('test-123', 'test-tool');
    log.info('Test message', { data: 'test' });
    // Verify JSON structure in output
  });

  it('should respect LOG_LEVEL environment variable', () => {
    process.env.LOG_LEVEL = 'warn';
    const log = createRequestLogger('test-456', 'test-tool');
    log.debug('Should not appear');
    log.warn('Should appear');
  });
});
```

**Migration Checklist:**
- [ ] Replace in `src/server.ts`
- [ ] Replace in `src/tools/geocode.ts`
- [ ] Replace in `src/tools/reverse-geocode.ts`
- [ ] Replace in `src/tools/poi-search.ts`
- [ ] Replace in `src/tools/route.ts`
- [ ] Replace in `src/tools/timezone.ts`
- [ ] Replace in `src/tools/static-map.ts`
- [ ] Replace in `src/lib/azure-maps-client.ts`

**Deliverables:**
1. `src/lib/logger.ts` (logging abstraction)
2. Updated tool files (7 tools)
3. Updated `src/server.ts`
4. Updated `package.json` (Winston dependency)
5. Unit tests in `tests/unit/logger.test.ts`
6. Documentation update (README.md - Logging section)

**Risk Level:** 🟢 Low (mechanical refactor, no logic changes)

---

### WI-004: Parameter Enhancements

**Priority:** P1 (High)  
**Assignee:** Trinity (Backend Specialist)  
**Estimate:** 4 hours  
**Status:** 🔴 Not Started

**Problem Statement:**  
Current tools don't provide Copilot-friendly parameter defaults. Agents may request full datasets when only summaries are needed, wasting tokens and increasing latency.

**Acceptance Criteria:**
- [ ] `maxResults` parameter added to `maps_search_nearby` (default: 10, range: 1-100)
- [ ] `outputLevel` parameter added to `maps_calculate_route` (default: 'summary', options: summary/detailed/full)
- [ ] Parameter schemas updated in tool definitions
- [ ] Backward compatible (defaults preserve existing behavior)
- [ ] Unit tests updated for new parameters
- [ ] Integration tests verify parameter behavior

**Technical Details:**

**POI Search Update:**
```typescript
// src/tools/poi-search.ts

export const poiSearchTool: Tool = {
  name: 'maps_search_nearby',
  description: 'Search for points of interest near coordinates',
  inputSchema: {
    type: 'object',
    properties: {
      latitude: {
        type: 'number',
        description: 'Latitude of search center'
      },
      longitude: {
        type: 'number',
        description: 'Longitude of search center'
      },
      category: {
        type: 'string',
        description: 'POI category (e.g., "restaurant", "hotel", "gas station")'
      },
      radiusMeters: {
        type: 'number',
        default: 5000,
        minimum: 100,
        maximum: 50000,
        description: 'Search radius in meters. Default: 5000m (5km)'
      },
      maxResults: {
        type: 'number',
        default: 10,
        minimum: 1,
        maximum: 100,
        description: 'Maximum number of POIs to return. Default: 10. Use lower values (5) for quick overviews, higher values (50+) for comprehensive searches.'
      }
    },
    required: ['latitude', 'longitude', 'category']
  }
};

export async function searchNearbyPOIs(input: {
  latitude: number;
  longitude: number;
  category: string;
  radiusMeters?: number;
  maxResults?: number;
}): Promise<any> {
  const radius = input.radiusMeters ?? 5000;
  const limit = input.maxResults ?? 10;
  
  const result = await azureMapsClient.get('/search/poi/json', {
    'api-version': '2026-01-01',
    query: input.category,
    lat: input.latitude,
    lon: input.longitude,
    radius,
    limit
  });
  
  return result;
}
```

**Route Calculation Update:**
```typescript
// src/tools/route.ts

export const routeTool: Tool = {
  name: 'maps_calculate_route',
  description: 'Calculate route with multiple waypoints',
  inputSchema: {
    type: 'object',
    properties: {
      waypoints: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            latitude: { type: 'number' },
            longitude: { type: 'number' }
          },
          required: ['latitude', 'longitude']
        },
        minItems: 2,
        description: 'Array of waypoints (minimum 2: start and end)'
      },
      travelMode: {
        type: 'string',
        enum: ['car', 'truck', 'taxi', 'bus', 'van', 'motorcycle', 'bicycle', 'pedestrian'],
        default: 'car',
        description: 'Travel mode for route calculation'
      },
      outputLevel: {
        type: 'string',
        enum: ['summary', 'detailed', 'full'],
        default: 'summary',
        description: 'Level of detail in response. summary: distance+duration only. detailed: +waypoints+legs. full: +turn-by-turn instructions.'
      }
    },
    required: ['waypoints']
  }
};

export async function calculateRoute(input: {
  waypoints: Array<{ latitude: number; longitude: number }>;
  travelMode?: string;
  outputLevel?: 'summary' | 'detailed' | 'full';
}): Promise<any> {
  const mode = input.travelMode ?? 'car';
  const level = input.outputLevel ?? 'summary';
  
  const result = await azureMapsClient.post('/route/directions/json', {
    'api-version': '2025-01-01',
    travelMode: mode
  }, {
    waypoints: input.waypoints
  });
  
  // Filter response based on outputLevel
  if (level === 'summary') {
    return {
      totalDistanceMeters: result.routes[0].summary.lengthInMeters,
      totalDurationSeconds: result.routes[0].summary.travelTimeInSeconds,
      departureTime: result.routes[0].summary.departureTime,
      arrivalTime: result.routes[0].summary.arrivalTime
    };
  } else if (level === 'detailed') {
    return {
      summary: result.routes[0].summary,
      legs: result.routes[0].legs.map(leg => ({
        distanceMeters: leg.summary.lengthInMeters,
        durationSeconds: leg.summary.travelTimeInSeconds,
        startPoint: leg.points[0],
        endPoint: leg.points[leg.points.length - 1]
      }))
    };
  } else {
    return result.routes[0]; // Full response
  }
}
```

**Dependencies:**
- None (isolated schema changes)

**Testing Validation:**
```typescript
// tests/unit/poi-search.test.ts

describe('POI Search Parameter Defaults', () => {
  it('should use default maxResults=10 when not specified', async () => {
    const result = await searchNearbyPOIs({
      latitude: 47.6062,
      longitude: -122.3321,
      category: 'restaurant'
    });
    expect(result.results.length).toBeLessThanOrEqual(10);
  });

  it('should respect custom maxResults', async () => {
    const result = await searchNearbyPOIs({
      latitude: 47.6062,
      longitude: -122.3321,
      category: 'restaurant',
      maxResults: 5
    });
    expect(result.results.length).toBeLessThanOrEqual(5);
  });
});

// tests/unit/route.test.ts

describe('Route Output Level', () => {
  it('should return summary only when outputLevel=summary', async () => {
    const result = await calculateRoute({
      waypoints: [
        { latitude: 47.6062, longitude: -122.3321 },
        { latitude: 47.6205, longitude: -122.3493 }
      ],
      outputLevel: 'summary'
    });
    expect(result).toHaveProperty('totalDistanceMeters');
    expect(result).toHaveProperty('totalDurationSeconds');
    expect(result).not.toHaveProperty('legs'); // Should not include legs
  });

  it('should return legs when outputLevel=detailed', async () => {
    const result = await calculateRoute({
      waypoints: [
        { latitude: 47.6062, longitude: -122.3321 },
        { latitude: 47.6205, longitude: -122.3493 }
      ],
      outputLevel: 'detailed'
    });
    expect(result).toHaveProperty('legs');
    expect(result.legs).toBeInstanceOf(Array);
  });
});
```

**Deliverables:**
1. Updated `src/tools/poi-search.ts`
2. Updated `src/tools/route.ts`
3. Updated unit tests
4. Updated integration tests
5. Documentation update (README.md - API Reference section)

**Risk Level:** 🟢 Low (backward compatible, defaults preserve existing behavior)

---

### WI-005: API Version Audit & Update

**Priority:** P1 (High)  
**Assignee:** Niobe (Azure Maps Specialist)  
**Estimate:** 4 hours  
**Status:** 🔴 Not Started

**Problem Statement:**  
Unknown API versions in use. Must audit current versions and update to latest stable versions to avoid deprecated APIs and ensure access to latest features.

**Acceptance Criteria:**
- [ ] Audit report documenting current API versions per endpoint
- [ ] All endpoints updated to latest stable Gen2 versions
- [ ] Version selection rationale documented in code comments
- [ ] Regression tests pass with updated versions
- [ ] No breaking changes introduced
- [ ] Documentation updated with API version strategy

**Technical Details:**

**Target API Versions:**

| Endpoint Category | Target Version | Rationale |
|-------------------|----------------|-----------|
| Search API | `2026-01-01` | Latest stable (GA March 2026), new features available |
| Route API | `2025-01-01` | Latest stable for routing |
| Render API | `2024-04-01` | Avoid deprecated 1.0 (retiring Sept 2026) |
| Timezone API | `1.0` | Only stable version available |

**Audit Process:**

1. **Search Codebase:**
```powershell
# Find all API version references
grep -r "api-version" src/
grep -r "api-version" tests/
```

2. **Compare Against Reference:**
```typescript
// Current (example)
azureMapsClient.get('/search/address/json', {
  'api-version': '2023-06-01', // OLD
  query: address
});

// Target
azureMapsClient.get('/search/address/json', {
  'api-version': '2026-01-01', // NEW
  query: address
});
```

3. **Update HTTP Client:**
```typescript
// src/lib/azure-maps-client.ts

// Document API version strategy
const API_VERSIONS = {
  SEARCH: '2026-01-01',     // Search API (geocode, reverse geocode, POI)
  ROUTE: '2025-01-01',      // Route API (directions)
  RENDER: '2024-04-01',     // Render API (static maps)
  TIMEZONE: '1.0'           // Timezone API
} as const;

export class AzureMapsClient {
  // Helper methods for each API category
  async searchRequest(path: string, params: Record<string, any>) {
    return this.get(path, {
      'api-version': API_VERSIONS.SEARCH,
      ...params
    });
  }

  async routeRequest(path: string, params: Record<string, any>) {
    return this.post(path, {
      'api-version': API_VERSIONS.ROUTE,
      ...params
    });
  }

  async renderRequest(path: string, params: Record<string, any>) {
    return this.get(path, {
      'api-version': API_VERSIONS.RENDER,
      ...params
    });
  }

  async timezoneRequest(path: string, params: Record<string, any>) {
    return this.get(path, {
      'api-version': API_VERSIONS.TIMEZONE,
      ...params
    });
  }
}
```

4. **Update Tool Implementations:**
```typescript
// Before
const result = await azureMapsClient.get('/search/address/json', {
  'api-version': '2023-06-01', // Hardcoded version
  query: address
});

// After
const result = await azureMapsClient.searchRequest('/search/address/json', {
  query: address
});
```

**Dependencies:**
- None (can run in parallel with other improvements)

**Testing Validation:**
```typescript
// tests/integration/api-versions.test.ts

describe('API Version Compliance', () => {
  it('should use latest stable versions for each endpoint', async () => {
    // Geocode should use 2026-01-01
    const geocodeResult = await geocodeAddress({ address: 'Seattle WA' });
    expect(geocodeResult).toBeDefined();

    // Route should use 2025-01-01
    const routeResult = await calculateRoute({
      waypoints: [
        { latitude: 47.6062, longitude: -122.3321 },
        { latitude: 47.6205, longitude: -122.3493 }
      ]
    });
    expect(routeResult).toBeDefined();

    // Static map should use 2024-04-01 (not deprecated 1.0)
    const mapResult = await renderStaticMap({
      latitude: 47.6062,
      longitude: -122.3321,
      zoom: 12
    });
    expect(mapResult).toBeDefined();
  });

  it('should not use deprecated API versions', async () => {
    // Verify Render API is NOT using deprecated 1.0
    const mapUrl = await renderStaticMap({
      latitude: 47.6062,
      longitude: -122.3321,
      zoom: 12
    });
    expect(mapUrl).not.toContain('api-version=1.0');
    expect(mapUrl).toContain('api-version=2024-04-01');
  });
});
```

**Deliverables:**
1. Audit report: `.squad/reports/api-version-audit-2026-05-22.md`
2. Updated `src/lib/azure-maps-client.ts` (API version constants)
3. Updated tool files (7 tools using helper methods)
4. Integration tests validating API versions
5. Documentation: `docs/api-version-strategy.md`

**Risk Level:** 🟡 Medium (API changes could introduce breaking changes, but Gen2 platform is stable)

---

## Sprint Timeline (REFOCUSED)

### Week 1: Deploy & Verify (May 22-29)

**Goal:** Get Container Apps deployed and MCP protocol working

**Days 1-3 (May 22-24): Container Apps Deployment (WI-001)**

**Neo (Infrastructure - CRITICAL PATH):**
- [ ] Day 1: Fix Bicep template (Managed Identity + AcrPull role)
- [ ] Day 2: Fix Log Analytics linkage, deploy to dev
- [ ] Day 3: Validate deployment, test connectivity

**Trinity (Support):**
- [ ] Day 1-2: Stand by for troubleshooting
- [ ] Day 3: Validate service responds to HTTP requests

**Daily Check-ins:** 4:00 PM (Blocker removal only)

**Week 1 Milestone:** Service is deployed and reachable at public FQDN ✅

---

**Days 4-5 (May 25-26): MCP Protocol Verification (WI-002)**

**Trinity (MCP Validation):**
- [ ] Day 4: Test MCP endpoints (server info, tools/list, tools/call)
- [ ] Day 4: Write MCP client test script
- [ ] Day 5: Document connection process, create troubleshooting guide

**Niobe (API Validation):**
- [ ] Day 4-5: Test all 7 tools manually, verify responses

**Neo (Monitor):**
- [ ] Day 4-5: Watch logs for errors, investigate failures

**Week 1 Milestone:** MCP protocol verified, tools discoverable ✅

---

### Week 2: Agent Integration & Documentation (May 30 - June 5)

**Goal:** Prove other agents can use the service + document limitations

**Days 6-8 (May 27-29): End-to-End Agent Integration (WI-003)**

**Trinity + Brady (Agent Testing):**
- [ ] Day 6: Configure GitHub Copilot to connect to service
- [ ] Day 6: Test geocode workflow ("Find Pike Place Market")
- [ ] Day 7: Test route workflow ("Seattle to Portland")
- [ ] Day 7: Test static map workflow ("Show Space Needle")
- [ ] Day 8: Test error handling, edge cases
- [ ] Day 8: Brady sign-off: "Ready for travel agents" or feedback for v1.1

**Morpheus (Review):**
- [ ] Day 6-8: Review agent test results, identify v1.1 improvements

**Week 2 Checkpoint:** Agent integration proven, Brady validates ✅

---

**Days 9-10 (June 2-3): Documentation & Known Limitations (WI-004)**

**Scribe + Trinity (Documentation):**
- [ ] Day 9: Update README.md with quick start
- [ ] Day 9: Create LIMITATIONS.md documenting v1.0 issues
- [ ] Day 9: Create ROADMAP.md with v1.1 improvements
- [ ] Day 10: Create API_REFERENCE.md (tool signatures)
- [ ] Day 10: Create TROUBLESHOOTING.md (common errors)

**Morpheus (Review):**
- [ ] Day 10: Final documentation review

**Week 2 Milestone:** Documentation complete, expectations set ✅

---

**Days 11-12 (June 4-5): Buffer & Release**

**All Squad (Polish):**
- [ ] Day 11: Address any last-minute feedback from Brady
- [ ] Day 11: Final smoke test (all 7 tools)
- [ ] Day 12: Tag v1.0.0
- [ ] Day 12: Announce v1.0 operational, link to ROADMAP for v1.1

**Morpheus (Release Manager):**
- [ ] Day 12: Create GitHub release with v1.0.0 tag
- [ ] Day 12: Publish release notes highlighting operational status + known limitations

---

## Success Metrics (REFOCUSED)

### Functional Success (Binary - Works or Doesn't)

- [ ] **Container Apps deployed** — Service running at public FQDN
- [ ] **MCP protocol working** — Tools discoverable and callable
- [ ] **3 core tools proven** — Geocode, route, static map end-to-end
- [ ] **Agent integration validated** — GitHub Copilot successfully uses service
- [ ] **Brady sign-off** — "Ready for travel agents" ✅

### Performance (Baseline - No Targets Yet)

*Baseline measurements, not goals. Optimization comes in v1.1 after production data.*

- Geocode response time: <TBD>ms average
- Route response time: <TBD>s average  
- Static map response time: <TBD>s average
- Error rate: <TBD>% (track for v1.1 improvement)
- Uptime: <TBD>% (track for v1.1 SLO definition)

### Documentation Success

- [ ] **README.md** — Quick start with service URL
- [ ] **LIMITATIONS.md** — Known issues documented
- [ ] **ROADMAP.md** — V1.1 improvements planned
- [ ] **API_REFERENCE.md** — Tool signatures documented
- [ ] **TROUBLESHOOTING.md** — Common errors + fixes

---

## Definition of Done — V1.0 Operational (REFOCUSED)

### Core Requirements (MUST HAVE)

**Service Deployed:**
- [ ] Container Apps deployed to `rg-azmaps-mcp-dev`
- [ ] Service is reachable at public FQDN
- [ ] Docker image running from ACR
- [ ] Managed Identity + AcrPull role working
- [ ] Logs streaming to Log Analytics

**MCP Protocol Working:**
- [ ] Server metadata endpoint responds: `GET /` returns MCP server info
- [ ] Tool discovery works: `tools/list` returns 7 tool definitions
- [ ] Tool invocation works: `tools/call` executes maps_search_address successfully
- [ ] Error handling works: Invalid requests return MCP error envelopes

**Agent Integration Proven:**
- [ ] GitHub Copilot can connect to service
- [ ] Geocode workflow validated: User asks for location → Copilot calls maps_search_address
- [ ] Route workflow validated: User asks for directions → Copilot calls maps_calculate_route
- [ ] Static map workflow validated: User asks for map → Copilot calls maps_render_static_map
- [ ] Brady sign-off: "Ready for travel agents to use" ✅

**Documentation Complete:**
- [ ] README.md updated with service URL and quick start
- [ ] LIMITATIONS.md documenting known v1.0 issues
- [ ] ROADMAP.md outlining v1.1 improvements
- [ ] API_REFERENCE.md with tool signatures
- [ ] TROUBLESHOOTING.md with common errors

---

### Quality Requirements (WHAT WE'RE TESTING)

**Functional Testing:**
- [ ] Integration tests pass for 3 core tools (geocode, route, static map)
- [ ] Edge cases documented (not necessarily fixed — that's v1.1)
- [ ] Error handling returns helpful messages

**Performance Baseline (MEASUREMENT ONLY - NO TARGETS):**
- [ ] Geocode response time measured and documented
- [ ] Route response time measured and documented
- [ ] Static map response time measured and documented
- [ ] Measurements published as v1.0 baseline (v1.1 will optimize)

**Operational Testing:**
- [ ] Service stays up for 24 hours without crashing
- [ ] Container Apps scales to 3 replicas under load (manual test)
- [ ] Logs capture tool invocations (even if unstructured)

---

### Acceptable V1.0 State (REALITY CHECK)

**✅ What's GOOD ENOUGH for V1.0:**

1. **Logging:** Console.log is fine. Structured logging is v1.1.
2. **Health Probes:** Container Apps default TCP check is fine. Deep Azure Maps checks are v1.1.
3. **Parameters:** Current parameters work. Defaults optimization is v1.1.
4. **API Versions:** Current versions work (integration tests pass). Formal audit is v1.1.
5. **Route Overlay:** 18 edge cases fail. Document in LIMITATIONS.md, fix in v1.1 or v2.0.
6. **Performance:** No specific targets. Measure baseline, optimize in v1.1.
7. **Scale:** Proof of concept. If 100 agents use it and it's slow, that's v1.1 problem.

**❌ What's NOT ACCEPTABLE for V1.0:**

1. **Service not deployed** — Nothing else matters if it's not running
2. **MCP protocol broken** — If agents can't discover/call tools, it's not operational
3. **Zero tools working** — At least geocode, route, and static map MUST work
4. **No documentation** — Users need to know what works and what doesn't
5. **Brady says "not ready"** — If the target user won't use it, delay v1.0

---

### Release Readiness Checklist

**Infrastructure:**
- [ ] Container Apps deployment succeeds
- [ ] Service FQDN documented and shareable
- [ ] ACR image pull working (no authentication errors)
- [ ] Logs visible in Azure Monitor

**Functionality:**
- [ ] 7 tools defined in MCP protocol
- [ ] 3 core tools working end-to-end (geocode, route, static map)
- [ ] Error messages are helpful (not cryptic Azure API errors)

**User Validation:**
- [ ] Brady tested with GitHub Copilot
- [ ] At least 2 real-world travel agent workflows proven
- [ ] Brady sign-off documented

**Documentation:**
- [ ] README.md published (quick start)
- [ ] LIMITATIONS.md published (manage expectations)
- [ ] ROADMAP.md published (what's next)
- [ ] API_REFERENCE.md published (tool signatures)
- [ ] TROUBLESHOOTING.md published (how to debug)

**Release Mechanics:**
- [ ] v1.0.0 tag created
- [ ] GitHub release published
- [ ] Release notes highlight: operational status, known limitations, v1.1 roadmap
---

## Risk Assessment (REFOCUSED)

### Risk 1: Container Apps Deployment Fails Again

**Likelihood:** 🟡 Medium  
**Impact:** 🔴 CRITICAL (blocks everything)

**Mitigation:**
- Neo focuses on simplified Bicep template (skip complex features)
- Use Azure Portal validation before deployment
- Test RBAC role assignments in isolation
- **Fallback:** Deploy to Azure Container Instances (ACI) if Container Apps blocked by Day 3

**Owner:** Neo  
**Checkpoint:** Day 2 EOD — deployment must succeed or trigger fallback

---

### Risk 2: MCP Protocol Incompatibility

**Likelihood:** 🟢 Low  
**Impact:** 🟡 Medium (would require protocol fixes)

**Mitigation:**
- Test with official MCP SDK client (not just curl)
- Verify JSON-RPC 2.0 compliance
- Check error envelope format matches spec

**Owner:** Trinity  
**Checkpoint:** Day 4 EOD — protocol verified or issues documented

---

### Risk 3: GitHub Copilot Can't Connect

**Likelihood:** 🟢 Low  
**Impact:** 🟡 Medium (would require alternative validation)

**Mitigation:**
- Test with multiple MCP clients (not just Copilot)
- Fallback: Use MCP SDK test client for validation
- Document connection process thoroughly

**Owner:** Trinity + Brady  
**Checkpoint:** Day 6 EOD — at least one agent successfully connected

---

### Risk 4: Brady Unavailable for Validation

**Likelihood:** 🟢 Low  
**Impact:** 🟢 Low (can use recorded demos)

**Mitigation:**
- Confirm Brady availability NOW
- Record demo videos as backup
- Morpheus can sign off based on checklist if needed

**Owner:** Morpheus  
**Checkpoint:** Day 1 — confirm Brady's schedule

---

## Work Item Assignments (REFOCUSED)

| Work Item | Assignee | Estimate | Priority | Status |
|-----------|----------|----------|----------|--------|
| WI-001: Container Apps | Neo | 2 days | P0 (CRITICAL) | 🔴 Not Started |
| WI-002: MCP Protocol Verification | Trinity | 4 hours | P0 (BLOCKING) | 🔴 Not Started |
| WI-003: Agent Integration | Trinity + Brady | 6 hours | P0 (VALIDATION) | 🔴 Not Started |
| WI-004: Documentation | Scribe + Trinity | 4 hours | P1 (POLISH) | 🔴 Not Started |

**Total Effort:** ~3.5 days  
**Available Time:** 2 weeks  
**Buffer:** Substantial (use for debugging, polish, v1.1 planning)

---

## Approval & Next Steps

**Sprint Plan Refocused By:** Squad (Coordinator)  
**Date:** 2026-05-22  
**Authority:** User directive: "Refocus Sprint 1 on an operational MCP service that can execute Azure Maps calls from other agents"

**Key Changes from Original Plan:**
1. **NEW FOCUS:** Operational service callable by agents (not polish)
2. **DEPRIORITIZED:** Health probes, structured logging, parameter enhancements, API version audit → v1.1
3. **NEW WORK ITEMS:** MCP protocol verification, agent integration testing
4. **REALITY CHECK:** Console.log is fine, default params are fine, current API versions are fine for v1.0

**Next Actions:**

1. **Ralph:** Present refocused sprint to Brady for approval
2. **Upon Approval:** Ralph activates work monitoring loop, Neo starts WI-001 immediately
3. **Daily Check-ins:** 4:00 PM (blocker removal only, not status updates)
4. **Week 1 Goal:** Service deployed + MCP protocol working
5. **Week 2 Goal:** Agent integration proven + documentation complete

**Ready to Execute:** Yes ✅ (pending Brady approval)

---

**END OF REFOCUSED SPRINT PLAN**
