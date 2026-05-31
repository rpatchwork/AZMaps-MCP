# AZMaps-MCP Stable Infrastructure

## Overview

This directory contains **production-ready, tested infrastructure deployments** for the AZMaps-MCP project.

**Status:** ✅ Deployed and verified on 2026-05-22

**Resource Group:** `rg-azmaps-mcp-dev`  
**Azure Subscription:** `a235bb1a-6ca9-4949-91f0-c82ac40a4576`

---

## What's Included

### 1. Azure Container Registry (ACR)
**Directory:** [`1-acr/`](./1-acr/)  
**Deployment Name:** `acr-deployment`  
**Status:** ✅ Deployed Successfully

Provides secure Docker image hosting for the MCP server container.

**Outputs:**
- **ACR Name:** `azmapsmcp`
- **Login Server:** `azmapsmcp.azurecr.io`
- **Resource ID:** `/subscriptions/a235bb1a-6ca9-4949-91f0-c82ac40a4576/resourceGroups/rg-azmaps-mcp-dev/providers/Microsoft.ContainerRegistry/registries/azmapsmcp`

### 2. Azure Maps Gen2
**Directory:** [`2-maps/`](./2-maps/)  
**Deployment Name:** `maps-deployment`  
**Status:** ✅ Deployed Successfully

Provides geospatial services (geocoding, routing, POI search, static maps, timezone).

**Outputs:**
- **Account Name:** `azmapsmcp-maps-dev`
- **Endpoint:** `https://atlas.microsoft.com`
- **Resource ID:** `/subscriptions/a235bb1a-6ca9-4949-91f0-c82ac40a4576/resourceGroups/rg-azmaps-mcp-dev/providers/Microsoft.Maps/accounts/azmapsmcp-maps-dev`
- **API Key:** Stored securely in deployment outputs (use `az deployment group show` to retrieve)

---

## Quick Start

### Prerequisites
- Azure CLI installed (`az`)
- Bicep CLI (included with Azure CLI)
- Logged into Azure: `az login`
- Access to subscription `a235bb1a-6ca9-4949-91f0-c82ac40a4576`

### Deploy All Stable Infrastructure

```bash
# 1. Create resource group (if not exists)
az group create \
  --name rg-azmaps-mcp-dev \
  --location eastus

# 2. Deploy ACR
cd c:\temp\AZMaps-MCP\infra\stable\1-acr
az deployment group create \
  --resource-group rg-azmaps-mcp-dev \
  --template-file acr.bicep \
  --parameters acr.bicepparam \
  --name acr-deployment

# 3. Deploy Azure Maps
cd c:\temp\AZMaps-MCP\infra\stable\2-maps
az deployment group create \
  --resource-group rg-azmaps-mcp-dev \
  --template-file azure-maps.bicep \
  --parameters azure-maps.bicepparam \
  --name maps-deployment
```

### Retrieve Deployment Outputs

```bash
# Get ACR login server
az deployment group show \
  --resource-group rg-azmaps-mcp-dev \
  --name acr-deployment \
  --query properties.outputs.acrLoginServer.value -o tsv

# Get Maps endpoint
az deployment group show \
  --resource-group rg-azmaps-mcp-dev \
  --name maps-deployment \
  --query properties.outputs.mapsEndpoint.value -o tsv

# Get Maps API key (secure - don't commit!)
az deployment group show \
  --resource-group rg-azmaps-mcp-dev \
  --name maps-deployment \
  --query properties.outputs.mapsPrimaryKey.value -o tsv
```

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│         Azure Resource Group                        │
│         rg-azmaps-mcp-dev                          │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌──────────────────────┐                          │
│  │ Azure Container      │                          │
│  │ Registry (ACR)       │                          │
│  │                      │                          │
│  │ azmapsmcp.azurecr.io │                          │
│  │                      │                          │
│  │ Stores:              │                          │
│  │ - azmaps-mcp:latest  │                          │
│  │   (Docker image)     │                          │
│  └──────────────────────┘                          │
│                                                     │
│  ┌──────────────────────┐                          │
│  │ Azure Maps Gen2      │                          │
│  │                      │                          │
│  │ azmapsmcp-maps-dev   │                          │
│  │                      │                          │
│  │ Provides:            │                          │
│  │ - Geocoding API      │                          │
│  │ - Routing API        │                          │
│  │ - POI Search         │                          │
│  │ - Static Maps        │                          │
│  │ - Timezone API       │                          │
│  └──────────────────────┘                          │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## Security Considerations

### API Key Storage
⚠️ **Current State:** Maps API key is stored in deployment outputs (DEV environment)

**Production Recommendations:**
1. Store API key in Azure Key Vault
2. Use Managed Identity for authentication (when supported)
3. Rotate keys regularly
4. Enable access restrictions (IP allowlist, CORS)

### ACR Access
- **Authentication:** Azure RBAC (no admin user)
- **Role Required:** `AcrPush` (for pushing images) or `AcrPull` (for pulling)
- **Current Access:** Deployment uses system-assigned managed identity

---

## Cost Estimate

**Current Configuration:**

| Resource | SKU | Estimated Cost |
|----------|-----|----------------|
| Azure Container Registry | Basic | ~$5/month |
| Azure Maps Gen2 | Pay-as-you-go | ~$0-50/month (depends on API calls) |
| **Total** | | **~$5-55/month** |

*Estimate as of May 2026. Actual costs depend on usage.*

---

## Validation

### CI Deployment Status Gate

GitHub Actions now enforces a deployment status gate from `infra/stable/DEPLOYMENT_MANIFEST.md`.

- Gate source of truth: `Container Apps` row in the `Deployment Summary` table
- Blocked statuses: `Failed`, `Pending`
- CI behavior: dedicated `Deployment Manifest Gate` job fails loudly with an explicit reason

Local check command:

```bash
npm run check:deployment-manifest
```

### Verify ACR Deployment
```bash
az acr show --name azmapsmcp --resource-group rg-azmaps-mcp-dev
```

### Verify Maps Deployment
```bash
az maps account show \
  --name azmapsmcp-maps-dev \
  --resource-group rg-azmaps-mcp-dev
```

### Test Maps API
```bash
# Get API key
MAPS_KEY=$(az deployment group show \
  --resource-group rg-azmaps-mcp-dev \
  --name maps-deployment \
  --query properties.outputs.mapsPrimaryKey.value -o tsv)

# Test geocoding endpoint
curl "https://atlas.microsoft.com/search/address/json?api-version=1.0&subscription-key=$MAPS_KEY&query=Microsoft+Building+25+Redmond+WA"
```

---

## Next Steps

### Docker Image Management
1. Build MCP server Docker image
2. Login to ACR: `az acr login --name azmapsmcp`
3. Tag image: `docker tag azmaps-mcp:v1 azmapsmcp.azurecr.io/azmaps-mcp:latest`
4. Push to ACR: `docker push azmapsmcp.azurecr.io/azmaps-mcp:latest`

### Container Deployment (Future)
Container Apps deployment is in progress. See [`../archive/deploy-3-container-apps-FAILED/`](../archive/deploy-3-container-apps-FAILED/) for WIP.

---

## Troubleshooting

### ACR Login Issues
```bash
# Ensure you have AcrPush role
az role assignment create \
  --role AcrPush \
  --assignee $(az ad signed-in-user show --query id -o tsv) \
  --scope $(az acr show --name azmapsmcp --query id -o tsv)
```

### Maps API Key Not Found
```bash
# Keys are SecureString - must query from deployment outputs
az deployment group show \
  --resource-group rg-azmaps-mcp-dev \
  --name maps-deployment \
  --query properties.outputs.mapsPrimaryKey.value -o tsv
```

---

## Maintenance

### Updating Deployments
To update infrastructure, modify the Bicep files and redeploy:

```bash
# Update ACR configuration
cd c:\temp\AZMaps-MCP\infra\stable\1-acr
# Edit acr.bicepparam as needed
az deployment group create \
  --resource-group rg-azmaps-mcp-dev \
  --template-file acr.bicep \
  --parameters acr.bicepparam \
  --name acr-deployment
```

### Cleanup (if needed)
```bash
# Delete entire resource group (CAUTION!)
az group delete --name rg-azmaps-mcp-dev --yes --no-wait
```

---

## Related Documentation

- [ACR Deployment Details](./1-acr/README.md)
- [Azure Maps Deployment Details](./2-maps/README.md)
- [Main Infrastructure Overview](../README.md)
- [Archived Deployments](../archive/)

---

**Last Updated:** 2026-05-22  
**Deployed By:** AZMaps-MCP Squad  
**Maintained By:** Brady, Neo, Ralph, Trinity, Scribe
