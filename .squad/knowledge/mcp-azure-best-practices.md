# MCP Server Best Practices for Azure

**Last Updated:** 2026-05-22  
**Research Lead:** Trinity (MCP Server Expert)  
**Purpose:** Reference guide for building production-ready MCP servers on Azure

---

## Executive Summary

This document captures research on running Model Context Protocol (MCP) servers in Azure, covering architecture patterns, hosting options, SDK best practices, state management, and production readiness. Use this as the foundation for MCP server implementation decisions.

**Key Findings:**
- **Hosting:** Azure Container Apps (minReplicas: 1) is the recommended platform for interactive MCP servers
- **SDK:** @modelcontextprotocol/sdk v1.x provides robust tool schema and error handling
- **Architecture:** Stateless, tool-focused design with standardized error envelopes
- **State:** Prefer stateless design; use external caching (Redis) only when required
- **Production:** Health probes, input validation, authentication, and observability are non-negotiable

---

## 1. MCP Server Architecture Patterns

### 1.1 Core Principles

**MCP servers are NOT REST APIs**  
MCP uses JSON-RPC 2.0 over HTTP (streamable transport). The protocol has specific requirements:
- POST requests to a single endpoint (typically `/`)
- JSON-RPC 2.0 envelope: `{"jsonrpc": "2.0", "id": 1, "method": "tools/list"}`
- Bidirectional communication via Server-Sent Events (SSE) for streaming responses

**Three Capability Types**

| Capability | Purpose | Example |
|------------|---------|---------|
| **Tools** | Functions the AI can invoke (with user approval) | `maps_search_address`, `createTask` |
| **Resources** | Read-only data the client can fetch | Config files, schemas, documentation |
| **Prompts** | Pre-written templates for common tasks | "Summarize all open tasks" |

**Most MCP servers focus on Tools.** Resources and Prompts are optional.

### 1.2 Tool Design Patterns

**Pattern: Single Responsibility per Tool**

Each tool should do ONE thing well. Don't create mega-tools.

```typescript
// ✅ GOOD: Focused tool
export const geocodeAddressTool: Tool = {
  name: 'maps_search_address',
  description: 'Convert an address string to geographic coordinates',
  inputSchema: {
    type: 'object',
    properties: {
      address: { type: 'string', description: 'Address to geocode' },
      maxResults: { type: 'number', minimum: 1, maximum: 20 }
    },
    required: ['address']
  }
};

// ❌ BAD: Multi-purpose tool
export const mapsToolOfEverything: Tool = {
  name: 'maps_do_everything',
  inputSchema: {
    properties: {
      operation: { enum: ['geocode', 'route', 'poi', 'reverse'] },
      // ... 50 more parameters
    }
  }
};
```

**Pattern: Copilot-Friendly Defaults**

Reduce cognitive load on the LLM by providing sensible defaults:

```typescript
{
  maxResults: { 
    type: 'number', 
    default: 10, 
    minimum: 1, 
    maximum: 100,
    description: 'Number of results to return. Default: 10'
  },
  outputLevel: { 
    enum: ['summary', 'detailed', 'full'],
    default: 'summary',
    description: 'summary: distance+duration only, detailed: +waypoints, full: +turn-by-turn'
  }
}
```

**Why:** LLMs struggle with unbounded parameters. Defaults prevent token waste and improve response time.

**Pattern: Batch Operations for Multi-Step Workflows**

When agents need to process N items, provide a batch tool:

```typescript
// ✅ Prevents N sequential calls
export const batchGeocodeTool: Tool = {
  name: 'maps_batch_geocode',
  inputSchema: {
    properties: {
      addresses: { 
        type: 'array', 
        items: { type: 'string' },
        minItems: 1,
        maxItems: 100
      }
    }
  }
};
```

**Use Case:** Multi-stop trip planning (5 addresses → 1 API call instead of 5)

### 1.3 Error Handling Architecture

**Standardized Error Envelope**

ALL tools must return the same error structure:

```typescript
export interface ErrorResponse {
  success: false;
  error: {
    code: string;          // e.g., "GEOCODE_NO_RESULTS"
    message: string;       // Human-readable description
    retryable: boolean;    // Can the agent retry?
    retryAfter?: number;   // Seconds to wait (for rate limits)
  };
}
```

**Error Classification**

```typescript
export enum ErrorCode {
  // Domain errors (NOT retryable)
  GEOCODE_NO_RESULTS = 'GEOCODE_NO_RESULTS',
  ROUTE_IMPOSSIBLE = 'ROUTE_IMPOSSIBLE',
  POI_NO_RESULTS = 'POI_NO_RESULTS',
  INVALID_COORDINATES = 'INVALID_COORDINATES',

  // Infrastructure errors (retryable)
  NETWORK_ERROR = 'NETWORK_ERROR',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',

  // Security errors (NOT retryable)
  AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED',
}
```

**Pattern: Wrap Upstream Errors**

Don't leak Azure Maps API errors to the agent. Translate them:

```typescript
export class AzureMapsError extends Error {
  toErrorResponse(): ErrorResponse {
    return {
      success: false,
      error: {
        code: this.code,
        message: this.message,
        retryable: this.retryable,
        retryAfter: this.retryAfter
      }
    };
  }
}

// Usage in handler
try {
  const result = await client.geocodeAddress(params);
  return { success: true, data: result };
} catch (error) {
  if (error instanceof AzureMapsError) {
    return error.toErrorResponse();  // Standardized format
  }
  throw error;  // Unknown errors bubble up
}
```

**Why:** Consistent error format helps LLMs understand what went wrong and whether to retry.

### 1.4 HTTP Client Patterns

**Pattern: Centralized HTTP Client with Retry Logic**

```typescript
export class AzureMapsClient {
  private readonly endpoint: string;
  private readonly apiKey?: string;
  private readonly maxRetries: number = 3;
  private readonly retryDelayMs: number = 1000;

  async fetchWithRetry(url: string, options?: RequestInit): Promise<Response> {
    let lastError: Error;
    
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await fetch(url, {
          ...options,
          headers: {
            'x-ms-client-id': 'mcp-server',
            ...options?.headers
          }
        });

        if (response.ok) return response;

        // Handle HTTP errors
        if (response.status === 429) {
          const retryAfter = parseInt(response.headers.get('Retry-After') || '60');
          throw createRateLimitError(retryAfter);
        }

        throw mapHttpStatusToError(response.status);
      } catch (error) {
        lastError = error as Error;
        
        if (attempt < this.maxRetries && this.isRetryable(error)) {
          await this.sleep(this.retryDelayMs * Math.pow(2, attempt)); // Exponential backoff
          continue;
        }
        throw error;
      }
    }
    throw lastError!;
  }
}
```

**Why:** 
- Centralized retry logic prevents duplication
- Exponential backoff respects API rate limits
- Clear separation between retryable and non-retryable errors

---

## 2. Azure Hosting Options for MCP Servers

### 2.1 Comparison Matrix

| Service | Best For | Pros | Cons | Cost |
|---------|----------|------|------|------|
| **Container Apps** | Long-lived MCP servers for interactive agents | Zero cold starts (minReplicas: 1), autoscaling, managed certs | Need Dockerfile | ~$30-50/month baseline |
| **Functions** | Event-driven, stateless tools | Pay-per-invocation, auto-scale | Cold starts (1-3s) unless Premium plan | $0.20/million executions |
| **App Service** | Code-based deployment, existing ASP plans | No Dockerfile needed, simple `az webapp up` | Higher baseline cost than Container Apps | ~$50+/month |
| **AKS** | Multi-MCP orchestration, GPU workloads | Full K8s control, colocate with AI models | Complexity, need K8s expertise | ~$200+/month cluster |

### 2.2 Recommended: Azure Container Apps (Standalone)

**Why Container Apps for MCP?**

1. **Zero Cold Starts:** Set `minReplicas: 1` to keep at least one instance warm
2. **HTTP-First:** Designed for containerized HTTP APIs (MCP's transport model)
3. **Managed Infrastructure:** No VM management, automatic HTTPS certificates
4. **Cost-Efficient Scaling:** Scale to zero in dev, scale up in production

**Configuration for Interactive MCP Clients (GitHub Copilot)**

```bicep
resource containerApp 'Microsoft.App/containerApps@2024-03-01' = {
  properties: {
    configuration: {
      ingress: {
        external: true
        targetPort: 3000
        transport: 'http'  // MCP uses HTTP, not HTTP/2
        allowInsecure: false  // HTTPS enforced
      }
    }
    template: {
      scale: {
        minReplicas: 1  // ⚠️ CRITICAL: Prevents cold starts
        maxReplicas: 10
        rules: [
          {
            name: 'http-requests'
            http: {
              metadata: {
                concurrentRequests: '50'
              }
            }
          }
        ]
      }
      containers: [{
        name: 'mcp-server'
        image: 'myregistry.azurecr.io/mcp-server:latest'
        resources: {
          cpu: json('0.25')  // Start small, scale based on telemetry
          memory: '0.5Gi'
        }
        probes: [
          {
            type: 'Liveness'
            httpGet: {
              path: '/healthz'  // Separate from MCP endpoint
              port: 3000
            }
            initialDelaySeconds: 10
            periodSeconds: 30
          }
        ]
      }]
    }
  }
}
```

**Critical Settings:**
- `minReplicas: 1` — Always-warm instance for <100ms response time
- `transport: 'http'` — MCP uses HTTP with SSE, not gRPC/HTTP2
- Health probe on `/healthz` — MCP endpoint (`/`) expects JSON-RPC, not GET requests

### 2.3 When to Use Functions

**Good Fit:**
- Stateless, independent tools (e.g., single-function MCP servers)
- Batch processing triggered by queues/events
- Integration with Azure Functions MCP extension for Foundry Agent Service

**Requirement:** Use **Premium Plan** to avoid cold starts:

```bicep
resource functionApp 'Microsoft.Web/sites@2023-01-01' = {
  kind: 'functionapp'
  properties: {
    serverFarmId: premiumPlan.id  // ⚠️ Consumption plan = 1-3s cold starts
  }
}
```

**Anti-Pattern:** Don't use Consumption plan for interactive MCP servers. Cold starts break LLM tool invocation UX.

### 2.4 Multi-MCP Server Architecture (Container Apps)

**Pattern: Internal Service Discovery**

```bicep
resource environment 'Microsoft.App/managedEnvironments@2024-03-01' = {
  properties: {
    vnetConfiguration: {
      internal: true  // Optional: Private environment
    }
  }
}

// MCP Server 1: Azure Maps
resource mapsServer 'Microsoft.App/containerApps@2024-03-01' = {
  properties: {
    managedEnvironmentId: environment.id
    configuration: {
      ingress: {
        external: true  // Public-facing
      }
    }
  }
}

// MCP Server 2: SQL Database
resource sqlServer 'Microsoft.App/containerApps@2024-03-01' = {
  properties: {
    managedEnvironmentId: environment.id
    configuration: {
      ingress: {
        external: false  // Internal-only
        targetPort: 3001
      }
    }
  }
}
```

**Use Case:** Travel agent app with separate MCP servers for maps, bookings, weather

---

## 3. MCP SDK Best Practices (@modelcontextprotocol/sdk v1.x)

### 3.1 Server Initialization

**Pattern: Declare Capabilities Upfront**

```typescript
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

const server = new Server(
  {
    name: 'azmaps-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},          // Required for tool invocation
      resources: {},      // Optional: if exposing resources
      prompts: {},        // Optional: if exposing prompts
    },
  }
);
```

**Why:** Clients use capabilities to determine what features are available.

### 3.2 Tool Registration Pattern

**Separate Definition from Handler**

```typescript
// 1. Tool definition (schema)
export const geocodeAddressTool: Tool = {
  name: 'maps_search_address',
  description: 'Convert address to coordinates',
  inputSchema: {
    type: 'object',
    properties: {
      address: { type: 'string' }
    },
    required: ['address']
  }
};

// 2. Handler implementation
export async function handleGeocodeAddress(
  args: unknown,
  client: AzureMapsClient
): Promise<GeocodeResult> {
  const params = GeocodeParamsSchema.parse(args);  // Zod validation
  return await client.geocodeAddress(params);
}

// 3. Registration
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [geocodeAddressTool, batchGeocodeTool, /* ... */]
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  switch (name) {
    case 'maps_search_address':
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(await handleGeocodeAddress(args, client), null, 2)
        }]
      };
    // ... other tools
  }
});
```

**Why:**
- Schema and implementation are separate concerns
- Easy to test handlers independently
- Clear separation for documentation generation

### 3.3 Input Validation with Zod

**Pattern: Runtime Schema Validation**

```typescript
import { z } from 'zod';

export const GeocodeParamsSchema = z.object({
  address: z.string().min(1, 'Address cannot be empty'),
  countryFilter: z.string().optional(),
  maxResults: z.number().min(1).max(20).default(1)
});

export async function handleGeocodeAddress(
  args: unknown,
  client: AzureMapsClient
): Promise<any> {
  try {
    const params = GeocodeParamsSchema.parse(args);  // Throws if invalid
    const result = await client.geocodeAddress(params);
    return result;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: error.errors.map(e => e.message).join(', '),
          retryable: false
        }
      };
    }
    throw error;
  }
}
```

**Why:**
- JSON Schema (in tool definition) is for documentation
- Zod (in handler) is for runtime validation
- Never trust LLM-generated input

### 3.4 Transport Selection

**For Azure Hosting:**

```typescript
// ❌ DON'T USE: StdioServerTransport (for local CLI MCP servers)
const transport = new StdioServerTransport();

// ✅ USE: HTTP Transport for Container Apps/Functions
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';

const app = express();
app.use(express.json());

app.post('/', async (req, res) => {
  const transport = new SSEServerTransport('/message', res);
  await server.connect(transport);
});

app.listen(3000);
```

**Why:** Azure services require HTTP endpoints. StdioTransport only works for local execution.

---

## 4. State Management

### 4.1 Default: Stateless Design

**Principle: Prefer stateless MCP servers**

```typescript
// ✅ Stateless: All state in the request
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  // No server-side session storage
  // No in-memory caches
  // Each request is independent
});
```

**Benefits:**
- Horizontal scaling (add replicas without coordination)
- No session hijacking risk
- Simpler deployment (no state to persist)

**When Stateless Works:**
- Tool invocations that complete in <30s
- No multi-step workflows
- No shared state between tool calls

### 4.2 External State: Redis for Caching

**When to Use:**
- API responses that are expensive to recompute (geocoding)
- Rate limit tracking across replicas
- Session data for multi-step workflows

**Pattern: Cache-Aside with TTL**

```typescript
import { createClient } from 'redis';

const redis = createClient({
  url: process.env.REDIS_CONNECTION_STRING
});

async function geocodeAddressWithCache(address: string): Promise<GeocodeResult> {
  const cacheKey = `geocode:${address.toLowerCase()}`;
  
  // 1. Check cache
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }
  
  // 2. Call Azure Maps API
  const result = await azureMapsClient.geocodeAddress({ address });
  
  // 3. Store in cache (TTL: 7 days)
  await redis.setEx(cacheKey, 60 * 60 * 24 * 7, JSON.stringify(result));
  
  return result;
}
```

**Infrastructure (Bicep):**

```bicep
resource redis 'Microsoft.Cache/redis@2023-08-01' = {
  name: 'redis-${uniqueString(resourceGroup().id)}'
  location: location
  properties: {
    sku: {
      name: 'Basic'
      family: 'C'
      capacity: 0  // 250MB
    }
    enableNonSslPort: false
    minimumTlsVersion: '1.2'
  }
}
```

### 4.3 API Client Connection Pooling

**Pattern: Reuse HTTP Connections**

```typescript
import { Agent } from 'http';

export class AzureMapsClient {
  private readonly agent: Agent;

  constructor(config: AzureMapsClientConfig) {
    // Connection pooling for Node.js fetch
    this.agent = new Agent({
      keepAlive: true,
      maxSockets: 50,  // Max concurrent connections
      maxFreeSockets: 10,
      timeout: 30000
    });
  }

  async fetchWithRetry(url: string): Promise<Response> {
    return fetch(url, {
      agent: this.agent,  // Reuse connections
      headers: {
        'Connection': 'keep-alive'
      }
    });
  }
}
```

**Why:** Reduces latency by reusing TCP connections to Azure Maps API.

### 4.4 Environment Configuration

**Pattern: `.env` for Dev, Managed Identity for Prod**

```typescript
import { config } from 'dotenv';

config(); // Load .env in development

const azureMapsConfig = {
  endpoint: process.env.AZURE_MAPS_ENDPOINT || 'https://atlas.microsoft.com/',
  
  // Dev: API key from .env
  // Prod: Managed Identity (no key needed)
  apiKey: process.env.AZURE_MAPS_API_KEY,
};

if (!azureMapsConfig.apiKey && process.env.NODE_ENV === 'production') {
  // TODO: Implement Managed Identity token acquisition
  throw new Error('Managed Identity not implemented');
}
```

**Security:**
- `.env` file must be in `.gitignore`
- API keys NEVER in source control
- Production uses Managed Identity (no keys)

---

## 5. Production Readiness

### 5.1 Health Probes

**Pattern: Separate Health Endpoint**

```typescript
import express from 'express';

const app = express();

// Health probe (NOT the MCP endpoint)
app.get('/healthz', (req, res) => {
  res.status(200).json({ 
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// MCP endpoint
app.post('/', async (req, res) => {
  // JSON-RPC 2.0 handling
});
```

**Why:** MCP endpoints expect POST with JSON-RPC payload. GET requests to `/` will fail.

**Container Apps Configuration:**

```bicep
probes: [
  {
    type: 'Liveness'
    httpGet: {
      path: '/healthz'
      port: 3000
      scheme: 'HTTP'
    }
    initialDelaySeconds: 10
    periodSeconds: 30
    failureThreshold: 3
  }
  {
    type: 'Readiness'
    httpGet: {
      path: '/healthz'
      port: 3000
    }
    initialDelaySeconds: 5
    periodSeconds: 10
  }
]
```

### 5.2 Logging & Observability

**Pattern: Structured Logging**

```typescript
export class Logger {
  private context: string;

  constructor(context: string) {
    this.context = context;
  }

  info(message: string, metadata?: Record<string, any>) {
    console.log(JSON.stringify({
      level: 'info',
      timestamp: new Date().toISOString(),
      context: this.context,
      message,
      ...metadata
    }));
  }

  error(message: string, error: Error, metadata?: Record<string, any>) {
    console.error(JSON.stringify({
      level: 'error',
      timestamp: new Date().toISOString(),
      context: this.context,
      message,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      ...metadata
    }));
  }
}

// Usage
const logger = new Logger('geocode-handler');

logger.info('Geocode request received', {
  address: params.address,
  requestId: req.headers['x-request-id']
});
```

**Azure Monitor Integration:**

Container Apps automatically forwards `stdout`/`stderr` to Log Analytics. Query with:

```kql
ContainerAppConsoleLogs_CL
| where ContainerAppName_s == "mcp-server"
| where TimeGenerated > ago(1h)
| where Log_s contains "error"
| project TimeGenerated, Log_s
| order by TimeGenerated desc
```

### 5.3 Authentication Patterns

**Development: API Key**

```typescript
const apiKey = process.env.AZURE_MAPS_API_KEY;

const url = new URL('/search/address/json', endpoint);
url.searchParams.set('api-version', '2026-01-01');
url.searchParams.set('subscription-key', apiKey);  // Query parameter auth
```

**Production: Managed Identity (Recommended)**

```typescript
import { DefaultAzureCredential } from '@azure/identity';

const credential = new DefaultAzureCredential();
const token = await credential.getToken('https://atlas.microsoft.com/.default');

const response = await fetch(url, {
  headers: {
    'Authorization': `Bearer ${token.token}`,
    'x-ms-client-id': 'mcp-server'
  }
});
```

**Container Apps Configuration:**

```bicep
resource containerApp 'Microsoft.App/containerApps@2024-03-01' = {
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    configuration: {
      secrets: []  // No API keys in production
    }
  }
}

// Grant Managed Identity access to Azure Maps
resource roleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  scope: azureMapsAccount
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', 
      '423170ca-a8f6-4b0f-8487-9e4eb8f49bfa')  // Azure Maps Data Reader
    principalId: containerApp.identity.principalId
  }
}
```

### 5.4 CORS Configuration (For Browser Clients)

**Note:** GitHub Copilot desktop app does NOT need CORS. Only configure for browser-based clients (VS Code for Web, custom web apps).

```bicep
configuration: {
  ingress: {
    corsPolicy: {
      allowedOrigins: [
        'https://vscode.dev'
        'https://github.dev'
        'https://yourdomain.com'  // Your custom web app
      ]
      allowedMethods: ['GET', 'POST', 'OPTIONS']
      allowedHeaders: [
        'Content-Type'
        'Authorization'
        'Mcp-Session-Id'
      ]
      maxAge: 3600
    }
  }
}
```

### 5.5 Rate Limiting

**Pattern: Client-Side (Cooperative)**

```typescript
export class RateLimiter {
  private requestsInWindow: number = 0;
  private windowStart: number = Date.now();
  private readonly maxRequests: number = 50;  // 50 requests per minute
  private readonly windowMs: number = 60000;

  async checkLimit(): Promise<boolean> {
    const now = Date.now();
    
    if (now - this.windowStart >= this.windowMs) {
      // Reset window
      this.windowStart = now;
      this.requestsInWindow = 0;
    }

    if (this.requestsInWindow >= this.maxRequests) {
      return false;  // Rate limit exceeded
    }

    this.requestsInWindow++;
    return true;
  }
}

// Usage
const rateLimiter = new RateLimiter();

app.post('/', async (req, res) => {
  if (!await rateLimiter.checkLimit()) {
    return res.status(429).json({
      error: 'Rate limit exceeded',
      retryAfter: 60
    });
  }

  // Process request
});
```

**Production: Azure API Management**

For enterprise deployments, front the MCP server with Azure API Management for:
- Token bucket rate limiting
- Per-client quotas
- JWT validation
- Request/response transformation

---

## 6. Anti-Patterns to Avoid

### 6.1 ❌ Cold Starts in Interactive Scenarios

**Problem:**
```bicep
template: {
  scale: {
    minReplicas: 0  // ❌ Cold starts = 1-3s delay
  }
}
```

**Why Bad:** LLMs expect <1s tool response time. Cold starts break UX.

**Fix:** `minReplicas: 1` for interactive clients (GitHub Copilot)

### 6.2 ❌ Mega-Tools with Complex Branching

**Problem:**
```typescript
export const doEverythingTool: Tool = {
  name: 'maps_operation',
  inputSchema: {
    properties: {
      operation: { enum: ['geocode', 'route', 'poi', 'reverse', 'timezone', 'staticmap'] },
      // ... 50 conditional parameters
    }
  }
};
```

**Why Bad:** 
- LLMs struggle with conditional schemas
- Error-prone (wrong param combos)
- Hard to test

**Fix:** Separate tools for each operation

### 6.3 ❌ Unvalidated LLM Input

**Problem:**
```typescript
async function handleTool(args: any) {
  const url = args.url;  // ❌ No validation
  await fetch(url);  // SSRF vulnerability
}
```

**Why Bad:** LLMs can be manipulated via prompt injection. Always validate input.

**Fix:** Zod validation + input sanitization

### 6.4 ❌ Stateful Server-Side Sessions

**Problem:**
```typescript
const sessions = new Map<string, SessionData>();  // ❌ In-memory state

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const sessionId = request.params.sessionId;
  const session = sessions.get(sessionId);
  // ...
});
```

**Why Bad:**
- Breaks horizontal scaling
- Session hijacking risk
- State lost on container restart

**Fix:** Stateless design or external state (Redis)

### 6.5 ❌ Leaking Upstream API Errors

**Problem:**
```typescript
async function handleGeocode(args: any) {
  const response = await fetch(azureMapsUrl);
  return await response.json();  // ❌ Raw Azure Maps error
}
```

**Why Bad:** LLMs get confused by Azure-specific error formats.

**Fix:** Standardized error envelope (see Section 1.3)

---

## 7. Quick Reference

### 7.1 Recommended Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Runtime | Node.js | 20 LTS |
| Language | TypeScript | 5.x |
| MCP SDK | @modelcontextprotocol/sdk | 1.x |
| Validation | Zod | 3.x |
| Testing | Vitest | 1.x |
| Hosting | Azure Container Apps | Latest API |
| Caching | Azure Cache for Redis | Basic tier |
| Auth | Managed Identity | N/A |

### 7.2 Critical Configuration Checklist

**Development:**
- [x] `.env` file with API key (not committed)
- [x] `.gitignore` includes `.env`
- [x] `npm run dev` uses `tsx watch`
- [x] Integration tests use real API (with rate limits)

**Production:**
- [x] `minReplicas: 1` in Container Apps
- [x] Health probe on `/healthz` (not `/`)
- [x] Managed Identity for Azure Maps access
- [x] Structured JSON logging to stdout
- [x] Zod validation on all tool inputs
- [x] Standardized error envelopes
- [x] Connection pooling for HTTP clients
- [x] HTTPS enforced (Container Apps default)

### 7.3 Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| P50 Tool Response | <500ms | From MCP call to result |
| P99 Tool Response | <2s | Including retries |
| Cold Start (minReplicas:1) | <100ms | First request after idle |
| Availability | 99.9% | Container Apps SLA |
| Concurrent Requests | 50/replica | HTTP scale rule |

---

## 8. Further Reading

**Official Docs:**
- [Model Context Protocol Spec](https://modelcontextprotocol.io/)
- [Azure Container Apps MCP Guide](https://learn.microsoft.com/azure/container-apps/mcp-overview)
- [MCP SDK TypeScript Reference](https://github.com/modelcontextprotocol/typescript-sdk)

**Azure Resources:**
- [Container Apps Best Practices](https://learn.microsoft.com/azure/well-architected/service-guides/azure-container-apps)
- [Managed Identity for Container Apps](https://learn.microsoft.com/azure/container-apps/managed-identity)
- [Container Apps Observability](https://learn.microsoft.com/azure/container-apps/log-options)

**Project Context:**
- [.squad/decisions.md](../.squad/decisions.md) — Team architectural decisions
- [infra/](../infra/) — Bicep templates for Azure resources
- [src/tools/](../src/tools/) — Tool implementations

---

**Document Status:** ✅ Research Complete  
**Next Action:** Review with Morpheus (Lead), incorporate into project strategy
