# AZMaps-MCP Deployment Manifest

**Version:** 1.0.2  
**Date:** 2026-05-31  
**Status:** STABLE - Production Ready (Immutable Runtime Verified)

---

## Deployment Summary

| Component | Status | Deployment Name | Resource ID |
|-----------|--------|----------------|-------------|
| Azure Container Registry | ✅ Deployed | `acr-deployment` | `/subscriptions/a235bb1a-6ca9-4949-91f0-c82ac40a4576/resourceGroups/rg-azmaps-mcp-dev/providers/Microsoft.ContainerRegistry/registries/azmapsmcp` |
| Azure Maps Gen2 | ✅ Deployed | `maps-deployment` | `/subscriptions/a235bb1a-6ca9-4949-91f0-c82ac40a4576/resourceGroups/rg-azmaps-mcp-dev/providers/Microsoft.Maps/accounts/azmapsmcp-maps-dev` |
| Container Apps | ✅ Deployed (active runtime, immutable image) | `revision ca-azmaps-mcp-dev--0000007` | `/subscriptions/a235bb1a-6ca9-4949-91f0-c82ac40a4576/resourceGroups/rg-azmaps-mcp-dev/providers/Microsoft.App/containerApps/ca-azmaps-mcp-dev` |

---

## Infrastructure Details

### Azure Container Registry

**Deployment Directory:** `stable/1-acr/`

**Configuration:**
```yaml
Name: azmapsmcp
SKU: Basic
Location: eastus
Admin User: Disabled (RBAC-based auth)
Public Access: Enabled
```

**Outputs:**
- **acrName:** `azmapsmcp`
- **acrLoginServer:** `azmapsmcp.azurecr.io`
- **acrId:** `/subscriptions/a235bb1a-6ca9-4949-91f0-c82ac40a4576/resourceGroups/rg-azmaps-mcp-dev/providers/Microsoft.ContainerRegistry/registries/azmapsmcp`

**Deployment Command:**
```bash
az deployment group create \
  --resource-group rg-azmaps-mcp-dev \
  --template-file acr.bicep \
  --parameters acr.bicepparam \
  --name acr-deployment
```

**Deployment Timestamp:** 2026-05-22 (estimated from terminal history)

---

### Azure Maps Gen2

**Deployment Directory:** `stable/2-maps/`

**Configuration:**
```yaml
Name: azmapsmcp-maps-dev
SKU: G2 (Gen2 - Pay-as-you-go)
Location: eastus
Kind: Gen2
```

**Outputs:**
- **mapsAccountName:** `azmapsmcp-maps-dev`
- **mapsEndpoint:** `https://atlas.microsoft.com`
- **mapsAccountId:** `/subscriptions/a235bb1a-6ca9-4949-91f0-c82ac40a4576/resourceGroups/rg-azmaps-mcp-dev/providers/Microsoft.Maps/accounts/azmapsmcp-maps-dev`
- **mapsPrimaryKey:** `[SECURE - Use az deployment group show to retrieve]`

**Deployment Command:**
```bash
az deployment group create \
  --resource-group rg-azmaps-mcp-dev \
  --template-file azure-maps.bicep \
  --parameters azure-maps.bicepparam \
  --name maps-deployment
```

**Deployment Timestamp:** 2026-05-22 (verified from terminal history)

---

## Deployment Dependencies

```
┌───────────────────┐
│ Resource Group    │
│ rg-azmaps-mcp-dev │
└─────────┬─────────┘
          │
          ├──────────────────────┐
          │                      │
┌─────────▼────────┐   ┌─────────▼─────────┐
│ ACR Deployment   │   │ Maps Deployment   │
│ (Independent)    │   │ (Independent)     │
└──────────────────┘   └───────────────────┘
```

**Note:** Both deployments are independent and can be executed in parallel.

---

## Sensitive Data Storage

### Secrets Location

| Secret | Storage Location | Retrieval Method |
|--------|-----------------|------------------|
| Maps API Key | Azure Deployment Outputs | `az deployment group show --name maps-deployment --query properties.outputs.mapsPrimaryKey.value` |
| ACR Admin Password | N/A | Not used (RBAC authentication) |

### Security Recommendations

1. **DO NOT** commit API keys to Git
2. Store production keys in Azure Key Vault
3. Rotate Maps API keys every 90 days
4. Use Managed Identity when possible (Container Apps future work)

---

## Docker Image Artifacts

### Published Images

| Image | Tag | Registry Location | Build Date |
|-------|-----|------------------|------------|
| azmaps-mcp | latest | azmapsmcp.azurecr.io/azmaps-mcp:latest | 2026-05-22 |
| azmaps-mcp | commit-619c4ec11226 | azmapsmcp.azurecr.io/azmaps-mcp:commit-619c4ec11226 | 2026-05-31 |
| azmaps-mcp | v1 | Local tag only | 2026-05-22 |

### Active Runtime Image Provenance

- Source commit: `619c4ec1122601784f750ca24a33dfaf5ec84c50`
- Commit-linked tag: `azmapsmcp.azurecr.io/azmaps-mcp:commit-619c4ec11226`
- Immutable digest: `sha256:023a7a67bb5a165fe4a6266875b12bda9246e63140e4eca2a21cc4b2b5b8d710`
- Active deployed image: `azmapsmcp.azurecr.io/azmaps-mcp@sha256:023a7a67bb5a165fe4a6266875b12bda9246e63140e4eca2a21cc4b2b5b8d710`
- Active revision: `ca-azmaps-mcp-dev--0000007`

### Image Push History
```bash
# Commands used
docker build -t azmaps-mcp:v1 .
docker tag azmaps-mcp:v1 azmapsmcp.azurecr.io/azmaps-mcp:latest
docker push azmapsmcp.azurecr.io/azmaps-mcp:latest
```

---

## Validation Results

### ACR Validation
✅ **PASSED** - ACR deployed successfully  
✅ **PASSED** - RBAC authentication configured  
✅ **PASSED** - Docker image pushed successfully

### Maps Validation
✅ **PASSED** - Azure Maps account created  
✅ **PASSED** - API key generated  
✅ **PASSED** - Geocoding API endpoint accessible

---

## Known Issues & Limitations

### Legacy Container App Remediation Blocker
**Status:** ⚠️ Partially blocked  
**Location:** `archive/deploy-3-container-apps-FAILED/`

**Issue:** `azmapsmcp-mcp-dev` remediation deployment is blocked by an in-flight operation:
`ContainerAppOperationInProgress` (operation id: `ed1e4390-9a16-487b-a9f0-e7c24d668877`).

**Current Runtime State:**
1. Active endpoint `ca-azmaps-mcp-dev.graysand-f7f65db5.eastus.azurecontainerapps.io` is healthy
2. MCP smoke check passed (`tools/list` and `maps_get_timezone`)
3. Legacy app `azmapsmcp-mcp-dev` remains non-authoritative and returns HTTP 404 for MCP routes

**Next Steps:**
1. Wait for active provisioning operation to complete on `azmapsmcp-mcp-dev`
2. Re-run remediation deployment for legacy app only if still required
3. Keep integration verification pinned to active app `ca-azmaps-mcp-dev`

---

## Rollback Procedures

### Rollback ACR
```bash
az deployment group delete \
  --resource-group rg-azmaps-mcp-dev \
  --name acr-deployment

az acr delete --name azmapsmcp --yes --no-wait
```

### Rollback Azure Maps
```bash
az deployment group delete \
  --resource-group rg-azmaps-mcp-dev \
  --name maps-deployment

az maps account delete \
  --name azmapsmcp-maps-dev \
  --resource-group rg-azmaps-mcp-dev \
  --yes
```

---

## Change Log

### v1.0.0 - 2026-05-22
- ✅ Initial deployment of ACR
- ✅ Initial deployment of Azure Maps Gen2
- ✅ Docker image built and pushed to ACR
- ⏸️ Container Apps deployment postponed

### v1.0.1 - 2026-05-31
- ✅ Confirmed active Azure Container App runtime at `ca-azmaps-mcp-dev`
- ✅ Verified MCP health and smoke checks against live FQDN
- ⚠️ Documented remediation blocker on legacy app `azmapsmcp-mcp-dev` (`ContainerAppOperationInProgress`)

### v1.0.2 - 2026-05-31
- ✅ Built and pushed commit-linked image `azmaps-mcp:commit-619c4ec11226` to ACR
- ✅ Deployed immutable digest `sha256:023a7a67bb5a165fe4a6266875b12bda9246e63140e4eca2a21cc4b2b5b8d710` to `ca-azmaps-mcp-dev`
- ✅ Active revision moved to `ca-azmaps-mcp-dev--0000007` and reported healthy
- ✅ Labeled-pin static map smoke check passed on active runtime

---

## Approval & Sign-off

**Infrastructure Lead:** Neo (Infrastructure Specialist)  
**Deployment Lead:** Brady (Squad Lead)  
**Validation:** Ralph (Work Monitor)  
**Documentation:** Scribe (Documentation Specialist)  

**Approval Status:** ✅ Approved for stable use

---

## Contact & Support

**Project Repository:** `c:\temp\AZMaps-MCP`  
**Subscription ID:** `a235bb1a-6ca9-4949-91f0-c82ac40a4576`  
**Resource Group:** `rg-azmaps-mcp-dev`

For questions or issues, reference:
- [Stable Infrastructure README](./README.md)
- [ACR Documentation](./1-acr/README.md)
- [Maps Documentation](./2-maps/README.md)
