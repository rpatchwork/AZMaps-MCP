# Deployment 3: Azure Container Apps

## Overview
This deployment creates an Azure Container Apps environment and deploys the AZMaps-MCP server.

## Prerequisites
- Azure CLI installed
- Bicep CLI installed
- Resource group created: `rg-azmaps-mcp-dev`
- **Deployment 1 (ACR) completed** ✅
- **Deployment 2 (Azure Maps) completed** ✅
- **Docker image built and pushed to ACR** ✅

## Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `location` | string | `eastus` | Azure region |
| `environmentName` | string | `azmapsmcp-env-dev` | Container Apps environment name |
| `appName` | string | `azmapsmcp-mcp-dev` | Container App name |
| `containerImage` | string | - | Full image path from ACR |
| `acrLoginServer` | string | - | ACR login server (from deployment 1) |
| `mapsEndpoint` | string | - | Maps endpoint (from deployment 2) |
| `mapsApiKey` | string | - | Maps API key (from deployment 2) |
| `minReplicas` | int | `1` | Minimum replica count |
| `maxReplicas` | int | `3` | Maximum replica count |
| `tags` | object | - | Resource tags |

## Retrieve Prerequisites

Before deploying, retrieve outputs from previous deployments:

```bash
# From Deployment 1 (ACR)
ACR_LOGIN_SERVER=$(az deployment group show \
  --resource-group rg-azmaps-mcp-dev \
  --name acr-deployment \
  --query properties.outputs.acrLoginServer.value -o tsv)

# From Deployment 2 (Azure Maps)
MAPS_ENDPOINT=$(az deployment group show \
  --resource-group rg-azmaps-mcp-dev \
  --name maps-deployment \
  --query properties.outputs.mapsEndpoint.value -o tsv)

MAPS_API_KEY=$(az deployment group show \
  --resource-group rg-azmaps-mcp-dev \
  --name maps-deployment \
  --query properties.outputs.mapsPrimaryKey.value -o tsv)

echo "ACR Login Server: $ACR_LOGIN_SERVER"
echo "Maps Endpoint: $MAPS_ENDPOINT"
echo "Maps API Key: [REDACTED]"
```

## Build and Push Docker Image

Before deploying Container Apps, build and push the Docker image:

```bash
# Navigate to repo root
cd c:\temp\AZMaps-MCP

# Build Docker image
docker build -t azmaps-mcp:v1 .

# Login to ACR
az acr login --name azmapsmcp

# Tag image
docker tag azmaps-mcp:v1 $ACR_LOGIN_SERVER/azmaps-mcp:latest

# Push to ACR
docker push $ACR_LOGIN_SERVER/azmaps-mcp:latest
```

## Deployment

```bash
# Navigate to deployment directory
cd c:\temp\AZMaps-MCP\infra\deploy-3-container-apps

# Deploy Container Apps with parameter overrides
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

echo "Container App URL: https://$CONTAINER_APP_FQDN"
```

## Architecture

This deployment creates:
- **Log Analytics Workspace** — Application logs and metrics
- **Container Apps Environment** — Managed infrastructure for Container Apps
- **Container App** — MCP server running Node.js/TypeScript
- **System-Assigned Managed Identity** — For ACR pull authentication
- **RBAC Role Assignment** — AcrPull role for the managed identity

## Health Check

Verify the deployment:

```bash
# Check Container App status
az containerapp show \
  --name azmapsmcp-mcp-dev \
  --resource-group rg-azmaps-mcp-dev \
  --query properties.runningStatus -o tsv

# Test health endpoint
curl https://$CONTAINER_APP_FQDN/health

# View logs
az containerapp logs show \
  --name azmapsmcp-mcp-dev \
  --resource-group rg-azmaps-mcp-dev \
  --follow
```

## Scaling Configuration

- **Min Replicas:** 1 (always-warm for consistent latency)
- **Max Replicas:** 3 (auto-scale based on HTTP concurrency)
- **Scale Rule:** 10 concurrent requests per replica

## Outputs

| Output | Description |
|--------|-------------|
| `containerAppFqdn` | Public URL of the MCP server |
| `containerAppId` | Resource ID |
| `containerAppEnvironmentId` | Environment resource ID |
| `containerAppPrincipalId` | Managed identity principal ID |
