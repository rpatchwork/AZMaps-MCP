using './acr.bicep'

param location = 'eastus'
param registryName = 'azmapsmcp' // Must be globally unique
param sku = 'Basic'
param adminUserEnabled = false // Use RBAC for secure access
param tags = {
  project: 'azmaps-mcp'
  environment: 'dev'
  deployment: 'stage-1'
}
