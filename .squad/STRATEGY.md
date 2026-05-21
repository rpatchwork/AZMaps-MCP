# AZMaps-MCP — Technical Strategy

**Author:** Morpheus  
**Date:** 2026-05-20  
**Status:** Draft → Review → Approved

---

## Executive Summary

Deploy a production-ready Azure Maps service with best-practice infrastructure, then build a compliant, high-quality MCP Server that exposes Azure Maps JavaScript SDK capabilities through the Model Context Protocol. The system must be toggleable (SKU, scale, features) while maintaining sensible defaults.

---

## Part 1: Azure Maps Deployment

### 1.1 Infrastructure as Code

**Decision:** Use **Bicep** as the primary IaC tool.

**Rationale:**
- Native Azure tooling with first-class support
- Strong type checking and validation
- Azure Maps resource definitions are well-maintained
- Team can leverage Azure Verified Modules (AVM) where applicable

**Structure:**
```
/infra
  /main.bicep              # Entry point, orchestrates modules
  /modules
    /maps-account.bicep    # Azure Maps account + config
    /monitoring.bicep      # Application Insights, Log Analytics
    /security.bicep        # Managed Identity, Key Vault (if needed)
  /parameters
    /dev.bicepparam        # Development environment
    /prod.bicepparam       # Production environment
```

### 1.2 SKU & Scale Toggleability

**Azure Maps Gen2 Pricing Tiers:**
- **Gen2 (Recommended):** Usage-based pricing, modern features
  - QPS: Configurable via parameter (default: moderate)
  - Storage: Configurable

**Toggleable Parameters:**
```bicep
@allowed(['Gen2'])
param skuName string = 'Gen2'

@description('Expected queries per second (QPS) - impacts cost projections')
@minValue(1)
@maxValue(1000)
param expectedQPS int = 50

@description('Enable premium features (traffic, weather)')
param enablePremiumFeatures bool = false

@description('Enable custom data upload capabilities')
param enableCustomData bool = false
```

**Best Practice Defaults:**
- Gen2 pricing (modern, pay-as-you-go)
- Moderate QPS baseline (50)
- Premium features OFF by default (cost-conscious)
- Monitoring and diagnostics ALWAYS enabled

### 1.3 Security & Identity

**Authentication Model:**
- **Managed Identity** for MCP Server → Azure Maps auth
- Azure Maps Subscription Key as fallback (stored in Key Vault)
- RBAC: `Azure Maps Data Reader` role for read operations

**Networking:**
- Public endpoint by default (simplicity)
- Optional: Private endpoint support (toggleable parameter)

### 1.4 Observability

**Required:**
- Application Insights integration
- Diagnostic settings capturing:
  - Request logs
  - Performance metrics
  - Error rates
- Dashboard for Maps usage patterns

---

## Part 2: MCP Server

### 2.1 Architecture

**Type:** Standalone Node.js application implementing MCP protocol

**Core Components:**
```
/mcp-server
  /src
    /server.ts              # MCP server entry point
    /maps
      /client.ts            # Azure Maps SDK client wrapper
      /operations
        /search.ts          # Search operations
        /render.ts          # Map rendering
        /route.ts           # Routing & directions
        /geolocation.ts     # IP geolocation
        /weather.ts         # Weather data (if premium)
        /traffic.ts         # Traffic data (if premium)
    /tools
      /search-tools.ts      # MCP tool definitions for search
      /route-tools.ts       # MCP tool definitions for routing
      /render-tools.ts      # MCP tool definitions for rendering
    /config.ts              # Configuration loading
    /auth.ts                # Azure authentication handler
  /tests
    /unit                   # Jest unit tests
    /integration            # Integration tests with Azure Maps
  /docs
    /tools.md               # Tool catalog documentation
```

### 2.2 Quality Definition

**"Quality" means:**

1. **MCP Protocol Compliance**
   - Strict adherence to MCP specification
   - Proper capability negotiation
   - Correct error handling per protocol

2. **Type Safety**
   - TypeScript throughout (strict mode)
   - Zod schemas for runtime validation
   - Generated types from Azure Maps SDK

3. **Error Handling**
   - Graceful degradation when Maps API fails
   - Clear error messages for LLM consumption
   - Rate limiting handling (429 responses)
   - Exponential backoff for retries

4. **Testing**
   - Unit test coverage >80%
   - Integration tests against live Azure Maps
   - Mock server for protocol testing
   - Performance benchmarks

5. **Documentation**
   - Each MCP tool has clear description
   - Parameter schemas with examples
   - README with setup instructions
   - Architecture decision records (ADRs)

6. **Performance**
   - Response caching (Redis or in-memory)
   - Connection pooling
   - Lazy loading of Maps SDK modules
   - Telemetry for slow operations

7. **Developer Experience**
   - Clear logging (structured JSON)
   - Easy local development setup
   - Environment variable configuration
   - VS Code debugging support

### 2.3 MCP Tool Surface

**Phase 1 (MVP):**
- `maps_search_address` - Geocode addresses
- `maps_reverse_geocode` - Reverse geocode coordinates
- `maps_search_nearby` - POI search
- `maps_get_route` - Calculate routes between points
- `maps_render_static_map` - Generate map images

**Phase 2 (Enhanced):**
- `maps_batch_search` - Batch geocoding
- `maps_get_traffic` - Real-time traffic data
- `maps_get_weather` - Weather at location
- `maps_upload_custom_data` - Upload custom datasets

**Phase 3 (Advanced):**
- `maps_spatial_query` - Spatial operations (buffer, intersect)
- `maps_isochrone` - Reachability analysis
- `maps_matrix_routing` - Many-to-many routing

### 2.4 Configuration Model

**Environment Variables:**
```bash
# Azure Maps Connection
AZURE_MAPS_SUBSCRIPTION_KEY=<from-keyvault-or-direct>
AZURE_MAPS_CLIENT_ID=<managed-identity-client-id>
AZURE_TENANT_ID=<tenant-id>

# MCP Server
MCP_SERVER_PORT=3000
MCP_SERVER_NAME=azmaps-mcp
MCP_LOG_LEVEL=info

# Features (align with IaC toggles)
ENABLE_PREMIUM_FEATURES=false
ENABLE_CUSTOM_DATA=false

# Performance
CACHE_TTL_SECONDS=300
MAX_CONCURRENT_REQUESTS=10
```

**Configuration Priority:**
1. Environment variables (highest)
2. `.env` file (local dev)
3. Key Vault references (production)
4. Default values (code)

---

## Part 3: Integration Points

### 3.1 Deployment → MCP Server

**Connection Flow:**
```
IaC Deployment (Bicep)
  ↓
Outputs: Maps Account ID, Primary Key, Managed Identity
  ↓
Stored in: Azure Key Vault + Deployment Outputs
  ↓
MCP Server reads on startup via:
  - Managed Identity → Key Vault (production)
  - Local .env file (development)
```

**Key Vault Secrets:**
- `azure-maps-subscription-key`
- `azure-maps-client-id`

### 3.2 Authentication Flow

**Production:**
```
MCP Server (Managed Identity)
  ↓
Azure Entra ID → Token
  ↓
Azure Maps REST API (authenticated)
```

**Development:**
```
MCP Server (.env with subscription key)
  ↓
Azure Maps REST API (key-based auth)
```

---

## Part 4: Order of Operations

### Phase 0: Foundation (Week 1)
1. **Project Setup**
   - Repository structure
   - CI/CD pipeline skeleton (GitHub Actions)
   - Development environment docs

2. **IaC Foundation**
   - Create `/infra` Bicep structure
   - Define parameters (dev/prod)
   - Create deployment scripts

3. **Decision:** Nail down MCP tool catalog (what we're exposing)

### Phase 1: Infrastructure (Week 2)
1. **Deploy Azure Maps** (Neo leads, Morpheus reviews)
   - Bicep implementation
   - Key Vault integration
   - Monitoring setup
   - Test deployment in dev subscription

2. **Validation**
   - Confirm Maps account accessible
   - Test subscription key retrieval
   - Verify monitoring signals

### Phase 2: MCP Server Core (Week 3-4)
1. **MCP Protocol Implementation** (Niobe leads, Morpheus reviews)
   - Server scaffolding
   - Protocol handlers
   - Configuration loading
   - Auth wrapper for Maps

2. **MVP Tools**
   - Implement Phase 1 tools (search, geocode, route, render)
   - Unit tests for each tool
   - Integration tests against live Maps

3. **Documentation**
   - Tool catalog
   - Setup guide
   - Architecture diagrams

### Phase 3: Integration & Testing (Week 5)
1. **End-to-End Testing**
   - Deploy infra to test environment
   - Deploy MCP Server with Managed Identity
   - Validate all tools work against deployed Maps

2. **Performance Testing**
   - Load testing (expected QPS)
   - Cache effectiveness
   - Latency benchmarks

3. **Security Review**
   - Managed Identity permissions
   - Key Vault access policies
   - Network security (if applicable)

### Phase 4: Production Readiness (Week 6)
1. **Documentation**
   - Operations runbook
   - Troubleshooting guide
   - Cost analysis

2. **Deployment Automation**
   - One-command deployment
   - Environment promotion (dev → prod)
   - Rollback procedures

3. **Monitoring & Alerts**
   - Error rate alerts
   - Cost anomaly detection
   - Performance degradation alerts

---

## Part 5: Key Architectural Decisions

### AD-001: Bicep over Terraform
**Decision:** Use Bicep for IaC  
**Rationale:** Native Azure tooling, better type safety, simpler for Azure-only project  
**Trade-off:** Less portable than Terraform, but we're Azure-specific

### AD-002: Node.js for MCP Server
**Decision:** TypeScript/Node.js runtime  
**Rationale:** 
- Azure Maps JavaScript SDK is first-class
- MCP protocol has strong Node.js support
- Rich ecosystem for API servers
**Trade-off:** Not as performant as Go/Rust, but adequate for API gateway pattern

### AD-003: Managed Identity over API Keys
**Decision:** Prefer Managed Identity for production  
**Rationale:** Better security posture, no credential rotation  
**Trade-off:** More complex local dev setup (solved with .env fallback)

### AD-004: In-Memory Caching over Redis
**Decision:** Start with in-memory cache, Redis optional  
**Rationale:** Simpler initial architecture, single-instance deployment  
**Trade-off:** Not distributed, but can add Redis later if scaling requires

### AD-005: Phased Tool Rollout
**Decision:** MVP → Enhanced → Advanced tool phases  
**Rationale:** Validate architecture with core tools before expanding  
**Trade-off:** Slower feature delivery, but reduces risk

---

## Part 6: Success Criteria

### Infrastructure Success
- [ ] Azure Maps account deploys in <5 minutes
- [ ] All parameters toggleable without code changes
- [ ] Monitoring dashboards show live metrics
- [ ] Cost projections match expected QPS

### MCP Server Success
- [ ] Protocol compliance verified with MCP test suite
- [ ] All Phase 1 tools functional
- [ ] Response latency <2 seconds for 95th percentile
- [ ] Zero crashes in 24-hour soak test
- [ ] Documentation allows new dev to run locally in <30 minutes

### Integration Success
- [ ] MCP Server authenticates to Maps via Managed Identity
- [ ] End-to-end tool invocation works from Claude Desktop
- [ ] All tests pass in CI/CD pipeline
- [ ] Production deployment succeeds with zero manual steps

---

## Part 7: Risk & Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Azure Maps API changes | High | Low | Pin SDK version, test before upgrades |
| MCP protocol evolves | Medium | Medium | Abstract protocol layer, follow spec changes |
| Cost overruns | High | Medium | Alerts on usage, QPS limits, cost analysis dashboard |
| Managed Identity issues | Medium | Low | Key-based auth fallback, thorough testing |
| Rate limiting (429s) | Medium | High | Exponential backoff, request queue, caching |

---

## Next Steps

1. **Morpheus:** Review and approve this strategy
2. **Neo:** Review infrastructure decisions (AD-001, AD-003)
3. **Niobe:** Review MCP tool catalog and quality definitions (AD-002, AD-004)
4. **Team:** Consensus on Phase 1 scope and timeline
5. **Morpheus:** Create decision records for AD-001 through AD-005

---

**Status:** Awaiting team review  
**Approval Required:** Morpheus (final), Neo (infra), Niobe (MCP)  
**Timeline:** 6 weeks to production-ready v1.0
