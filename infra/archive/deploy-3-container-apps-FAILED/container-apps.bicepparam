using './container-apps.bicep'

param location = 'eastus'
param environmentName = 'azmapsmcp-env-dev'
param appName = 'azmapsmcp-mcp-dev'
// These will be overridden via --parameters at deployment time
param containerImage = 'azmapsmcp.azurecr.io/azmaps-mcp:latest' // From deployment 1
param acrLoginServer = 'azmapsmcp.azurecr.io' // From deployment 1
param mapsEndpoint = 'https://atlas.microsoft.com/' // From deployment 2
param mapsApiKey = '<RETRIEVE_FROM_DEPLOYMENT_2>' // From deployment 2
param minReplicas = 1
param maxReplicas = 3
param tags = {
  project: 'azmaps-mcp'
  environment: 'dev'
  deployment: 'stage-3'
}
