# AZMaps-MCP Infrastructure Deployment Guide

## ⚡ Quick Start - Use Stable Infrastructure

**For production-ready deployments, use the [`stable/`](./stable/) directory:**

```bash
cd c:\temp\AZMaps-MCP\infra\stable
.\deploy-all.ps1
```

📖 **[View Stable Infrastructure Documentation →](./stable/README.md)**

---

## Directory Structure

```
infra/
├── stable/                     ✅ Production-ready deployments
│   ├── 1-acr/                  ✅ Azure Container Registry
│   ├── 2-maps/                 ✅ Azure Maps Gen2
│   ├── deploy-all.ps1          🚀 Automated deployment script
│   ├── README.md               📖 Comprehensive documentation
│   ├── DEPLOYMENT_MANIFEST.md  📋 Deployment details and outputs
│   └── OUTPUTS.md              🔑 Resource IDs, endpoints, API keys
│
├── archive/                    📦 Preserved work-in-progress
│   └── deploy-3-container-apps-FAILED/  ⏸️ For future work
│
├── deploy-1-acr/               (Original - use stable/ instead)
├── deploy-2-maps/              (Original - use stable/ instead)
├── modules/                    Bicep modules (referenced by main.bicep)
├── main.bicep                  Composite deployment (not yet tested)
└── main.bicepparam             Parameters for composite deployment
```

**Recommendation:** Use [`stable/`](./stable/) for all deployments. The original `deploy-*` directories are kept for reference.

---

## Overview

This directory contains **infrastructure deployments** for the AZMaps-MCP project:

1. **Azure Container Registry (ACR)** — Host Docker images ✅
2. **Azure Maps Gen2** — Geospatial services API ✅
3. **Azure Container Apps** — MCP server runtime ⏸️ (pending fixes)

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Azure Resource Group                     │
│                   rg-azmaps-mcp-dev                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌────────────────┐      ┌────────────────┐               │
│  │ Azure Container│      │  Azure Maps    │               │
│  │   Registry     │      │  Gen2 Account  │               │
│  │  (Stage 1)     │      │  (Stage 2)     │               │
│  └────────┬───────┘      └───────┬────────┘               │
│           │                      │                         │
│           │ Pull Image           │ API Key                 │
│           │                      │                         │
│  ┌────────▼──────────────────────▼─────────────┐          │
│  │    Container Apps Environment               │          │
│  │                                              │          │
│  │  ┌─────────────────────────────────────┐    │          │
│  │  │   MCP Server Container App          │    │          │
│  │  │   - Node.js/TypeScript Runtime      │    │          │
│  │  │   - Auto-scaling (1-3 replicas)     │    │          │
│  │  │   - System-Assigned Identity        │    │          │
│  │  └─────────────────────────────────────┘    │          │
│  │              (Stage 3)                       │          │
│  └──────────────────────────────────────────────┘          │
│                                                             │
│  ┌─────────────────────────────────────────────┐           │
│  │    Log Analytics Workspace                  │           │
│  │    - Application Logs                       │           │
│  │    - Metrics & Diagnostics                  │           │
│  └─────────────────────────────────────────────┘           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Prerequisites

### Tools Required
- **Azure CLI** (`az`) — [Install](https://learn.microsoft.com/cli/azure/install-azure-cli)
- **Bicep CLI** — Included with Azure CLI
- **Docker Desktop** — [Install](https://www.docker.com/products/docker-desktop/)

### Azure Prerequisites
- Active Azure subscription
- Contributor or Owner role on the subscription
- Resource group created: `rg-azmaps-mcp-dev`

### Create Resource Group

```bash
az group create \
  --name rg-azmaps-mcp-dev \
  --location eastus
```

## Deployment Sequence

### Stage 1: Azure Container Registry

Deploy ACR to host Docker images.

```bash
cd c:\temp\AZMaps-MCP\infra\deploy-1-acr

az deployment group create \
  --resource-group rg-azmaps-mcp-dev \
  --template-file acr.bicep \
  --parameters acr.bicepparam \
  --name acr-deployment

# Capture output
ACR_LOGIN_SERVER=$(az deployment group show \
  --resource-group rg-azmaps-mcp-dev \
  --name acr-deployment \
  --query properties.outputs.acrLoginServer.value -o tsv)

echo "✅ ACR deployed: $ACR_LOGIN_SERVER"
```

**Expected output:** `azmapsmcp.azurecr.io`

📖 [Detailed instructions](./deploy-1-acr/README.md)

---

### Stage 2: Azure Maps

Deploy Azure Maps Gen2 account.

```bash
cd c:\temp\AZMaps-MCP\infra\deploy-2-maps

az deployment group create \
  --resource-group rg-azmaps-mcp-dev \
  --template-file azure-maps.bicep \
  --parameters azure-maps.bicepparam \
  --name maps-deployment

# Capture outputs
MAPS_ENDPOINT=$(az deployment group show \
  --resource-group rg-azmaps-mcp-dev \
  --name maps-deployment \
  --query properties.outputs.mapsEndpoint.value -o tsv)

MAPS_API_KEY=$(az deployment group show \
  --resource-group rg-azmaps-mcp-dev \
  --name maps-deployment \
  --query properties.outputs.mapsPrimaryKey.value -o tsv)

echo "✅ Azure Maps deployed"
echo "   Endpoint: $MAPS_ENDPOINT"
echo "   API Key: [REDACTED]"
```

⚠️ **Security:** Store `MAPS_API_KEY` securely. Do not commit to git.

📖 [Detailed instructions](./deploy-2-maps/README.md)

---

### Stage 3: Build and Push Docker Image

Build the MCP server Docker image and push to ACR.

```bash
# Navigate to repo root
cd c:\temp\AZMaps-MCP

# Build Docker image
docker build -t azmaps-mcp:v1 .

# Login to ACR (RBAC authentication)
az acr login --name azmapsmcp

# Tag and push
docker tag azmaps-mcp:v1 $ACR_LOGIN_SERVER/azmaps-mcp:latest
docker push $ACR_LOGIN_SERVER/azmaps-mcp:latest

echo "✅ Docker image pushed to ACR"
```

---

### Stage 4: Azure Container Apps

Deploy Container Apps environment and MCP server.

```bash
cd c:\temp\AZMaps-MCP\infra\deploy-3-container-apps

az deployment group create \
  --resource-group rg-azmaps-mcp-dev \
  --template-file container-apps.bicep \
  --parameters container-apps.bicepparam \
  --parameters containerImage="$ACR_LOGIN_SERVER/azmaps-mcp:latest" \
  --parameters acrLoginServer="$ACR_LOGIN_SERVER" \
  --parameters mapsEndpoint="$MAPS_ENDPOINT" \
  --parameters mapsApiKey="$MAPS_API_KEY" \
  --name containerapp-deployment

# Capture FQDN
CONTAINER_APP_FQDN=$(az deployment group show \
  --resource-group rg-azmaps-mcp-dev \
  --name containerapp-deployment \
  --query properties.outputs.containerAppFqdn.value -o tsv)

echo "✅ Container App deployed"
echo "   URL: https://$CONTAINER_APP_FQDN"
```

📖 [Detailed instructions](./deploy-3-container-apps/README.md)

---

## Verification

### Check Deployment Status

```bash
# ACR status
az acr show --name azmapsmcp --query provisioningState -o tsv

# Azure Maps status
az maps account show \
  --name azmapsmcp-maps-dev \
  --resource-group rg-azmaps-mcp-dev \
  --query provisioningState -o tsv

# Container App status
az containerapp show \
  --name azmapsmcp-mcp-dev \
  --resource-group rg-azmaps-mcp-dev \
  --query properties.runningStatus -o tsv
```

### Test MCP Server

```bash
# Health endpoint
curl https://$CONTAINER_APP_FQDN/health

# Expected response: {"status":"healthy","timestamp":"..."}
```

### View Logs

```bash
az containerapp logs show \
  --name azmapsmcp-mcp-dev \
  --resource-group rg-azmaps-mcp-dev \
  --follow
```

---

## Resource Naming Convention

| Resource Type | Naming Pattern | Example |
|---------------|----------------|---------|
| Resource Group | `rg-{project}-{env}` | `rg-azmaps-mcp-dev` |
| Container Registry | `{project}` | `azmapsmcp` |
| Azure Maps | `{project}-maps-{env}` | `azmapsmcp-maps-dev` |
| Container App Env | `{project}-env-{env}` | `azmapsmcp-env-dev` |
| Container App | `{project}-mcp-{env}` | `azmapsmcp-mcp-dev` |
| Log Analytics | `{env-name}-logs` | `azmapsmcp-env-dev-logs` |

---

## Cost Estimates (East US, Dev Tier)

| Resource | SKU | Monthly Cost (USD) |
|----------|-----|-------------------|
| Azure Container Registry | Basic | ~$5 |
| Azure Maps Gen2 | Pay-as-you-go | Variable (~$0-50) |
| Container Apps | Consumption | ~$0-20 (1-3 replicas) |
| Log Analytics | PerGB2018 | ~$0-10 (30-day retention) |
| **TOTAL** | | **~$5-85/month** |

💡 Actual costs depend on usage. Monitor with Azure Cost Management.

---

## Troubleshooting

### ACR Login Issues

If `az acr login` fails:

```bash
# Grant yourself AcrPush role
az role assignment create \
  --role AcrPush \
  --assignee $(az ad signed-in-user show --query id -o tsv) \
  --scope $(az acr show --name azmapsmcp --query id -o tsv)
```

### Container App Image Pull Errors

Verify the managed identity has AcrPull role:

```bash
PRINCIPAL_ID=$(az deployment group show \
  --resource-group rg-azmaps-mcp-dev \
  --name containerapp-deployment \
  --query properties.outputs.containerAppPrincipalId.value -o tsv)

az role assignment list \
  --assignee $PRINCIPAL_ID \
  --scope $(az acr show --name azmapsmcp --query id -o tsv)
```

### Azure Maps API Key Rotation

To rotate the API key:

```bash
az maps account keys renew \
  --name azmapsmcp-maps-dev \
  --resource-group rg-azmaps-mcp-dev \
  --key primary

# Retrieve new key
NEW_KEY=$(az maps account keys list \
  --name azmapsmcp-maps-dev \
  --resource-group rg-azmaps-mcp-dev \
  --query primaryKey -o tsv)

# Update Container App secret
az containerapp update \
  --name azmapsmcp-mcp-dev \
  --resource-group rg-azmaps-mcp-dev \
  --set-env-vars "AZURE_MAPS_API_KEY=secretref:maps-api-key" \
  --replace-secrets "maps-api-key=$NEW_KEY"
```

---

## Cleanup

To delete all resources:

```bash
az group delete \
  --name rg-azmaps-mcp-dev \
  --yes \
  --no-wait

echo "⏳ Resource group deletion initiated (runs asynchronously)"
```

---

## Production Considerations

When moving to production, consider:

1. **ACR SKU:** Upgrade to Standard or Premium for geo-replication
2. **VNet Integration:** Isolate Container Apps in a private VNet
3. **Managed Identity:** Replace subscription keys with Managed Identity auth for Azure Maps
4. **Key Vault:** Store secrets in Azure Key Vault, not Container Apps secrets
5. **Custom Domain:** Configure custom domain and SSL certificate for Container App
6. **Zone Redundancy:** Enable for Container Apps Environment (availability zones)
7. **Monitoring:** Set up Azure Monitor alerts and dashboards
8. **CI/CD:** Automate deployments with GitHub Actions or Azure DevOps

---

## Support

- **Issues:** [GitHub Repository](https://github.com/yourusername/azmaps-mcp/issues)
- **Azure Maps Docs:** https://learn.microsoft.com/azure/azure-maps/
- **Container Apps Docs:** https://learn.microsoft.com/azure/container-apps/

---

**Last Updated:** 2026-05-21  
**Version:** 1.0.0

- ✋ Multi-region deployment and traffic management

## Security Best Practices

1. **Never commit secrets:**
   - `.env` files are in `.gitignore`
   - Use Azure Key Vault in production (V2)
   - Rotate API keys regularly

2. **Use Managed Identity in production:**
   - Deferred to V2 per AD-003
   - Will eliminate API key management

3. **Monitor access logs:**
   - Azure Maps usage logs available in Azure Monitor
   - Container Apps logs in Log Analytics workspace

## Support

For issues or questions:
- Check `.squad/decisions.md` for architectural context
- Review Morpheus's STRATEGY.md for project goals
- Consult Trinity for MCP server implementation questions
- Consult Neo (me!) for infrastructure and Azure questions
