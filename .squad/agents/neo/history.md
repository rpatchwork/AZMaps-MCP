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
