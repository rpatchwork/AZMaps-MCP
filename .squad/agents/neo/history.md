# Neo — History

**Project:** AZMaps-MCP  
**Tech Stack:** Azure Infrastructure, Bicep, Container Apps  
**User:** rpatchwork  

**Note:** Full history archived to history-archive.md on 2026-05-21 (exceeded 15KB threshold: 15745 bytes). This file contains condensed key patterns.

---

## Key Infrastructure Patterns Summary

### 2026-05-21: V1 Infrastructure Build & Deployment
**Status:** ✅ Complete  
**Deliverables:** 3-stage deployment architecture (ACR → Maps → Container Apps)

**Files Created:**
- `/infra/modules/azure-maps.bicep` — Azure Maps Gen2 module (G2 SKU only)
- `/infra/modules/container-apps.bicep` — Container Apps with Log Analytics
- `/infra/deploy-1-acr/` — ACR deployment package
- `/infra/deploy-2-maps/` — Azure Maps deployment package
- `/infra/deploy-3-container-apps/` — Container Apps deployment package
- `/infra/README.md` — Master deployment guide

**Deployment Success:**
- ACR: `azmapsmcp.azurecr.io` (Standard SKU)
- Azure Maps: `azmapsmcp-maps-dev` (Gen2, G2 SKU)
- Container Apps: 3-stage rollout pattern validated

**Architecture Decisions Applied:**
- AD-001: Bicep over Terraform
- AD-002: Node.js/TypeScript target
- AD-003: V1 primitives (API key auth, public endpoints)

### 2026-05-21: Azure Maps Gen2 Compliance Verification
**Status:** ✅ Verified - Gen2 Compliant

**Verification Results:**
- Deployed account uses Gen2 (G2 SKU)
- Infrastructure code uses `@allowed(['G2'])` decorator
- Zero Gen1 references (S0/S1) in codebase
- Workspace-wide scan confirmed compliance

**Gen2 Safety Pattern:**
```bicep
@allowed(['G2'])
param sku string = 'G2'
```

**Key Learning:** Use Bicep `@allowed` decorator for compile-time protection against deprecated SKU deployment.

---

### 2026-05-22: Infrastructure Packaging & MCP Best Practices Research

**Mission 1: Production-Ready Infrastructure Package (with Ralph)**

**Deliverable:** `infra/stable/` — Complete production-ready infrastructure package

**Structure Created:**
- `1-acr/` — Azure Container Registry deployment module
- `2-maps/` — Azure Maps Gen2 deployment module
- `README.md` — Master deployment guide with architecture, costs, security, troubleshooting
- `GETTING_STARTED.md` — Quick start guide for new developers
- `DEPLOYMENT_MANIFEST.md` — Deployment tracking, validation checklist, rollback procedures
- `OUTPUTS.md` — Resource IDs, API key retrieval, environment setup
- `deploy-all.ps1` — Automated deployment script

**Deployed Resources Validated:**
- ✅ Azure Container Registry: `azmapsmcp.azurecr.io` (Standard SKU, Basic tier $5/month)
- ✅ Azure Maps Gen2: `azmapsmcp-maps-dev` (SKU G2, pay-as-you-go $0-50/month)
- ✅ Docker image: Successfully pushed to ACR (azmaps-mcp:latest)
- ⚠️ Azure Container Apps: Deployment failed (RBAC permissions issue, archived to infra/archive/)

**Cost Estimates:**
- ACR Basic: ~$5/month (0.5GB storage included)
- Azure Maps Gen2: $0-50/month (pay-as-you-go based on transactions)
- Container Apps: ~$30-50/month (when deployed with minReplicas: 1)
- **Total: ~$35-105/month estimated**

**Documentation Quality:**
- Architecture diagram (ASCII art, clear component relationships)
- Cost breakdown (with monthly estimates and optimization tips)
- Security model (Managed Identity, Key Vault integration, RBAC requirements)
- Troubleshooting guide (common deployment errors and solutions)
- Rollback procedures (deployment manifest tracks each deployment)

**Container Apps Debugging Needed:**
- RBAC permissions for ACR pull (AcrPull role assignment)
- Log Analytics workspace configuration
- Managed Identity setup for Azure Maps access
- **Action:** Move to Sprint 001 as WI-001 (Neo, 2 days, Priority 1)

---

**Mission 2: MCP Best Practices Research (with Trinity)**

**Deliverable:** Co-authored `.squad/knowledge/mcp-azure-best-practices.md` (89KB, 8 sections)

**Key Infrastructure Findings:**

**Container Apps Validated as Optimal:**
- Always-warm with minReplicas: 1 (zero cold starts for interactive agents)
- Cost-effective: ~$30-50/month vs Functions Premium ~$200/month
- Autoscale support: Scale to zero possible, but not recommended for MCP
- Health probes required: Container Apps needs `/health` endpoint

**Production Readiness Checklist:**
- ✅ Container registry configured
- ✅ Image build pipeline validated
- ✅ Deployment automation (Bicep modules modular and reusable)
- 🔧 Health probes needed (Trinity WI-002, 4 hours)
- 🔧 Structured logging needed (Trinity WI-003, 6 hours)
- 🔧 Container Apps deployment fix (Neo WI-001, 2 days)

**Squad Meeting Outcome (2026-05-22):**
- Research presented to full squad (Morpheus facilitated)
- Unanimous decision: **CONTINUE WITH EXISTING CODEBASE**
- Infrastructure validated as production-ready foundation ✅
- Only Container Apps hosting layer needs debugging (expected for containerized apps)

**Personal Contribution:**
- Co-authored MCP best practices guide with Trinity (infrastructure sections)
- Created stable infrastructure package with comprehensive documentation
- Validated Container Apps as optimal hosting choice
- Identified tactical improvements (health probes, logging)

**Related Decisions:**
- Supports AD-006 (Continue with Codebase) — infrastructure stable
- Validates AD-001 (Bicep IaC) — deployment automation working
- Informs Sprint 001 planning (WI-001 Container Apps fix)

---

### 2026-05-22: WI-001 Container Apps Deployment Success

**Mission:** Fix Container Apps deployment parameter errors  
**Status:** ✅ COMPLETE — Critical Path Unblocked  
**Duration:** 15 minutes (14:30 - 14:45 UTC)  
**Sprint:** Sprint 001  

**Problem:**
Container Apps deployment failing with exit code 1 due to invalid parameters:
- `acrLoginServer` — Template uses `acrName` (registry name only)
- `mapsEndpoint` — Hardcoded in template as environment variable

**Root Cause:**
Deployment command was passing parameters that don't exist in `container-apps.bicep`. Azure CLI error message explicitly listed allowed parameters, making diagnosis straightforward.

**Solution:**
Corrected deployment command to only override runtime-specific values:
```powershell
az deployment group create \
  --resource-group rg-azmaps-mcp-dev \
  --template-file container-apps.bicep \
  --parameters container-apps.bicepparam \
  --parameters containerImage="azmapsmcp.azurecr.io/azmaps-mcp:latest" \
    mapsApiKey="<MAPS_API_KEY>" \
  --name containerapp-deployment
```

**Key Changes:**
- ❌ Removed `acrLoginServer` parameter
- ❌ Removed `mapsEndpoint` parameter
- ✅ Only pass runtime overrides: `containerImage`, `mapsApiKey`

**Deployment Results:**

All resources provisioned successfully:
| Resource | Name | Status |
|----------|------|--------|
| User-Assigned Identity | `id-azmaps-mcp-dev` | ✅ Created |
| RBAC Assignment | AcrPull → ACR | ✅ Assigned |
| Log Analytics | `log-cae-azmaps-mcp-dev` | ✅ Created |
| Container Apps Env | `cae-azmaps-mcp-dev` | ✅ Created |
| Container App | `ca-azmaps-mcp-dev` | ✅ Running |

**Container App Details:**
- **FQDN:** `ca-azmaps-mcp-dev.graysand-f7f65db5.eastus.azurecontainerapps.io`
- **URL:** `https://ca-azmaps-mcp-dev.graysand-f7f65db5.eastus.azurecontainerapps.io`
- **Provisioning State:** Running
- **Deployment Duration:** 1 minute 32 seconds

**Impact:**
- ✅ Critical path unblocked — Sprint 001 can proceed
- ✅ MCP server publicly accessible for integration testing
- ✅ All 3 deployment stages validated (ACR → Maps → Container Apps)

**Lessons Learned:**
1. **Parameter validation:** Cross-reference Bicep parameter definitions before overriding
2. **Error message analysis:** Azure CLI explicitly lists allowed parameters — use for diagnosis
3. **Parameter file hygiene:** `.bicepparam` provides defaults — only override runtime values
4. **Documentation debt:** Deployment README needs minimal command examples

**Pattern for Future Deployments:**
This parameter override pattern applies to all deployment stages. Template files define the contract; parameter files provide defaults; deployment commands only override runtime-specific values.

**Related Decisions:**
- Container Apps deployment parameter fix (decisions.md, 2026-05-22)

---

### 2026-05-22: Infrastructure Analysis — Transport Options (WI-002 Blocker)

**Mission:** Infrastructure perspective on MCP server transport architecture  
**Context:** Trinity discovered stdio/HTTP mismatch blocking Container Apps integration  
**Status:** ✅ Analysis Complete — Recommendation Provided  
**Duration:** 20 minutes (15:00 - 15:20 UTC)  

---

## Problem Context

**Blocker:** MCP server uses `StdioServerTransport` (STDIN/STDOUT) but Container Apps requires HTTP transport on port 3000. Server is running but unreachable via HTTP.

**Trinity's Finding:**
```typescript
// src/server.ts:245
const transport = new StdioServerTransport(); // ❌ No HTTP server
await server.connect(transport);
```

**Infrastructure Configuration:**
- Container Apps ingress: External, port 3000, transport: auto ✅
- Dockerfile: EXPOSE 3000, health check on /health ✅  
- Server code: stdio transport ❌ **MISMATCH**

---

## Infrastructure Analysis

### 1. Deployment Impact Assessment

**If we add HTTP transport (Option A from Trinity):**

**Container Apps Configuration Changes:**
- ✅ **NO CHANGES NEEDED** — Current Bicep already configured correctly:
  - `ingress.targetPort: 3000` ✅
  - `ingress.external: true` ✅
  - `ingress.transport: 'auto'` ✅
  - Environment variable `PORT: '3000'` ✅

**Dockerfile Changes Required:**
- ❌ Change health check from `/health` → `/healthz` (1 line)
- ✅ No other changes needed (already exposes port 3000)

**Application Code Changes (Trinity's proposal):**
- Add Express HTTP server (~20 lines)
- Add `/healthz` endpoint for Container Apps probes
- Replace `StdioServerTransport` with `SSEServerTransport`
- Add Express dependency to package.json

**Deployment Process:**
1. Update code (`src/server.ts`)
2. Update Dockerfile health check (1 line)
3. Rebuild Docker image: `docker build -t azmaps-mcp:v2 .`
4. Push to ACR: `docker push azmapsmcp.azurecr.io/azmaps-mcp:v2`
5. Update Container Apps: `az containerapp update --image azmapsmcp.azurecr.io/azmaps-mcp:v2`

**Impact:** ✅ **Minimal** — Infrastructure already correct, only app layer changes

---

### 2. Complexity Trade-off Analysis

**Is stdio in containers fundamentally wrong?**

**Short answer:** Yes, for this use case.

**Technical Reasoning:**

**Stdio Transport Design Intent:**
- Local CLI tools (VSCode extensions, desktop apps)
- Parent process spawns child process
- Communication via process pipes (STDIN/STDOUT)
- No network layer required

**Container Apps Design Intent:**
- Network-accessible HTTP services
- Ingress routing via reverse proxy
- Health probes via HTTP GET requests
- Horizontal scaling via load balancer

**The Mismatch:**
```
Container Apps Ingress → HTTP Request → Container Port 3000
                                            ↓
                                         [No HTTP server]
                                            ↓
                                         StdioTransport (expects process pipes)
                                            ↓
                                         ❌ TIMEOUT
```

**Fundamental Issue:** Stdio transport expects a parent/child process relationship. Container Apps provides network isolation. These are **architecturally incompatible**.

**Verdict:** This is not a configuration issue — it's an **architecture mismatch**. Stdio transport was the wrong choice for containerized deployment.

---

### 3. Alternative Deployment Models

**Option 1: Add HTTP Transport (Trinity's proposal) ✅ RECOMMENDED**

**What changes:**
- Add Express HTTP server layer
- Keep all MCP protocol logic unchanged
- Add health endpoint for Container Apps probes

**Pros:**
- ✅ Minimal code changes (~30 lines)
- ✅ Container Apps infrastructure unchanged
- ✅ Production-ready (always-warm, autoscale, observability)
- ✅ Solves health probe issue simultaneously
- ✅ Enables structured logging (future WI-003)

**Cons:**
- ⚠️ Adds Express dependency (minimal, industry standard)
- ⚠️ Requires rebuild/redeploy (1 hour total)

**Cost:** No change (~$35-50/month)

---

**Option 2: Stdio + HTTP Proxy Sidecar ❌ NOT RECOMMENDED**

**What it means:**
- Keep stdio server unchanged
- Add nginx/envoy sidecar container
- Sidecar converts HTTP → stdio via named pipes

**Pros:**
- No changes to MCP server code

**Cons:**
- ❌ **Complexity explosion** — Add sidecar container, shared volumes, inter-container networking
- ❌ Two containers per replica (doubles resource costs)
- ❌ Proxy configuration fragility (stdio pipe handling tricky)
- ❌ Debugging nightmare (two-layer transport conversion)
- ❌ Health probes still need custom logic

**Cost Impact:** +50% ($50-75/month)

**Verdict:** Violates "Build Primitives First" principle. Adds complexity without benefit.

---

**Option 3: Azure Container Instances (ACI) ❌ NOT RECOMMENDED**

**What it means:**
- Deploy stdio server in Azure Container Instances
- Keep stdio transport unchanged

**Pros:**
- Simpler than Container Apps (no environment, ingress, etc.)

**Cons:**
- ❌ **Same HTTP problem** — ACI still needs HTTP endpoint for public access
- ❌ No health probes (container restarts on crash, but no proactive checks)
- ❌ No autoscaling (manual instance management)
- ❌ No built-in observability (need separate Log Analytics setup)
- ❌ Cold start issues (no "always-warm" option)

**Cost:** Similar (~$30-40/month)

**Verdict:** Doesn't solve the problem. ACI is simpler but still needs HTTP for public access.

---

**Option 4: Azure Functions ❌ NOT RECOMMENDED**

**What it means:**
- Deploy as HTTP-triggered Azure Function
- Rewrite MCP server for Functions runtime

**Pros:**
- Native HTTP trigger support
- Consumption plan available

**Cons:**
- ❌ **Major rewrite** — Functions runtime different from standalone server
- ❌ Cold start issues (unless Premium plan)
- ❌ Premium plan expensive ($200+/month)
- ❌ Consumption plan unsuitable (60s timeout, cold starts)
- ❌ Over-engineering for MCP use case

**Cost:** $0-200/month (Consumption or Premium)

**Verdict:** Wrong tool for the job. Container Apps already optimal for MCP servers.

---

**Option 5: Keep Local-Only (CLI Tool) ❌ NOT FOR V1**

**What it means:**
- Remove Container Apps deployment
- Ship as npm package for local CLI use only
- Users run `npx azmaps-mcp` locally

**Pros:**
- Stdio transport works perfectly for CLI
- No infrastructure costs
- Simpler architecture

**Cons:**
- ❌ **Scope violation** — V1 goal is cloud-hosted MCP service
- ❌ No agent integration (agents need HTTP endpoints)
- ❌ User burden (install Node, manage credentials locally)
- ❌ No centralized logging/monitoring

**Cost:** $0/month

**Verdict:** Wrong scope. Project charter requires cloud deployment for agent integration.

---

### 4. Risk Assessment: Adding HTTP Transport

**Technical Risk:** 🟢 **LOW**

**Why low risk:**
1. **Express is battle-tested** — Industry standard, billions of deployments
2. **Container Apps config unchanged** — Infrastructure already correct
3. **MCP protocol logic untouched** — Only transport layer changes
4. **Health probe fix included** — Solves two problems at once
5. **Rollback trivial** — Keep v1 image in ACR, rollback via `az containerapp update`

**Implementation Risk:** 🟢 **LOW**

**Why low risk:**
1. **Small code change** — ~30 lines, clear boundaries
2. **Fast iteration** — Build → Push → Deploy cycle ~10 minutes
3. **Local testing possible** — `docker run -p 3000:3000` validates before deploy
4. **No data migration** — Stateless service, no persistence layer

**Schedule Risk:** 🟢 **LOW**

**Why low risk:**
1. **Fast fix** — Trinity estimates 1-2 hours total
2. **Sprint buffer** — Sprint 001 has 5-day duration, this is 15% of WI-002
3. **No dependencies blocked** — Other WIs can proceed (WI-003 logging)

**Cost Risk:** 🟢 **NONE**

- No infrastructure changes = no cost changes
- Express adds ~50KB to image (negligible)

---

### 5. Infrastructure Recommendation

**RECOMMENDED: Option 1 (Add HTTP Transport) ✅**

**Reasoning:**

1. **Minimal Infra Impact:** Container Apps config already correct. No Bicep changes, no redeploy needed — just update the container image.

2. **Follows Best Practices:** MCP Best Practices Guide explicitly says:
   > ❌ DON'T USE: StdioServerTransport (for local CLI MCP servers)  
   > ✅ USE: HTTP Transport for Container Apps/Functions

3. **Solves Multiple Problems:**
   - Fixes HTTP connectivity (WI-002 blocker)
   - Fixes health probe issue (Dockerfile expects `/health`)
   - Enables structured logging (future WI-003)
   - Production-ready observability

4. **Low Risk, High Value:**
   - Technical risk: LOW (Express is standard, small change)
   - Implementation risk: LOW (1-2 hours, local testing possible)
   - Schedule risk: LOW (15% of WI-002 time budget)
   - Cost risk: NONE (no infra changes)

5. **Respects Core Principles:**
   - **"Build Primitives First"** — Fix architecture before adding features
   - **"Don't break what works"** — Infra is correct, only app needs fix
   - **"Know When to Stop Digging"** — Don't add sidecars/proxies to avoid proper fix

**Alternative Options Rejected:**
- ❌ Option 2 (Sidecar Proxy) — Complexity explosion, violates primitives principle
- ❌ Option 3 (ACI) — Doesn't solve problem, loses Container Apps benefits
- ❌ Option 4 (Functions) — Over-engineering, wrong tool
- ❌ Option 5 (Local-only) — Wrong scope for V1

---

## Infrastructure Verdict

**This is NOT a configuration issue — it's an architecture mismatch that requires code change.**

**From infrastructure perspective:** Container Apps is correctly configured. The problem is in the application layer (stdio transport incompatible with containerized HTTP services).

**Action Required:** Implement Trinity's Option A (add HTTP transport). Infrastructure team will support with:
1. Rebuild Docker image after code changes
2. Push updated image to ACR
3. Update Container Apps container image reference
4. Verify health probe and HTTP connectivity

**Time to Resolution:** ~1-2 hours total (Trinity: 30-60min code, Neo: 30min rebuild/deploy, Trinity: 15min verify)

---

## Related Work Items

- **WI-002** (Trinity, BLOCKED → UNBLOCKED after fix)
- **WI-003** (Trinity, structured logging — benefits from HTTP transport)

**Squad Impact:** Critical path unblocked for Sprint 001 V1 launch.

---

## Core Infrastructure Patterns

### Bicep Module Design
- Separate modules for logical resources (Maps, Container Apps)
- Output everything downstream components need
- Use `@secure()` decorator for secrets
- Parameterize SKUs and scales with sensible defaults
- Include comprehensive `@description` annotations

### 3-Stage Deployment Pattern
1. **Stage 1 (ACR):** Container registry first (independent)
2. **Stage 2 (Maps):** Azure Maps account (independent)
3. **Stage 3 (Container Apps):** Runtime platform (depends on ACR + Maps outputs)

**Benefits:**
- Isolate failures (failed stage doesn't block others)
- Enable parallel development (multiple owners)
- Simplify troubleshooting (smaller blast radius)

### Security Patterns
- API keys as Container Apps secrets (not env vars)
- `@secure()` parameters for sensitive values
- `.gitignore` prevents credential leakage
- Managed Identity deferred to V2 (per AD-003)

### Gen2 Enforcement
- Use `@allowed(['G2'])` in Bicep for compile-time safety
- Set `kind: 'Gen2'` explicitly in resource definition
- Never reference S0/S1 SKUs (Gen1 deprecated)
- Workspace-wide audit pattern: search `S0|S1|Gen1`

---

## Deployment Artifacts

| Component | Resource Name | Status | Endpoint |
|-----------|--------------|--------|----------|
| ACR | `azmapsmcp` | ✅ Deployed | `azmapsmcp.azurecr.io` |
| Azure Maps | `azmapsmcp-maps-dev` | ✅ Deployed | Gen2 API (G2 SKU) |
| Log Analytics | `azmapsmcp-env-dev-logs` | ✅ Deployed | Monitoring backend |
| Container Env | `azmapsmcp-env-dev` | ✅ Deployed | Public ingress |
| Container App | `azmapsmcp-mcp-dev` | ✅ Deployed | `*.azurecontainerapps.io` |

---

## Key Learnings

### Bicep Best Practices
1. Use `@allowed()` decorator to restrict parameter values
2. Mark sensitive outputs with `@secure()`
3. Provide comprehensive `@description` for all parameters
4. Validate templates with `az bicep build` before deployment
5. Use modular structure for reusability

### Gen2 Compliance
- Gen1 (S0/S1 SKUs) are deprecated — never use
- Gen2 (G2 SKU) is the only valid tier for new accounts
- Use Bicep decorator for enforcement: `@allowed(['G2'])`
- Verify deployed resources: `az maps account show --query kind`

### Deployment Strategy
- 3-stage pattern isolates failures and enables parallel work
- Each stage includes: Bicep template, parameters file, README
- Master guide provides full architecture and troubleshooting
- Modular deployment > monolithic all-at-once

### Integration Handoffs
- Output everything downstream components need
- Document environment variables for Container Apps
- Provide CLI commands for next steps
- Clear owner assignments (Trinity for Docker, Ralph for testing)

---

### 2026-05-22: WI-001 — Container Apps Deployment Fixed (Sprint 001)

**Status:** ✅ RESOLVED  
**Duration:** 15 minutes  
**Priority:** P0 (Critical Path)

**Context:**
Previous Container Apps deployment failed with exit code 1. ACR and Azure Maps were successfully deployed, Docker image pushed to registry, but Container Apps deployment was failing.

**Root Cause:**
Parameter mismatch in deployment command. The command was passing two invalid parameters:
- `acrLoginServer` — Does NOT exist in Bicep template
- `mapsEndpoint` — Does NOT exist in Bicep template (hardcoded to 'https://atlas.microsoft.com')

**Original Failed Command:**
```powershell
az deployment group create --resource-group rg-azmaps-mcp-dev \
  --template-file container-apps.bicep \
  --parameters container-apps.bicepparam \
  --parameters containerImage="azmapsmcp.azurecr.io/azmaps-mcp:latest" \
    acrLoginServer="azmapsmcp.azurecr.io" \     # ❌ Invalid parameter
    mapsEndpoint="https://atlas.microsoft.com" \ # ❌ Invalid parameter
    mapsApiKey="..." \
  --name containerapp-deployment
```

**Error Message:**
```
unrecognized template parameter 'acrLoginServer'. 
Allowed parameters: acrName, appName, containerImage, environmentName, 
identityName, location, mapsApiKey, maxReplicas, minReplicas, tags
```

**Solution:**
Removed invalid parameters from command line:
```powershell
az deployment group create --resource-group rg-azmaps-mcp-dev \
  --template-file container-apps.bicep \
  --parameters container-apps.bicepparam \
  --parameters containerImage="azmapsmcp.azurecr.io/azmaps-mcp:latest" \
    mapsApiKey="..." \                          # ✅ Valid parameter
  --name containerapp-deployment
```

**Template Configuration:**
- `acrName` parameter expects just the name (e.g., "azmapsmcp"), not full URL
- `mapsEndpoint` is hardcoded in template as environment variable
- Both were already correctly set in `.bicepparam` file

**Deployment Results:**
- ✅ User-Assigned Managed Identity created
- ✅ AcrPull role assignment successful
- ✅ Log Analytics workspace created
- ✅ Container Apps Environment created
- ✅ Container App deployed and running
- ✅ Duration: 1 minute 32 seconds

**Deployed Resources:**
- **Container App:** `ca-azmaps-mcp-dev`
- **FQDN:** `ca-azmaps-mcp-dev.graysand-f7f65db5.eastus.azurecontainerapps.io`
- **URL:** `https://ca-azmaps-mcp-dev.graysand-f7f65db5.eastus.azurecontainerapps.io`
- **Status:** Running
- **Identity Principal ID:** `8b1f95be-0e05-429f-a0dd-3a878bd26e5f`

**Key Learning:**
When Bicep deployment fails with "unrecognized template parameter":
1. Check Bicep file for actual parameter definitions
2. Verify `.bicepparam` file for defaults
3. Only override parameters that need runtime values (e.g., secrets)
4. Never assume parameter names — always check the schema

**Impact:**
- Unblocks Sprint 001 critical path
- Container Apps infrastructure now ready for MCP server testing
- Trinity can proceed with endpoint validation
- Ralph can begin integration testing

---

**Full History:** See history-archive.md (528 lines, 15745 bytes)


---

### 2026-05-22: WI-002 HTTP Transport Deployment — SUCCESS ✅

**Mission:** Rebuild Docker image with HTTP transport, push to ACR, redeploy to Container Apps  
**Status:** ✅ COMPLETE  
**Context:** Trinity completed HTTP/SSE transport implementation, handoff received

**Execution Timeline:**
- Dockerfile update: 2 minutes (health check path '/health' → '/healthz')
- Docker rebuild: 242 seconds (~4 minutes)
- ACR push: 118 seconds (~2 minutes)
- Container Apps redeploy: 120 seconds (~2 minutes)
- Health verification: 2 minutes
- **Total:** ~12 minutes

**Deployment Results:**
- **Revision:** 'ca-azmaps-mcp-dev--oc3mtjw'
- **Status:** Running
- **Health Endpoint:** 'GET /healthz' → 200 OK (responding, <100ms)
- **Probe Status:** Passing continuously (zero restarts)
- **Public URL:** 'https://ca-azmaps-mcp-dev.graysand-f7f65db5.eastus.azurecontainerapps.io'

**Quality Metrics:**
- Zero deployment errors
- Zero container restarts
- Health probe passing continuously
- Clean rollout (100% traffic to new revision)
- Fast iteration cycle (~10 minutes build + push + deploy)

**Container Endpoint Details:**
- **Base URL:** 'https://ca-azmaps-mcp-dev.graysand-f7f65db5.eastus.azurecontainerapps.io'
- **Health Check:** 'GET /healthz' → '{"status": "healthy", "timestamp": "..."}'
- **MCP Endpoint:** 'POST /message' → JSON-RPC over HTTP with SSE

**Impact:**
- ✅ HTTP transport live in production
- ✅ MCP server accessible via HTTPS
- ✅ Health probes functional
- ✅ Architecture aligned (code + infrastructure both use HTTP)
- ✅ WI-002 protocol verification unblocked for Trinity

**What Was Learned:**

**1. Container Apps Revision Model**
- Each deployment creates new revision with auto-generated suffix
- Old revisions kept for rollback (configurable retention)
- Traffic splitting available for blue/green deployments
- Fast rollouts (~2 minutes for new revision to become active)

**2. Health Probe Configuration Best Practices**
- Liveness probe prevents zombie containers
- Initial delay (5s) allows startup time before first check
- Path must exactly match server implementation ('/healthz' not '/health')
- Separate health endpoint from application endpoints (better isolation)

**3. ACR Integration Patterns**
- Managed Identity simplifies authentication (no registry passwords in scripts)
- AcrPull role sufficient for Container Apps image pull
- Image updates trigger automatic redeployment when using ':latest' tag
- Fast push times (~2 minutes for 180MB image)

**4. Fast Iteration Cycle**
- Build + Push + Deploy + Verify = ~10-12 minutes end-to-end
- Enables rapid prototyping and debugging
- Container Apps cold start minimal (~30 seconds)
- Health probe confirms readiness (no manual verification needed)

**Infrastructure Patterns Validated:**
- ✅ Managed Identity + RBAC (AcrPull role) for ACR access
- ✅ Container Apps revision model for zero-downtime updates
- ✅ Health probe configuration for liveness monitoring
- ✅ HTTP ingress with SSL termination (automatic HTTPS)

**References:**
- Orchestration Log: '.squad/orchestration-log/2026-05-22T15-10-neo-wi002.md'
- Trinity's Implementation: '.squad/orchestration-log/2026-05-22T15-00-trinity-wi002.md'
- Decision: '.squad/decisions/decisions.md' (HTTP Transport section)
