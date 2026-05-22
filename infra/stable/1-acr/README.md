# Deployment 1: Azure Container Registry (ACR)

## Overview
This deployment creates an Azure Container Registry to host the AZMaps-MCP Docker image.

## Prerequisites
- Azure CLI installed
- Bicep CLI installed
- Resource group created: `rg-azmaps-mcp-dev`
- Sufficient permissions to create ACR resources

## Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `location` | string | `eastus` | Azure region |
| `registryName` | string | `azmapsmcp` | Globally unique ACR name (alphanumeric only) |
| `sku` | string | `Basic` | SKU tier (Basic/Standard/Premium) |
| `adminUserEnabled` | bool | `false` | Use RBAC instead of admin credentials |
| `tags` | object | - | Resource tags |

## SKU Recommendations

- **Basic:** Development and testing (chosen for this deployment)
- **Standard:** Production workloads with higher throughput needs
- **Premium:** Geo-replication, zone redundancy, content trust

## Deployment

```bash
# Navigate to deployment directory
cd c:\temp\AZMaps-MCP\infra\deploy-1-acr

# Deploy ACR
az deployment group create \
  --resource-group rg-azmaps-mcp-dev \
  --template-file acr.bicep \
  --parameters acr.bicepparam \
  --name acr-deployment

# Capture outputs for next stages
ACR_LOGIN_SERVER=$(az deployment group show \
  --resource-group rg-azmaps-mcp-dev \
  --name acr-deployment \
  --query properties.outputs.acrLoginServer.value -o tsv)

echo "ACR Login Server: $ACR_LOGIN_SERVER"
```

## Post-Deployment: RBAC Setup

Grant AcrPush role for CI/CD or developers:

```bash
# For current user
az role assignment create \
  --role AcrPush \
  --assignee $(az ad signed-in-user show --query id -o tsv) \
  --scope $(az acr show --name azmapsmcp --query id -o tsv)

# For a service principal
az role assignment create \
  --role AcrPush \
  --assignee <service-principal-id> \
  --scope $(az acr show --name azmapsmcp --query id -o tsv)
```

## Next Steps

1. ✅ ACR deployed
2. ➡️ Deploy Azure Maps (deployment 2)
3. Build and push Docker image
4. Deploy Container Apps (deployment 3)

## Outputs

| Output | Description |
|--------|-------------|
| `acrName` | Registry name |
| `acrLoginServer` | Login server URL (e.g., `azmapsmcp.azurecr.io`) |
| `acrId` | Resource ID |
