# Sprint 001 — V1 Launch

**Sprint Duration:** 2026-05-22 to 2026-06-05 (2 weeks)  
**Sprint Goal:** Ship production-ready AZMaps-MCP v1.0.0 with 7 primitive tools  
**Created:** 2026-05-22  
**Created By:** Ralph (Work Monitor)  
**Authority:** Squad Meeting Decision (morpheus-v1-reboot-squad-meeting.md)

---

## Executive Summary

**Status:** 🟢 Ready to Execute

**Context:** Squad research confirms the existing codebase is 90% complete with validated architecture. V1 requires 5 tactical improvements, not a reboot. All work items are well-scoped, parallelizable, and achievable within 2-week timeline.

**Sprint Objectives:**
1. Complete 5 tactical improvements (Week 1)
2. Execute integration testing and validation (Week 2)
3. Deploy to production Container Apps
4. Release v1.0.0 with full documentation

**Critical Success Factors:**
- Parallel execution Week 1 (no blocking dependencies)
- Daily sync-ups to detect blockers early
- Testing gates enforced before production deployment
- Brady validation before v1.0.0 tag

---

## Sprint Backlog

### WI-001: Container Apps Deployment Fix

**Priority:** P0 (Critical Path)  
**Assignee:** Neo (Infrastructure Specialist)  
**Estimate:** 2 days (16 hours)  
**Status:** 🔴 Not Started

**Problem Statement:**  
Container Apps deployment archived after RBAC/Log Analytics failures. Need working deployment to `rg-azmaps-mcp-dev` for integration testing.

**Acceptance Criteria:**
- [ ] Bicep template in `infra/stable/3-container-apps/` compiles without errors
- [ ] RBAC role assignments correct (AcrPull for Managed Identity)
- [ ] Log Analytics workspace linked to Container Apps
- [ ] Deployment succeeds: `az containerapp show --name azmaps-mcp --resource-group rg-azmaps-mcp-dev`
- [ ] Container starts successfully (logs show "MCP Server running")
- [ ] Health probe endpoint returns HTTP 200

**Technical Details:**

**Known Issues to Fix:**
```bicep
// 1. Add Managed Identity
resource containerAppIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = {
  name: 'id-azmaps-mcp-${environment}'
  location: location
}

// 2. Grant AcrPull role to Managed Identity
resource acrPullRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  scope: containerRegistry
  name: guid(containerRegistry.id, containerAppIdentity.id, 'AcrPull')
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '7f951dda-4ed3-4680-a7ca-43fe172d538d') // AcrPull
    principalId: containerAppIdentity.properties.principalId
    principalType: 'ServicePrincipal'
  }
}

// 3. Link Log Analytics workspace
resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2022-10-01' existing = {
  name: 'log-azmaps-mcp-${environment}'
}

resource containerAppEnvironment 'Microsoft.App/managedEnvironments@2023-05-01' = {
  name: 'cae-azmaps-mcp-${environment}'
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
```

**Dependencies:**
- ACR deployed ✅ (azmapsmcp.azurecr.io)
- Azure Maps deployed ✅ (maps-azmaps-mcp-dev)
- Docker image pushed ✅ (azmaps-mcp:latest)

**Testing Validation:**
```powershell
# Verify deployment
az containerapp show --name azmaps-mcp --resource-group rg-azmaps-mcp-dev --query "properties.provisioningState"

# Check logs
az containerapp logs show --name azmaps-mcp --resource-group rg-azmaps-mcp-dev --tail 50

# Test health endpoint
$fqdn = az containerapp show --name azmaps-mcp --resource-group rg-azmaps-mcp-dev --query "properties.configuration.ingress.fqdn" -o tsv
curl https://$fqdn/health
```

**Deliverables:**
1. `infra/stable/3-container-apps/container-apps.bicep` (updated)
2. `infra/stable/3-container-apps/container-apps.bicepparam` (updated)
3. `infra/stable/3-container-apps/README.md` (troubleshooting guide)
4. Deployment validation report

**Risk Level:** 🟡 Medium (RBAC permissions can be tricky, but well-documented)

---

### WI-002: Health Probes Implementation

**Priority:** P0 (Critical Path)  
**Assignee:** Trinity (Backend Specialist)  
**Estimate:** 4 hours  
**Status:** 🔴 Not Started

**Problem Statement:**  
Container Apps requires `/health` endpoint for liveness checks. Without it, unhealthy instances won't be restarted automatically.

**Acceptance Criteria:**
- [ ] `/health` HTTP endpoint implemented in `src/server.ts`
- [ ] Returns HTTP 200 when healthy, HTTP 503 when unhealthy
- [ ] Includes Azure Maps connectivity check
- [ ] Returns JSON response with status + timestamp + checks
- [ ] Container Apps Bicep updated with health probe configuration
- [ ] Integration test added: `tests/integration/health.test.ts`

**Technical Details:**

**Implementation:**
```typescript
// src/server.ts

import express from 'express';
import { AzureMapsClient } from './lib/azure-maps-client.js';

const app = express();
const azureMapsClient = new AzureMapsClient(
  process.env.AZURE_MAPS_ENDPOINT!,
  process.env.AZURE_MAPS_API_KEY!
);

// Health probe endpoint
app.get('/health', async (req, res) => {
  const checks = {
    azureMaps: 'unknown' as 'healthy' | 'unhealthy' | 'unknown'
  };

  // Test Azure Maps connectivity (lightweight ping)
  try {
    const testResult = await azureMapsClient.get('/search/address/json', {
      'api-version': '2026-01-01',
      query: 'Seattle',
      limit: 1
    });
    checks.azureMaps = testResult ? 'healthy' : 'unhealthy';
  } catch (error) {
    checks.azureMaps = 'unhealthy';
  }

  const health = {
    status: checks.azureMaps === 'healthy' ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    checks
  };

  const statusCode = health.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json(health);
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Health endpoint available at http://localhost:${PORT}/health`);
});
```

**Bicep Update:**
```bicep
// infra/stable/3-container-apps/container-apps.bicep

resource containerApp 'Microsoft.App/containerApps@2023-05-01' = {
  name: 'ca-azmaps-mcp-${environment}'
  location: location
  properties: {
    configuration: {
      ingress: {
        external: true
        targetPort: 3000
        transport: 'http'
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

## Sprint Timeline

### Week 1: Foundation Fixes (Parallel Execution)

**Days 1-2 (May 22-23):** Infrastructure + Backend Foundation

**Neo (Infrastructure):**
- [ ] Day 1 AM: Debug RBAC role assignments (AcrPull for Managed Identity)
- [ ] Day 1 PM: Configure Log Analytics workspace linkage
- [ ] Day 2 AM: Deploy to `rg-azmaps-mcp-dev`, validate deployment
- [ ] Day 2 PM: Test health endpoint, verify logs streaming

**Trinity (Backend):**
- [ ] Day 1 AM: Implement `/health` endpoint (WI-002)
- [ ] Day 1 PM: Set up Winston logger, create abstraction (WI-003)
- [ ] Day 2 AM: Migrate all console.log statements to logger
- [ ] Day 2 PM: Add parameter enhancements (maxResults, outputLevel) (WI-004)

**Niobe (API Validation):**
- [ ] Day 1: Audit current API versions, compare against latest stable
- [ ] Day 2: Update HTTP client with version constants, test all endpoints

**Tank (Testing):**
- [ ] Day 1: Review test coverage for 7 tools, identify gaps
- [ ] Day 2: Write integration tests for health probes, logger

**Daily Sync-Up:** 4:00 PM (15-minute standup)
- Blockers? Dependencies?
- What's done? What's next?

---

**Days 3-4 (May 24-25):** Integration & Validation

**All Squad:**
- [ ] Day 3 AM: Code freeze for Week 1 work items
- [ ] Day 3 PM: Integration testing against deployed Container Apps
- [ ] Day 4 AM: Bug fixes from integration testing
- [ ] Day 4 PM: Week 1 retrospective, prepare for Week 2

**Key Validation Gates:**
- [ ] All 7 tools work correctly against real Azure Maps API
- [ ] Health probes report accurate status
- [ ] Structured logs visible in Azure Monitor
- [ ] Parameter enhancements tested with GitHub Copilot
- [ ] API versions updated and regression tests pass

**Deliverables:**
- Working Container Apps deployment
- Health probe endpoint operational
- Structured logging in production
- Parameter enhancements live
- API versions up-to-date

---

### Week 2: Testing, Validation & Release

**Days 5-7 (May 26-28):** Comprehensive Testing

**Tank (Testing Lead):**
- [ ] Day 5: Full integration test suite against production-like environment
- [ ] Day 6: Performance baseline measurements (geocode <500ms, route <2s)
- [ ] Day 7: Load testing (100 concurrent requests, verify no crashes)

**Niobe (API Validation):**
- [ ] Day 5: End-to-end API validation (all 7 tools with various inputs)
- [ ] Day 6: Edge case testing (invalid coordinates, missing parameters)
- [ ] Day 7: Error handling verification (API failures, network issues)

**Trinity (Backend):**
- [ ] Day 5-7: Bug fixes from testing, code review feedback

**Neo (Infrastructure):**
- [ ] Day 5-7: Monitor logs, investigate any Container Apps issues

---

**Days 8-9 (May 29-30):** Production Readiness Review

**Morpheus (Lead):**
- [ ] Day 8 AM: Security audit (API key handling, input validation)
- [ ] Day 8 PM: Code review (all Week 1 changes)
- [ ] Day 9 AM: Documentation review (README, API reference, troubleshooting)
- [ ] Day 9 PM: Production readiness checklist sign-off

**Scribe:**
- [ ] Day 8: Update README.md with v1.0.0 features
- [ ] Day 8: Create API reference documentation
- [ ] Day 9: Write troubleshooting guide
- [ ] Day 9: Prepare release notes

**Trinity (Backend):**
- [ ] Day 8-9: Address code review feedback

**Neo (Infrastructure):**
- [ ] Day 8-9: Production deployment checklist (no secrets in logs, RBAC correct)

---

**Days 10-12 (May 31 - June 2):** User Acceptance & Release Prep

**Brady (User Validation):**
- [ ] Day 10: Test with GitHub Copilot (real travel agent workflows)
- [ ] Day 11: Provide feedback on UX, parameter defaults, error messages
- [ ] Day 12: Sign-off for v1.0.0 release

**Squad (Bug Fixes):**
- [ ] Day 10-11: Address Brady's feedback
- [ ] Day 12: Final smoke test

**Morpheus (Release Manager):**
- [ ] Day 12 PM: Tag v1.0.0
- [ ] Day 12 PM: Publish release notes
- [ ] Day 12 PM: Announce to stakeholders

---

**Day 13-14 (June 3-5):** Buffer Days

**Purpose:** Contingency for unexpected delays, final polish, documentation improvements

**Activities:**
- Additional testing if needed
- Performance optimization if metrics don't meet targets
- Documentation polish
- Team retrospective

---

## Definition of Done — V1.0.0 Ready

### Functional Requirements

**All 7 Primitive Tools Operational:**
- [ ] `maps_search_address` — Geocode address to coordinates
- [ ] `maps_batch_geocode` — Batch geocoding (array of addresses)
- [ ] `maps_reverse_geocode` — Reverse geocode coordinates to address
- [ ] `maps_search_nearby` — POI search by category
- [ ] `maps_calculate_route` — Multi-waypoint routing
- [ ] `maps_get_timezone` — Timezone by coordinates
- [ ] `maps_render_static_map` — Static map generation

**Infrastructure Deployed:**
- [ ] Azure Container Registry (ACR) operational
- [ ] Azure Maps Gen2 account deployed
- [ ] Container Apps deployed to `rg-azmaps-mcp-dev`
- [ ] Docker image pushed and running
- [ ] Managed Identity configured with AcrPull role

**Operational Features:**
- [ ] `/health` endpoint returns HTTP 200 when healthy
- [ ] Structured logging to Azure Monitor (JSON format)
- [ ] Parameter enhancements live (maxResults, outputLevel)
- [ ] API versions updated to latest stable (2026-01-01, 2025-01-01, 2024-04-01)

---

### Quality Requirements

**Test Coverage:**
- [ ] Unit tests >80% code coverage
- [ ] Integration tests pass against real Azure Maps API
- [ ] Performance tests meet targets:
  - Geocode: <500ms average response time
  - Route calculation: <2s average response time
  - POI search: <1s average response time
- [ ] Load testing: 100 concurrent requests without errors
- [ ] Error handling tested (invalid inputs, API failures, network issues)

**Code Quality:**
- [ ] TypeScript strict mode enabled, no compilation errors
- [ ] ESLint passes with no warnings
- [ ] Code reviewed by Morpheus (Lead)
- [ ] No hardcoded secrets (API keys from environment variables)
- [ ] Error messages user-friendly (no stack traces in tool responses)

**Security:**
- [ ] API key stored in Azure Key Vault or Container Apps secrets
- [ ] Input validation on all tool parameters
- [ ] HTTPS ingress enforced on Container Apps
- [ ] No sensitive data logged (mask API keys in logs)
- [ ] Managed Identity used for ACR access (no registry passwords)

---

### Documentation Requirements

**Developer Documentation:**
- [ ] README.md updated with v1.0.0 features
- [ ] API reference for all 7 tools (inputs, outputs, examples)
- [ ] Troubleshooting guide (common errors, solutions)
- [ ] Architecture diagram (infrastructure components)
- [ ] Deployment guide (step-by-step Bicep deployment)

**Operational Documentation:**
- [ ] Health monitoring guide (interpreting `/health` responses)
- [ ] Log querying guide (Azure Monitor KQL queries)
- [ ] Performance tuning guide (scaling, caching strategies)
- [ ] API version strategy documented

**Release Documentation:**
- [ ] Release notes (new features, improvements, known issues)
- [ ] Migration guide (if upgrading from previous versions)
- [ ] Changelog (all changes since last release)

---

### Production Deployment Criteria

**Infrastructure Validation:**
- [ ] Container Apps deployment successful (`az containerapp show` returns "Succeeded")
- [ ] Health probes configured (liveness + readiness)
- [ ] Log Analytics streaming logs
- [ ] Ingress HTTPS endpoint accessible
- [ ] minReplicas: 1 configured (zero cold starts)

**Operational Validation:**
- [ ] Smoke test: All 7 tools work via GitHub Copilot
- [ ] Load test: 100 concurrent requests succeed
- [ ] Failover test: Health probe detects Azure Maps outage
- [ ] Logging test: Structured logs visible in Azure Monitor
- [ ] Security scan: No critical vulnerabilities (npm audit)

**User Acceptance:**
- [ ] Brady signs off after testing with GitHub Copilot
- [ ] Travel agent workflows validated (multi-stop itineraries, POI discovery)
- [ ] Error messages clear and actionable
- [ ] Response times acceptable for interactive use

**Release Approval:**
- [ ] Morpheus (Lead) approves production deployment
- [ ] All Definition of Done items checked
- [ ] Release notes reviewed and approved
- [ ] Rollback plan documented (how to revert to previous version)

---

## Risk Assessment

### Risk 1: Container Apps Deployment Failure

**Likelihood:** 🟡 Medium  
**Impact:** 🔴 Critical (blocks all Week 2 testing)

**Description:** Container Apps deployment could fail due to RBAC permissions, Log Analytics configuration, or network issues.

**Mitigation Strategies:**
1. **Neo focuses on this first** (Day 1-2 priority)
2. Use stable ACR/Maps infrastructure (already deployed ✅)
3. Reference working examples from Azure docs
4. Test in dev environment before production
5. Fallback: Deploy to Azure Container Instances (ACI) temporarily if Container Apps blocked

**Contingency Plan:**
- If Container Apps still broken by Day 3 → Switch to ACI for testing
- Week 2 goal: Get Container Apps working in parallel with testing
- Worst case: Ship v1 on ACI, migrate to Container Apps in v1.1

**Owner:** Neo  
**Status Check:** Day 2 EOD (deployment must be working)

---

### Risk 2: API Version Breaking Changes

**Likelihood:** 🟢 Low  
**Impact:** 🟡 Medium (could require tool rewrites)

**Description:** Updating to latest API versions (2026-01-01, 2025-01-01) could introduce breaking changes in response schemas.

**Mitigation Strategies:**
1. **Niobe reads API docs carefully** (changelog, migration guides)
2. Comprehensive regression testing after version updates
3. Test against production Azure Maps API (not mock)
4. Keep fallback to previous versions if breaking changes detected
5. Update one API category at a time (Search → Route → Render)

**Contingency Plan:**
- If breaking changes detected → Document differences, adjust code
- If too many changes → Keep current stable versions, defer to v1.1
- Prioritize: Search API (critical), Route API (critical), Render API (nice-to-have)

**Owner:** Niobe  
**Status Check:** Day 2 EOD (audit complete, changes identified)

---

### Risk 3: Performance Targets Not Met

**Likelihood:** 🟢 Low  
**Impact:** 🟡 Medium (impacts user experience)

**Description:** Performance targets (geocode <500ms, route <2s) may not be achievable due to Azure Maps API latency or network issues.

**Mitigation Strategies:**
1. **Measure baseline performance early** (Day 5, Tank)
2. Identify bottlenecks (HTTP client, JSON parsing, logging overhead)
3. Optimize HTTP client (connection pooling, keep-alive)
4. Add caching layer if needed (Redis, in-memory LRU)
5. Set realistic expectations (Azure Maps API latency is out of our control)

**Contingency Plan:**
- If targets not met → Investigate Azure Maps API latency (Niobe)
- Add caching for repeated queries (80/20 rule: cache top 20% of queries)
- Adjust targets if Azure Maps inherently slower (document latency expectations)
- Consider CDN for static map images (render API)

**Owner:** Tank (performance testing), Trinity (optimization)  
**Status Check:** Day 6 (performance baseline report due)

---

### Risk 4: Brady Unavailable for User Acceptance

**Likelihood:** 🟢 Low  
**Impact:** 🟡 Medium (delays v1.0.0 release)

**Description:** Brady may be unavailable Day 10-12 for user acceptance testing, blocking release sign-off.

**Mitigation Strategies:**
1. **Confirm Brady's availability NOW** (before Week 1 starts)
2. Schedule UAT sessions in advance (Day 10-11, specific times)
3. Prepare UAT checklist (specific workflows to test)
4. Record demo video as backup (Brady can review async)
5. Get interim feedback early (Day 5-6 preview)

**Contingency Plan:**
- If Brady unavailable → Morpheus signs off based on checklist completion
- Defer "Brady tested" to v1.0.1 patch release
- Ship v1.0.0 with squad confidence, gather Brady feedback post-release

**Owner:** Morpheus (coordinate with Brady)  
**Status Check:** Day 1 (confirm availability)

---

### Risk 5: Scope Creep — New Features Requested

**Likelihood:** 🟡 Medium  
**Impact:** 🟡 Medium (delays v1.0.0 release)

**Description:** During testing, Brady or squad may identify "must-have" features not in v1 scope, creating scope creep.

**Mitigation Strategies:**
1. **Ruthlessly defend v1 scope** (7 primitives from AD-003)
2. Maintain v2 backlog for new feature requests
3. Morpheus enforces scope discipline ("Is this blocking v1 release?")
4. Use "demand-driven" principle: wait for 3+ user requests before adding
5. Document feature requests for post-v1 planning

**Contingency Plan:**
- If "must-have" feature emerges → Assess effort (< 4 hours? Include. > 4 hours? Defer.)
- If critical bug found → Fix immediately (security, data loss)
- If nice-to-have improvement → Defer to v1.1

**Owner:** Morpheus (scope gatekeeper)  
**Status Check:** Continuous (enforce at daily sync-ups)

---

## Success Metrics

### Technical Metrics

**Performance:**
- [ ] Geocode average response time <500ms (p95 <800ms)
- [ ] Route calculation average response time <2s (p95 <3s)
- [ ] POI search average response time <1s (p95 <1.5s)
- [ ] Static map generation <3s (p95 <5s)
- [ ] Health probe response <100ms

**Reliability:**
- [ ] Uptime >99.9% (Container Apps minReplicas: 1)
- [ ] Error rate <1% (API errors, timeouts, crashes)
- [ ] Health probe success rate >99%
- [ ] Log streaming 100% operational (no missing logs)

**Quality:**
- [ ] Unit test coverage >80%
- [ ] Integration tests pass 100%
- [ ] Zero critical security vulnerabilities (npm audit)
- [ ] Zero high-severity bugs at release
- [ ] Code review approval from Morpheus

**Operational:**
- [ ] Deployment time <10 minutes (Bicep → running container)
- [ ] Rollback time <5 minutes (previous Docker image)
- [ ] Log query response time <2s (Azure Monitor KQL)
- [ ] Health monitoring dashboards operational

---

### User Experience Metrics

**Usability (GitHub Copilot Integration):**
- [ ] Tool invocation success rate >95% (Copilot successfully calls tools)
- [ ] Parameter defaults work correctly (no missing required fields)
- [ ] Error messages actionable (Copilot can self-correct)
- [ ] Response formats parseable (JSON structure correct)

**Workflow Success:**
- [ ] Multi-stop itinerary planning works end-to-end
- [ ] POI discovery returns relevant results
- [ ] Batch geocoding handles 10+ addresses correctly
- [ ] Static map generation produces valid images

**Brady Validation:**
- [ ] Brady signs off after testing (Day 12)
- [ ] No blocking issues identified in UAT
- [ ] Feedback incorporated or deferred to v2

---

### Sprint Execution Metrics

**Velocity:**
- [ ] All 5 work items completed Week 1 (WI-001 through WI-005)
- [ ] Week 2 testing completed on schedule
- [ ] Zero work items pushed to v1.1

**Team Collaboration:**
- [ ] Daily sync-ups attended by all squad members
- [ ] Blockers resolved within 24 hours
- [ ] Code reviews completed within 4 hours
- [ ] No merge conflicts or integration issues

**Documentation:**
- [ ] README.md updated before release
- [ ] API reference complete (all 7 tools documented)
- [ ] Troubleshooting guide published
- [ ] Release notes approved by Morpheus

---

### Post-Release Success Indicators (Week 3+)

**Adoption:**
- [ ] Brady uses AZMaps-MCP in production workflows
- [ ] Zero critical bugs reported in first week
- [ ] Positive feedback from Brady ("works as expected")

**Stability:**
- [ ] Uptime >99.9% in production
- [ ] No rollbacks required
- [ ] Error logs show <1% failure rate

**Next Steps:**
- [ ] V2 scope defined based on Brady feedback
- [ ] Squad ready for next sprint
- [ ] Lessons learned documented for future projects

---

## Daily Sync-Up Format

**Time:** 4:00 PM daily (15 minutes max)  
**Format:** Standup (no sitting, stay focused)

**Each Squad Member Reports:**

1. **What I completed today:**
   - Specific work items or tasks
   - Blockers resolved

2. **What I'm working on next:**
   - Tomorrow's priorities
   - Dependencies on others

3. **Blockers or risks:**
   - What's blocking progress?
   - Need help from other squad members?

**Morpheus Tracks:**
- Sprint burn-down (work items remaining)
- Risk status changes
- Decisions needed

**Ralph Reports:**
- GitHub issues/PRs status
- Board health (untriaged, in-progress, ready for merge)

---

## Work Item Assignments

| Work Item | Assignee | Estimate | Status | Due Date |
|-----------|----------|----------|---------|----------|
| WI-001: Container Apps Deployment | Neo | 2 days | 🔴 Not Started | May 23 EOD |
| WI-002: Health Probes | Trinity | 4 hours | 🔴 Not Started | May 22 EOD |
| WI-003: Structured Logging | Trinity | 6 hours | 🔴 Not Started | May 23 EOD |
| WI-004: Parameter Enhancements | Trinity | 4 hours | 🔴 Not Started | May 23 EOD |
| WI-005: API Version Audit | Niobe | 4 hours | 🔴 Not Started | May 23 EOD |

**Total Estimated Effort:** 3.75 days (Week 1)  
**Available Capacity:** 4 days (Week 1)  
**Buffer:** 0.25 days (6 hours)

---

## Sprint Deliverables Checklist

**Week 1 (Foundation Fixes):**
- [ ] Working Container Apps deployment (Neo)
- [ ] Health probe endpoint operational (Trinity)
- [ ] Structured logging in production (Trinity)
- [ ] Parameter enhancements live (Trinity)
- [ ] API versions updated (Niobe)
- [ ] Integration tests passing (Tank)

**Week 2 (Testing & Release):**
- [ ] Full integration test suite complete (Tank)
- [ ] Performance baseline established (Tank)
- [ ] Security audit passed (Morpheus)
- [ ] Documentation complete (Scribe)
- [ ] Brady UAT sign-off (Brady)
- [ ] Release notes published (Scribe)
- [ ] v1.0.0 tagged and deployed (Morpheus)

---

## Approval & Sign-Off

**Sprint Plan Created By:** Ralph (Work Monitor)  
**Date:** 2026-05-22  
**Authority:** Squad Meeting Decision (morpheus-v1-reboot-squad-meeting.md)

**Awaiting Approval From:** Brady  
**Approval Criteria:**
- Sprint scope aligns with squad meeting outcomes
- Timeline is realistic (2 weeks)
- Work items are well-defined and actionable
- Risks are identified with mitigation strategies
- Success metrics are clear and measurable

**Upon Approval:**
- Ralph activates work monitoring loop
- Squad members begin Week 1 work items
- Daily sync-ups begin (4:00 PM)
- Progress tracked in this document (update status daily)

---

## Notes for Brady

**Key Questions for Review:**

1. **Timeline:** Is 2 weeks realistic given your availability for UAT (Day 10-12)?
2. **Scope:** Are the 5 tactical improvements the right priorities, or should we adjust?
3. **Success Metrics:** Are the performance targets (geocode <500ms, route <2s) acceptable?
4. **Definition of Done:** Any missing criteria for "v1.0.0 ready"?
5. **Risk Assessment:** Are we missing any major risks?

**Adjustments Requested:**
- [ ] (Brady to fill in after review)

**Approval Status:**
- [ ] ✅ Approved — Proceed with sprint
- [ ] ⚠️ Approved with changes — See "Adjustments Requested"
- [ ] ❌ Rejected — Rework required

**Approved By:** _______________________  
**Date:** _______________________

---

**END OF SPRINT PLAN**
