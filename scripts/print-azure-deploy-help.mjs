console.log(`Doings Evidence MCP Azure deployment quick help

Required GitHub repository variables:
- AZURE_RESOURCE_GROUP
- AZURE_CONTAINER_REGISTRY  (globally unique ACR name, lowercase alphanumeric)
- AZURE_LOCATION            (default: swedencentral)
- AZURE_CONTAINER_APP_NAME  (default: doings-evidence-mcp)
- AZURE_CONTAINER_ENVIRONMENT (default: doings-evidence-env)

Required GitHub secrets:
- AZURE_CLIENT_ID
- AZURE_TENANT_ID
- AZURE_SUBSCRIPTION_ID
- MCP_BEARER_TOKEN
- MS_TENANT_ID
- MS_CLIENT_ID

Then run workflow:
.github/workflows/azure-container-app.yml
`);
