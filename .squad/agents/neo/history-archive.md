# Neo — History Archive

**Archived on:** 2026-05-21T00:00:00Z  
**Reason:** History file exceeded 15KB threshold (15.37 KB)  
**Original size:** 528 lines, 15745 bytes

---

## 2026-05-21: V1 Infrastructure Build Complete

**Task:** Build Azure infrastructure (Bicep) for AZMaps-MCP V1 primitives  
**Status:** ✅ Complete  
**Authority:** rpatchwork directive after AD-003 locked

### Deliverables Created

1. **`/infra/modules/azure-maps.bicep`** — Azure Maps Gen2 account module
   - SKU: G2 (only supported tier)
   - Public endpoint (no VNet in V1)
   - Outputs: accountId, accountName, endpoint, primaryKey (secure)
   - Fixed: Removed read-only `tier` property from SKU definition

2. **`/infra/modules/container-apps.bicep`** — Container Apps environment + MCP server app
   - Log Analytics workspace for observability
   - Container Apps environment (public ingress)
   - Container App with placeholder image (Trinity will replace)
   - Always-warm: minReplicas=1 (per deployment decision)
   - HTTP scaling rule: 10 concurrent requests threshold
   - Environment variables: AZURE_MAPS_ENDPOINT, AZURE_MAPS_API_KEY, NODE_ENV, PORT
   - API key stored as secret (Managed Identity deferred to V2)

3. **`/infra/main.bicep`** — Main deployment template
   - Orchestrates Maps + Container Apps modules
   - Resource naming: `${projectName}-{maps|env|mcp}-${environment}`
   - Comprehensive output instructions for next steps
   - Tags: project, environment, managedBy

4. **`/infra/main.bicepparam`** — Default parameters (dev environment)

5. **`/infra/README.md`** — Complete deployment documentation (prerequisites, quick start, troubleshooting)

6. **`/.gitignore`** — Updated with security entries (`.env.local`, `*.key`, `*.bicep.json`)

### Validation

✅ Bicep build successful (`az bicep build --file main.bicep`)  
✅ No errors or warnings  
✅ All parameters have descriptions  
✅ Outputs designed for Trinity's integration  
✅ No secrets in git-tracked files

### Security Posture
- API keys managed as Container Apps secrets (not environment variables)
- No hardcoded credentials in Bicep templates
- Secure parameter type for sensitive values
- `.gitignore` prevents secret leakage

### Handoff Notes

Infrastructure ready for Trinity (Docker build) and Ralph (integration testing).

**Next actions:**
1. Trinity: Build Docker image with MCP server
2. Ralph: Create `docker-compose.yml` for local testing
3. Trinity: Push image to ACR → `azmapsmcp.azurecr.io`
4. Deploy Container Apps with Trinity's image

---

## 2026-05-21: Azure Infrastructure Deployment - 3-Stage Rollout

**Task:** Deploy Azure infrastructure in 3 independent stages  
**Status:** 🟡 Stage 3 In Progress  
**Authority:** rpatchwork directive - modular deployment strategy

### Deployment Architecture

Created **3 self-contained deployment packages** in `/infra/`:

1. **`deploy-1-acr/`** — Azure Container Registry (ACR)
2. **`deploy-2-maps/`** — Azure Maps Gen2 Account  
3. **`deploy-3-container-apps/`** — Container Apps Environment + MCP Server App

Each stage has:
- Bicep template (`*.bicep`)
- Parameters file (`*.bicepparam`)
- Deployment guide (`README.md`)

**Master guide:** `/infra/README.md` — Comprehensive deployment documentation with architecture diagrams

---

## DEPLOYMENT STATUS REPORT
**Timestamp:** 2026-05-21T14:05:00Z  
**Resource Group:** `rg-azmaps-mcp-dev`  
**Region:** East US

### Deployment 1: Azure Container Registry
**Status:** ✅ Deployed Successfully

| Property | Value |
|----------|-------|
| **ACR Name** | `azmapsmcp` |
| **Login Server** | `azmapsmcp.azurecr.io` |
| **SKU** | Standard |
| **Admin Enabled** | Yes (required for Container Apps pull) |
| **Resource ID** | `/subscriptions/a235bb1a-6ca9-4949-91f0-c82ac40a4576/resourceGroups/rg-azmaps-mcp-dev/providers/Microsoft.ContainerRegistry/registries/azmapsmcp` |
| **Deployment Time** | 2026-05-21T13:39:04Z |
| **Images Pushed** | `azmaps-mcp:latest` ✅ |

**Actions Completed:**
- ✅ ACR deployed via Bicep
- ✅ Docker image built locally
- ✅ Image tagged: `azmapsmcp.azurecr.io/azmaps-mcp:latest`
- ✅ Image pushed to registry

---

### Deployment 2: Azure Maps
**Status:** ✅ Deployed Successfully

| Property | Value |
|----------|-------|
| **Account Name** | `azmapsmcp-maps-dev` |
| **Kind** | Gen2 |
| **SKU** | G2 (only supported tier for Gen2) |
| **Location** | East US |
| **Provisioning State** | Succeeded |
| **Unique ID** | `61dc8559-4b7e-49c2-afa4-ad6c6b877081` |
| **Primary API Key** | `Fl8FZB8h...` (64 chars) ✅ |
| **Deployment Time** | 2026-05-21T13:41:19Z |

**Endpoint:** Available via Azure SDK (no public REST endpoint for Gen2)

**Actions Completed:**
- ✅ Azure Maps Gen2 account deployed
- ✅ API keys generated
- ✅ Account accessible for geocoding, routing, search APIs

---

### Deployment 3: Container Apps
**Status:** ⏳ Deployment In Progress

| Property | Value |
|----------|-------|
| **Container App Name** | `azmapsmcp-mcp-dev` |
| **FQDN** | `azmapsmcp-mcp-dev.agreeablepond-17747d7c.eastus.azurecontainerapps.io` |
| **Environment** | `azmapsmcp-env-dev` |
| **Log Analytics** | `azmapsmcp-env-dev-logs` |
| **Provisioning State** | InProgress ⏳ |
| **Running Status** | Running 🟢 |
| **Latest Revision** | `null` (initial deployment) |
| **Image Source** | `azmapsmcp.azurecr.io/azmaps-mcp:latest` |
| **Deployment Started** | 2026-05-21T14:01:44Z |

**Resources Created:**
- ✅ Log Analytics Workspace: `azmapsmcp-env-dev-logs`
- ✅ Container Apps Environment: `azmapsmcp-env-dev`
- ⏳ Container App: `azmapsmcp-mcp-dev` (provisioning)

**Current State:**
- The Container App is **running** but the deployment is still **provisioning**
- This is normal behavior - the app becomes available before deployment finalizes
- Expected completion: ~2-5 minutes

**Container Configuration:**
```yaml
Image: azmapsmcp.azurecr.io/azmaps-mcp:latest
Replicas: 1-3 (CPU scaling, 75% threshold)
CPU: 0.25 cores
Memory: 0.5 GB
Ingress: External, HTTP/HTTPS
Port: 8080
```

**Environment Variables Configured:**
- `AZURE_MAPS_ENDPOINT` → Azure Maps SDK endpoint
- `AZURE_MAPS_API_KEY` → Securely stored (secret reference)
- `NODE_ENV` → `production`
- `PORT` → `8080`

---

## Files Created

### `/infra/deploy-1-acr/`
- ✅ `acr.bicep` — ACR module with Standard SKU
- ✅ `acr.bicepparam` — Parameters for dev environment
- ✅ `README.md` — ACR deployment guide

### `/infra/deploy-2-maps/`
- ✅ `azure-maps.bicep` — Azure Maps Gen2 module
- ✅ `azure-maps.bicepparam` — Maps configuration
- ✅ `README.md` — Maps deployment guide

### `/infra/deploy-3-container-apps/`
- ✅ `container-apps.bicep` — Container Apps environment + app
- ✅ `container-apps.bicepparam` — Container Apps config
- ✅ `README.md` — Container Apps deployment guide

### `/infra/` (Root)
- ✅ `README.md` — **Master deployment guide** with:
  - Architecture diagram
  - 3-stage deployment sequence
  - Prerequisites checklist
  - Quick start commands
  - Troubleshooting guide
  - Post-deployment verification

---

## 2026-05-21: Azure Maps Gen2 Deployment Verification

**Task:** Verify Azure Maps is Gen2 (not deprecated Gen1)  
**Status:** ✅ Verified - Gen2 Compliant  
**Authority:** Brady directive after deployment issues

### Verification Results

**Deployed Resource:**
- Account: `azmapsmcp-maps-dev`
- Kind: **Gen2** ✅
- SKU: **G2** ✅
- Status: Provisioned successfully

**Infrastructure Code Audit:**
- ✅ `infra/modules/azure-maps.bicep` uses `@allowed(['G2'])` decorator
- ✅ `kind: 'Gen2'` explicitly set in resource definition
- ✅ No S0/S1 (Gen1) SKU references anywhere in codebase
- ✅ Workspace-wide scan confirmed zero Gen1 references

### Gen2 Safety Pattern

**Enforcement Mechanism:**
```bicep
@allowed(['G2'])
param sku string = 'G2'
```

This Bicep decorator provides compile-time protection against accidental Gen1 deployment.

**Why This Matters:**
- Gen1 APIs (S0/S1 SKUs) are deprecated for new accounts
- Gen2 is the only supported tier for modern Azure Maps features
- Our infrastructure was correctly built with Gen2 from inception

### Deliverable

**File:** `.squad/decisions/inbox/neo-gen2-verification.md`

Comprehensive verification report documenting:
- Deployed configuration (JSON output from Azure)
- Infrastructure code audit results
- Gen1 vs Gen2 comparison table
- Compliance statement
- No remediation required

### Knowledge Captured

**Gen2 Verification Pattern:**
1. Check deployed resource: `az maps account show --query "{sku:sku, kind:kind}"`
2. Audit infrastructure: Search for `S0|S1|Gen1` across Bicep files
3. Verify safety: Confirm `@allowed(['G2'])` decorator in templates
4. Document compliance: Report findings with evidence

**Gen2 Requirements:**
- SKU: G2 (only valid option for Gen2)
- Kind: Gen2 (explicit property)
- Never use: S0, S1 (Gen1 deprecated SKUs)

**Best Practice:**
Use Bicep `@allowed` decorator to enforce Gen2-only deployments at compile time.

---

## Infrastructure Summary

| Component | Name | Status | Endpoint/Value |
|-----------|------|--------|----------------|
| **Resource Group** | `rg-azmaps-mcp-dev` | ✅ Active | East US |
| **Container Registry** | `azmapsmcp` | ✅ Deployed | `azmapsmcp.azurecr.io` |
| **Azure Maps** | `azmapsmcp-maps-dev` | ✅ Deployed | Gen2 API (SDK access) |
| **Log Analytics** | `azmapsmcp-env-dev-logs` | ✅ Deployed | Metrics & logs backend |
| **Container Environment** | `azmapsmcp-env-dev` | ✅ Deployed | Public ingress enabled |
| **Container App** | `azmapsmcp-mcp-dev` | ⏳ Provisioning | `azmapsmcp-mcp-dev.agreeablepond-17747d7c.eastus.azurecontainerapps.io` |

---

## Deployment Timeline

| Stage | Start | End | Duration | Status |
|-------|-------|-----|----------|--------|
| **ACR** | 13:38 | 13:39 | ~1 min | ✅ Succeeded |
| **Azure Maps** | 13:40 | 13:41 | ~1 min | ✅ Succeeded |
| **Docker Build** | 13:45 | 13:52 | ~7 min | ✅ Complete |
| **Docker Push** | 13:52 | 13:55 | ~3 min | ✅ Complete |
| **Container Apps** | 14:01 | TBD | ~5 min (est) | ⏳ In Progress |

**Total deployment time (so far):** ~27 minutes  
**Estimated completion:** 2026-05-21T14:06:00Z

---

## Security Posture

🔐 **Current (V1 - DEV):**
- API key authentication (Maps primaryKey output marked @secure)
- API key passed to Container App via secrets (not plain env vars)
- `.env` files excluded from git

⚠️ **Deferred to V2 (per AD-003):**
- Managed Identity authentication
- Azure Key Vault integration
- VNet integration and private endpoints

---

## Architectural Decisions Applied

- **AD-001:** Bicep over Terraform ✅
- **AD-002:** Node.js/TypeScript target ✅
- **AD-003:** V1 primitives scope (API key auth, public endpoints) ✅
