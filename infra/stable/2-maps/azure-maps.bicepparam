using './azure-maps.bicep'

param location = 'eastus'
param accountName = 'azmapsmcp-maps-dev'
param sku = 'G2'
param tags = {
  project: 'azmaps-mcp'
  environment: 'dev'
  deployment: 'stage-2'
}
