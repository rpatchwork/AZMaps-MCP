# Deployment 2: Azure Maps Gen2

## Overview
This deployment creates an Azure Maps Gen2 account for geospatial services.

## Prerequisites
- Azure CLI installed
- Bicep CLI installed
- Resource group created: `rg-azmaps-mcp-dev`
- Deployment 1 (ACR) completed ✅

## Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `location` | string | `eastus` | Azure region |
| `accountName` | string | `azmapsmcp-maps-dev` | Azure Maps account name |
| `sku` | string | `G2` | SKU (Gen2 is the only supported tier) |
| `tags` | object | - | Resource tags |

## About Azure Maps Gen2

Azure Maps Gen2 is the current generation offering:
- Pay-as-you-go pricing model
- Full REST API access for geocoding, search, routing, timezone
- Subscription key authentication (Managed Identity in V2)

## Deployment

```bash
# Navigate to deployment directory
cd c:\temp\AZMaps-MCP\infra\deploy-2-maps

# Deploy Azure Maps
az deployment group create \
  --resource-group rg-azmaps-mcp-dev \
  --template-file azure-maps.bicep \
  --parameters azure-maps.bicepparam \
  --name maps-deployment

# Capture outputs for next stage
MAPS_ENDPOINT=$(az deployment group show \
  --resource-group rg-azmaps-mcp-dev \
  --name maps-deployment \
  --query properties.outputs.mapsEndpoint.value -o tsv)

MAPS_API_KEY=$(az deployment group show \
  --resource-group rg-azmaps-mcp-dev \
  --name maps-deployment \
  --query properties.outputs.mapsPrimaryKey.value -o tsv)

echo "Maps Endpoint: $MAPS_ENDPOINT"
echo "Maps API Key: $MAPS_API_KEY"  # DO NOT COMMIT TO GIT
```

## Security Best Practices

⚠️ **DEV ONLY:** This deployment uses subscription keys for authentication.

**Production recommendations:**
- Store API key in Azure Key Vault
- Use Managed Identity authentication (roadmap V2)
- Enable access restrictions by IP or CORS policy

## Next Steps

1. ✅ ACR deployed
2. ✅ Azure Maps deployed
3. ➡️ Build and push Docker image
4. ➡️ Deploy Container Apps (deployment 3)

## Outputs

| Output | Description |
|--------|-------------|
| `mapsAccountName` | Maps account name |
| `mapsEndpoint` | Service endpoint URL |
| `mapsPrimaryKey` | Primary subscription key (secure output) |
| `mapsAccountId` | Resource ID |
