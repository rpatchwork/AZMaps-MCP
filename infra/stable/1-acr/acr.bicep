@description('Azure region for the Container Registry')
param location string

@description('Name of the Azure Container Registry (must be globally unique)')
@minLength(5)
@maxLength(50)
param registryName string

@description('SKU for Azure Container Registry')
@allowed(['Basic', 'Standard', 'Premium'])
param sku string = 'Basic'

@description('Enable admin user (NOT RECOMMENDED - use RBAC instead)')
param adminUserEnabled bool = false

@description('Tags to apply to the Container Registry')
param tags object = {}

// Azure Container Registry
resource containerRegistry 'Microsoft.ContainerRegistry/registries@2023-07-01' = {
  name: registryName
  location: location
  sku: {
    name: sku
  }
  tags: tags
  properties: {
    adminUserEnabled: adminUserEnabled
    // Public network access (VNet integration deferred to v2)
    publicNetworkAccess: 'Enabled'
    // Zone redundancy (Premium SKU only)
    zoneRedundancy: sku == 'Premium' ? 'Enabled' : 'Disabled'
  }
}

@description('Name of the Container Registry')
output acrName string = containerRegistry.name

@description('Login server URL for the Container Registry')
output acrLoginServer string = containerRegistry.properties.loginServer

@description('Resource ID of the Container Registry')
output acrId string = containerRegistry.id
