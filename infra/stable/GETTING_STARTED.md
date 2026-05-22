# AZMaps-MCP Stable Infrastructure - Getting Started

This guide helps you deploy the stable Azure infrastructure for the AZMaps-MCP project.

## What Gets Deployed

✅ **Azure Container Registry (ACR)** - Hosts Docker images for the MCP server  
✅ **Azure Maps Gen2** - Provides geospatial APIs (geocoding, routing, POI search, etc.)

---

## Prerequisites

1. **Azure CLI** installed ([Download](https://learn.microsoft.com/cli/azure/install-azure-cli))
2. **PowerShell 7+** (for deployment script)
3. **Azure Subscription** with Contributor or Owner role
4. **Logged into Azure:** `az login`

---

## Option 1: Automated Deployment (Recommended)

Use the PowerShell script for a guided deployment:

```powershell
cd c:\temp\AZMaps-MCP\infra\stable
.\deploy-all.ps1
```

**What it does:**
- ✅ Checks prerequisites (Azure CLI, login status)
- ✅ Creates resource group if needed
- ✅ Deploys ACR
- ✅ Deploys Azure Maps
- ✅ Shows deployment summary with outputs

**Optional parameters:**
```powershell
# Dry run (see what would be deployed without actually deploying)
.\deploy-all.ps1 -WhatIf

# Skip ACR deployment
.\deploy-all.ps1 -SkipACR

# Skip Maps deployment
.\deploy-all.ps1 -SkipMaps

# Use different resource group
.\deploy-all.ps1 -ResourceGroupName "my-custom-rg" -Location "westus2"
```

---

## Option 2: Manual Deployment

If you prefer manual control:

### Step 1: Create Resource Group

```bash
az group create \
  --name rg-azmaps-mcp-dev \
  --location eastus
```

### Step 2: Deploy ACR

```bash
cd c:\temp\AZMaps-MCP\infra\stable\1-acr

az deployment group create \
  --resource-group rg-azmaps-mcp-dev \
  --template-file acr.bicep \
  --parameters acr.bicepparam \
  --name acr-deployment
```

### Step 3: Deploy Azure Maps

```bash
cd c:\temp\AZMaps-MCP\infra\stable\2-maps

az deployment group create \
  --resource-group rg-azmaps-mcp-dev \
  --template-file azure-maps.bicep \
  --parameters azure-maps.bicepparam \
  --name maps-deployment
```

---

## Retrieve Deployment Outputs

After deployment, get the configuration values you need:

### Get ACR Login Server

```bash
az deployment group show \
  --resource-group rg-azmaps-mcp-dev \
  --name acr-deployment \
  --query properties.outputs.acrLoginServer.value -o tsv
```

**Output:** `azmapsmcp.azurecr.io`

### Get Azure Maps API Key

```bash
az deployment group show \
  --resource-group rg-azmaps-mcp-dev \
  --name maps-deployment \
  --query properties.outputs.mapsPrimaryKey.value -o tsv
```

**⚠️ Security Note:** Never commit this API key to Git. Store it securely in Azure Key Vault or environment variables.

### Get All Outputs

See [OUTPUTS.md](./OUTPUTS.md) for a complete reference of all deployment outputs and how to use them.

---

## Next Steps

### 1. Build and Push Docker Image

```bash
# Navigate to repo root
cd c:\temp\AZMaps-MCP

# Build Docker image
docker build -t azmaps-mcp:v1 .

# Login to ACR
az acr login --name azmapsmcp

# Tag and push image
docker tag azmaps-mcp:v1 azmapsmcp.azurecr.io/azmaps-mcp:latest
docker push azmapsmcp.azurecr.io/azmaps-mcp:latest
```

### 2. Configure MCP Server

Set environment variables for local development:

**PowerShell:**
```powershell
$env:AZURE_MAPS_ENDPOINT = "https://atlas.microsoft.com"
$env:AZURE_MAPS_API_KEY = $(az deployment group show --resource-group rg-azmaps-mcp-dev --name maps-deployment --query properties.outputs.mapsPrimaryKey.value -o tsv)
```

**Bash:**
```bash
export AZURE_MAPS_ENDPOINT="https://atlas.microsoft.com"
export AZURE_MAPS_API_KEY=$(az deployment group show --resource-group rg-azmaps-mcp-dev --name maps-deployment --query properties.outputs.mapsPrimaryKey.value -o tsv)
```

### 3. Test MCP Server Locally

```bash
npm run build
npm start
```

### 4. Deploy to Container Apps (Future)

Container Apps deployment is work-in-progress. See [`../archive/deploy-3-container-apps-FAILED/`](../archive/deploy-3-container-apps-FAILED/) for the draft deployment.

---

## Validation

### Verify ACR Deployment

```bash
# Check ACR exists
az acr show --name azmapsmcp --resource-group rg-azmaps-mcp-dev

# List repositories (after pushing image)
az acr repository list --name azmapsmcp --output table
```

### Verify Azure Maps Deployment

```bash
# Check Maps account exists
az maps account show \
  --name azmapsmcp-maps-dev \
  --resource-group rg-azmaps-mcp-dev

# Test geocoding API
MAPS_KEY=$(az deployment group show \
  --resource-group rg-azmaps-mcp-dev \
  --name maps-deployment \
  --query properties.outputs.mapsPrimaryKey.value -o tsv)

curl "https://atlas.microsoft.com/search/address/json?api-version=1.0&subscription-key=$MAPS_KEY&query=Microsoft+Building+25+Redmond+WA"
```

---

## Troubleshooting

### "Deployment failed" Error

Check the deployment logs:
```bash
az deployment group show \
  --resource-group rg-azmaps-mcp-dev \
  --name acr-deployment \
  --query properties.error -o json
```

### ACR Login Failed

Grant yourself AcrPush role:
```bash
az role assignment create \
  --role AcrPush \
  --assignee $(az ad signed-in-user show --query id -o tsv) \
  --scope $(az acr show --name azmapsmcp --query id -o tsv)
```

### Maps API Key Not Found

Keys are marked as SecureString and must be retrieved from deployment outputs:
```bash
az deployment group show \
  --resource-group rg-azmaps-mcp-dev \
  --name maps-deployment \
  --query properties.outputs.mapsPrimaryKey.value -o tsv
```

---

## Documentation

- [Full README](./README.md) - Comprehensive infrastructure documentation
- [Deployment Manifest](./DEPLOYMENT_MANIFEST.md) - Detailed deployment tracking
- [Outputs Reference](./OUTPUTS.md) - All deployment outputs and usage examples
- [ACR Details](./1-acr/README.md) - Azure Container Registry documentation
- [Maps Details](./2-maps/README.md) - Azure Maps deployment documentation

---

## Support

**Project:** AZMaps-MCP  
**Squad:** Brady (Lead), Neo (Infrastructure), Trinity (Development), Ralph (Monitoring), Scribe (Documentation)  
**Resource Group:** `rg-azmaps-mcp-dev`  
**Subscription:** `a235bb1a-6ca9-4949-91f0-c82ac40a4576`
