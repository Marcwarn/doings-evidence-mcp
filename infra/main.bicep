param location string = resourceGroup().location
param containerRegistryName string
param containerAppName string = 'doings-evidence-mcp'
param containerAppEnvironmentName string = 'doings-evidence-env'
param logAnalyticsWorkspaceName string = '${containerAppName}-logs'

resource acr 'Microsoft.ContainerRegistry/registries@2023-07-01' = {
  name: containerRegistryName
  location: location
  sku: {
    name: 'Basic'
  }
  properties: {
    adminUserEnabled: true
  }
}

resource law 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: logAnalyticsWorkspaceName
  location: location
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: 30
  }
}

resource env 'Microsoft.App/managedEnvironments@2024-03-01' = {
  name: containerAppEnvironmentName
  location: location
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: law.properties.customerId
        sharedKey: law.listKeys().primarySharedKey
      }
    }
  }
}

resource app 'Microsoft.App/containerApps@2024-03-01' = {
  name: containerAppName
  location: location
  properties: {
    managedEnvironmentId: env.id
    configuration: {
      ingress: {
        external: true
        targetPort: 3000
        transport: 'http'
        allowInsecure: false
      }
      registries: [
        {
          server: '${containerRegistryName}.azurecr.io'
          username: acr.listCredentials().username
          passwordSecretRef: 'acr-password'
        }
      ]
      secrets: [
        {
          name: 'acr-password'
          value: acr.listCredentials().passwords[0].value
        }
        {
          name: 'mcp-bearer-token'
          value: 'replace-after-deploy'
        }
        {
          name: 'ms-tenant-id'
          value: 'replace-after-deploy'
        }
        {
          name: 'ms-client-id'
          value: 'replace-after-deploy'
        }
      ]
    }
    template: {
      containers: [
        {
          name: containerAppName
          image: 'mcr.microsoft.com/azuredocs/containerapps-helloworld:latest'
          env: [
            { name: 'PORT', value: '3000' }
            { name: 'NODE_ENV', value: 'production' }
            { name: 'MCP_REQUIRE_AUTH', value: 'true' }
            { name: 'MCP_BEARER_TOKEN', secretRef: 'mcp-bearer-token' }
            { name: 'MCP_PATH', value: '/mcp' }
            { name: 'MS_TENANT_ID', secretRef: 'ms-tenant-id' }
            { name: 'MS_CLIENT_ID', secretRef: 'ms-client-id' }
            { name: 'MS_GRAPH_SCOPES', value: 'Files.Read.All Sites.Read.All offline_access' }
          ]
          resources: {
            cpu: json('0.5')
            memory: '1Gi'
          }
        }
      ]
      scale: {
        minReplicas: 1
        maxReplicas: 3
      }
    }
  }
}

output containerAppFqdn string = app.properties.configuration.ingress.fqdn
output mcpEndpoint string = 'https://${app.properties.configuration.ingress.fqdn}/mcp'
output healthEndpoint string = 'https://${app.properties.configuration.ingress.fqdn}/health'
