# MCP Research Summary — For Morpheus Review

**Research Completed:** 2026-05-22  
**Researcher:** Trinity (MCP Server Expert)  
**Document:** `.squad/knowledge/mcp-azure-best-practices.md` (committed: b4ef30e)

---

## Executive Summary

Completed comprehensive research on MCP server fundamentals for Azure. The findings provide a solid foundation for implementation decisions and validate several of our current architectural choices while highlighting areas for improvement.

---

## Key Findings

### 1. Azure Hosting Validation ✅

**Current Decision (AD-002):** Container Apps with minReplicas: 1

**Research Confirms:** This is the optimal choice for interactive MCP servers like ours.

**Evidence:**
- Container Apps designed for long-lived HTTP APIs (MCP's transport model)
- `minReplicas: 1` prevents cold starts (critical: LLMs expect <1s response time)
- Cost-efficient: ~$30-50/month baseline vs Functions Premium (~$200/month)
- Managed HTTPS, autoscaling, and health probes built-in

**Alternative Comparison:**
| Service | Best For | Our Fit? |
|---------|----------|----------|
| Container Apps | Long-lived HTTP APIs with scale-to-zero option | ✅ Perfect |
| Functions | Event-driven, can tolerate cold starts | ❌ Cold starts break UX |
| App Service | Code-based (no Dockerfile), existing plans | ⚠️ Works but more expensive |
| AKS | Multi-MCP orchestration, GPU workloads | ❌ Overkill for v1 |

### 2. MCP Server Architecture Patterns

**What We're Doing Right:**
- ✅ Separate tool definitions from handlers (`geocode.ts` structure)
- ✅ Zod validation at boundaries (`GeocodeParamsSchema.parse()`)
- ✅ Centralized HTTP client with retry logic (`AzureMapsClient`)
- ✅ Standardized error envelopes (`ErrorResponse` interface)

**What Needs Attention:**
- ⚠️ **Health Probe:** We need `/healthz` endpoint (separate from MCP endpoint `/`)
- ⚠️ **Logging:** Should switch to structured JSON logging for Azure Monitor
- ⚠️ **Auth:** Managed Identity implementation deferred (acceptable for v1)

**Pattern Highlight: Copilot-Friendly Defaults**

Research shows LLMs struggle with unbounded parameters. Our design already follows this:

```typescript
// ✅ Already doing this
maxResults: { 
  type: 'number', 
  default: 10, 
  minimum: 1, 
  maximum: 100 
}

outputLevel: { 
  enum: ['summary', 'detailed', 'full'],
  default: 'summary'  // Prevents 5KB JSON dumps
}
```

This is a **best practice** — keep doing this for all tools.

### 3. Error Handling Validation ✅

**Current Implementation:** Strong foundation in `errors.ts`

**Research Validates:**
- Error classification (domain vs infrastructure errors)
- `retryable` flag for LLM guidance
- Structured error responses

**Recommendation:** No changes needed. Our error handling is production-ready.

### 4. State Management

**Research Finding:** Prefer stateless MCP servers

**Our Status:** Currently stateless ✅

**Future Consideration:** If we need caching (e.g., geocoding results), use:
- Azure Cache for Redis (Basic tier: $15/month)
- Cache-aside pattern with 7-day TTL
- Store geocode results keyed by lowercase address

**When to Add Caching:**
- If Azure Maps API costs become significant
- If we see repeated geocode requests for same addresses
- Not needed for v1 — add based on telemetry

### 5. Production Readiness Gaps

**Critical (Must Fix Before Production):**
1. ❌ **Health Probe Endpoint:** Add `GET /healthz` (separate from MCP endpoint)
2. ❌ **Structured Logging:** JSON logs for Azure Monitor integration
3. ❌ **Managed Identity:** Replace API key auth (blocked on production plan)

**Nice to Have (Can Defer):**
4. ⚠️ **Connection Pooling:** Add HTTP Agent with `keepAlive: true`
5. ⚠️ **Rate Limiting:** Client-side rate limiter (50 req/min)
6. ⚠️ **CORS Config:** Only needed if supporting browser clients (not GitHub Copilot desktop)

---

## Recommendations for Immediate Action

### High Priority (This Sprint)

**1. Add Health Probe Endpoint**

```typescript
// server.ts
app.get('/healthz', (req, res) => {
  res.status(200).json({ 
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});
```

Update Bicep to use `/healthz` for health probes (currently pointing to `/`).

**2. Structured Logging**

Replace `console.log()` with structured JSON:

```typescript
logger.info('Geocode request', { 
  address: params.address, 
  requestId: req.headers['x-request-id'] 
});
```

This enables KQL queries in Azure Monitor.

### Medium Priority (Next Sprint)

**3. Connection Pooling**

Add HTTP Agent to `AzureMapsClient` for connection reuse:

```typescript
private readonly agent = new Agent({
  keepAlive: true,
  maxSockets: 50
});
```

Reduces latency by 20-50ms per request.

**4. Deployment Script Hardening**

Update Container Apps Bicep:
- Set `minReplicas: 1` explicitly (prevent cold starts)
- Configure health probe path to `/healthz`
- Add resource limits based on telemetry

### Low Priority (Post-V1)

**5. Managed Identity**

Switch from API key to Managed Identity for Azure Maps access. Requires:
- `@azure/identity` package
- Role assignment in Bicep
- Token acquisition logic in `AzureMapsClient`

**Defer until:** Production deployment planning (AD-003 decision pending)

---

## Architecture Decision Validation

| Decision | Status | Research Finding |
|----------|--------|------------------|
| AD-001: Bicep over Terraform | ✅ Validated | Bicep templates align with Azure best practices for MCP |
| AD-002: Node.js + TypeScript | ✅ Validated | MCP SDK v1.x has excellent TypeScript support |
| AD-002a: Container Apps | ✅ Validated | Optimal for interactive MCP servers (minReplicas: 1) |
| AD-003: V1 Primitives | ✅ Validated | Batch operations (batch_geocode) prevent N API calls |
| SDK Selection: Direct REST | ✅ Validated | Custom HTTP client gives full control + connection pooling |

**No architectural pivots needed.** Current stack is solid.

---

## Team Discussion Topics

### For Morpheus (Lead)

1. **Health Probe Priority:** Should we pause feature work to add `/healthz` endpoint first?
2. **Production Timeline:** When do we need Managed Identity? (Drives auth implementation schedule)
3. **Caching Strategy:** Add Redis now or wait for cost telemetry?

### For Neo (Infrastructure)

1. **Bicep Updates:** minReplicas, health probe path, resource limits — can you review the recommendations in Section 6.2 of the knowledge doc?
2. **Redis Provisioning:** Do we want to pre-provision Redis (Basic tier) or add it later?

### For Tank (Testing)

1. **Health Probe Tests:** Can you add integration test for `/healthz` endpoint?
2. **Error Handling Tests:** Current error envelope tests are strong — keep this pattern

---

## Success Metrics (Based on Research)

| Metric | Research Target | Our Target |
|--------|-----------------|------------|
| P50 Tool Response | <500ms | <500ms ✅ |
| P99 Tool Response | <2s | <2s ✅ |
| Cold Start (minReplicas:1) | <100ms | <100ms (need to measure) |
| Availability | 99.9% | 99.9% (Container Apps SLA) |

**Action:** Add Application Insights to measure these metrics post-deployment.

---

## Next Steps

1. **Trinity:** Implement health probe endpoint + structured logging (2-3 hours)
2. **Neo:** Review Bicep recommendations in knowledge doc (1 hour)
3. **Morpheus:** Review research findings, prioritize production readiness items (30 min)
4. **Team:** Discussion session on production timeline and Managed Identity scope (1 hour)

---

## Document Location

**Full Research:** `.squad/knowledge/mcp-azure-best-practices.md`  
**Commit:** `b4ef30e` (main branch)  
**Usage:** Reference this for all future MCP implementation decisions

---

**Status:** ✅ Research Complete  
**Next:** Team review and prioritization
