@description('Azure region for Container Apps resources')
param location string

@description('Name for the Container Apps environment')
param environmentName string

@description('Name for the Container App (MCP server)')
param appName string

@description('Container image to deploy (full path from ACR)')
param containerImage string

@description('ACR login server URL (from deployment 1)')
param acrLoginServer string

@description('Azure Maps endpoint URL (from deployment 2)')
param mapsEndpoint string

@description('Azure Maps API key (DEV ONLY - use Managed Identity in production)')
@secure()
param mapsApiKey string

@description('Minimum number of replicas (always-warm per deployment decision)')
@minValue(1)
@maxValue(30)
param minReplicas int = 1

@description('Maximum number of replicas for auto-scaling')
@minValue(1)
@maxValue(30)
param maxReplicas int = 3

@description('Tags to apply to Container Apps resources')
param tags object = {}

// Log Analytics Workspace for Container Apps observability
resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2022-10-01' = {
  name: '${environmentName}-logs'
  location: location
  tags: tags
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: 30
  }
}

// Container Apps Environment
resource containerAppEnvironment 'Microsoft.App/managedEnvironments@2024-03-01' = {
  name: environmentName
  location: location
  tags: tags
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logAnalytics.properties.customerId
        sharedKey: logAnalytics.listKeys().primarySharedKey
      }
    }
    // No VNet integration in V1 (public ingress)
  }
}

// Container App (MCP Server)
resource containerApp 'Microsoft.App/containerApps@2024-03-01' = {
  name: appName
  location: location
  tags: tags
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    managedEnvironmentId: containerAppEnvironment.id
    configuration: {
      activeRevisionsMode: 'Single'
      ingress: {
        external: true
        targetPort: 3000
        transport: 'http'
        allowInsecure: false
      }
      registries: [
        {
          server: acrLoginServer
          identity: 'system'
        }
      ]
      secrets: [
        {
          name: 'maps-api-key'
          value: mapsApiKey
        }
      ]
    }
    template: {
      containers: [
        {
          name: 'mcp-server'
          image: containerImage
          resources: {
            cpu: json('0.5')
            memory: '1Gi'
          }
          env: [
            {
              name: 'AZURE_MAPS_ENDPOINT'
              value: mapsEndpoint
            }
            {
              name: 'AZURE_MAPS_API_KEY'
              secretRef: 'maps-api-key'
            }
            {
              name: 'NODE_ENV'
              value: 'production'
            }
            {
              name: 'PORT'
              value: '3000'
            }
          ]
        }
      ]
      scale: {
        minReplicas: minReplicas
        maxReplicas: maxReplicas
        rules: [
          {
            name: 'http-scaling'
            http: {
              metadata: {
                concurrentRequests: '10'
              }
            }
          }
        ]
      }
    }
  }
}

// Grant Container App system identity AcrPull role on ACR
resource acrPullRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(containerApp.id, 'AcrPull')
  scope: resourceGroup()
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '7f951dda-4ed3-4680-a7ca-43fe172d538d') // AcrPull
    principalId: containerApp.identity.principalId
    principalType: 'ServicePrincipal'
  }
}

@description('Fully qualified domain name of the Container App')
output containerAppFqdn string = containerApp.properties.configuration.ingress.fqdn

@description('Resource ID of the Container App')
output containerAppId string = containerApp.id

@description('Resource ID of the Container Apps Environment')
output containerAppEnvironmentId string = containerAppEnvironment.id

@description('System-assigned managed identity principal ID')
output containerAppPrincipalId string = containerApp.identity.principalId
