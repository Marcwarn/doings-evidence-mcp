# Deployment chain runbook: GitHub -> Azure -> Remote MCP -> ChatGPT/MCP client

This runbook turns the local Doings Evidence MCP into a hosted remote MCP service.

## What this package can do

- Build and run locally as STDIO MCP.
- Build and run locally as Streamable HTTP MCP.
- Deploy to Azure Container Apps via GitHub Actions.
- Protect the `/mcp` endpoint with a bearer token.
- Expose `/health` for operations and smoke testing.

## What still requires an admin/human

- Create or select the GitHub repository.
- Create an Azure subscription/resource group or authorize GitHub OIDC against an existing subscription.
- Register/configure the Microsoft Entra application used for SharePoint access.
- Decide exactly which SharePoint site/library the MCP may read.
- Add the deployed MCP URL to ChatGPT or another MCP client supported by your workspace.

## Step 1: Create GitHub repository

Recommended repository name:

```text
doings-evidence-mcp
```

Push this package to the repository:

```bash
git init
git add .
git commit -m "Initial Doings Evidence MCP remote-ready package"
git branch -M main
git remote add origin git@github.com:<org>/doings-evidence-mcp.git
git push -u origin main
```

## Step 2: Configure GitHub variables and secrets

Repository variables:

```text
AZURE_RESOURCE_GROUP=rg-doings-evidence-mcp
AZURE_LOCATION=swedencentral
AZURE_CONTAINER_APP_NAME=doings-evidence-mcp
AZURE_CONTAINER_ENVIRONMENT=doings-evidence-env
AZURE_CONTAINER_REGISTRY=<globally-unique-acr-name>
```

Repository secrets:

```text
AZURE_CLIENT_ID=<federated-credential-app-client-id>
AZURE_TENANT_ID=<azure-tenant-id>
AZURE_SUBSCRIPTION_ID=<azure-subscription-id>
MCP_BEARER_TOKEN=<long-random-token>
MS_TENANT_ID=<doings-entra-tenant-id>
MS_CLIENT_ID=<sharepoint-graph-app-client-id>
```

## Step 3: Deploy to Azure Container Apps

Run the workflow manually:

```text
Actions -> Deploy Doings Evidence MCP to Azure Container Apps -> Run workflow
```

The workflow will:

1. Build TypeScript.
2. Deploy the Bicep infrastructure.
3. Build and push a Docker image to Azure Container Registry.
4. Update the Azure Container App revision.
5. Print the health and MCP endpoints.

## Step 4: Smoke test

Health:

```bash
MCP_BASE_URL=https://<fqdn> npm run smoke:health
```

Remote MCP initialize:

```bash
MCP_BASE_URL=https://<fqdn> MCP_BEARER_TOKEN=<token> npm run smoke:remote
```

## Step 5: Connect a client

Remote MCP config shape:

```json
{
  "mcpServers": {
    "doings-evidence": {
      "url": "https://<fqdn>/mcp",
      "headers": {
        "Authorization": "Bearer <token>"
      }
    }
  }
}
```

Exact UI depends on the MCP client and on what the ChatGPT workspace/admin settings support.

## Step 6: SharePoint permission model

Start narrow. Recommended first site:

```text
Doings Evidence Knowledge
```

Only include approved material:

- Doings voice guide
- approved playbooks
- org-design principles
- reusable RFP snippets
- anonymized/approved case material

Avoid broad tenant-wide access in the first deployment.
