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

**Full History:** See history-archive.md (528 lines, 15745 bytes)
