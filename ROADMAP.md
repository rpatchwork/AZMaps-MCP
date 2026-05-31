# Product Roadmap — AZMaps-MCP

**Last Updated:** 2026-05-24  
**Version:** 1.0.0

This document outlines the planned evolution of AZMaps-MCP from V1.0 through future releases. Timelines are estimates and subject to change based on user feedback and squad capacity.

---

## Release History

### V1.0 — Foundation (SHIPPED 2026-05-24)

**Status:** ✅ Deployed and operational  
**Sprint:** Sprint 001 (2026-05-22 to 2026-06-05)  
**Goal:** Deploy operational MCP service that other agents can discover and call

**What Shipped:**
- ✅ 7 primitive geospatial tools (geocoding, routing, POI search, timezone, maps)
- ✅ HTTP-only JSON-RPC 2.0 transport
- ✅ Azure Container Apps deployment (public endpoint)
- ✅ Standardized error handling
- ✅ 87/87 unit tests, 55/73 integration tests passing
- ✅ Production endpoint: `ca-azmaps-mcp-dev.graysand-f7f65db5.eastus.azurecontainerapps.io`

**Key Decisions:**
- HTTP-only (SSE deferred)
- 7 basic primitives (no advanced features)
- Public endpoint with API key auth (Managed Identity deferred)
- Console.log logging (structured logging deferred)
- Default health probes (custom probes deferred)

**Architecture:**
- TypeScript + Node.js 20+
- Azure Maps Gen2 REST APIs (direct, no SDK)
- Bicep infrastructure as code
- Container Apps with Managed Identity for ACR pull

---

## V1.1 — Polish & Performance (NEXT)

**Target:** June 2026  
**Status:** 🟡 Planning  
**Focus:** Quality of life improvements and performance optimization

### Planned Features

#### 1. SSE Streaming Transport
**Why:** Enable progressive responses for long-running operations  
**Benefit:** Better UX for multi-step workflows (batch geocoding, complex routes)  
**Complexity:** Medium (4-6 hours)  
**Priority:** P1

**Approach:**
- Add SSE alongside HTTP (not replacing)
- Use `SSEServerTransport` from `@modelcontextprotocol/sdk`
- Maintain HTTP for simple operations
- SSE for operations that could benefit from streaming

#### 2. Structured Logging
**Why:** Improve observability and troubleshooting in production  
**Benefit:** Filter logs by severity, trace requests, monitor performance  
**Complexity:** Low (2-3 hours)  
**Priority:** P1

**Approach:**
- Replace `console.log` with structured logger (Winston or Pino)
- JSON format for all logs
- Log levels: DEBUG, INFO, WARN, ERROR
- Request ID tracing for correlation

#### 3. Deep Health Probes
**Why:** Proactively detect Azure Maps API connectivity issues  
**Benefit:** Faster failure detection, better uptime visibility  
**Complexity:** Low (2-3 hours)  
**Priority:** P2

**Approach:**
- Custom `/health` endpoint
- Check Azure Maps API reachability
- Validate API key/credentials
- Return detailed status (OK, DEGRADED, UNHEALTHY)

#### 4. Parameter Enhancements
**Why:** Improve error messages and developer experience  
**Benefit:** Faster debugging, clearer validation errors  
**Complexity:** Medium (4-6 hours)  
**Priority:** P2

**Approach:**
- Enhanced Zod schemas with custom error messages
- Parameter constraints (min/max values, patterns)
- Default value recommendations in schema
- Examples in tool descriptions

#### 5. API Version Audit
**Why:** Ensure we're using latest stable Azure Maps API versions  
**Benefit:** Access to new features, bug fixes, performance improvements  
**Complexity:** Medium (3-4 hours investigation + testing)  
**Priority:** P2

**Approach:**
- Audit all 7 tools for current API versions
- Check Azure Maps changelog for breaking changes
- Update to latest stable versions
- Regression test all 73 integration tests

#### 6. Semantic Versioning
**Why:** Avoid `:latest` tag caching issues in Container Apps  
**Benefit:** Reliable deployments, better version tracking  
**Complexity:** Low (1-2 hours)  
**Priority:** P1

**Approach:**
- Use `:v1.1.0` style tags for all images
- Automate tag creation in CI/CD
- Update deployment scripts to use semantic versions
- Keep `:latest` as alias but don't rely on it

### Success Criteria
- [ ] SSE transport working alongside HTTP
- [ ] Structured JSON logs in production
- [ ] Custom health probe validating Azure Maps connectivity
- [ ] Enhanced parameter validation with clear error messages
- [ ] All tools using latest stable API versions
- [ ] Semantic versioning for container images
- [ ] 60/73+ integration tests passing (fix route overlay edge cases)

---

## V1.2 — Advanced Features (FUTURE)

**Target:** July-August 2026  
**Status:** 🔵 Backlog  
**Focus:** Advanced routing and batch optimization

### Planned Features

#### 1. Advanced Routing Options
**Why:** Support complex trip planning scenarios  
**Features:**
- Traffic-aware routing (real-time and predicted)
- Toll avoidance options
- Alternative route suggestions
- Route optimization (minimize distance or time)

**User Demand Required:** Defer until travel agents request these capabilities

#### 2. Batch Operations Optimization
**Why:** Improve performance for multi-stop itineraries  
**Current:** Sequential processing for batch geocoding  
**Planned:** Parallel processing with request batching  
**Performance Target:** 3-5x faster for batches of 10+ addresses

#### 3. Monitoring & Observability
**Why:** Production-grade monitoring and alerting  
**Features:**
- Azure Monitor integration
- Application Insights tracing
- Custom metrics (response time, error rate, API usage)
- Alerts for degraded performance or failures

#### 4. Rate Limiting
**Why:** Protect against quota exhaustion and cost overruns  
**Approach:**
- Client-side rate limiting (per-client quotas)
- Graceful degradation (429 errors with retry-after headers)
- Usage tracking and alerting

### Success Criteria
- [ ] Traffic-aware routing operational
- [ ] Batch geocoding 3-5x faster
- [ ] Application Insights tracing end-to-end
- [ ] Rate limiting preventing quota overruns

---

## V2.0 — Real-Time & Multi-Region (EXPLORATION)

**Target:** Q4 2026  
**Status:** 🔵 Exploration  
**Focus:** Real-time features and global availability

### Potential Features (Not Committed)

#### Real-Time Capabilities
- WebSocket support for real-time location updates
- Traffic incident notifications
- Route change alerts based on traffic conditions

#### Multi-Region Deployment
- Deploy to multiple Azure regions (East US, West Europe, Asia Pacific)
- Traffic Manager for geo-routing
- Regional failover for high availability

#### Webhook Support
- Callback URLs for long-running operations
- Event notifications (route calculated, batch completed)

#### Enhanced Security
- Managed Identity for Azure Maps authentication (no API keys)
- OAuth 2.0 / Azure AD authentication for MCP clients
- VNet integration for private endpoint access
- API Gateway integration for centralized auth/monitoring

### Decision Gates
- Evaluate real-time demand based on V1.x usage patterns
- Assess multi-region need based on user geography
- Prioritize security enhancements based on user feedback

---

## Beyond V2.0 (Ideas, Not Commitments)

### Machine Learning Integration
- Predictive routing based on historical traffic patterns
- Personalized POI recommendations
- Travel time predictions with confidence intervals

### Offline Capabilities
- Cached geocoding for common addresses
- Offline map tile serving
- Route caching for frequent trips

### Developer Experience
- OpenAPI spec generation
- Swagger UI for interactive testing
- Client SDKs (Python, JavaScript, C#)

---

## Feature Request Process

**How to Request Features:**
1. File a GitHub issue with use case description
2. Explain why existing capabilities don't meet your needs
3. Provide examples of desired behavior
4. Indicate urgency and willingness to beta test

**Prioritization Criteria:**
1. **User Demand:** How many users need this?
2. **Impact:** Does this unlock new use cases or significantly improve existing ones?
3. **Effort:** How complex is the implementation?
4. **Strategic Fit:** Does this align with our vision of primitive geospatial operations?

**Roadmap Updates:**
- Reviewed quarterly by squad
- User feedback shapes priorities
- Breaking changes require major version bumps

---

## Version Support Policy

### Active Support
- **V1.x:** Active development and bug fixes
- **V2.x:** When released, V1.x moves to maintenance mode

### Maintenance Mode
- Critical bug fixes only
- No new features
- Security updates as needed

### End of Life
- 6 months notice before EOL
- Migration guide to newer version
- Final security update before deprecation

### Breaking Changes
- Require major version bump (V1 → V2)
- Announced 3+ months in advance
- Deprecation warnings in logs before removal

---

## Contributing to the Roadmap

**Squad Members:**
- Propose features via `.squad/decisions/inbox/`
- Discuss in squad meetings
- Update roadmap after user approval

**External Contributors:**
- File GitHub issues for feature requests
- Comment on existing roadmap items
- Beta test new features when available

**Transparency:**
- Roadmap is public and version-controlled
- Changes documented with rationale
- User feedback publicly visible in issues

---

## Questions?

**Where are we now?** See [README.md](README.md) for current capabilities  
**What doesn't work?** See [LIMITATIONS.md](LIMITATIONS.md) for known issues  
**When will X ship?** Check this roadmap (updated quarterly)  
**Can I help?** File issues, provide feedback, beta test new features
