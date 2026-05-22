@description('Azure region for the Maps account')
param location string

@description('Name of the Azure Maps account')
param accountName string

@description('SKU for Azure Maps account. Gen2 is the only supported tier.')
@allowed(['G2'])
param sku string = 'G2'

@description('Tags to apply to the Maps account')
param tags object = {}

// Azure Maps Account (Gen2)
resource mapsAccount 'Microsoft.Maps/accounts@2023-06-01' = {
  name: accountName
  location: location
  sku: {
    name: sku
  }
  kind: 'Gen2'
  tags: tags
  properties: {
    // Public endpoint - no VNet integration in V1
    // Managed Identity auth deferred to V2 (per AD-003)
  }
}

@description('Resource ID of the Azure Maps account')
output mapsAccountId string = mapsAccount.id

@description('Name of the Azure Maps account')
output mapsAccountName string = mapsAccount.name

@description('Endpoint URL for Azure Maps service')
output mapsEndpoint string = 'https://atlas.microsoft.com'

@description('Primary access key (DEV ONLY - do not commit to git)')
@secure()
output mapsPrimaryKey string = mapsAccount.listKeys().primaryKey
