# AZMaps-MCP Deployment Outputs

This document contains all outputs from the stable infrastructure deployments.

**Last Updated:** 2026-05-22  
**Resource Group:** `rg-azmaps-mcp-dev`  
**Subscription:** `a235bb1a-6ca9-4949-91f0-c82ac40a4576`

---

## Azure Container Registry Outputs

**Deployment Name:** `acr-deployment`

### Outputs

```json
{
  "acrId": {
    "type": "String",
    "value": "/subscriptions/a235bb1a-6ca9-4949-91f0-c82ac40a4576/resourceGroups/rg-azmaps-mcp-dev/providers/Microsoft.ContainerRegistry/registries/azmapsmcp"
  },
  "acrLoginServer": {
    "type": "String",
    "value": "azmapsmcp.azurecr.io"
  },
  "acrName": {
    "type": "String",
    "value": "azmapsmcp"
  }
}
```

### Quick Access

| Output | Value |
|--------|-------|
| **ACR Name** | `azmapsmcp` |
| **Login Server** | `azmapsmcp.azurecr.io` |
| **Resource ID** | `/subscriptions/a235bb1a-6ca9-4949-91f0-c82ac40a4576/resourceGroups/rg-azmaps-mcp-dev/providers/Microsoft.ContainerRegistry/registries/azmapsmcp` |

### Retrieve Commands

```bash
# Get ACR name
az deployment group show \
  --resource-group rg-azmaps-mcp-dev \
  --name acr-deployment \
  --query properties.outputs.acrName.value -o tsv

# Get login server
az deployment group show \
  --resource-group rg-azmaps-mcp-dev \
  --name acr-deployment \
  --query properties.outputs.acrLoginServer.value -o tsv

# Get resource ID
az deployment group show \
  --resource-group rg-azmaps-mcp-dev \
  --name acr-deployment \
  --query properties.outputs.acrId.value -o tsv
```

---

## Azure Maps Outputs

**Deployment Name:** `maps-deployment`

### Outputs

```json
{
  "mapsAccountId": {
    "type": "String",
    "value": "/subscriptions/a235bb1a-6ca9-4949-91f0-c82ac40a4576/resourceGroups/rg-azmaps-mcp-dev/providers/Microsoft.Maps/accounts/azmapsmcp-maps-dev"
  },
  "mapsAccountName": {
    "type": "String",
    "value": "azmapsmcp-maps-dev"
  },
  "mapsEndpoint": {
    "type": "String",
    "value": "https://atlas.microsoft.com"
  },
  "mapsPrimaryKey": {
    "type": "SecureString"
    // Value masked - retrieve using command below
  }
}
```

### Quick Access

| Output | Value |
|--------|-------|
| **Account Name** | `azmapsmcp-maps-dev` |
| **Endpoint** | `https://atlas.microsoft.com` |
| **Resource ID** | `/subscriptions/a235bb1a-6ca9-4949-91f0-c82ac40a4576/resourceGroups/rg-azmaps-mcp-dev/providers/Microsoft.Maps/accounts/azmapsmcp-maps-dev` |
| **Primary Key** | `[SECURE - Use command below]` |

### Retrieve Commands

```bash
# Get account name
az deployment group show \
  --resource-group rg-azmaps-mcp-dev \
  --name maps-deployment \
  --query properties.outputs.mapsAccountName.value -o tsv

# Get endpoint
az deployment group show \
  --resource-group rg-azmaps-mcp-dev \
  --name maps-deployment \
  --query properties.outputs.mapsEndpoint.value -o tsv

# Get resource ID
az deployment group show \
  --resource-group rg-azmaps-mcp-dev \
  --name maps-deployment \
  --query properties.outputs.mapsAccountId.value -o tsv

# Get API key (SECURE - don't commit!)
az deployment group show \
  --resource-group rg-azmaps-mcp-dev \
  --name maps-deployment \
  --query properties.outputs.mapsPrimaryKey.value -o tsv
```

---

## Environment Variables for MCP Server

Use these values to configure the MCP server:

### PowerShell

```powershell
# Set environment variables
$env:AZURE_MAPS_ENDPOINT = "https://atlas.microsoft.com"
$env:AZURE_MAPS_API_KEY = $(az deployment group show `
    --resource-group rg-azmaps-mcp-dev `
    --name maps-deployment `
    --query properties.outputs.mapsPrimaryKey.value -o tsv)

# Verify
Write-Host "AZURE_MAPS_ENDPOINT: $env:AZURE_MAPS_ENDPOINT"
Write-Host "AZURE_MAPS_API_KEY: [SET - $(if ($env:AZURE_MAPS_API_KEY) { 'Length: ' + $env:AZURE_MAPS_API_KEY.Length } else { 'NOT SET' })]"
```

### Bash

```bash
# Set environment variables
export AZURE_MAPS_ENDPOINT="https://atlas.microsoft.com"
export AZURE_MAPS_API_KEY=$(az deployment group show \
    --resource-group rg-azmaps-mcp-dev \
    --name maps-deployment \
    --query properties.outputs.mapsPrimaryKey.value -o tsv)

# Verify
echo "AZURE_MAPS_ENDPOINT: $AZURE_MAPS_ENDPOINT"
echo "AZURE_MAPS_API_KEY: [SET - Length: ${#AZURE_MAPS_API_KEY}]"
```

### .env File (DO NOT COMMIT)

```bash
AZURE_MAPS_ENDPOINT=https://atlas.microsoft.com
AZURE_MAPS_API_KEY=<retrieve using az deployment command above>
```

---

## Docker Image Reference

### Published Image

| Property | Value |
|----------|-------|
| **Registry** | `azmapsmcp.azurecr.io` |
| **Repository** | `azmaps-mcp` |
| **Tag** | `latest` |
| **Full Reference** | `azmapsmcp.azurecr.io/azmaps-mcp:latest` |

### Pull Image

```bash
# Login to ACR
az acr login --name azmapsmcp

# Pull image
docker pull azmapsmcp.azurecr.io/azmaps-mcp:latest
```

---

## Testing the Deployed Infrastructure

### Test ACR Access

```bash
# Login to ACR
az acr login --name azmapsmcp

# List repositories
az acr repository list --name azmapsmcp --output table

# Show tags for azmaps-mcp repo
az acr repository show-tags --name azmapsmcp --repository azmaps-mcp --output table
```

### Test Azure Maps API

```bash
# Get API key
MAPS_KEY=$(az deployment group show \
  --resource-group rg-azmaps-mcp-dev \
  --name maps-deployment \
  --query properties.outputs.mapsPrimaryKey.value -o tsv)

# Test geocoding API
curl "https://atlas.microsoft.com/search/address/json?api-version=1.0&subscription-key=$MAPS_KEY&query=Microsoft+Building+25+Redmond+WA"

# Expected response: JSON with lat/lon coordinates for Microsoft Building 25
```

### Test Timezone API

```bash
# Get API key
MAPS_KEY=$(az deployment group show \
  --resource-group rg-azmaps-mcp-dev \
  --name maps-deployment \
  --query properties.outputs.mapsPrimaryKey.value -o tsv)

# Test timezone API with coordinates (Redmond, WA)
curl "https://atlas.microsoft.com/timezone/byCoordinates/json?api-version=1.0&subscription-key=$MAPS_KEY&query=47.6397,-122.1289"

# Expected response: JSON with timezone information
```

---

## RBAC Configuration

### Grant ACR Push Access

```bash
# For current user
az role assignment create \
  --role AcrPush \
  --assignee $(az ad signed-in-user show --query id -o tsv) \
  --scope /subscriptions/a235bb1a-6ca9-4949-91f0-c82ac40a4576/resourceGroups/rg-azmaps-mcp-dev/providers/Microsoft.ContainerRegistry/registries/azmapsmcp
```

### Grant ACR Pull Access (for Container Apps)

```bash
# For a managed identity or service principal
az role assignment create \
  --role AcrPull \
  --assignee <principal-id> \
  --scope /subscriptions/a235bb1a-6ca9-4949-91f0-c82ac40a4576/resourceGroups/rg-azmaps-mcp-dev/providers/Microsoft.ContainerRegistry/registries/azmapsmcp
```

---

## Cost Monitoring

### View Current Costs

```bash
# Get resource group cost (requires Cost Management permissions)
az consumption usage list \
  --query "[?contains(instanceId, 'rg-azmaps-mcp-dev')].{Resource:instanceName, Cost:pretaxCost, Currency:currency}" \
  --output table
```

### Set Budget Alert (Optional)

```bash
# Create a budget for the resource group
az consumption budget create \
  --resource-group rg-azmaps-mcp-dev \
  --budget-name azmaps-mcp-dev-budget \
  --amount 100 \
  --category Cost \
  --time-period "$(date -u +%Y-%m-01)to$(date -u -d '+1 month' +%Y-%m-01)" \
  --time-grain Monthly \
  --output table
```

---

## Maintenance Commands

### Update ACR

```bash
# Navigate to ACR deployment
cd c:\temp\AZMaps-MCP\infra\stable\1-acr

# Redeploy with updated parameters
az deployment group create \
  --resource-group rg-azmaps-mcp-dev \
  --template-file acr.bicep \
  --parameters acr.bicepparam \
  --name acr-deployment
```

### Rotate Maps API Key

```bash
# Regenerate primary key
az maps account keys renew \
  --name azmapsmcp-maps-dev \
  --resource-group rg-azmaps-mcp-dev \
  --key primary

# Get new key
az deployment group show \
  --resource-group rg-azmaps-mcp-dev \
  --name maps-deployment \
  --query properties.outputs.mapsPrimaryKey.value -o tsv
```

---

**Note:** Always treat API keys and secrets as sensitive. Never commit them to version control. Use Azure Key Vault for production deployments.
