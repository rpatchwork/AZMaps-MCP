# Archived Infrastructure Deployments

This directory contains infrastructure deployments that are **not currently in production** but are preserved for reference or future work.

---

## deploy-3-container-apps-FAILED

**Status:** ❌ Failed Deployment  
**Date Archived:** 2026-05-22  
**Reason:** Container Apps deployment encountered errors during provisioning

### What This Contains

This directory contains the work-in-progress (WIP) Container Apps deployment that was attempted but failed. It includes:
- Bicep templates for Azure Container Apps Environment
- Container App definition with MCP server configuration
- Deployment parameters
- Original README with deployment instructions

### Issue Summary

The Container Apps deployment failed during execution. The deployment attempted to:
1. Create a Container Apps Environment
2. Create a Log Analytics workspace for diagnostics
3. Deploy the MCP server container from ACR
4. Configure environment variables for Azure Maps integration

### Why It's Archived

This deployment is moved to archive because:
- It blocks the stable infrastructure organization
- The underlying dependencies (ACR, Maps) are successfully deployed
- The Container Apps work needs debugging before it can be production-ready
- Preserving it allows future work without cluttering the stable directory

### Future Work

To resume Container Apps deployment:
1. Review the Bicep template for errors
2. Verify RBAC permissions for ACR pull access
3. Check Container Apps Environment configuration
4. Ensure Log Analytics workspace provisioning works correctly
5. Test with updated parameters

### Files Preserved

```
deploy-3-container-apps-FAILED/
├── container-apps.bicep          # Bicep template
├── container-apps.bicepparam     # Parameters file
└── README.md                      # Original deployment instructions
```

### Related Stable Components

This deployment depends on:
- ✅ **ACR:** `azmapsmcp.azurecr.io` (stable/1-acr/)
- ✅ **Azure Maps:** `azmapsmcp-maps-dev` (stable/2-maps/)

---

## Restoration Procedure

If you want to retry the Container Apps deployment:

```bash
# Navigate to the archived deployment
cd c:\temp\AZMaps-MCP\infra\archive\deploy-3-container-apps-FAILED

# Review and fix any issues in the Bicep files
# Update container-apps.bicep and container-apps.bicepparam as needed

# Retrieve stable deployment outputs
$ACR_LOGIN_SERVER = az deployment group show `
    --resource-group rg-azmaps-mcp-dev `
    --name acr-deployment `
    --query properties.outputs.acrLoginServer.value -o tsv

$MAPS_ENDPOINT = az deployment group show `
    --resource-group rg-azmaps-mcp-dev `
    --name maps-deployment `
    --query properties.outputs.mapsEndpoint.value -o tsv

$MAPS_API_KEY = az deployment group show `
    --resource-group rg-azmaps-mcp-dev `
    --name maps-deployment `
    --query properties.outputs.mapsPrimaryKey.value -o tsv

# Attempt deployment with fixes
az deployment group create `
    --resource-group rg-azmaps-mcp-dev `
    --template-file container-apps.bicep `
    --parameters container-apps.bicepparam `
    --parameters containerImage="$ACR_LOGIN_SERVER/azmaps-mcp:latest" `
    --parameters acrLoginServer="$ACR_LOGIN_SERVER" `
    --parameters mapsEndpoint="$MAPS_ENDPOINT" `
    --parameters mapsApiKey="$MAPS_API_KEY" `
    --name containerapp-deployment
```

---

## Archive Policy

**Retention:** Indefinite - preserved for reference and future work  
**Review Cycle:** None required unless Container Apps deployment is prioritized

---

**Archived By:** Ralph (Work Monitor)  
**Approved By:** Brady (Squad Lead)
